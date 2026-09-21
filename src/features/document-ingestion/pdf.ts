import type { PDFDocumentLoadingTask } from "pdfjs-dist";
import { appendPdfChunk, newPageText } from "./pdf-text";
import { createPdfRuntime, type PdfRuntime } from "./pdf-runtime";
import { buildDocument, validateFileHeader, validateFileSize } from "./processing";
import { failure, IngestionFailure, LIMITS, type IngestionResult, type JobOptions, type SourceUnit } from "./types";

/** Narrow injection seam for adapter tests and real-parser Node acceptance. */
export async function ingestPdf(file: File, options: JobOptions, runtimeFactory = createPdfRuntime): Promise<IngestionResult> {
  if (options.signal.aborted) return { status: "cancelled" };
  const sizeError = validateFileSize(file.size);
  if (sizeError) return failure(sizeError);
  const lifetime = new AbortController();
  let runtime: PdfRuntime | undefined;
  let loading: PDFDocumentLoadingTask | undefined;
  let rejectStopped!: (error: unknown) => void;
  const stopped = new Promise<never>((_, reject) => { rejectStopped = reject; });
  void stopped.catch(() => {});
  const stop = (error: unknown) => { rejectStopped(error); lifetime.abort(); };
  const cancel = () => stop(new DOMException("Cancelled", "AbortError"));
  options.signal.addEventListener("abort", cancel, { once: true });
  const deadline = setTimeout(() => stop(new IngestionFailure("processing-timeout")), LIMITS.jobMs);
  const guard = <T,>(work: Promise<T>) => Promise.race([work, stopped, ...(runtime ? [runtime.failed] : [])]);
  try {
    options.onProgress?.({ stage: "opening" });
    let header: ArrayBuffer;
    let bytes: Uint8Array;
    try {
      header = await guard(file.slice(0, 1_024).arrayBuffer());
      if (!validateFileHeader(new Uint8Array(header))) return failure("wrong-file-type");
      bytes = new Uint8Array(await guard(file.arrayBuffer()));
    } catch (error) {
      if (lifetime.signal.aborted) throw error;
      throw new IngestionFailure("file-read-failed");
    }
    runtime = await guard(runtimeFactory(lifetime.signal));
    lifetime.signal.throwIfAborted();
    loading = runtime.api.getDocument({
      data: bytes, worker: runtime.worker, verbosity: 0, stopAtErrors: true,
      enableXfa: false, disableFontFace: true, useSystemFonts: false, useWasm: false,
      isOffscreenCanvasSupported: false, isImageDecoderSupported: false,
    });
    loading.onPassword = () => stop(new IngestionFailure("password-required"));
    const pdf = await guard(loading.promise);
    if (!Number.isSafeInteger(pdf.numPages) || pdf.numPages < 1) throw new IngestionFailure("invalid-extraction");
    if (pdf.numPages > LIMITS.pages) throw new IngestionFailure("too-many-pages");
    if (pdf.isPureXfa) throw new IngestionFailure("unsupported-pdf");
    // Public APIs only. No claim that these detect all encryption or omitted content.
    const fields = await guard(pdf.getFieldObjects());
    if (fields !== null && !(fields instanceof Map)) throw new IngestionFailure("invalid-extraction");
    if (fields?.size) throw new IngestionFailure("unsupported-pdf");
    const attachments = await guard(pdf.getAttachments());
    if (attachments !== null && !(attachments instanceof Map)) throw new IngestionFailure("invalid-extraction");
    if (attachments?.size) throw new IngestionFailure("unsupported-pdf");
    const permissions = await guard(pdf.getPermissions());
    if (permissions !== null && !(permissions instanceof Set)) throw new IngestionFailure("invalid-extraction");
    if (permissions && !permissions.has(runtime.api.PermissionFlag.COPY)) throw new IngestionFailure("unsupported-pdf");
    const units: SourceUnit[] = [];
    let totalCharacters = 0; let totalItems = 0;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      lifetime.signal.throwIfAborted();
      options.onProgress?.({ stage: "extracting", pageNumber, pageCount: pdf.numPages });
      const pageDeadline = setTimeout(() => stop(new IngestionFailure("processing-timeout")), LIMITS.pageMs);
      let reader: ReadableStreamDefaultReader | undefined;
      let page: Awaited<ReturnType<typeof pdf.getPage>> | undefined;
      try {
        page = await guard(pdf.getPage(pageNumber));
        reader = page.streamTextContent({ disableNormalization: true, includeMarkedContent: false }).getReader();
        const text = newPageText();
        while (true) {
          const chunk = await guard(reader.read());
          if (chunk.done) break;
          const previousItems = text.items;
          appendPdfChunk(text, chunk.value, totalCharacters);
          totalItems += text.items - previousItems;
          if (totalItems > LIMITS.items) throw new IngestionFailure("resource-limit");
        }
        units.push({ pageNumber, text: text.parts.join("") });
        totalCharacters += text.characters;
      } finally {
        clearTimeout(pageDeadline);
        if (reader) { void reader.cancel().catch(() => {}); reader.releaseLock(); }
        page?.cleanup();
      }
    }
    lifetime.signal.throwIfAborted();
    return buildDocument(units, "pdf", file.name, runtime.api.version);
  } catch (error) {
    if (options.signal.aborted) return { status: "cancelled" };
    if (error instanceof IngestionFailure) return failure(error.code);
    // Known public error names only; never render or log exception payloads.
    const name = error && typeof error === "object" && "name" in error ? error.name : null;
    if (name === "PasswordException") return failure("password-required");
    if (name === "InvalidPDFException" || name === "FormatError") return failure("invalid-pdf");
    return failure("unexpected-parser-failure");
  } finally {
    clearTimeout(deadline);
    options.signal.removeEventListener("abort", cancel);
    if (loading) void loading.destroy().catch(() => {});
    runtime?.dispose();
    lifetime.abort();
  }
}
