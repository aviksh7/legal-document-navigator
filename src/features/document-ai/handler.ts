import type { DocumentAiAdapter } from "./adapter";
import { AI_LIMITS, AiFailure, requestSchemas, TASK_SETTINGS, type AiErrorCode, type AiTask } from "./contracts";
import { prepareInput } from "./prompts";
import { readBoundedJson } from "./transport";
import { validateDocument, validateResult } from "./validation";

const statuses: Record<AiErrorCode, number> = {
  "ai-unavailable": 503, "free-quota-exhausted": 503, "rate-limited": 429,
  "invalid-request": 400, "request-too-large": 413, "invalid-output": 502,
  "invalid-evidence": 502, "incomplete-output": 502, refused: 422, timeout: 504, cancelled: 408,
};
function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } });
}
function error(code: AiErrorCode) { return json({ ok: false, code }, statuses[code]); }

/** Pure boundary with an injected adapter. Routes only inject the mock in dev. */
export function createAiHandler(task: AiTask, options: { enabled: boolean; origin: string | null; adapter: DocumentAiAdapter; timeoutMs?: number }) {
  return async function handle(request: Request): Promise<Response> {
    // Kill switch runs before reading any document bytes.
    if (!options.enabled) return error("ai-unavailable");
    const url = new URL(request.url);
    if (request.method !== "POST" || !options.origin || request.headers.get("origin") !== options.origin ||
        url.origin !== options.origin || url.search ||
        !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get("content-type") ?? "") ||
        (request.headers.has("sec-fetch-site") && request.headers.get("sec-fetch-site") !== "same-origin")) return error("invalid-request");
    const controller = new AbortController();
    let timedOut = false;
    const onCancel = () => controller.abort();
    request.signal.addEventListener("abort", onCancel, { once: true });
    if (request.signal.aborted) onCancel();
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, options.timeoutMs ?? TASK_SETTINGS[task].timeoutMs);
    let removeAbort = () => {};
    try {
      const aborted = new Promise<never>((_, reject) => {
        const stop = () => reject(new AiFailure(timedOut ? "timeout" : "cancelled"));
        if (controller.signal.aborted) stop();
        else controller.signal.addEventListener("abort", stop, { once: true });
        removeAbort = () => controller.signal.removeEventListener("abort", stop);
      });
      // Race also bounds adapters which do not honor their cancellation signal.
      return await Promise.race([aborted, (async () => {
        const raw = await readBoundedJson(request, AI_LIMITS.bodyBytes, controller.signal);
        const parsed = requestSchemas[task].safeParse(raw);
        if (!parsed.success) throw new AiFailure("invalid-request");
        validateDocument(parsed.data.document);
        const input = prepareInput(task, parsed.data);
        if (controller.signal.aborted) throw new AiFailure("cancelled");
        const generated = await options.adapter.generate(input, controller.signal);
        if (controller.signal.aborted) throw new AiFailure("cancelled");
        if (generated.completion === "refused") throw new AiFailure("refused");
        if (generated.completion !== "complete") throw new AiFailure("incomplete-output");
        if (new TextEncoder().encode(JSON.stringify(generated.output)).length > AI_LIMITS.responseBytes) throw new AiFailure("invalid-output");
        const result = validateResult(task, generated.output, parsed.data.document);
        return json({ ok: true, schemaVersion: 1, task, mode: "mock", requestId: parsed.data.requestId, documentId: parsed.data.document.documentId,
          coverage: { kind: "all-supplied-blocks", blockCount: parsed.data.document.blocks.length }, result });
      })()]);
    } catch (failure) {
      return error(timedOut ? "timeout" : failure instanceof AiFailure ? failure.code : "ai-unavailable");
    } finally {
      clearTimeout(timer); removeAbort(); request.signal.removeEventListener("abort", onCancel);
    }
  };
}
