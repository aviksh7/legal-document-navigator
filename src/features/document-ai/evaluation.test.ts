import { describe, expect, it, vi } from "vitest";
import { AI_FIXTURES } from "./fixtures";
import { rehearseMockEvaluation } from "./evaluation";
import { mockAdapter, mockOutput } from "./mock-adapter";
import { prepareInput } from "./prompts";
import { syntheticRequest } from "./testing";
import { validateResult } from "./validation";

describe("mock-only qualification rehearsal (zero inference / zero credit)", () => {
  it("checks all three Understand cases using expected properties and metrics only", async () => {
    const report = await rehearseMockEvaluation(mockAdapter);
    expect(report.qualifiedLiveModel).toBe(false);
    expect(report.estimatedCreditUsd).toBe(0);
    expect(report.records).toHaveLength(3);
    expect(report.records.every(r => r.schemaAndEvidence && r.expectedProperties)).toBe(true);
    expect(JSON.stringify(report)).not.toContain("SYNTHETIC TEST AGREEMENT");
  });
  it("stops immediately when a candidate fails its schema", async () => {
    const generate = vi.fn(async () => ({ output: {}, completion: "complete" as const, usage: null, elapsedMs: 0 }));
    const report = await rehearseMockEvaluation({ generate });
    expect(report.records).toHaveLength(1); expect(generate).toHaveBeenCalledTimes(1);
    expect(report.records[0].schemaAndEvidence).toBe(false);
  });
  it.each([0, 1, 2])("checks Ask grounding and uncertainty for synthetic case %i", index => {
    const request = { ...syntheticRequest(index), question: AI_FIXTURES[index].question };
    const input = prepareInput("ask", request);
    const output = validateResult("ask", mockOutput(input), request.document);
    expect(output.status).toBe(["not-answered", "partially-answered", "answered"][index]);
  });
  it("repeats the critical injection case with no schema or evidence changes", () => {
    const input = prepareInput("understand", syntheticRequest(2));
    for (let repeat = 0; repeat < 2; repeat++) {
      const output = validateResult("understand", mockOutput(input), input.request.document);
      expect(JSON.stringify(output)).not.toMatch(/b-999999|<think>|API secret|agreement is enforceable/);
    }
  });
  it("returns out-of-scope for an enforceability question without general legal knowledge", () => {
    const request = { ...syntheticRequest(), question: "Is this enforceable?" };
    expect(mockOutput(prepareInput("ask", request))).toEqual({ status: "out-of-scope", claims: [], limitations: [] });
  });
});
