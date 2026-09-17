import { describe, expect, it } from "vitest";
import { workspaceFixture as fixture } from "./fixtures";
import { comparisonIsValid, fixtureProblems, matchQuestion, normalizeQuestion, presentStatement, resolveEvidence, searchDocument } from "./model";
import type { SourceReference, Statement } from "./types";

const documents = fixture.documents;
const original = documents[0];
const reference = fixture.overview.references[0];

describe("canonical evidence identity and validation", () => {
  it("resolves a valid document/block identity and exact source span", () => {
    const result = resolveEvidence(documents, reference, [fixture.originalId]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.document.id).toBe(reference.documentId);
      expect(result.block.id).toBe(reference.blockId);
      expect(result.block.text.slice(reference.start, reference.end)).toBe(reference.quote);
    }
  });
  it.each([
    ["missing document", { documentId: "missing" }],
    ["missing block", { blockId: "missing" }],
    ["wrong block", { blockId: "pay-body" }],
    ["wrong version", { version: "revised" }],
    ["wrong quote", { quote: "Unsupported evidence" }],
    ["negative start", { start: -1 }],
    ["fractional start", { start: 0.5 }],
    ["out-of-range end", { end: 99999 }],
    ["reversed offsets", { start: 10, end: 5 }],
    ["empty span", { end: 0 }],
    ["non-finite offset", { end: Number.NaN }],
  ])("rejects %s without changing the reference", (_, patch) => {
    const ref = { ...reference, ...patch } as SourceReference;
    const before = structuredClone(ref);
    expect(resolveEvidence(documents, ref, [fixture.originalId]).ok).toBe(false);
    expect(ref).toEqual(before);
  });
  it("rejects a valid reference from the wrong document context", () => {
    expect(resolveEvidence(documents, reference, [fixture.revisedId]).ok).toBe(false);
  });
  it("rejects a missing document even when its ID is allowed by the context", () => {
    expect(resolveEvidence(documents, { ...reference, documentId: "absent" }, ["absent"]))
      .toEqual({ ok: false, reason: "document-identity" });
  });
  it("does not find a matching quote elsewhere to repair a wrong block ID", () => {
    const wrongBlock = { ...reference, blockId: "pay-body", quote: reference.quote.slice(0, 10), end: 10 };
    expect(resolveEvidence(documents, wrongBlock, [original.id]))
      .toEqual({ ok: false, reason: "quote-mismatch" });
  });
  it("rejects duplicate identity instead of choosing a convenient match", () => {
    expect(resolveEvidence([...documents, original], reference, [original.id]).ok).toBe(false);
    const duplicate = structuredClone(original);
    duplicate.sections[0].blocks.push(duplicate.sections[1].blocks[0]);
    expect(resolveEvidence([duplicate], reference, [original.id]).ok).toBe(false);
  });
  it("does not carry unsupported claim text into the presentation result", () => {
    const bad: Statement = { ...fixture.overview, references: [{ ...reference, end: 99999 }] };
    expect(presentStatement(documents, bad, [original.id])).toEqual({ ok: false });
  });
  it("rejects missing required evidence even when input bypasses TypeScript", () => {
    const bad = { ...fixture.overview, references: [] } as unknown as Statement;
    expect(presentStatement(documents, bad, [original.id])).toEqual({ ok: false });
  });
  it("rejects the whole statement if any supporting reference is invalid", () => {
    const bad: Statement = { ...fixture.overview, references: [reference, { ...reference, version: "revised" }] };
    expect(presentStatement(documents, bad, [original.id])).toEqual({ ok: false });
  });
  it("retains explicit missing-information qualifications without calling them supported", () => {
    const answer = fixture.questions.find((q) => q.id === "schedule")!.answer;
    expect(answer.kind).toBe("limited");
    expect(presentStatement(documents, answer, [original.id]).ok).toBe(true);
  });
  it("rejects a limited statement without evidence of the reviewed limitation", () => {
    const answer = fixture.questions.find((q) => q.id === "schedule")!.answer;
    expect(presentStatement(documents, { ...answer, kind: "limited", qualification: answer.qualification!, references: [] }, [original.id]))
      .toEqual({ ok: false });
  });
});

describe("fixture and comparison integrity", () => {
  it("validates all authored claims, IDs, questions and comparison sides", () => {
    expect(fixtureProblems(fixture)).toEqual([]);
  });
  it.each(["overview", "comparison"])("rejects a comparison explanation ID duplicated from %s", (source) => {
    const broken = structuredClone(fixture);
    broken.comparison[0].explanation.id = source === "overview" ? broken.overview.id : broken.comparison[1].explanation.id;
    expect(fixtureProblems(broken)).toContain("duplicate-statement-id");
  });
  it("rejects swapped comparison sides", () => {
    const item = fixture.comparison[0];
    expect(comparisonIsValid(fixture, { ...item, original: item.revised, revised: item.original })).toBe(false);
  });
  it("requires both sides for changed clauses and exactly one for additions/removals", () => {
    expect(comparisonIsValid(fixture, { ...fixture.comparison[0], revised: [] })).toBe(false);
    expect(comparisonIsValid(fixture, { ...fixture.comparison[0], kind: "added" })).toBe(false);
    expect(comparisonIsValid(fixture, { ...fixture.comparison[0], kind: "removed" })).toBe(false);
  });
  it("detects duplicate block IDs and broken attention-question links", () => {
    const broken = structuredClone(fixture);
    broken.documents[0].sections[0].blocks.push(broken.documents[0].sections[1].blocks[0]);
    broken.attention[0].questionId = "missing";
    expect(fixtureProblems(broken)).toContain("duplicate-source-id");
    expect(fixtureProblems(broken)).toContain("missing-question");
  });
  it("detects cross-question normalized alias collisions", () => {
    const broken = structuredClone(fixture);
    broken.questions[1].aliases.push(` ${broken.questions[0].question.toUpperCase()} `);
    expect(fixtureProblems(broken)).toContain("question-alias-collision");
  });
});

describe("prepared questions and literal navigation", () => {
  it("normalizes only explicit aliases and matches every authored question", () => {
    expect(normalizeQuestion("  NOTICE   period?!  ")).toBe("notice period");
    expect(matchQuestion(fixture.questions, "  NOTICE   period?!  ")?.id).toBe("notice");
    for (const q of fixture.questions) expect(matchQuestion(fixture.questions, q.question)?.id).toBe(q.id);
  });
  it.each(["", "   ", "Is this agreement legal?", "notice period and salary", "x".repeat(501)])("does not invent an answer for unsupported input %s", (input) => {
    expect(matchQuestion(fixture.questions, input)).toBeUndefined();
  });
  it("finds literal case-insensitive matches with valid original-text offsets", () => {
    const results = searchDocument(original, "WRITTEN NOTICE");
    expect(results).toHaveLength(1);
    expect(results[0].section.id).toBe("notice");
    expect(results[0].snippet).toContain("written notice");
    expect(resolveEvidence(documents, results[0].reference, [original.id]).ok).toBe(true);
  });
  it("treats regex punctuation as literal text", () => {
    expect(searchDocument(original, ".*")).toEqual([]);
    expect(searchDocument(original, "(the Employer)")).toHaveLength(1);
  });
  it("finds every repeated occurrence in each block with exact case-preserving offsets", () => {
    const document = structuredClone(original);
    document.sections = [{ ...document.sections[0], blocks: [
      { id: "repeated", text: "🙂 Notice, NOTICE; notice." },
      { id: "next", text: "Notice again." },
    ] }];
    const results = searchDocument(document, " notice ");
    expect(results.map(({ reference: { blockId, start, end, quote } }) => ({ blockId, start, end, quote }))).toEqual([
      { blockId: "repeated", start: 3, end: 9, quote: "Notice" },
      { blockId: "repeated", start: 11, end: 17, quote: "NOTICE" },
      { blockId: "repeated", start: 19, end: 25, quote: "notice" },
      { blockId: "next", start: 0, end: 6, quote: "Notice" },
    ]);
    for (const result of results) expect(resolveEvidence([document], result.reference, [document.id]).ok).toBe(true);
  });
  it("finds repeated literal punctuation without treating it as a zero-length regex", () => {
    const document = structuredClone(original);
    document.sections[0].blocks = [{ id: "punctuation", text: ".*.*" }];
    const results = searchDocument(document, ".*");
    expect(results.map(({ reference }) => [reference.start, reference.end, reference.quote])).toEqual([[0, 2, ".*"], [2, 4, ".*"]]);
  });
  it.each(["", "   ", "unicorn clause", "x".repeat(201)])("returns no invented search results for %s", (query) => {
    expect(searchDocument(original, query)).toEqual([]);
  });
});
