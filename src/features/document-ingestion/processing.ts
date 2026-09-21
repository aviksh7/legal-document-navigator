import type { SourceBlock, SourceSection } from "../document-workspace/types";
import { failure, IngestionFailure, LIMITS, PIPELINE_VERSION, type ErrorCode, type IngestedSourceDocument, type IngestionResult, type IngestionWarning, type SourceUnit } from "./types";

export const normalizePaste = (input: string) => input.replace(/\r\n?/g, "\n");
export function usableCharacters(input: string) {
  let count = 0;
  for (const match of input.matchAll(/[\p{L}\p{N}]/gu)) { if (match) count++; }
  return count;
}
// These characters trigger review, never deletion from canonical text.
const hasSuspiciousCharacters = (text: string) => /[\u0000-\u0008\u000b-\u001f\u007f\ufffd]/u.test(text);

export function validateFileSize(size: number): ErrorCode | null {
  if (!Number.isSafeInteger(size) || size < 0) return "file-read-failed";
  if (!size) return "empty-file";
  return size > LIMITS.fileBytes ? "file-too-large" : null;
}
export function validateFileHeader(bytes: Uint8Array) {
  const header = [37, 80, 68, 70, 45]; // %PDF-; a parse attempt still must succeed.
  const end = Math.min(bytes.length, 1_024) - header.length;
  for (let i = 0; i <= end; i++) if (header.every((byte, j) => bytes[i + j] === byte)) return true;
  return false;
}

/** Partition only canonical text. Delimiters remain in the preceding block. */
export function partitionText(text: string) {
  const ranges: { text: string; start: number; end: number }[] = [];
  if (!text.length) return ranges;
  const boundaries: number[] = [];
  for (const match of text.matchAll(/\n[\t ]*\n(?:[\t ]*\n)*/g)) {
    const end = match.index + match[0].length;
    if (text.slice(boundaries.at(-1) ?? 0, end).trim()) boundaries.push(end);
  }
  if (boundaries.length && !text.slice(boundaries.at(-1)).trim()) boundaries.pop();
  boundaries.push(text.length);
  let start = 0;
  for (const boundary of boundaries) {
    while (start < boundary) {
      let end = Math.min(boundary, start + LIMITS.blockCharacters);
      if (end < boundary) {
        const half = start + LIMITS.blockCharacters / 2;
        const line = text.lastIndexOf("\n", end - 1);
        const space = text.lastIndexOf(" ", end - 1);
        if (line >= half) end = line + 1;
        else if (space >= half) end = space + 1;
        else if (/[\uD800-\uDBFF]/.test(text[end - 1]) && /[\uDC00-\uDFFF]/.test(text[end])) end--;
      }
      ranges.push({ text: text.slice(start, end), start, end });
      if (ranges.length > LIMITS.blocks) throw new IngestionFailure("resource-limit");
      start = end;
    }
  }
  return ranges;
}

export function assessQuality(units: SourceUnit[], kind: "paste" | "pdf") {
  const warnings: IngestionWarning[] = kind === "pdf" ? [{ code: "pdf-extraction" }] : [];
  const counts = units.map(unit => usableCharacters(unit.text));
  const usable = counts.reduce((sum, count) => sum + count, 0);
  let review = false;
  if (kind === "pdf") {
    const sparse = counts.filter(count => count < LIMITS.sparsePageUsable).length;
    counts.forEach((count, i) => {
      if (count < LIMITS.sparsePageUsable) warnings.push({ code: "sparse-page", pageNumber: i + 1, usableCharacters: count });
    });
    if (usable / units.length < LIMITS.averageUsable || (sparse >= 2 && sparse / units.length >= LIMITS.sparseProportion)) {
      warnings.push({ code: "low-coverage" }); review = true;
    }
  }
  if (units.some(unit => hasSuspiciousCharacters(unit.text))) {
    warnings.push({ code: "suspicious-characters" }); review = true;
  }
  return { warnings, review, usable, counts };
}

/** UUID allocation is per successful intake. IDs are never content fingerprints. */
export function buildDocument(units: SourceUnit[], kind: "paste" | "pdf", title: string, parserVersion?: string): IngestionResult {
  if (!Array.isArray(units) || units.length === 0 || units.some((unit, i) => !unit || typeof unit.text !== "string" || (kind === "pdf" ? unit.pageNumber !== i + 1 : unit.pageNumber !== undefined))) return failure("invalid-extraction");
  if (kind === "paste" && units.length !== 1) return failure("invalid-extraction");
  if (kind === "pdf" && (!parserVersion || units.length > LIMITS.pages)) return failure(parserVersion ? "too-many-pages" : "invalid-extraction");
  const characters = units.reduce((sum, unit) => sum + unit.text.length, 0);
  if (characters > LIMITS.characters || (kind === "pdf" && units.some(unit => unit.text.length > LIMITS.pageCharacters))) return failure("too-much-text");
  if (kind === "paste" && characters > LIMITS.pasteCharacters) return failure("paste-too-long");
  const quality = assessQuality(units, kind);
  if (quality.usable < LIMITS.minimumUsable) return failure(kind === "paste" ? "paste-too-short" : quality.usable === 0 ? "no-extractable-text" : "insufficient-extracted-text");
  let ordinal = 0;
  let sections: SourceSection[];
  try {
    sections = units.map((unit, index) => ({
      id: `s-${String(index + 1).padStart(4, "0")}`,
      number: kind === "pdf" ? String(index + 1) : "",
      title: kind === "pdf" ? `PDF page ${index + 1}` : "Pasted text",
      kind: kind === "pdf" ? "page" : "text",
      blocks: partitionText(unit.text).map(({ text, start, end }): SourceBlock => {
        if (++ordinal > LIMITS.blocks) throw new IngestionFailure("resource-limit");
        return { id: `b-${String(ordinal).padStart(6, "0")}`, text, provenance: kind === "pdf" ? { kind, pageNumber: index + 1, start, end } : { kind, start, end } };
      }),
    }));
  } catch (error) { return failure(error instanceof IngestionFailure ? error.code : "unexpected-parser-failure"); }
  const metadata = { pipelineVersion: PIPELINE_VERSION, characterCount: characters };
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") return failure("unexpected-parser-failure");
  const document: IngestedSourceDocument = {
    id: crypto.randomUUID(), version: "provided", versionLabel: "Provided document",
    title: title.replace(/[\u0000-\u001f\u007f\u202a-\u202e]/g, "").slice(0, 120) || "Provided document",
    type: null, jurisdiction: null, parties: null, sections,
    ingestion: kind === "pdf"
      ? { ...metadata, kind, parserVersion: parserVersion!, pages: units.map((unit, i) => ({ pageNumber: i + 1, characterCount: unit.text.length, usableCharacters: quality.counts[i] })) }
      : { ...metadata, kind },
  };
  if (ingestionProblems(document).length) return failure("invalid-extraction");
  return { status: quality.review ? "needs-review" : "ready", document, warnings: quality.warnings };
}

export function ingestPaste(input: string): IngestionResult {
  if (input.length > LIMITS.pasteCharacters) return failure("paste-too-long");
  if (!input.trim()) return failure("empty-paste");
  return buildDocument([{ text: normalizePaste(input) }], "paste", "Pasted document");
}

/** Validate generated source contracts independently of sample analysis fixtures. */
export function ingestionProblems(document: IngestedSourceDocument) {
  const problems: string[] = [];
  const { ingestion, sections } = document;
  if (!document.id || document.version !== "provided" || !sections.length) problems.push("document-identity");
  let ordinal = 0;
  let characters = 0;
  for (const [index, section] of sections.entries()) {
    if (section.id !== `s-${String(index + 1).padStart(4, "0")}`) problems.push("section-order");
    let offset = 0;
    for (const block of section.blocks) {
      ordinal++;
      if (block.id !== `b-${String(ordinal).padStart(6, "0")}`) problems.push("block-order");
      const origin = block.provenance;
      if (!origin || origin.kind !== ingestion.kind || origin.start !== offset || origin.end !== offset + block.text.length || !Number.isSafeInteger(origin.end)) problems.push("block-provenance");
      if (origin?.kind === "pdf" && origin.pageNumber !== index + 1) problems.push("page-provenance");
      if (!block.text.length || block.text.length > LIMITS.blockCharacters) problems.push("block-limit");
      offset += block.text.length;
    }
    characters += offset;
    if (ingestion.kind === "pdf") {
      const page = ingestion.pages[index];
      if (!page || page.pageNumber !== index + 1 || page.characterCount > LIMITS.pageCharacters || page.characterCount !== offset || page.usableCharacters !== usableCharacters(section.blocks.map(block => block.text).join(""))) problems.push("page-coverage");
    }
  }
  if (!ordinal || ordinal > LIMITS.blocks || characters > LIMITS.characters) problems.push("document-limit");
  if (ingestion.kind === "paste" && (sections.length !== 1 || ingestion.characterCount !== characters)) problems.push("paste-provenance");
  if (ingestion.kind === "pdf" && (sections.length > LIMITS.pages || ingestion.pages.length !== sections.length || ingestion.pages.reduce((sum, page) => sum + page.characterCount, 0) !== ingestion.characterCount)) problems.push("page-coverage");
  return problems;
}
