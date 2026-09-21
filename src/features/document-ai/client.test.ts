import { describe, expect, it, vi } from "vitest";
import { AiClient, prepareRequest } from "./client";
import { AI_LIMITS } from "./contracts";
import { createAiHandler } from "./handler";
import { mockAdapter } from "./mock-adapter";
import { syntheticSource } from "./testing";

const origin = "http://localhost:3000";
function mockFetch(mutate?: (value: Record<string, unknown>) => void) {
  return vi.fn<typeof fetch>(async (url, options) => {
    const incoming = new Request(`${origin}${url}`, { ...options, headers: { ...options?.headers, origin } });
    const task = String(url).endsWith("ask") ? "ask" : "understand";
    const response = await createAiHandler(task, { enabled: true, origin, adapter: mockAdapter })(incoming);
    if (!mutate) return response;
    const json = await response.json(); mutate(json);
    return Response.json(json);
  });
}
const options = () => ({ enabled: true, confirmed: true, signal: new AbortController().signal });
describe("document AI client boundary", () => {
  it("does not bind native fetch to the client instance", async () => {
    const transport = mockFetch();
    vi.stubGlobal("fetch", function(this: unknown, ...args: Parameters<typeof fetch>) {
      expect(this).not.toBeInstanceOf(AiClient);
      return transport(...args);
    });
    try { expect((await new AiClient().run("understand", syntheticSource(), options())).ok).toBe(true); }
    finally { vi.unstubAllGlobals(); }
  });
  it.each(["disabled", "no-consent", "too-large", "cancelled"])("does not send document content when %s", async condition => {
    const send = mockFetch(); const client = new AiClient(send); const opts = options(); const source = syntheticSource();
    if (condition === "disabled") opts.enabled = false;
    if (condition === "no-consent") opts.confirmed = false;
    if (condition === "too-large") source.sections[0].blocks[0].text = "a".repeat(AI_LIMITS.characters + 1);
    if (condition === "cancelled") { const abort = new AbortController(); abort.abort(); opts.signal = abort.signal; }
    await expect(client.run("understand", source, opts)).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
  it("round-trips a validated mock, explicitly sending no credentials or redirects", async () => {
    const send = mockFetch(); const source = syntheticSource();
    const value = await new AiClient(send).run("understand", source, options());
    expect(value.documentId).toBe(source.id); expect(value.mode).toBe("mock");
    expect(send.mock.calls[0][1]).toMatchObject({ method: "POST", cache: "no-store", credentials: "omit", redirect: "error", referrerPolicy: "no-referrer" });
    const serialized = JSON.parse(String(send.mock.calls[0][1]?.body));
    expect(serialized.document.title).toBeUndefined(); expect(serialized.question).toBeUndefined();
  });
  it("rejects another response's request/document identity and false coverage", async () => {
    for (const key of ["requestId", "documentId", "coverage"]) {
      const send = mockFetch(value => { value[key] = key === "coverage" ? { kind: "all-supplied-blocks", blockCount: 1 } : crypto.randomUUID(); });
      await expect(new AiClient(send).run("understand", syntheticSource(), options())).rejects.toThrow("invalid-evidence");
    }
  });
  it("revalidates evidence in transit rather than trusting the server label", async () => {
    const send = mockFetch(value => {
      const result = value.result as { overview: { evidence: { blockId: string }[] }[] };
      result.overview[0].evidence[0].blockId = "b-999999";
    });
    await expect(new AiClient(send).run("understand", syntheticSource(), options())).rejects.toThrow("invalid-evidence");
  });
  it("shares one in-flight guard and cooldown across different documents", async () => {
    let finish!: () => void; const wait = new Promise<void>(resolve => { finish = resolve; });
    const underlying = mockFetch(); const send = vi.fn<typeof fetch>(async (url, options) => { await wait; return underlying(url, options); });
    let now = 0; const client = new AiClient(send, () => now);
    const first = client.run("understand", syntheticSource(), options());
    now = AI_LIMITS.cooldownMs + 1;
    await expect(client.run("understand", syntheticSource(1), options())).rejects.toThrow("rate-limited");
    finish(); await first;
    await client.run("understand", syntheticSource(1), options());
    await expect(client.run("ask", syntheticSource(), { ...options(), question: "How much is the fee?" })).rejects.toThrow("rate-limited");
    expect(send).toHaveBeenCalledTimes(2);
  });
  it("discards a late response after cancellation even if transport ignores abort", async () => {
    let finish!: () => void; const wait = new Promise<void>(resolve => { finish = resolve; });
    const send = vi.fn<typeof fetch>(async (url, options) => { const response = await mockFetch()(url, { ...options, signal: undefined }); await wait; return response; });
    const control = new AbortController(); const client = new AiClient(send);
    const result = client.run("understand", syntheticSource(), { ...options(), signal: control.signal });
    control.abort(); finish();
    await expect(result).rejects.toThrow("cancelled");
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("preserves quota failure and makes no automatic retry", async () => {
    const send = vi.fn<typeof fetch>(async () => Response.json({ ok: false, code: "free-quota-exhausted" }, { status: 503 }));
    await expect(new AiClient(send).run("understand", syntheticSource(), options())).rejects.toThrow("free-quota-exhausted");
    expect(send).toHaveBeenCalledTimes(1);
  });
  it.each(["{malformed", "x".repeat(AI_LIMITS.responseBytes + 1)])("withholds malformed or oversized response bodies (%#)", async body => {
    const send = vi.fn<typeof fetch>(async () => new Response(body));
    await expect(new AiClient(send).run("understand", syntheticSource(), options())).rejects.toThrow("invalid-output");
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("sends stateless questions without previous answers or memory", () => {
    const source = syntheticSource(); const payload = prepareRequest("ask", source, true, "How much is the fee?");
    expect(Object.keys(payload).sort()).toEqual(["document", "nonSensitiveConfirmed", "question", "requestId", "schemaVersion"]);
  });
});
