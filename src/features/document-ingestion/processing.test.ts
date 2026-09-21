import { describe, expect, it } from "vitest";
import { resolveEvidence } from "../document-workspace/model";
import { buildDocument, ingestPaste, ingestionProblems, normalizePaste, partitionText, usableCharacters, validateFileHeader, validateFileSize } from "./processing";
import { LIMITS, type IngestedSourceDocument, type IngestionResult } from "./types";

function documentOf(result: IngestionResult) {
  expect(["ready", "needs-review"]).toContain(result.status);
  if (result.status !== "ready" && result.status !== "needs-review") throw new Error("Expected source document");
  return result.document;
}
const clause = "The employee must give thirty days of written notice.";
const body = `${clause} ${clause} ${clause}`;

describe("paste canonical text and source contracts", () => {
  it("normalizes only line endings, preserving exact remaining characters", () => {
    const input = `  1. Notice\r\n\r\n${clause}\t  ﬁ e\u0301\u00a0 \rnon-\rcompete.  `;
    const canonical = input.replace(/\r\n?/g, "\n");
    expect(normalizePaste(input)).toBe(canonical);
    const doc = documentOf(ingestPaste(input));
    expect(doc.sections.flatMap(s => s.blocks).map(b => b.text).join("")).toBe(canonical);
    expect(doc.version).toBe("provided");
    expect(doc.versionLabel).toBe("Provided document");
    expect(doc.parties).toBeNull();
    expect(doc.sections[0].blocks.every(b => b.provenance?.kind === "paste" && !("pageNumber" in b.provenance))).toBe(true);
    expect(ingestionProblems(doc)).toEqual([]);
  });
  it("gives each ingestion a fresh UUID and deterministic ordered block IDs", () => {
    const input = `${clause}\n\n${clause}`;
    const a = documentOf(ingestPaste(input));
    const b = documentOf(ingestPaste(input));
    expect(a.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(a.id).not.toBe(b.id);
    expect(a.sections[0].blocks.map(b => b.id)).toEqual(["b-000001", "b-000002"]);
    expect(a.sections).toEqual(b.sections);
  });
  it("keeps exact UTF-16 evidence offsets and rejects wrong documents/roles", () => {
    const doc = documentOf(ingestPaste(`🙂 ${clause}`));
    const block = doc.sections[0].blocks[0];
    const ref = { documentId: doc.id, blockId: block.id, version: doc.version, start: 3, end: 15, quote: block.text.slice(3, 15) };
    expect(resolveEvidence([doc], ref, [doc.id]).ok).toBe(true);
    expect(resolveEvidence([doc], { ...ref, version: "original" }, [doc.id]).ok).toBe(false);
    expect(resolveEvidence([doc], { ...ref, documentId: "other" }, [doc.id]).ok).toBe(false);
  });
  it.each([["", "empty-paste"], [" \t\r\n", "empty-paste"], ["A short clause", "paste-too-short"], ["!".repeat(100), "paste-too-short"], ["a".repeat(200_001), "paste-too-long"]])("rejects invalid paste without truncating (%#)", (input, code) => {
    expect(ingestPaste(input)).toEqual({ status: "error", error: { code } });
  });
  it("accepts exact paste and minimum limits", () => {
    expect(ingestPaste("a".repeat(LIMITS.pasteCharacters)).status).toBe("ready");
    expect(ingestPaste("a".repeat(20)).status).toBe("ready");
    expect(usableCharacters("ﬁ🙂 e\u0301 123")).toBe(5);
  });
});

describe("lossless partitioning of canonical text", () => {
  it.each([body, `\n\n${body}\n\n   `, `${clause}\n\n${clause}`, `1. Heading\n(a) ${clause}\n(b) ${clause}`, "x".repeat(12_005), `${"x".repeat(3_999)}🙂${body}`, `${body.repeat(30)}\n\n${clause}`])("conserves text and contiguous offsets (%#)", (input) => {
    const blocks = partitionText(input);
    expect(blocks.map(b => b.text).join("")).toBe(input);
    let offset = 0;
    for (const block of blocks) {
      expect(block.start).toBe(offset);
      expect(input.slice(block.start, block.end)).toBe(block.text);
      expect(block.text.length).toBeLessThanOrEqual(LIMITS.blockCharacters);
      expect(block.text.isWellFormed()).toBe(true);
      offset = block.end;
    }
  });
  it("rejects excessive paragraph counts rather than losing content", () => {
    expect(ingestPaste("word\n\n".repeat(5_001))).toEqual({ status: "error", error: { code: "resource-limit" } });
  });
});

describe("PDF source provenance and quality heuristics", () => {
  const pdf = (texts: string[]) => buildDocument(texts.map((text, i) => ({ text, pageNumber: i + 1 })), "pdf", "Provided PDF", "6.3.289");
  it("keeps canonical API text verbatim, including CR, spacing and hyphenation", () => {
    const text = `  ${body}\t\rnon-\ncompete.   `;
    const doc = documentOf(pdf([text, text]));
    expect(doc.sections[0].blocks.map(b => b.text).join("")).toBe(text);
    expect(doc.sections[1].blocks[0].provenance).toEqual({ kind: "pdf", pageNumber: 2, start: 0, end: text.length });
    expect(doc.sections[0].blocks[0].id).not.toBe(doc.sections[1].blocks[0].id);
  });
  it("retains API whitespace on an otherwise textless page without inventing wording", () => {
    const whitespace = " \t\n\n ";
    const doc = documentOf(pdf([body.repeat(5), whitespace, ""]));
    expect(doc.sections[1].blocks.map(block => block.text).join("")).toBe(whitespace);
    expect(doc.sections[2].blocks).toEqual([]);
    expect(ingestionProblems(doc)).toEqual([]);
  });
  it("does not require review for one short signature or empty page", () => {
    const result = pdf([body.repeat(5), "Signed", ""]);
    // Two sparse pages are a substantial proportion, unlike a single separator.
    expect(result.status).toBe("needs-review");
    expect(pdf([body.repeat(5), "Signed"]).status).toBe("ready");
    const singleEmpty = pdf([body.repeat(5), ""]);
    expect(singleEmpty.status).toBe("ready");
    expect(documentOf(singleEmpty).sections[1].blocks).toEqual([]);
  });
  it("requires review for low overall coverage, multiple sparse pages and unusual characters", () => {
    expect(pdf([clause]).status).toBe("needs-review");
    expect(pdf([body.repeat(10), "", ""]).status).toBe("needs-review");
    expect(pdf([`${body}\uFFFD`]).status).toBe("needs-review");
    expect(pdf([`${body}\0`]).status).toBe("needs-review");
  });
  it.each([["", "no-extractable-text"], [" \t\n", "no-extractable-text"], ["123", "insufficient-extracted-text"]])("reports insufficient overall text (%#)", (text, code) => {
    expect(pdf([text])).toEqual({ status: "error", error: { code } });
  });
  it("rejects page and character limits", () => {
    expect(pdf(Array(101).fill(body))).toEqual({ status: "error", error: { code: "too-many-pages" } });
    expect(pdf(["a".repeat(100_001)])).toEqual({ status: "error", error: { code: "too-much-text" } });
    expect(pdf(Array(6).fill("a".repeat(100_000)))).toEqual({ status: "error", error: { code: "too-much-text" } });
    expect(pdf(Array(5).fill("a".repeat(100_000))).status).toBe("ready");
  });
  it.each([[], [{ text: body, pageNumber: 2 }], [{ text: 123, pageNumber: 1 }], [{ text: body, pageNumber: 1 }, { text: body, pageNumber: 1 }]].map(units => ({ units })))("rejects malformed source units (%#)", ({ units }) => {
    expect(buildDocument(units as never, "pdf", "PDF", "6.3.289")).toEqual({ status: "error", error: { code: "invalid-extraction" } });
  });
  it("detects invalid block identities, order and provenance", () => {
    const baseline = documentOf(pdf([body, body]));
    for (const mutate of [
      (d: IngestedSourceDocument) => { d.sections[1].blocks[0].id = d.sections[0].blocks[0].id; },
      (d: IngestedSourceDocument) => { d.sections[0].blocks[0].provenance!.end++; },
      (d: IngestedSourceDocument) => { d.sections.reverse(); },
      (d: IngestedSourceDocument) => { d.sections[0].blocks = []; },
      (d: IngestedSourceDocument) => { if (d.ingestion.kind === "pdf") d.ingestion.pages[0].usableCharacters++; },
    ]) {
      const doc = structuredClone(baseline); mutate(doc);
      expect(ingestionProblems(doc).length).toBeGreaterThan(0);
    }
  });
});

describe("file validation independent of filename/MIME", () => {
  it.each([[0, "empty-file"], [LIMITS.fileBytes + 1, "file-too-large"]])("rejects invalid file size (%#)", (size, code) => expect(validateFileSize(size as number)).toBe(code));
  it("accepts boundary sizes and PDF signatures despite arbitrary filenames", () => {
    expect(validateFileSize(LIMITS.fileBytes)).toBeNull();
    expect(validateFileHeader(new TextEncoder().encode("%PDF-1.7\n"))).toBe(true);
    expect(validateFileHeader(new TextEncoder().encode("not a PDF"))).toBe(false);
    expect(validateFileHeader(new TextEncoder().encode(`${" ".repeat(1_024)}%PDF-1.7`))).toBe(false);
  });
});
