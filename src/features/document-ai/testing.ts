import { ingestPaste } from "../document-ingestion/processing";
import { AI_FIXTURES } from "./fixtures";
import { payloadDocument } from "./validation";
import type { AiRequest } from "./contracts";

export function syntheticSource(index = 0) {
  const result = ingestPaste(AI_FIXTURES[index].text);
  if (result.status !== "ready") throw new Error("Invalid synthetic fixture");
  return result.document;
}
export function syntheticRequest(index = 0): AiRequest {
  return { schemaVersion: 1, requestId: crypto.randomUUID(), nonSensitiveConfirmed: true, document: payloadDocument(syntheticSource(index)) };
}
