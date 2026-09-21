import type { IngestedSourceDocument } from "../document-ingestion/types";
import { resolveEvidence } from "../document-workspace/model";
import type { SourceReference, Statement } from "../document-workspace/types";
import { AI_LIMITS, AiFailure, documentSchema, outputSchemas, type AiDocument, type AiResult, type AiTask, type EvidenceId, type GroundedClaim } from "./contracts";

/** Contiguous provenance per source unit; repeated clauses keep distinct IDs. */
export function validateDocument(document: AiDocument): void {
  if ((document.sourceKind === "paste") !== (document.pageCount === null)) throw new AiFailure("invalid-request");
  let page = 0, end = 0, characters = 0;
  document.blocks.forEach((block, index) => {
    const p = block.provenance;
    const currentPage = p.kind === "pdf" ? p.pageNumber : 1;
    if (p.kind !== document.sourceKind || block.blockId !== `b-${String(index + 1).padStart(6, "0")}` ||
        currentPage < page || currentPage > (document.pageCount ?? 1) ||
        p.start !== (currentPage === page ? end : 0) || p.end - p.start !== block.text.length ||
        !block.text.isWellFormed()) throw new AiFailure("invalid-request");
    page = currentPage; end = p.end; characters += block.text.length;
  });
  if (characters > AI_LIMITS.characters) throw new AiFailure("request-too-large");
}

export function payloadDocument(source: IngestedSourceDocument): AiDocument {
  const blocks = source.sections.flatMap(section => section.blocks);
  if (blocks.length > AI_LIMITS.blocks || blocks.reduce((n, block) => n + block.text.length, 0) > AI_LIMITS.characters) throw new AiFailure("request-too-large");
  const parsed = documentSchema.safeParse({
    documentId: source.id, sourceKind: source.ingestion.kind,
    pageCount: source.ingestion.kind === "pdf" ? source.sections.length : null,
    blocks: blocks.map(block => ({ blockId: block.id, provenance: block.provenance, text: block.text })),
  });
  if (!parsed.success || source.version !== "provided") throw new AiFailure("invalid-request");
  validateDocument(parsed.data);
  return parsed.data;
}

export function resultEvidence(result: AiResult): EvidenceId[][] {
  if ("overview" in result) return [
    ...result.overview.map(c => c.evidence), ...result.terms.map(t => t.claim.evidence),
    ...result.attention.flatMap(a => [a.claim.evidence, a.question.evidence]),
    ...result.limitations.map(c => c.evidence), ...result.questions.map(q => q.evidence),
  ];
  return [...result.claims, ...result.limitations].map(c => c.evidence);
}

/** Validate the whole result. Valid IDs establish provenance, not entailment. */
export function validateResult(task: AiTask, output: unknown, document: AiDocument): AiResult {
  const parsed = outputSchemas[task].safeParse(output);
  if (!parsed.success) throw new AiFailure("invalid-output");
  const result = parsed.data;
  if ("overview" in result) {
    if (result.status === "analyzed" && !result.overview.length) throw new AiFailure("incomplete-output");
    if (result.status === "insufficient-source" && [result.overview, result.terms, result.attention, result.limitations, result.questions].some(a => a.length)) throw new AiFailure("invalid-output");
  } else {
    if (["answered", "partially-answered"].includes(result.status) && !result.claims.length) throw new AiFailure("incomplete-output");
    if (["not-answered", "out-of-scope"].includes(result.status) && result.claims.length) throw new AiFailure("invalid-output");
    if (result.status === "partially-answered" && !result.limitations.length && !result.claims.some(c => c.qualification)) throw new AiFailure("invalid-output");
  }
  const ids = new Set(document.blocks.map(b => b.blockId));
  if (ids.size !== document.blocks.length) throw new AiFailure("invalid-evidence");
  for (const refs of resultEvidence(result)) {
    const seen = new Set<string>();
    for (const ref of refs) {
      if (ref.documentId !== document.documentId || !ids.has(ref.blockId) || seen.has(ref.blockId)) throw new AiFailure("invalid-evidence");
      seen.add(ref.blockId);
    }
  }
  return result;
}

export function sourceReferences(evidence: EvidenceId[], source: IngestedSourceDocument): SourceReference[] {
  return evidence.map(ref => {
    const matches = source.sections.flatMap(s => s.blocks).filter(b => b.id === ref.blockId);
    if (ref.documentId !== source.id || matches.length !== 1) throw new AiFailure("invalid-evidence");
    const block = matches[0];
    const reference: SourceReference = { documentId: source.id, blockId: block.id, version: source.version, quote: block.text, start: 0, end: block.text.length };
    if (!resolveEvidence([source], reference, [source.id]).ok) throw new AiFailure("invalid-evidence");
    return reference;
  });
}

export function presentClaim(claim: GroundedClaim, source: IngestedSourceDocument, id: string): Statement {
  const references = sourceReferences(claim.evidence, source);
  if (!references.length) throw new AiFailure("invalid-evidence");
  return { id, text: claim.text, basis: claim.basis, kind: "supported", references: references as [SourceReference, ...SourceReference[]], ...(claim.qualification ? { qualification: claim.qualification } : {}) };
}
