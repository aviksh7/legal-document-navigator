import { IngestionFailure, LIMITS } from "./types";

export function newPageText() { return { parts: [] as string[], characters: 0, items: 0 }; }
/** Public TextItem.str is canonical. PDF.js has already transformed PDF whitespace. */
export function appendPdfChunk(state: ReturnType<typeof newPageText>, chunk: unknown, precedingCharacters: number) {
  if (!chunk || typeof chunk !== "object" || !("items" in chunk) || !Array.isArray(chunk.items)) throw new IngestionFailure("invalid-extraction");
  state.items += chunk.items.length;
  if (state.items > LIMITS.pageItems) throw new IngestionFailure("resource-limit");
  for (const item of chunk.items) {
    if (!item || typeof item !== "object" || typeof item.str !== "string" || typeof item.hasEOL !== "boolean") throw new IngestionFailure("invalid-extraction");
    state.characters += item.str.length + (item.hasEOL ? 1 : 0);
    if (state.characters > LIMITS.pageCharacters || precedingCharacters + state.characters > LIMITS.characters) throw new IngestionFailure("too-much-text");
    state.parts.push(item.str);
    if (item.hasEOL) state.parts.push("\n");
  }
}
