"use client";

import { useEffect, useRef, useState } from "react";
import { AI_FIXTURES } from "../document-ai/fixtures";
import { LatestJob } from "./jobs";
import { ERROR_MESSAGES, warningMessage } from "./messages";
import { ingestPaste } from "./processing";
import { ingestPdf } from "./pdf";
import { SourceWorkspace } from "./source-workspace";
import { LIMITS, type IngestionProgress, type IngestionResult } from "./types";

export function DocumentIntake({ mockAiEnabled = false }: { mockAiEnabled?: boolean }) {
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<IngestionResult | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [progress, setProgress] = useState<IngestionProgress | null>(null);
  const jobs = useRef(new LatestJob());
  const input = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const review = useRef<HTMLHeadingElement>(null);
  const entry = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const current = jobs.current;
    const clear = () => { current.cancel(); setDraft(""); setResult(null); setProgress(null); setPasteOpen(false); if (fileInput.current) fileInput.current.value = ""; };
    window.addEventListener("pagehide", clear);
    window.addEventListener("pageshow", clear);
    return () => { current.cancel(); window.removeEventListener("pagehide", clear); window.removeEventListener("pageshow", clear); };
  }, []);
  useEffect(() => { if (result?.status === "needs-review") review.current?.focus(); }, [result]);
  useEffect(() => { if (pasteOpen) input.current?.focus(); }, [pasteOpen]);
  function clear() {
    jobs.current.cancel(); setDraft(""); setResult(null); setProgress(null); setPasteOpen(false);
    if (fileInput.current) fileInput.current.value = "";
    requestAnimationFrame(() => entry.current?.focus());
  }
  function openPaste() {
    const job = jobs.current.start();
    setProgress(null);
    const next = ingestPaste(draft);
    if (!jobs.current.owns(job)) return;
    setResult(next);
    if (next.status === "ready" || next.status === "needs-review") setDraft("");
  }
  async function openPdf(file: File) {
    const job = jobs.current.start();
    setDraft(""); setResult(null); setPasteOpen(false); setProgress({ stage: "opening" });
    const next = await ingestPdf(file, { signal: job.signal, onProgress: value => { if (jobs.current.owns(job)) setProgress(value); } });
    if (!jobs.current.owns(job)) return;
    setProgress(null); setResult(next);
  }
  if (result?.status === "ready") return <SourceWorkspace key={result.document.id} document={result.document} warnings={result.warnings} onClear={clear} mockAiEnabled={mockAiEnabled} />;
  return <section className="document-intake" aria-labelledby="intake-heading">
    <div className="intake-intro"><span className="eyebrow">Your document, close at hand</span><h2 id="intake-heading" ref={entry} tabIndex={-1}>Start with the source</h2><p>Open a document to read its wording and find exact passages. No AI or legal analysis is used.</p></div>
    <div className="intake-actions"><button className="button primary" type="button" onClick={() => fileInput.current?.click()}>Upload PDF <span aria-hidden="true">↗</span></button><button className="button secondary" type="button" onClick={() => { jobs.current.cancel(); setResult(null); setProgress(null); setPasteOpen(true); }}>Paste text</button><input ref={fileInput} type="file" accept=".pdf,application/pdf" className="sr-only" tabIndex={-1} aria-label="Select a local PDF" onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void openPdf(file); }} /></div>
    <p className="input-help" style={{ marginTop: 10 }}>PDF up to 10 MiB and 100 pages. Text extraction only; no OCR or password entry.</p>
    <p className="intake-privacy">Processed in this browser. Reading and extraction do not upload or save document contents. {mockAiEnabled && "An optional development mock sends extracted text to this app’s server only after confirmation. No external AI is connected."} Clear or reload to reset. Browser and operating-system retention are outside this app’s control.</p>
    {mockAiEnabled && <details className="extraction-notes"><summary>Development: synthetic AI test documents</summary><p>Prepared responses only; no model or credit is used.</p><div className="intake-actions">{AI_FIXTURES.map(fixture => <button type="button" className="text-button" key={fixture.id} onClick={() => { jobs.current.cancel(); setDraft(""); setProgress(null); setPasteOpen(false); setResult(ingestPaste(fixture.text)); }}>{fixture.label}</button>)}</div></details>}
    {progress && <div className="processing-status" aria-busy="true"><p role="status">{progress.stage === "opening" ? "Opening PDF locally…" : `Reading page ${progress.pageNumber} of ${progress.pageCount}…`}</p><button type="button" className="button secondary" onClick={() => { jobs.current.cancel(); setProgress(null); setResult({ status: "cancelled" }); }}>Cancel processing</button></div>}
    {result?.status === "needs-review" ? <div className="intake-review"><h3 ref={review} tabIndex={-1}>Check the extraction before reading</h3><p>Some wording may be missing or unusual. These checks cannot establish completeness.</p><ul>{result.warnings.filter(w => w.code !== "pdf-extraction").map((warning, i) => <li key={i}>{warningMessage(warning)}</li>)}</ul><div className="intake-actions"><button type="button" className="button primary" onClick={() => setResult({ ...result, status: "ready" })}>Open extracted text</button><button type="button" className="button secondary" onClick={clear}>Choose another document</button></div></div> : <>
      {pasteOpen && <form className="paste-form" onSubmit={event => { event.preventDefault(); openPaste(); }}><label htmlFor="document-paste">Plain document text</label><p className="input-help" id="paste-help">Up to 200,000 characters. Include at least 20 letters or numbers. Line endings are normalized; other whitespace is preserved.</p><textarea id="document-paste" ref={input} value={draft} autoComplete="off" spellCheck={false} aria-describedby="paste-help" onPaste={event => {
        const added = event.clipboardData.getData("text/plain");
        const field = event.currentTarget;
        if (draft.length - (field.selectionEnd - field.selectionStart) + added.length > LIMITS.pasteCharacters) { event.preventDefault(); setResult({ status: "error", error: { code: "paste-too-long" } }); }
      }} onChange={event => {
        if (event.target.value.length > LIMITS.pasteCharacters) { setResult({ status: "error", error: { code: "paste-too-long" } }); return; }
        setDraft(event.target.value); setResult(null);
      }} /><div className="paste-footer"><span className="quiet-label">{draft.length.toLocaleString()} / 200,000</span><div className="intake-actions"><button className="button primary" type="submit">Open source text</button><button className="text-button" type="button" onClick={clear}>Clear</button></div></div></form>}
      {result?.status === "error" && <p className="field-error" role="alert">{ERROR_MESSAGES[result.error.code]}</p>}
      {result?.status === "cancelled" && <p role="status" className="quiet-label">Processing cancelled. Choose another document or paste text.</p>}
    </>}
  </section>;
}
