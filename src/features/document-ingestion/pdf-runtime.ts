import type * as PdfJs from "pdfjs-dist";
import { IngestionFailure } from "./types";

export interface PdfRuntime {
  api: Pick<typeof PdfJs, "getDocument" | "version" | "PermissionFlag">;
  worker?: PdfJs.PDFWorker;
  failed: Promise<never>;
  dispose: () => void;
}

/** Imported on demand only; native module worker, public PDF.js transport. */
export async function createPdfRuntime(signal: AbortSignal): Promise<PdfRuntime> {
  const api = await import("pdfjs-dist/build/pdf.mjs");
  signal.throwIfAborted();
  let native: Worker;
  try {
    native = new Worker(new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url), { type: "module" });
  } catch { throw new IngestionFailure("worker-unavailable"); }
  let rejectWorker!: (error: IngestionFailure) => void;
  const failed = new Promise<never>((_, reject) => { rejectWorker = reject; });
  // The caller races this rejection against each operation. Also handle early errors.
  void failed.catch(() => {});
  const onError = (event: Event) => { event.preventDefault(); rejectWorker(new IngestionFailure("worker-unavailable")); };
  native.addEventListener("error", onError);
  native.addEventListener("messageerror", onError);
  api.GlobalWorkerOptions.workerPort = native;
  let worker: PdfJs.PDFWorker;
  try { worker = api.PDFWorker.create({ port: native, verbosity: 0 }); }
  catch {
    native.removeEventListener("error", onError);
    native.removeEventListener("messageerror", onError);
    native.terminate();
    if (api.GlobalWorkerOptions.workerPort === native) api.GlobalWorkerOptions.workerPort = null;
    throw new IngestionFailure("worker-unavailable");
  }
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    signal.removeEventListener("abort", dispose);
    native.removeEventListener("error", onError);
    native.removeEventListener("messageerror", onError);
    native.terminate();
    worker.destroy();
    if (api.GlobalWorkerOptions.workerPort === native) api.GlobalWorkerOptions.workerPort = null;
  };
  signal.addEventListener("abort", dispose, { once: true });
  if (signal.aborted) dispose();
  return { api, worker, failed, dispose };
}
