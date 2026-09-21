import { AiFailure } from "./contracts";

/** Count actual streamed bytes, including when Content-Length is absent or false. */
export async function readBoundedJson(message: Request | Response, maxBytes: number, signal: AbortSignal): Promise<unknown> {
  const declared = message.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) throw new AiFailure("request-too-large");
  if (!message.body) throw new AiFailure("invalid-request");
  const reader = message.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", abort, { once: true });
  try {
    while (true) {
      if (signal.aborted) throw new AiFailure("cancelled");
      const { done, value } = await reader.read();
      if (signal.aborted) throw new AiFailure("cancelled");
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new AiFailure("request-too-large");
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let cursor = 0;
    for (const chunk of chunks) { bytes.set(chunk, cursor); cursor += chunk.length; }
    try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
    catch { throw new AiFailure("invalid-request"); }
  } finally {
    signal.removeEventListener("abort", abort);
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
