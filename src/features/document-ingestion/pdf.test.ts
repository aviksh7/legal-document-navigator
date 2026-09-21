import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import { ingestPdf } from "./pdf";
import type { PdfRuntime } from "./pdf-runtime";
import { LIMITS } from "./types";
import { resolveEvidence } from "../document-workspace/model";
import { syntheticPdf, SYNTHETIC_PAGE } from "./testing/synthetic-pdf";

const input = (bytes: Uint8Array = syntheticPdf([SYNTHETIC_PAGE])) => new File([new Uint8Array(bytes)], "synthetic.pdf", { type: "application/pdf" });
const options = () => ({ signal: new AbortController().signal });
const never = () => new Promise<never>(() => {});

function mockRuntime(overrides: Partial<PDFDocumentProxy> = {}, chunks: unknown[] = [{ items: [{ str: SYNTHETIC_PAGE, hasEOL: false }] }]) {
  const cleanup = vi.fn(); const destroy = vi.fn(async () => {}); const dispose = vi.fn();
  const document = {
    numPages: 1, isPureXfa: false,
    getFieldObjects: async () => null, getAttachments: async () => null, getPermissions: async () => null,
    getPage: async () => ({ cleanup, streamTextContent: () => new ReadableStream({ start(controller) { chunks.forEach(chunk => controller.enqueue(chunk)); controller.close(); } }) }),
    ...overrides,
  } as unknown as PDFDocumentProxy;
  const loading = { promise: Promise.resolve(document), destroy, onPassword: null } as unknown as PDFDocumentLoadingTask;
  const runtime = { api: { getDocument: vi.fn(() => loading), version: "6.3.289", PermissionFlag: { COPY: 16 } }, failed: never(), dispose } as unknown as PdfRuntime;
  return { runtime, loading, cleanup, destroy, dispose };
}

describe("PDF adapter boundary and lifecycle", () => {
  afterEach(() => vi.useRealTimers());
  it("disposes parser resources after success and never passes a document URL", async () => {
    const mock = mockRuntime();
    expect((await ingestPdf(input(), options(), async () => mock.runtime)).status).toBe("ready");
    expect(mock.destroy).toHaveBeenCalledOnce(); expect(mock.dispose).toHaveBeenCalledOnce(); expect(mock.cleanup).toHaveBeenCalledOnce();
    expect(mock.runtime.api.getDocument).toHaveBeenCalledWith(expect.objectContaining({ data: expect.any(Uint8Array), verbosity: 0, stopAtErrors: true }));
    expect(mock.runtime.api.getDocument).not.toHaveBeenCalledWith(expect.objectContaining({ url: expect.anything() }));
  });
  it.each([
    { numPages: 101 }, { numPages: NaN }, { isPureXfa: true },
    { getFieldObjects: async () => new Map([["field", []]]) },
    { getAttachments: async () => new Map([["attachment", {}]]) },
    { getPermissions: async () => new Set<number>() },
  ])("fails closed for unsupported or invalid public document data (%#)", async (override) => {
    const mock = mockRuntime(override as Partial<PDFDocumentProxy>);
    const result = await ingestPdf(input(), options(), async () => mock.runtime);
    expect(result.status).toBe("error"); expect(mock.destroy).toHaveBeenCalledOnce(); expect(mock.dispose).toHaveBeenCalledOnce();
  });
  it("does not expose parser messages or partial pages when a later page fails", async () => {
    const mock = mockRuntime({ numPages: 2, getPage: vi.fn().mockResolvedValueOnce({ cleanup: vi.fn(), streamTextContent: () => new ReadableStream({ start(c) { c.enqueue({ items: [{ str: SYNTHETIC_PAGE, hasEOL: false }] }); c.close(); } }) }).mockRejectedValueOnce(new Error("SENSITIVE-PARSER-PAYLOAD")) });
    const result = await ingestPdf(input(), options(), async () => mock.runtime);
    expect(result).toEqual({ status: "error", error: { code: "unexpected-parser-failure" } });
    expect(JSON.stringify(result)).not.toContain("SENSITIVE"); expect(mock.dispose).toHaveBeenCalledOnce();
  });
  it("rejects malformed chunk output and excessive items", async () => {
    for (const chunks of [[{ items: [{ str: 123 }] }], [{ items: Array(LIMITS.pageItems + 1).fill({ str: "", hasEOL: false }) }]]) {
      const mock = mockRuntime({}, chunks);
      expect((await ingestPdf(input(), options(), async () => mock.runtime)).status).toBe("error");
      expect(mock.dispose).toHaveBeenCalledOnce();
    }
  });
  it("cancels a stuck load and destroys resources without waiting for parser cooperation", async () => {
    const controller = new AbortController(); const mock = mockRuntime();
    Object.defineProperty(mock.loading, "promise", { value: never() });
    const task = ingestPdf(input(), { signal: controller.signal, onProgress: () => {} }, async () => { queueMicrotask(() => controller.abort()); return mock.runtime; });
    expect(await task).toEqual({ status: "cancelled" });
  });
  it("times out a stuck load", async () => {
    vi.useFakeTimers(); const mock = mockRuntime(); Object.defineProperty(mock.loading, "promise", { value: never() });
    const task = ingestPdf(input(), options(), async () => mock.runtime);
    await vi.advanceTimersByTimeAsync(LIMITS.jobMs + 1);
    expect(await task).toEqual({ status: "error", error: { code: "processing-timeout" } });
    expect(mock.dispose).toHaveBeenCalledOnce();
  });
  it("times out a stuck page", async () => {
    vi.useFakeTimers(); const mock = mockRuntime({ getPage: () => never() });
    const task = ingestPdf(input(), options(), async () => mock.runtime);
    await vi.advanceTimersByTimeAsync(LIMITS.pageMs + 1);
    expect(await task).toEqual({ status: "error", error: { code: "processing-timeout" } });
    expect(mock.dispose).toHaveBeenCalledOnce();
  });
  it("checks size/header before loading the parser and honors pre-cancellation", async () => {
    const factory = vi.fn();
    expect(await ingestPdf(new File([], "empty.pdf"), options(), factory)).toEqual({ status: "error", error: { code: "empty-file" } });
    expect(await ingestPdf(new File([new Uint8Array(LIMITS.fileBytes + 1)], "large.pdf"), options(), factory)).toEqual({ status: "error", error: { code: "file-too-large" } });
    expect(await ingestPdf(new File(["plain text"], "fake.pdf", { type: "application/pdf" }), options(), factory)).toEqual({ status: "error", error: { code: "wrong-file-type" } });
    expect(await ingestPdf(input(), { signal: AbortSignal.abort() }, factory)).toEqual({ status: "cancelled" });
    expect(factory).not.toHaveBeenCalled();
  });
});

describe("real modern PDF.js parser with synthetic PDF bytes", () => {
  let api: typeof import("pdfjs-dist");
  const originalToHex = Object.getOwnPropertyDescriptor(Uint8Array.prototype, "toHex");
  const originalMapInsert = Object.getOwnPropertyDescriptor(Map.prototype, "getOrInsertComputed");
  beforeAll(async () => {
    // Node 24 lacks this browser API. This shim is test-only, never browser code.
    if (!originalToHex) Object.defineProperty(Uint8Array.prototype, "toHex", { configurable: true, value(this: Uint8Array) { return Buffer.from(this).toString("hex"); } });
    if (!originalMapInsert) Object.defineProperty(Map.prototype, "getOrInsertComputed", { configurable: true, value(this: Map<unknown, unknown>, key: unknown, callback: (key: unknown) => unknown) { if (!this.has(key)) this.set(key, callback(key)); return this.get(key); } });
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    try { api = await import("pdfjs-dist/build/pdf.mjs"); } finally { warning.mockRestore(); }
  });
  afterAll(() => {
    if (originalToHex) Object.defineProperty(Uint8Array.prototype, "toHex", originalToHex);
    else Reflect.deleteProperty(Uint8Array.prototype, "toHex");
    if (originalMapInsert) Object.defineProperty(Map.prototype, "getOrInsertComputed", originalMapInsert);
    else Reflect.deleteProperty(Map.prototype, "getOrInsertComputed");
  });
  const factory = async (): Promise<PdfRuntime> => ({ api, failed: never(), dispose: () => {} });
  it("extracts actual PDF pages and validates exact canonical evidence", async () => {
    const result = await ingestPdf(input(syntheticPdf([SYNTHETIC_PAGE, SYNTHETIC_PAGE])), options(), factory);
    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("Expected real extracted source");
    expect(result.document.sections).toHaveLength(2);
    const block = result.document.sections[1].blocks[0];
    expect(block.text).toContain("SYNTHETIC-PHASE2-SENTINEL");
    expect(block.provenance?.kind === "pdf" && block.provenance.pageNumber).toBe(2);
    expect(resolveEvidence([result.document], { documentId: result.document.id, version: "provided", blockId: block.id, quote: block.text, start: 0, end: block.text.length }, [result.document.id]).ok).toBe(true);
  });
  it("rejects a genuinely password-required synthetic PDF", async () => {
    expect(await ingestPdf(input(syntheticPdf([SYNTHETIC_PAGE], { password: "synthetic-password" })), options(), factory)).toEqual({ status: "error", error: { code: "password-required" } });
  });
  it("does not claim to reject encryption that opens without a password", async () => {
    expect((await ingestPdf(input(syntheticPdf([SYNTHETIC_PAGE], { password: "" })), options(), factory)).status).toBe("ready");
  });
  it("rejects malformed PDF bytes safely", async () => {
    expect(await ingestPdf(new File(["%PDF-1.7\nnot a valid object tree"], "malformed.pdf"), options(), factory)).toEqual({ status: "error", error: { code: "invalid-pdf" } });
  });
  it.each([false, true])("rejects textless PDF (image=%s)", async imageOnly => {
    expect(await ingestPdf(input(syntheticPdf([""], { imageOnly })), options(), factory)).toEqual({ status: "error", error: { code: "no-extractable-text" } });
  });
  it("distinguishes overall sparsity from a single empty separator page", async () => {
    expect((await ingestPdf(input(syntheticPdf(["Only a short synthetic sentence exists."])), options(), factory)).status).toBe("needs-review");
    expect((await ingestPdf(input(syntheticPdf([SYNTHETIC_PAGE, "", SYNTHETIC_PAGE])), options(), factory)).status).toBe("ready");
    expect((await ingestPdf(input(syntheticPdf([SYNTHETIC_PAGE, "", ""])), options(), factory)).status).toBe("needs-review");
  });
  it("rejects too many pages and detected form fields", async () => {
    expect(await ingestPdf(input(syntheticPdf(Array(101).fill(""))), options(), factory)).toEqual({ status: "error", error: { code: "too-many-pages" } });
    expect(await ingestPdf(input(syntheticPdf([SYNTHETIC_PAGE], { field: true })), options(), factory)).toEqual({ status: "error", error: { code: "unsupported-pdf" } });
  });
  it("rejects extremely little text and excessive real extracted page text", async () => {
    expect(await ingestPdf(input(syntheticPdf(["123"])), options(), factory)).toEqual({ status: "error", error: { code: "insufficient-extracted-text" } });
    // Overlaid lines stay inside the page; extraction must still enforce its budget.
    const dense = Array(2_100).fill("This synthetic overlapping line contains fifty letters.").join("\n");
    expect(await ingestPdf(input(syntheticPdf([dense], { overlayLines: true })), options(), factory)).toEqual({ status: "error", error: { code: "too-much-text" } });
  });
  it("can cancel actual extraction before publishing a source document", async () => {
    const controller = new AbortController();
    expect(await ingestPdf(input(syntheticPdf(Array(50).fill(SYNTHETIC_PAGE))), { signal: controller.signal, onProgress: progress => { if (progress.stage === "extracting") controller.abort(); } }, factory)).toEqual({ status: "cancelled" });
  });
});
