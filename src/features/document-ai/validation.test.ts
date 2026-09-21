import { describe, expect, it } from "vitest";
import { AI_LIMITS, AiFailure, outputSchemas, requestSchemas } from "./contracts";
import { mockOutput } from "./mock-adapter";
import { prepareInput } from "./prompts";
import { syntheticRequest, syntheticSource } from "./testing";
import { payloadDocument, presentClaim, sourceReferences, validateDocument, validateResult } from "./validation";

describe("strict AI contracts and canonical evidence", () => {
  it("sends only the minimum canonical source fields, never filenames or PDF bytes", () => {
    const source = syntheticSource(); source.title = "PRIVATE DISPLAY TITLE";
    const payload = payloadDocument(source);
    expect(Object.keys(payload).sort()).toEqual(["blocks", "documentId", "pageCount", "sourceKind"]);
    expect(JSON.stringify(payload)).not.toContain(source.title);
    expect(payload.blocks.map(b => b.text)).toEqual(source.sections.flatMap(s => s.blocks).map(b => b.text));
  });
  it.each(["apiKey", "model", "provider", "title", "filename", "tools", "scenario"])("rejects an injected request field: %s", key => {
    expect(requestSchemas.understand.safeParse({ ...syntheticRequest(), [key]: "untrusted" }).success).toBe(false);
  });
  it("requires explicit confirmation and rejects nested unknown fields", () => {
    const request = syntheticRequest();
    expect(requestSchemas.understand.safeParse({ ...request, nonSensitiveConfirmed: false }).success).toBe(false);
    expect(requestSchemas.understand.safeParse({ ...request, document: { ...request.document, title: "unexpected" } }).success).toBe(false);
    expect(requestSchemas.ask.safeParse({ ...request, question: " " }).success).toBe(false);
    expect(requestSchemas.ask.safeParse({ ...request, question: "x".repeat(501) }).success).toBe(false);
  });
  it.each(["id", "order", "offset", "length", "source-kind", "page-count", "surrogate"])("rejects corrupt document provenance: %s", kind => {
    const d = syntheticRequest().document;
    switch (kind) {
      case "id": d.blocks[1].blockId = d.blocks[0].blockId; break;
      case "order": d.blocks.reverse(); break;
      case "offset": d.blocks[1].provenance.start++; break;
      case "length": d.blocks[0].provenance.end++; break;
      case "source-kind": d.sourceKind = "pdf"; d.pageCount = 1; break;
      case "page-count": d.pageCount = 1; break;
      case "surrogate": d.blocks[0].text = "\uD800" + d.blocks[0].text.slice(1); break;
    }
    expect(() => validateDocument(d)).toThrow("invalid-request");
  });
  it("accepts empty PDF pages between text-bearing pages and resets page offsets", () => {
    const d = syntheticRequest().document;
    d.sourceKind = "pdf"; d.pageCount = 3;
    d.blocks.forEach((b, i) => { b.provenance = { kind: "pdf", pageNumber: i === 0 ? 1 : 3, start: 0, end: b.text.length }; });
    expect(() => validateDocument(d)).not.toThrow();
    d.blocks[1].provenance = { kind: "pdf", pageNumber: 4, start: 0, end: d.blocks[1].text.length };
    expect(() => validateDocument(d)).toThrow();
  });
  it("derives exact full-block quotes without normalizing or inventing offsets", () => {
    const source = syntheticSource();
    const block = source.sections[0].blocks[0];
    block.text = "  e\u0301\t🙂\n";
    const [ref] = sourceReferences([{ documentId: source.id, blockId: block.id }], source);
    expect(ref).toEqual({ documentId: source.id, blockId: block.id, version: "provided", start: 0, end: block.text.length, quote: block.text });
    expect(() => sourceReferences([{ documentId: crypto.randomUUID(), blockId: block.id }], source)).toThrow("invalid-evidence");
    source.sections[0].blocks.push(block);
    expect(() => sourceReferences([{ documentId: source.id, blockId: block.id }], source)).toThrow("invalid-evidence");
  });
  it.each(["unknown-block", "wrong-document", "duplicate-reference", "empty-evidence", "invented-quote", "unknown-property"])("withholds the whole response for %s", kind => {
    const request = syntheticRequest();
    const output = mockOutput(prepareInput("understand", request));
    if (!("overview" in output)) throw new Error("Expected Understand");
    const c = output.overview[0];
    switch (kind) {
      case "unknown-block": c.evidence[0].blockId = "b-999999"; break;
      case "wrong-document": c.evidence[0].documentId = crypto.randomUUID(); break;
      case "duplicate-reference": c.evidence.push(c.evidence[0]); break;
      case "empty-evidence": c.evidence = []; break;
      case "invented-quote": Object.assign(c.evidence[0], { quote: "not source text" }); break;
      case "unknown-property": Object.assign(output, { legalAdvice: true }); break;
    }
    expect(() => validateResult("understand", output, request.document)).toThrow(AiFailure);
  });
  it("checks questions and attention evidence, including near-duplicate blocks", () => {
    const request = syntheticRequest(1);
    const output = mockOutput(prepareInput("understand", request));
    if (!("overview" in output)) throw new Error("Expected Understand");
    expect(output.overview[0].evidence.map(e => e.blockId)).toEqual(["b-000002", "b-000003"]);
    output.questions[0].evidence[0].blockId = "b-999999";
    expect(() => validateResult("understand", output, request.document)).toThrow("invalid-evidence");
  });
  it("requires coherent completion status and explicit uncertainty for partial answers", () => {
    const request = syntheticRequest(); const d = request.document;
    const output = mockOutput(prepareInput("understand", request));
    if (!("overview" in output)) throw new Error("Expected Understand");
    expect(() => validateResult("understand", { ...output, overview: [] }, d)).toThrow("incomplete-output");
    expect(() => validateResult("understand", { ...output, status: "insufficient-source" }, d)).toThrow("invalid-output");
    expect(() => validateResult("ask", { status: "answered", claims: [], limitations: [] }, d)).toThrow("incomplete-output");
    expect(() => validateResult("ask", { status: "not-answered", claims: output.overview, limitations: [] }, d)).toThrow("invalid-output");
    expect(() => validateResult("ask", { status: "partially-answered", claims: output.overview, limitations: [] }, d)).toThrow("invalid-output");
    const statement = presentClaim(output.overview[0], { ...syntheticSource(), id: d.documentId }, "code-owned-id");
    expect(statement.id).toBe("code-owned-id");
  });
  it("rejects prose, fences, reasoning tags and malformed JSON instead of repairing it", () => {
    for (const output of ["<think>text</think>{}", "```json\n{}\n```", "ordinary text", null, {}]) {
      expect(outputSchemas.understand.safeParse(output).success).toBe(false);
    }
  });
  it("bounds the complete prompt and schema; never silently truncates", () => {
    const request = syntheticRequest();
    const input = prepareInput("understand", request);
    expect(input.inputTokenBound).toBeLessThanOrEqual(AI_LIMITS.inputTokens);
    expect(JSON.parse(input.messages[1].content).document).toEqual(request.document);
    request.document.blocks[0].text = "🙂".repeat(10_000);
    expect(() => prepareInput("understand", request)).toThrow("request-too-large");
  });
  it("keeps untrusted instructions in the data message and emits strict JSON Schema", () => {
    const input = prepareInput("understand", syntheticRequest(2));
    expect(input.messages[0].content).not.toContain("UNTRUSTED INSERT");
    expect(input.messages[1].content).toContain("UNTRUSTED INSERT");
    expect(input.schema.additionalProperties).toBe(false);
    expect(input.schema.required).toContain("limitations");
    expect(input.settings.maxOutputTokens).toBe(2048);
  });
});
