"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { UnderstandView } from "./understand-view";
import { CompareView } from "./compare-view";
import { AskNavigateView } from "./ask-navigate-view";
import { SourcePanel } from "./source-panel";
import { DevelopmentScenarios, type PreviewState } from "./development-scenarios";
import { resolveEvidence } from "./model";
import { revealIfNeeded } from "./navigation";
import type { SourceReference, WorkspaceFixture } from "./types";

const tabs = [{ id: "understand", label: "Understand" }, { id: "compare", label: "Compare" }, { id: "ask", label: "Ask & Navigate" }] as const;
type Tab = (typeof tabs)[number]["id"];
function subscribeWidth(callback: () => void) {
  const media = window.matchMedia("(max-width: 1023px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const getNarrow = () => window.matchMedia("(max-width: 1023px)").matches;

export function Workspace({ initialFixture }: { initialFixture: WorkspaceFixture }) {
  const [preview, setPreview] = useState<PreviewState>({ status: "ready", fixture: initialFixture });
  const fixture = process.env.NODE_ENV === "development" ? preview.fixture : initialFixture;
  const [tab, setTab] = useState<Tab>("understand");
  const [revisionAdded, setRevisionAdded] = useState(false);
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ reference: SourceReference | null; sequence: number }>({ reference: null, sequence: 0 });
  const [sourceOpen, setSourceOpen] = useState(false);
  const [sourceError, setSourceError] = useState(false);
  const sourceTrigger = useRef<HTMLElement | null>(null);
  const narrow = useSyncExternalStore(subscribeWidth, getNarrow, () => false);
  const document = fixture.documents.find((doc) => doc.id === fixture.originalId)!;
  const failed = process.env.NODE_ENV === "development" && preview.status === "failure";
  const loading = process.env.NODE_ENV === "development" && preview.status === "loading";
  const onPage = tab === "understand" ? [{ id: "overview", label: "Overview" }, { id: "attention", label: "Points to clarify" }, { id: "terms", label: "Key terms" }, { id: "questions", label: "Questions to ask" }] : tab === "compare" ? [{ id: "comparison", label: "Version comparison" }] : [{ id: "ask", label: "Ask a question" }, { id: "find", label: "Find in document" }, { id: "contents", label: "Document contents" }];
  function openSource(reference: SourceReference, trigger: HTMLElement) {
    if (!resolveEvidence(fixture.documents, reference, fixture.documents.map((doc) => doc.id)).ok) { setSourceError(true); return; }
    setSourceError(false);
    if (!trigger.closest(".source-pane, .source-dialog")) sourceTrigger.current = trigger;
    setSelection((previous) => ({ reference, sequence: previous.sequence + 1 }));
    setSourceOpen(narrow);
  }
  function returnToReading() {
    setSourceOpen(false);
    requestAnimationFrame(() => {
      const trigger = sourceTrigger.current;
      const canRestore = trigger?.isConnected && trigger.tabIndex >= 0
        && !trigger.matches(":disabled")
        && !trigger.closest("[hidden], [inert], [aria-hidden='true']")
        && trigger.getClientRects().length > 0
        && window.getComputedStyle(trigger).visibility === "visible";
      const target = canRestore ? trigger : window.document.getElementById(`tab-${tab}`);
      target?.focus({ preventScroll: true });
    });
  }
  function activateTab(next: Tab) {
    if (next === tab) return;
    setTab(next);
    requestAnimationFrame(() => {
      revealIfNeeded(window.document.getElementById(`panel-${next}`)?.querySelector("h2") ?? null);
    });
  }
  function showQuestion(id: string) {
    setQuestionId(id); activateTab("ask");
    requestAnimationFrame(() => { window.document.getElementById("panel-ask")?.focus({ preventScroll: true }); });
  }
  const pageLinks = <>{onPage.map((item) => <a key={item.id} href={`#${item.id}`}>{item.label}<span aria-hidden="true">↗</span></a>)}</>;
  return <>
    <a className="skip-link" href="#workspace-content">Skip to workspace</a>
    <header className="app-header"><Link href="/" className="wordmark"><span className="brand-mark" aria-hidden="true">L /</span> Legal Document Navigator</Link><span className="sample-badge"><span aria-hidden="true" />Sample workspace</span></header>
    <div className="workspace-heading"><div><Link className="back-link" href="/">← Back to entry</Link><div className="document-title"><h1>{document.title}</h1><span className="version-badge">Original</span></div><p className="document-meta">{document.type} <span aria-hidden="true">/</span> {document.jurisdiction} <span aria-hidden="true">/</span> Synthetic sample</p><details className="metadata-details"><summary>Document details</summary><dl><div><dt>Parties</dt><dd>{document.parties?.join(" · ")}</dd></div><div><dt>Location stated in sample</dt><dd>{document.jurisdiction}</dd></div><div><dt>Source</dt><dd>Authored synthetic text · {document.sections.length} sections</dd></div></dl></details></div><button type="button" className="button secondary view-source" onClick={(event) => { sourceTrigger.current = event.currentTarget; setSelection((s) => ({ reference: null, sequence: s.sequence + 1 })); setSourceOpen(true); }}>View source <span aria-hidden="true">↗</span></button></div>
    <div className="workspace-tabs"><div role="tablist" aria-label="Document workspace">{tabs.map((item, index) => <button type="button" role="tab" id={`tab-${item.id}`} aria-selected={tab === item.id} aria-controls={`panel-${item.id}`} tabIndex={tab === item.id ? 0 : -1} key={item.id} onClick={() => activateTab(item.id)} onKeyDown={(event) => { let next: number; if (event.key === "ArrowRight") next = (index + 1) % tabs.length; else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length; else if (event.key === "Home") next = 0; else if (event.key === "End") next = tabs.length - 1; else return; event.preventDefault(); activateTab(tabs[next].id); window.document.getElementById(`tab-${tabs[next].id}`)?.focus({ preventScroll: true }); }}>{item.label}</button>)}</div><span className="tabs-note">Read. Check the source. Ask better questions.</span></div>
    {process.env.NODE_ENV === "development" && <DevelopmentScenarios baseline={initialFixture} state={preview} onChange={(state) => { setPreview(state); setTab("understand"); setSelection({ reference: null, sequence: 0 }); setSourceOpen(false); }} />}
    <div className="workspace-grid">
      <nav className="context-nav" aria-label="On this page"><span className="eyebrow">On this page</span>{pageLinks}<div className="rail-note"><span aria-hidden="true">§</span><p>Every explanation starts with the wording.</p><span>Use a citation to read it in context.</span></div></nav>
      <main id="workspace-content" className="analysis-column" tabIndex={-1}>
        <details className="mobile-page-nav"><summary>On this page</summary><nav aria-label="Page sections">{pageLinks}</nav></details>
        {sourceError && <p className="unavailable-message" role="alert">Source unavailable. The reference could not be validated.</p>}
        {failed ? <div className="empty-state"><h2>The sample could not be opened</h2><p>This preview shows an unavailable workspace. No analysis is presented.</p><button className="button primary" type="button" onClick={() => setPreview({ status: "ready", fixture: initialFixture })}>Reload sample</button><Link className="text-button" href="/">Back to entry</Link></div> : loading ? <div className="loading-state" aria-busy="true" role="status"><h2>Opening document</h2><p>Loading layout preview</p><div className="skeleton" /><div className="skeleton short" /><div className="skeleton" /></div> : <>
          {process.env.NODE_ENV === "development" && preview.status === "partial" && <p className="unavailable-message" role="status">Some information is unavailable in this preview. Empty categories do not establish the absence of terms.</p>}
          <div role="tabpanel" id="panel-understand" aria-labelledby="tab-understand" tabIndex={0} hidden={tab !== "understand"}><UnderstandView fixture={fixture} onOpen={openSource} onQuestion={showQuestion} /></div>
          <div role="tabpanel" id="panel-compare" aria-labelledby="tab-compare" tabIndex={0} hidden={tab !== "compare"}><CompareView fixture={fixture} added={revisionAdded} onAdded={(added) => {
              setRevisionAdded(added);
              if (!added && selection.reference?.documentId === fixture.revisedId) {
                setSelection({ reference: null, sequence: 0 });
                setSourceOpen(false);
              }
            }} onOpen={openSource} /></div>
          <div role="tabpanel" id="panel-ask" aria-labelledby="tab-ask" tabIndex={0} hidden={tab !== "ask"}><AskNavigateView fixture={fixture} selectedId={questionId} onSelected={setQuestionId} onOpen={openSource} /></div>
        </>}
        <footer className="workspace-footer">Synthetic material for exploring this workspace. Prepared explanations are not legal advice.</footer>
      </main>
      {!failed && !loading && <SourcePanel documents={fixture.documents} originalId={fixture.originalId} selection={selection} narrow={narrow} open={sourceOpen} onOpen={openSource} onReturn={returnToReading} />}
    </div>
  </>;
}
