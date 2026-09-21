import type { DocumentAiAdapter } from "./adapter";
import { partitionText } from "../document-ingestion/processing";
import { AiFailure, type AiDocument, type GroundedClaim, type UnderstandResult, type AskResult } from "./contracts";
import { AI_FIXTURES } from "./fixtures";
import type { PreparedAiInput } from "./prompts";

const empty = (): UnderstandResult => ({ status: "insufficient-source", overview: [], terms: [], attention: [], limitations: [], questions: [] });
function claim(document: AiDocument, text: string, blockNumbers: number[], qualification: GroundedClaim["qualification"] = null): GroundedClaim {
  return { text, basis: "explanation", evidence: blockNumbers.map(n => ({ documentId: document.documentId, blockId: `b-${String(n).padStart(6, "0")}` })), qualification };
}

/** Exact, complete fixture match only. This is NOT a model or a general analyzer. */
export function mockOutput(input: PreparedAiInput): UnderstandResult | AskResult {
  const d = input.request.document;
  const fixture = AI_FIXTURES.find(f => f.text === d.blocks.map(b => b.text).join(""));
  const expectedBlocks = fixture ? partitionText(fixture.text) : [];
  const supported = fixture && d.sourceKind === "paste" && d.blocks.length === expectedBlocks.length &&
    d.blocks.every((block, index) => block.text === expectedBlocks[index].text);
  const result = empty();
  if (supported) {
    result.status = "analyzed";
    if (fixture.id === "notice-and-missing-schedule") {
      const notice = claim(d, "Either party may terminate with thirty days of written notice.", [1]);
      const fees = claim(d, "Fees are payable within fourteen days of an invoice, but the amount depends on the missing Schedule A.", [2], { reason: "missing-material", detail: "The supplied text refers to Schedule A and says it is not included." });
      result.overview = [notice];
      result.terms = [{ category: "Termination", label: "Written notice", claim: notice }, { category: "Money", label: "Fees and missing schedule", claim: fees }];
      result.limitations = [fees];
      result.questions = [{ text: "How much is the fee?", evidence: fees.evidence }];
      result.attention = [{ title: "Schedule A is missing", claim: fees, question: result.questions[0] }];
    } else if (fixture.id === "repeated-conflicting-notice") {
      const conflict = claim(d, "The supplied clauses give both thirty-day and sixty-day written notice periods.", [2, 3], { reason: "conflicting", detail: "These passages disagree, and the source states no order of precedence. The applicable period cannot be determined from this text." });
      result.overview = [conflict];
      result.terms = [{ category: "Termination", label: "Conflicting notice periods", claim: conflict }];
      result.limitations = [conflict];
      result.questions = [{ text: "What notice period applies?", evidence: conflict.evidence }];
    } else {
      const fees = claim(d, "Fees are payable within fourteen days of an invoice.", [1]);
      result.overview = [fees];
      result.terms = [{ category: "Money", label: "Payment deadline", claim: fees }];
      result.questions = [{ text: "When are fees payable?", evidence: fees.evidence }];
    }
  }
  if (input.task === "understand") return result;
  const question = "question" in input.request ? input.request.question.toLowerCase().trim() : "";
  if (["is this enforceable?", "is this legal?"].includes(question)) return { status: "out-of-scope", claims: [], limitations: [] };
  if (!supported) return { status: "not-answered", claims: [], limitations: [] };
  if (question === fixture.question.toLowerCase()) {
    if (fixture.id === "notice-and-missing-schedule") return { status: "not-answered", claims: [], limitations: result.limitations };
    return { status: fixture.id === "repeated-conflicting-notice" ? "partially-answered" : "answered", claims: result.overview, limitations: result.limitations };
  }
  return { status: "not-answered", claims: [], limitations: [] };
}

export const mockAdapter: DocumentAiAdapter = {
  async generate(input, signal) {
    if (signal.aborted) throw new AiFailure("cancelled");
    return { output: mockOutput(input), completion: "complete", usage: null, elapsedMs: 0 };
  },
};
