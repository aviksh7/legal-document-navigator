import type { ComparisonItem, PreparedQuestion, SourceDocument, SourceReference, Statement, WorkspaceFixture } from "./types";

export function resolveEvidence(documents: SourceDocument[], ref: SourceReference, allowedDocumentIds: string[]) {
  const invalid = (reason: string) => ({ ok: false as const, reason });
  if (!allowedDocumentIds.includes(ref.documentId)) return invalid("document-membership");
  const candidates = documents.filter((doc) => doc.id === ref.documentId);
  if (candidates.length !== 1) return invalid("document-identity");
  const document = candidates[0];
  if (ref.version !== document.version) return invalid("version-mismatch");
  const blocks = document.sections.flatMap((section) => section.blocks.map((block) => ({ section, block })));
  const matches = blocks.filter(({ block }) => block.id === ref.blockId);
  if (matches.length !== 1) return invalid("block-identity");
  const { section, block } = matches[0];
  if (!Number.isInteger(ref.start) || !Number.isInteger(ref.end) || ref.start < 0 || ref.end <= ref.start || ref.end > block.text.length) return invalid("invalid-offsets");
  if (!ref.quote || block.text.slice(ref.start, ref.end) !== ref.quote) return invalid("quote-mismatch");
  return { ok: true as const, document, section, block, reference: ref };
}

/** Rejected presentation results deliberately do not carry the unsupported text. */
export function presentStatement(documents: SourceDocument[], statement: Statement, allowedDocumentIds: string[]) {
  if (statement.references.length === 0) return { ok: false as const };
  const sources = statement.references.map((ref) => resolveEvidence(documents, ref, allowedDocumentIds));
  if (sources.some((source) => !source.ok)) return { ok: false as const };
  return { ok: true as const, statement };
}

export function comparisonIsValid(fixture: WorkspaceFixture, item: ComparisonItem) {
  const { original, revised, kind } = item;
  if ((kind === "changed" || kind === "unchanged") && (!original.length || !revised.length)) return false;
  if (kind === "added" && (original.length || !revised.length)) return false;
  if (kind === "removed" && (!original.length || revised.length)) return false;
  return original.every((ref) => resolveEvidence(fixture.documents, ref, [fixture.originalId]).ok)
    && revised.every((ref) => resolveEvidence(fixture.documents, ref, [fixture.revisedId]).ok)
    && presentStatement(fixture.documents, item.explanation, [fixture.originalId, fixture.revisedId]).ok;
}

export function normalizeQuestion(input: string) {
  return input.trim().replace(/[?!.]+$/, "").trim().replace(/\s+/g, " ").toLowerCase();
}
export function matchQuestion(questions: PreparedQuestion[], input: string) {
  if (input.length > 500) return undefined;
  const normalized = normalizeQuestion(input);
  if (!normalized) return undefined;
  return questions.find((q) => [q.question, ...q.aliases].some((alias) => normalizeQuestion(alias) === normalized));
}

export function searchDocument(document: SourceDocument, input: string, limit = Number.POSITIVE_INFINITY) {
  const query = input.trim();
  if (!query || query.length > 200) return [];
  const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "giu");
  const results: { section: SourceDocument["sections"][number]; snippet: string; reference: SourceReference }[] = [];
  for (const section of document.sections) for (const block of section.blocks) for (const match of block.text.matchAll(pattern)) {
    if (results.length >= limit) return results;
    const start = match.index;
    const end = start + match[0].length;
    results.push({
      section,
      snippet: `${start > 55 ? "…" : ""}${block.text.slice(Math.max(0, start - 55), Math.min(block.text.length, end + 100))}${end + 100 < block.text.length ? "…" : ""}`,
      reference: { documentId: document.id, blockId: block.id, version: document.version, quote: match[0], start, end } satisfies SourceReference,
    });
  }
  return results;
}

/** Integrity gate for authored fixtures; this is not a future provider schema validator. */
export function fixtureProblems(fixture: WorkspaceFixture) {
  const problems: string[] = [];
  const unique = (values: string[]) => new Set(values).size === values.length;
  if (!unique(fixture.documents.map((d) => d.id))) problems.push("duplicate-document-id");
  const original = fixture.documents.find((d) => d.id === fixture.originalId);
  const revised = fixture.documents.find((d) => d.id === fixture.revisedId);
  if (!original || original.version !== "original" || !revised || revised.version !== "revised" || original.id === revised.id) problems.push("invalid-document-pair");
  for (const document of fixture.documents) {
    if (!unique(document.sections.map((s) => s.id)) || !unique(document.sections.flatMap((s) => s.blocks.map((b) => b.id)))) problems.push("duplicate-source-id");
  }
  const statements = [fixture.overview, ...fixture.terms.map((t) => t.statement), ...fixture.attention.map((a) => a.statement), ...fixture.questions.map((q) => q.answer)];
  const statementIds = [...statements, ...fixture.comparison.map((item) => item.explanation)].map((s) => s.id);
  if (!unique(statementIds)) problems.push("duplicate-statement-id");
  if (statements.some((s) => !presentStatement(fixture.documents, s, [fixture.originalId]).ok)) problems.push("invalid-statement");
  if (fixture.comparison.some((item) => !comparisonIsValid(fixture, item))) problems.push("invalid-comparison");
  const aliases = new Map<string, string>();
  for (const question of fixture.questions) {
    for (const alias of [question.question, ...question.aliases]) {
      const key = normalizeQuestion(alias);
      if (!key || (aliases.has(key) && aliases.get(key) !== question.id)) problems.push("question-alias-collision");
      aliases.set(key, question.id);
    }
  }
  for (const collection of [fixture.terms, fixture.attention, fixture.questions, fixture.comparison]) {
    if (!unique(collection.map((item) => item.id))) problems.push("duplicate-item-id");
  }
  if (fixture.attention.some((a) => !fixture.questions.some((q) => q.id === a.questionId))) problems.push("missing-question");
  return problems;
}
