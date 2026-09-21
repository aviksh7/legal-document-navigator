import { afterEach, describe, expect, it, vi } from "vitest";
import { createPdfRuntime } from "./pdf-runtime";

const api = vi.hoisted(() => ({
  GlobalWorkerOptions: { workerPort: null as unknown },
  PDFWorker: { create: vi.fn(() => ({ destroy: vi.fn() })) },
}));
vi.mock("pdfjs-dist/build/pdf.mjs", () => api);
class NativeWorker extends EventTarget {
  static instances: NativeWorker[] = [];
  terminate = vi.fn();
  constructor(public url: URL, public options: WorkerOptions) { super(); NativeWorker.instances.push(this); }
}
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); NativeWorker.instances = []; api.GlobalWorkerOptions.workerPort = null; });

describe("supported modern worker ownership", () => {
  it("creates the bundled modern module worker and cleans up exactly once", async () => {
    vi.stubGlobal("Worker", NativeWorker);
    const controller = new AbortController(); const runtime = await createPdfRuntime(controller.signal);
    const native = NativeWorker.instances[0];
    expect(native.url.pathname).toContain("pdfjs-dist/build/pdf.worker.mjs");
    expect(native.options.type).toBe("module");
    expect(api.PDFWorker.create).toHaveBeenCalledWith({ port: native, verbosity: 0 });
    controller.abort(); runtime.dispose();
    expect(native.terminate).toHaveBeenCalledOnce();
    expect(runtime.worker!.destroy).toHaveBeenCalledOnce();
    expect(api.GlobalWorkerOptions.workerPort).toBeNull();
  });
  it("does not create a worker for a cancelled job", async () => {
    vi.stubGlobal("Worker", NativeWorker);
    await expect(createPdfRuntime(AbortSignal.abort())).rejects.toMatchObject({ name: "AbortError" });
    expect(NativeWorker.instances).toHaveLength(0);
  });
  it("old disposal cannot clear a replacement worker's public configuration", async () => {
    vi.stubGlobal("Worker", NativeWorker);
    const old = await createPdfRuntime(new AbortController().signal);
    const current = await createPdfRuntime(new AbortController().signal);
    old.dispose(); expect(api.GlobalWorkerOptions.workerPort).toBe(NativeWorker.instances[1]);
    current.dispose(); expect(api.GlobalWorkerOptions.workerPort).toBeNull();
  });
  it("maps worker errors without exposing their content or falling back to main-thread parsing", async () => {
    vi.stubGlobal("Worker", NativeWorker);
    const runtime = await createPdfRuntime(new AbortController().signal);
    const event = new Event("error", { cancelable: true });
    NativeWorker.instances[0].dispatchEvent(event);
    await expect(runtime.failed).rejects.toMatchObject({ code: "worker-unavailable" });
    expect(event.defaultPrevented).toBe(true); runtime.dispose();
  });
  it("terminates a native worker if public PDFWorker setup throws", async () => {
    vi.stubGlobal("Worker", NativeWorker);
    api.PDFWorker.create.mockImplementationOnce(() => { throw new Error("setup failed"); });
    await expect(createPdfRuntime(new AbortController().signal)).rejects.toMatchObject({ code: "worker-unavailable" });
    expect(NativeWorker.instances[0].terminate).toHaveBeenCalledOnce();
    expect(api.GlobalWorkerOptions.workerPort).toBeNull();
  });
});
