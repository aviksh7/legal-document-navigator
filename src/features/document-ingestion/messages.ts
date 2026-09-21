import type { ErrorCode, IngestionWarning } from "./types";

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  "wrong-file-type": "This file does not have a PDF header. Choose a PDF or paste plain text.",
  "empty-file": "This file is empty. Choose another copy or paste the text.",
  "file-read-failed": "The browser could not read this file. Select it again or choose another copy.",
  "file-too-large": "This PDF exceeds the 10 MiB limit. Choose a smaller document or paste an excerpt.",
  "too-many-pages": "This PDF exceeds the 100-page limit. Choose a shorter document or paste an excerpt.",
  "too-much-text": "The extracted text exceeds the limit of 500,000 characters total or 100,000 per page. Choose a smaller document.",
  "resource-limit": "This document exceeds the processing limits. Choose a smaller document or paste an excerpt.",
  "invalid-pdf": "This PDF could not be read reliably. Try another PDF export or paste the text.",
  "password-required": "This PDF requires a password. Password entry is not supported here. Use an accessible copy or paste the text.",
  "unsupported-pdf": "This PDF contains unsupported forms, attachments, or extraction restrictions. Use a flattened, accessible PDF or paste the text.",
  "no-extractable-text": "No usable text was extracted. The PDF may contain scans or images and need OCR elsewhere. Choose a text-bearing PDF or paste text.",
  "insufficient-extracted-text": "Too little usable text was extracted to open this document. Extraction may be incomplete. Try another export or paste text; a scan may need OCR elsewhere.",
  "empty-paste": "Paste some document text before opening it.",
  "paste-too-short": "Paste a longer passage with at least 20 letters or numbers.",
  "paste-too-long": "Pasted text exceeds the 200,000-character limit. Paste a smaller excerpt; the text has not been truncated.",
  "invalid-extraction": "The extracted source could not be validated. No partial document was opened. Try another export or paste text.",
  "processing-timeout": "Processing took too long and was stopped. Choose a smaller PDF or paste text.",
  "worker-unavailable": "PDF processing could not start in this browser. Try a current browser or paste text.",
  "unexpected-parser-failure": "The document could not be processed. Try again, choose another copy, or paste text.",
};
export function warningMessage(warning: IngestionWarning) {
  switch (warning.code) {
    case "pdf-extraction": return "This is extracted page text, not the original PDF view. Reading order and visual spacing may differ; images, annotations, and other non-text material are not included. Quotes match this extracted text exactly, not the PDF’s visual appearance.";
    case "low-coverage": return "Overall text coverage is unusually low or many pages have little text. Extraction may be incomplete. Check the original document before relying on this source.";
    case "suspicious-characters": return "The text contains replacement or unusual control characters. These were retained; check the wording against your source.";
    case "sparse-page": return `PDF page ${warning.pageNumber}: ${warning.usableCharacters} extracted letters/numbers. Extraction may be incomplete; an image or scan is one possible cause.`;
  }
}
