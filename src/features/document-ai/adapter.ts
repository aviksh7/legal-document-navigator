import type { PreparedAiInput } from "./prompts";

/** One task, one completion, no tools, streaming, repair or fallback. */
export interface DocumentAiAdapter {
  generate(input: PreparedAiInput, signal: AbortSignal): Promise<{
    output: unknown;
    completion: "complete" | "incomplete" | "refused";
    usage: { inputTokens: number; outputTokens: number } | null;
    elapsedMs: number;
  }>;
}
