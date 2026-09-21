export const categories = [
  "Obligations", "Money", "Deadlines", "Restrictions", "Termination", "Disputes", "Definitions",
] as const;
export type Category = (typeof categories)[number];

/** Offsets address canonical page/paste text, not PDF bytes or visual positions. */
export type BlockProvenance =
  | { kind: "pdf"; pageNumber: number; start: number; end: number }
  | { kind: "paste"; start: number; end: number };
export interface PageCoverage { pageNumber: number; characterCount: number; usableCharacters: number }
export type IngestionMetadata =
  | { kind: "paste"; pipelineVersion: string; characterCount: number }
  | { kind: "pdf"; pipelineVersion: string; parserVersion: string; characterCount: number; pages: PageCoverage[] };
export interface SourceBlock { id: string; text: string; provenance?: BlockProvenance }
export interface SourceSection { id: string; number: string; title: string; blocks: SourceBlock[]; kind?: "page" | "text" }
export interface SourceDocument {
  id: string;
  version: "original" | "revised" | "provided";
  versionLabel: string;
  title: string;
  type: string | null;
  jurisdiction: string | null;
  parties: string[] | null;
  sections: SourceSection[];
  ingestion?: IngestionMetadata;
}

/** Identity is documentId + blockId. Quote/offsets only validate and display a span. */
export interface SourceReference {
  documentId: string;
  blockId: string;
  version: SourceDocument["version"];
  quote: string;
  start: number;
  end: number;
}
export interface Qualification {
  reason: "ambiguous" | "conflicting" | "not-stated" | "missing-material";
  detail: string;
}
interface StatementBase { id: string; text: string; basis: "document-wording" | "explanation" }
export type Statement =
  | (StatementBase & { kind: "supported"; references: [SourceReference, ...SourceReference[]]; qualification?: Qualification })
  | (StatementBase & { kind: "limited"; references: SourceReference[]; qualification: Qualification });
export interface KeyTerm { id: string; category: Category; label: string; statement: Statement }
export interface AttentionItem { id: string; title: string; label: string; statement: Statement; questionId: string }
export interface PreparedQuestion { id: string; question: string; aliases: string[]; answer: Statement }
export type ChangeKind = "changed" | "added" | "removed" | "unchanged" | "unresolved";
export interface ComparisonItem {
  id: string;
  category: Category;
  title: string;
  kind: ChangeKind;
  original: SourceReference[];
  revised: SourceReference[];
  explanation: Statement;
}
export interface WorkspaceFixture {
  documents: SourceDocument[];
  originalId: string;
  revisedId: string;
  overview: Statement;
  terms: KeyTerm[];
  attention: AttentionItem[];
  questions: PreparedQuestion[];
  comparison: ComparisonItem[];
  comparisonCoverage: string;
}
