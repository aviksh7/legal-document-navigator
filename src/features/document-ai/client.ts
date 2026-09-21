import type { IngestedSourceDocument } from "../document-ingestion/types";
import { AI_LIMITS, AiFailure, errorSchema, requestSchemas, successSchemas, TASK_SETTINGS, type AiRequest, type AiSuccess, type AiTask } from "./contracts";
import { prepareInput } from "./prompts";
import { readBoundedJson } from "./transport";
import { payloadDocument, resultEvidence, sourceReferences, validateResult } from "./validation";

export function prepareRequest(task: AiTask, source: IngestedSourceDocument, confirmed: boolean, question?: string): AiRequest {
  if (!confirmed) throw new AiFailure("invalid-request");
  const parsed = requestSchemas[task].safeParse({ schemaVersion: 1, requestId: crypto.randomUUID(), nonSensitiveConfirmed: true,
    document: payloadDocument(source), ...(task === "ask" ? { question } : {}) });
  if (!parsed.success) throw new AiFailure("invalid-request");
  if (new TextEncoder().encode(JSON.stringify(parsed.data)).length > AI_LIMITS.bodyBytes) throw new AiFailure("request-too-large");
  prepareInput(task, parsed.data);
  return parsed.data;
}

/** One in-flight request and cooldown across document replacements in this tab. */
export class AiClient {
  private active = false;
  private nextAt = 0;
  // Native browser fetch must not receive this AiClient instance as its receiver.
  constructor(private readonly send: typeof fetch = (...args) => fetch(...args), private readonly now = () => Date.now()) {}
  cooldownRemaining() { return Math.max(0, this.nextAt - this.now()); }
  async run(task: AiTask, source: IngestedSourceDocument, options: { enabled: boolean; confirmed: boolean; signal: AbortSignal; question?: string }): Promise<AiSuccess> {
    if (!options.enabled) throw new AiFailure("ai-unavailable");
    if (options.signal.aborted) throw new AiFailure("cancelled");
    if (this.active || this.cooldownRemaining()) throw new AiFailure("rate-limited");
    const request = prepareRequest(task, source, options.confirmed, options.question);
    this.active = true;
    this.nextAt = this.now() + AI_LIMITS.cooldownMs;
    const controller = new AbortController();
    let timedOut = false;
    const cancel = () => controller.abort();
    options.signal.addEventListener("abort", cancel, { once: true });
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, TASK_SETTINGS[task].timeoutMs);
    try {
      const response = await this.send(`/api/ai/${task}`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request), signal: controller.signal, cache: "no-store", credentials: "omit", redirect: "error", referrerPolicy: "no-referrer" });
      let raw: unknown;
      try { raw = await readBoundedJson(response, AI_LIMITS.responseBytes, controller.signal); }
      catch {
        if (controller.signal.aborted) throw new AiFailure("cancelled");
        throw new AiFailure("invalid-output");
      }
      if (controller.signal.aborted) throw new AiFailure("cancelled");
      const failure = errorSchema.safeParse(raw);
      if (failure.success) throw new AiFailure(failure.data.code);
      const parsed = successSchemas[task].safeParse(raw);
      if (!response.ok || !parsed.success) throw new AiFailure("invalid-output");
      const value = parsed.data;
      if (value.documentId !== source.id || value.requestId !== request.requestId || value.coverage.blockCount !== request.document.blocks.length) throw new AiFailure("invalid-evidence");
      const result = validateResult(task, value.result, request.document);
      for (const evidence of resultEvidence(result)) sourceReferences(evidence, source);
      return value;
    } catch (error) {
      if (timedOut) throw new AiFailure("timeout");
      if (options.signal.aborted) throw new AiFailure("cancelled");
      throw error instanceof AiFailure ? error : new AiFailure("ai-unavailable");
    } finally {
      clearTimeout(timer); options.signal.removeEventListener("abort", cancel); this.active = false;
    }
  }
}
export const documentAiClient = new AiClient();
