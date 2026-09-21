import type { IngestionMetadata, SourceDocument } from "../document-workspace/types";

export type IngestedSourceDocument = SourceDocument & {
  version: "provided";
  ingestion: IngestionMetadata;
};
export type ErrorCode =
  | "wrong-file-type" | "empty-file" | "file-read-failed" | "file-too-large"
  | "too-many-pages" | "too-much-text" | "resource-limit" | "invalid-pdf"
  | "password-required" | "unsupported-pdf" | "no-extractable-text"
  | "insufficient-extracted-text" | "empty-paste" | "paste-too-short"
  | "paste-too-long" | "invalid-extraction" | "processing-timeout"
  | "worker-unavailable" | "unexpected-parser-failure";
export interface IngestionError { code: ErrorCode; pageNumber?: number }
export type IngestionWarning =
  | { code: "pdf-extraction" | "low-coverage" | "suspicious-characters" }
  | { code: "sparse-page"; pageNumber: number; usableCharacters: number };
export type IngestionResult =
  | { status: "ready" | "needs-review"; document: IngestedSourceDocument; warnings: IngestionWarning[] }
  | { status: "error"; error: IngestionError }
  | { status: "cancelled" };
export interface SourceUnit { text: string; pageNumber?: number }
export interface IngestionProgress { stage: "opening" | "extracting"; pageNumber?: number; pageCount?: number }
export interface JobOptions { signal: AbortSignal; onProgress?: (progress: IngestionProgress) => void }

export const LIMITS = {
  fileBytes: 10 * 1024 * 1024, pages: 100, characters: 500_000,
  pageCharacters: 100_000, pasteCharacters: 200_000,
  pageItems: 20_000, items: 100_000, blockCharacters: 4_000, blocks: 5_000,
  minimumUsable: 20, sparsePageUsable: 40, averageUsable: 100,
  sparseProportion: 0.3, jobMs: 30_000, pageMs: 5_000,
} as const;
export const PIPELINE_VERSION = "source-v1";

/** Carries only an allowlisted code; never a parser message or document data. */
export class IngestionFailure extends Error {
  constructor(public readonly code: ErrorCode) { super(code); }
}
export function failure(code: ErrorCode): IngestionResult { return { status: "error", error: { code } }; }
