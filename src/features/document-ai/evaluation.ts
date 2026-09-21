import type { DocumentAiAdapter } from "./adapter";
import type { AiResult, GroundedClaim } from "./contracts";
import { AiFailure } from "./contracts";
import { AI_FIXTURES } from "./fixtures";
import { prepareInput } from "./prompts";
import { syntheticRequest } from "./testing";
import { resultEvidence, validateResult } from "./validation";

function claims(result: AiResult): GroundedClaim[] {
  return "overview" in result ? [...result.overview, ...result.terms.map(t => t.claim), ...result.attention.map(a => a.claim), ...result.limitations] : [...result.claims, ...result.limitations];
}
/** Property checks are signals for human review, not proof of semantic accuracy. */
export function expectedProperties(index: number, result: AiResult): boolean {
  const fixture = AI_FIXTURES[index];
  const refs = resultEvidence(result).flat().map(e => e.blockId);
  const reasons = claims(result).flatMap(c => c.qualification ? [c.qualification.reason] : []);
  const terms = "terms" in result ? result.terms.map(t => t.category) : [];
  return fixture.expected.requiredBlocks.every(b => refs.includes(b)) &&
    fixture.expected.requiredReasons.every(r => reasons.includes(r)) &&
    fixture.expected.requiredTerms.every(t => terms.includes(t)) &&
    !claims(result).some(c => /agreement is (?:enforceable|illegal)|api secret|<think>|b-999999/i.test(c.text));
}

/** Test-only qualification rehearsal. Records no source, prompts or output text. */
export async function rehearseMockEvaluation(adapter: DocumentAiAdapter) {
  const records: { caseId: string; schemaAndEvidence: boolean; expectedProperties: boolean; elapsedMs: number; estimatedCreditUsd: number }[] = [];
  for (let index = 0; index < AI_FIXTURES.length; index++) {
    const request = syntheticRequest(index);
    const input = prepareInput("understand", request);
    try {
      const generated = await adapter.generate(input, new AbortController().signal);
      if (generated.completion !== "complete") throw new AiFailure("incomplete-output");
      const result = validateResult("understand", generated.output, request.document);
      const passed = expectedProperties(index, result);
      records.push({ caseId: AI_FIXTURES[index].id, schemaAndEvidence: true, expectedProperties: passed, elapsedMs: generated.elapsedMs, estimatedCreditUsd: 0 });
      if (!passed) break;
    } catch {
      records.push({ caseId: AI_FIXTURES[index].id, schemaAndEvidence: false, expectedProperties: false, elapsedMs: 0, estimatedCreditUsd: 0 });
      break;
    }
  }
  return { mode: "mock-only", qualifiedLiveModel: false, estimatedCreditUsd: 0, records } as const;
}
