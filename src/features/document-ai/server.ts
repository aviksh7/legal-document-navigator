import "server-only";
import { createAiHandler } from "./handler";
import { mockAdapter } from "./mock-adapter";
import type { AiTask } from "./contracts";

/** Production is always disabled. No credentials, provider URL or live adapter. */
export function mockAiEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.AI_ENABLED === "true" && process.env.AI_MODE === "mock" && !!configuredOrigin();
}
function configuredOrigin(): string | null {
  try {
    const value = process.env.APP_ORIGIN;
    if (!value) return null;
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && url.origin === value ? value : null;
  } catch { return null; }
}
export function handleAi(task: AiTask, request: Request) {
  return createAiHandler(task, { enabled: mockAiEnabled(), origin: configuredOrigin(), adapter: mockAdapter })(request);
}
