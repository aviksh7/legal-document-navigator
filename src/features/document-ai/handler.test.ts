import { describe, expect, it, vi } from "vitest";
import type { DocumentAiAdapter } from "./adapter";
import { AI_LIMITS, AiFailure, type AiErrorCode } from "./contracts";
import { createAiHandler } from "./handler";
import { mockAdapter } from "./mock-adapter";
import { syntheticRequest } from "./testing";

const origin = "http://localhost:3000";
function request(body: unknown = syntheticRequest(), headers: Record<string, string> = {}) {
  return new Request(`${origin}/api/ai/understand`, { method: "POST", headers: { origin, "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
}
function setup(adapter: DocumentAiAdapter = mockAdapter, enabled = true, timeoutMs = 1000) {
  const generate = vi.fn(adapter.generate);
  return { generate, handle: createAiHandler("understand", { enabled, origin, adapter: { generate }, timeoutMs }) };
}
describe("same-origin mock server boundary", () => {
  it("fails closed before reading a disabled request or invoking an adapter", async () => {
    const { handle, generate } = setup(mockAdapter, false);
    const incoming = request();
    const response = await handle(incoming);
    expect(await response.json()).toEqual({ ok: false, code: "ai-unavailable" });
    expect(incoming.bodyUsed).toBe(false);
    expect(generate).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it.each<Record<string, string>>([{ origin: "https://attacker.invalid" }, { "content-type": "text/plain" }, { "sec-fetch-site": "cross-site" }])("rejects origin/content-type/fetch-metadata violations (%#)", async headers => {
    const { handle, generate } = setup();
    expect((await handle(request(undefined, headers))).status).toBe(400);
    expect(generate).not.toHaveBeenCalled();
  });
  it("rejects query parameters and missing Origin, never accepting content in URLs", async () => {
    const { handle } = setup();
    const incoming = request(); incoming.headers.delete("origin");
    expect((await handle(incoming)).status).toBe(400);
    const query = new Request(`${origin}/api/ai/understand?document=untrusted`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: "{}" });
    expect((await handle(query)).status).toBe(400);
  });
  it("accepts the exact synthetic fixture and returns only a validated safe envelope", async () => {
    const payload = syntheticRequest();
    const { handle, generate } = setup();
    const response = await handle(request(payload));
    const result = await response.json();
    expect(response.status).toBe(200); expect(generate).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ ok: true, mode: "mock", requestId: payload.requestId, documentId: payload.document.documentId, coverage: { kind: "all-supplied-blocks", blockCount: 2 } });
    expect(result.result.status).toBe("analyzed");
  });
  it("does not apply sample analysis to arbitrary documents", async () => {
    const payload = syntheticRequest();
    payload.document.blocks[0].text = payload.document.blocks[0].text.replace("thirty", "ninety");
    const result = await (await setup().handle(request(payload))).json();
    expect(result.result).toEqual({ status: "insufficient-source", overview: [], terms: [], attention: [], limitations: [], questions: [] });
  });
  it("requires exact block boundaries, not just the concatenated fixture text", async () => {
    const payload = syntheticRequest();
    const [first, second] = payload.document.blocks;
    second.text = first.text.slice(-10) + second.text;
    first.text = first.text.slice(0, -10);
    first.provenance.end -= 10; second.provenance.start -= 10;
    const result = await (await setup().handle(request(payload))).json();
    expect(result.result.status).toBe("insufficient-source");
  });
  it("rejects malformed JSON without leaking raw parse errors", async () => {
    const incoming = new Request(`${origin}/api/ai/understand`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: '{"sensitive":' });
    expect(await (await setup().handle(incoming)).json()).toEqual({ ok: false, code: "invalid-request" });
  });
  it.each([true, false])("enforces actual body bytes, with oversized Content-Length: %s", async declared => {
    const body = "x".repeat(AI_LIMITS.bodyBytes + 1);
    const incoming = new Request(`${origin}/api/ai/understand`, { method: "POST", headers: { origin, "content-type": "application/json", ...(declared ? { "content-length": String(body.length) } : { "content-length": "1" }) }, body });
    const { handle, generate } = setup();
    expect(await (await handle(incoming)).json()).toEqual({ ok: false, code: "request-too-large" });
    expect(generate).not.toHaveBeenCalled();
  });
  it("bounds a stalled request stream", async () => {
    let cancelled = false;
    const stream = new ReadableStream({ cancel() { cancelled = true; } });
    const incoming = new Request(`${origin}/api/ai/understand`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: stream, duplex: "half" } as RequestInit);
    expect(await (await setup(mockAdapter, true, 10).handle(incoming)).json()).toEqual({ ok: false, code: "timeout" });
    expect(cancelled).toBe(true);
  });
  it("bounds an adapter that ignores abort, without a retry", async () => {
    const { handle, generate } = setup({ generate: () => new Promise(() => {}) }, true, 10);
    expect(await (await handle(request())).json()).toEqual({ ok: false, code: "timeout" });
    expect(generate).toHaveBeenCalledTimes(1);
  });
  it("aborts user cancellation before calling the adapter", async () => {
    const control = new AbortController(); control.abort();
    const incoming = new Request(request(), { signal: control.signal });
    const { handle, generate } = setup();
    expect(await (await handle(incoming)).json()).toEqual({ ok: false, code: "cancelled" });
    expect(generate).not.toHaveBeenCalled();
  });
  it.each(["free-quota-exhausted", "rate-limited", "ai-unavailable"] satisfies AiErrorCode[])("returns fixed %s without retry or fallback", async code => {
    const { handle, generate } = setup({ async generate() { throw new AiFailure(code); } });
    expect(await (await handle(request())).json()).toEqual({ ok: false, code });
    expect(generate).toHaveBeenCalledTimes(1);
  });
  it.each(["incomplete", "refused"] as const)("withholds %s completions", async completion => {
    const { handle } = setup({ async generate() { return { output: { unsafe: "text" }, completion, usage: null, elapsedMs: 0 }; } });
    expect(await (await handle(request())).json()).toEqual({ ok: false, code: completion === "refused" ? "refused" : "incomplete-output" });
  });
  it("redacts unexpected adapter exceptions and does not log them", async () => {
    const logging = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const { handle } = setup({ async generate() { throw new Error("SECRET raw prompt and document"); } });
      expect(await (await handle(request())).json()).toEqual({ ok: false, code: "ai-unavailable" });
      expect(logging).not.toHaveBeenCalled();
    } finally { logging.mockRestore(); }
  });
  it("rejects unknown evidence and overlarge outputs before returning any claims", async () => {
    for (const tooLarge of [true, false]) {
      const { handle, generate } = setup({ async generate(input, signal) {
        const generated = await mockAdapter.generate(input, signal);
        const output = generated.output as { overview: { text: string; evidence: { blockId: string }[] }[] };
        if (tooLarge) output.overview[0].text = "x".repeat(AI_LIMITS.responseBytes);
        else output.overview[0].evidence[0].blockId = "b-999999";
        return generated;
      } });
      expect(await (await handle(request())).json()).toEqual({ ok: false, code: tooLarge ? "invalid-output" : "invalid-evidence" });
      expect(generate).toHaveBeenCalledTimes(1);
    }
  });
});
