"use client";

import { useEffect, useRef, useState } from "react";
import { LatestJob } from "../document-ingestion/jobs";
import type { IngestedSourceDocument } from "../document-ingestion/types";
import { EvidenceLink, StatementContent, type OpenSource } from "../document-workspace/evidence";
import { AI_MESSAGES, AiFailure, type AiSuccess, type AiTask, type GroundedClaim, type GroundedQuestion } from "./contracts";
import { documentAiClient } from "./client";
import { presentClaim, sourceReferences } from "./validation";

export function AiPanel({ document, enabled, onOpen }: { document: IngestedSourceDocument; enabled: boolean; onOpen: OpenSource }) {
  const [confirmed, setConfirmed] = useState(false);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState<AiTask | null>(null);
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [analysis, setAnalysis] = useState<AiSuccess | null>(null);
  const [answer, setAnswer] = useState<AiSuccess | null>(null);
  const jobs = useRef(new LatestJob());
  const questionInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const current = jobs.current;
    const reset = () => { current.cancel(); setConfirmed(false); setQuestion(""); setBusy(null); setNotice(""); setAnalysis(null); setAnswer(null); };
    window.addEventListener("pagehide", reset);
    return () => { current.cancel(); window.removeEventListener("pagehide", reset); };
  }, []);
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setCooldown(Math.ceil(documentAiClient.cooldownRemaining() / 1000)), 250);
    return () => clearInterval(timer);
  }, [enabled]);

  function cancel() { jobs.current.cancel(); setBusy(null); setNotice(AI_MESSAGES.cancelled); }
  async function run(task: AiTask) {
    if (busy) return;
    const job = jobs.current.start();
    setBusy(task); setNotice("");
    if (task === "ask") setAnswer(null); else setAnalysis(null);
    try {
      const result = await documentAiClient.run(task, document, { enabled, confirmed, signal: job.signal, question });
      if (!jobs.current.owns(job)) return;
      if (task === "ask") setAnswer(result); else setAnalysis(result);
    } catch (error) {
      if (jobs.current.owns(job)) setNotice(AI_MESSAGES[error instanceof AiFailure ? error.code : "ai-unavailable"]);
    } finally {
      if (jobs.current.owns(job)) { setBusy(null); setCooldown(Math.ceil(documentAiClient.cooldownRemaining() / 1000)); }
    }
  }
  const blocked = !confirmed || !!busy || cooldown > 0;
  const claim = (value: GroundedClaim, id: string) => <StatementContent key={id} statement={presentClaim(value, document, id)} documents={[document]} allowedIds={[document.id]} onOpen={onOpen} />;
  function suggested(value: GroundedQuestion, id: string) {
    return <div className="ai-question" key={id}><button type="button" className="text-button" disabled={!!busy} onClick={() => { setQuestion(value.text); setAnswer(null); questionInput.current?.focus(); }}>{value.text}</button><div className="citations">{sourceReferences(value.evidence, document).map(ref => <EvidenceLink key={ref.blockId} documents={[document]} reference={ref} allowedIds={[document.id]} onOpen={onOpen} />)}</div></div>;
  }
  return <section className="ai-panel" aria-labelledby="ai-heading">
    <h3 id="ai-heading">Understand & Ask</h3>
    {!enabled ? <p className="reading-note">{AI_MESSAGES["ai-unavailable"]} Live AI is not enabled in this build.</p> : <>
      <span className="eyebrow">Development mock · No AI model</span>
      <p className="input-help" id="ai-disclosure">This test sends extracted blocks and your question to this app’s server. It uses prepared synthetic responses; no request goes to Hugging Face or another inference provider. Only the supplied synthetic test documents have prepared responses. This is not legal advice or a confidential-document service.</p>
      <label className="ai-consent"><input type="checkbox" checked={confirmed} onChange={event => { setConfirmed(event.target.checked); if (!event.target.checked) cancel(); }} aria-describedby="ai-disclosure" /><span>I confirm this document and question are synthetic or public, non-sensitive, non-confidential, and contain no personal information.</span></label>
      <button className="button secondary" type="button" disabled={blocked} onClick={() => void run("understand")}>Understand · Mock</button>
      <form className="ai-ask" onSubmit={event => { event.preventDefault(); if (!blocked && question.trim()) void run("ask"); }}><label htmlFor="ai-question">Ask about this document</label><div className="input-row"><input id="ai-question" ref={questionInput} value={question} maxLength={500} autoComplete="off" spellCheck={false} disabled={!!busy} onChange={event => { setQuestion(event.target.value); setAnswer(null); }} /><button type="submit" className="button secondary" disabled={blocked || !question.trim()}>Ask · Mock</button></div></form>
      <div role="status" aria-live="polite">{busy ? <div className="processing-status"><p>{busy === "ask" ? "Preparing a mock answer…" : "Preparing mock analysis…"}</p><button type="button" className="text-button" onClick={cancel}>Cancel request</button></div> : notice ? <p className="unavailable-message">{notice}</p> : null}{cooldown > 0 && !busy && <p className="input-help">Next request available in {cooldown}s.</p>}</div>
      {analysis?.task === "understand" && <div className="ai-result"><h4>Understand · Prepared mock</h4><p className="input-help">All {analysis.coverage.blockCount} supplied blocks were checked for an exact fixture match. Evidence links validate source identity, not interpretation.</p>{analysis.result.status === "insufficient-source" ? <p>No mock analysis is available for this document. Use a supplied synthetic test document; local reading and search still work.</p> : <>
        {analysis.result.overview.map((c, i) => claim(c, `overview-${i}`))}
        {analysis.result.terms.map((t, i) => <article key={i}><h5>{t.category} · {t.label}</h5>{claim(t.claim, `term-${i}`)}</article>)}
        {analysis.result.attention.map((a, i) => <article key={i}><h5>{a.title}</h5>{claim(a.claim, `attention-${i}`)}{suggested(a.question, `attention-q-${i}`)}</article>)}
        {!!analysis.result.limitations.length && <h5>Uncertainty and limitations</h5>}{analysis.result.limitations.map((c, i) => claim(c, `limitation-${i}`))}
        {!!analysis.result.questions.length && <h5>Questions worth asking</h5>}{analysis.result.questions.map((q, i) => suggested(q, `question-${i}`))}
      </>}</div>}
      {answer?.task === "ask" && <div className="ai-result"><h4>Answer · Prepared mock</h4>{answer.result.status === "not-answered" && <p>The mock has no answer to this question. This does not establish that the source lacks an answer.</p>}{answer.result.status === "out-of-scope" && <p>Legal advice and enforceability conclusions are outside this document-reading tool’s scope.</p>}{answer.result.claims.map((c, i) => claim(c, `answer-${i}`))}{answer.result.limitations.map((c, i) => claim(c, `answer-limit-${i}`))}</div>}
    </>}
  </section>;
}
