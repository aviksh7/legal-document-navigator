import { z } from "zod";
import { categories } from "../document-workspace/types";

export const AI_LIMITS = {
  bodyBytes: 128 * 1024, responseBytes: 128 * 1024,
  characters: 40_000, blocks: 500, blockCharacters: 4_000,
  inputTokens: 12_000, framingTokens: 1_024, questionCharacters: 500,
  cooldownMs: 10_000,
} as const;
export const TASK_SETTINGS = {
  understand: { timeoutMs: 45_000, maxOutputTokens: 2_048, reasoning: "minimal" },
  ask: { timeoutMs: 30_000, maxOutputTokens: 1_024, reasoning: "minimal" },
} as const;
export type AiTask = keyof typeof TASK_SETTINGS;

const identifier = z.uuid();
const blockId = z.string().regex(/^b-\d{6}$/);
const offset = z.number().int().min(0).max(500_000);
const provenance = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("paste"), start: offset, end: offset }),
  z.strictObject({ kind: z.literal("pdf"), pageNumber: z.number().int().min(1).max(100), start: offset, end: offset }),
]);
export const documentSchema = z.strictObject({
  documentId: identifier,
  sourceKind: z.enum(["paste", "pdf"]),
  pageCount: z.number().int().min(1).max(100).nullable(),
  blocks: z.array(z.strictObject({ blockId, provenance, text: z.string().min(1).max(AI_LIMITS.blockCharacters) })).min(1).max(AI_LIMITS.blocks),
});
const requestFields = {
  schemaVersion: z.literal(1), requestId: identifier,
  nonSensitiveConfirmed: z.literal(true), document: documentSchema,
};
export const requestSchemas = {
  understand: z.strictObject(requestFields),
  ask: z.strictObject({ ...requestFields, question: z.string().trim().min(1).max(AI_LIMITS.questionCharacters) }),
};
export type AiDocument = z.infer<typeof documentSchema>;
export type AiRequest = z.infer<typeof requestSchemas.understand> | z.infer<typeof requestSchemas.ask>;

export const evidenceSchema = z.strictObject({ documentId: identifier, blockId });
const evidence = z.array(evidenceSchema).min(1).max(8);
const qualification = z.strictObject({
  reason: z.enum(["ambiguous", "conflicting", "not-stated", "missing-material"]),
  detail: z.string().trim().min(1).max(300),
});
export const claimSchema = z.strictObject({
  text: z.string().trim().min(1).max(500),
  basis: z.enum(["document-wording", "explanation"]), evidence,
  qualification: qualification.nullable(),
});
export const questionSchema = z.strictObject({ text: z.string().trim().min(1).max(300), evidence });
export const understandSchema = z.strictObject({
  status: z.enum(["analyzed", "insufficient-source"]),
  overview: z.array(claimSchema).max(2),
  terms: z.array(z.strictObject({ category: z.enum(categories), label: z.string().trim().min(1).max(120), claim: claimSchema })).max(8),
  attention: z.array(z.strictObject({ title: z.string().trim().min(1).max(120), claim: claimSchema, question: questionSchema })).max(3),
  limitations: z.array(claimSchema).max(3),
  questions: z.array(questionSchema).max(3),
});
export const askSchema = z.strictObject({
  status: z.enum(["answered", "partially-answered", "not-answered", "out-of-scope"]),
  claims: z.array(claimSchema).max(4), limitations: z.array(claimSchema).max(3),
});
export const outputSchemas = { understand: understandSchema, ask: askSchema };
export type GroundedClaim = z.infer<typeof claimSchema>;
export type GroundedQuestion = z.infer<typeof questionSchema>;
export type UnderstandResult = z.infer<typeof understandSchema>;
export type AskResult = z.infer<typeof askSchema>;
export type AiResult = UnderstandResult | AskResult;
export type EvidenceId = z.infer<typeof evidenceSchema>;

export const errorCodes = ["ai-unavailable", "free-quota-exhausted", "rate-limited", "invalid-request", "request-too-large", "invalid-output", "invalid-evidence", "incomplete-output", "refused", "timeout", "cancelled"] as const;
export type AiErrorCode = typeof errorCodes[number];
export const errorSchema = z.strictObject({ ok: z.literal(false), code: z.enum(errorCodes) });
const responseFields = {
  ok: z.literal(true), schemaVersion: z.literal(1), requestId: identifier,
  documentId: identifier, mode: z.literal("mock"),
  coverage: z.strictObject({ kind: z.literal("all-supplied-blocks"), blockCount: z.number().int().min(1).max(AI_LIMITS.blocks) }),
};
export const successSchemas = {
  understand: z.strictObject({ ...responseFields, task: z.literal("understand"), result: understandSchema }),
  ask: z.strictObject({ ...responseFields, task: z.literal("ask"), result: askSchema }),
};
export type AiSuccess = z.infer<typeof successSchemas.understand> | z.infer<typeof successSchemas.ask>;

/** Error messages and exceptions never carry source text or schema diagnostics. */
export class AiFailure extends Error {
  constructor(public readonly code: AiErrorCode) { super(code); }
}
export const AI_MESSAGES: Record<AiErrorCode, string> = {
  "ai-unavailable": "AI is unavailable. Local reading, search, and the synthetic sample remain available.",
  "free-quota-exhausted": "AI is unavailable because the free quota is exhausted. Local reading and search remain available. No paid fallback will be used.",
  "rate-limited": "Please wait before trying again. No automatic retry was made.",
  "invalid-request": "This request could not be accepted. Reopen the document and try again.",
  "request-too-large": "This document exceeds the AI request budget. It remains locally readable. No shortened analysis was generated.",
  "invalid-output": "The response did not meet the required structure and has been withheld.",
  "invalid-evidence": "The response contained an invalid source reference and has been withheld.",
  "incomplete-output": "The response was incomplete and has been withheld.",
  refused: "The analysis request was declined. Local reading and search remain available.",
  timeout: "The request timed out. You can try again manually.",
  cancelled: "Request cancelled. No result was added.",
};
