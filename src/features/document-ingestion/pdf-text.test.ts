import { describe, expect, it } from "vitest";
import { appendPdfChunk, newPageText } from "./pdf-text";
import { LIMITS } from "./types";

describe("canonical public PDF.js text items", () => {
  it("uses API strings verbatim and only adds hasEOL boundaries", () => {
    const state = newPageText();
    appendPdfChunk(state, { items: [{ str: "A  \t\rnon-", hasEOL: true }, { str: "compete", hasEOL: false }, { str: ".", hasEOL: true }] }, 0);
    expect(state.parts.join("")).toBe("A  \t\rnon-\ncompete.\n");
    // No claim about the PDF's original whitespace: these are already extracted strings.
    expect(state.characters).toBe(state.parts.join("").length);
  });
  it("does not invent spaces between items or collapse repeated text", () => {
    const state = newPageText();
    appendPdfChunk(state, { items: [{ str: "agree", hasEOL: false }, { str: "ment", hasEOL: false }, { str: "ment", hasEOL: false }] }, 0);
    expect(state.parts.join("")).toBe("agreementment");
  });
  it.each([null, {}, { items: "text" }, { items: [null] }, { items: [{ str: 12, hasEOL: true }] }, { items: [{ str: "text" }] }])("rejects malformed extraction records (%#)", chunk => {
    expect(() => appendPdfChunk(newPageText(), chunk, 0)).toThrow("invalid-extraction");
  });
  it("enforces item and character budgets including empty strings and inserted LF", () => {
    expect(() => appendPdfChunk(newPageText(), { items: Array(LIMITS.pageItems + 1).fill({ str: "", hasEOL: false }) }, 0)).toThrow("resource-limit");
    expect(() => appendPdfChunk(newPageText(), { items: [{ str: "x".repeat(LIMITS.pageCharacters), hasEOL: true }] }, 0)).toThrow("too-much-text");
    expect(() => appendPdfChunk(newPageText(), { items: [{ str: "xy", hasEOL: false }] }, LIMITS.characters - 1)).toThrow("too-much-text");
  });
});
