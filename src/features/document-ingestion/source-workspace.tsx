import { useEffect, useRef, useState } from "react";
import { AiPanel } from "../document-ai/panel";
import { EvidenceLink } from "../document-workspace/evidence";
import { searchDocument } from "../document-workspace/model";
import { SourceSections } from "../document-workspace/source-sections";
import type { SourceReference } from "../document-workspace/types";
import { warningMessage } from "./messages";
import type { IngestedSourceDocument, IngestionWarning } from "./types";

export function SourceWorkspace({ document, warnings, onClear, mockAiEnabled = false }: { document: IngestedSourceDocument; warnings: IngestionWarning[]; onClear: () => void; mockAiEnabled?: boolean }) {
  const [sectionId, setSectionId] = useState(document.sections[0].id);
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [selection, setSelection] = useState<{ reference: SourceReference | null; sequence: number }>({ reference: null, sequence: 0 });
  const reader = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const results = searchDocument(document, submitted, 101);
  const pageIndex = document.sections.findIndex(section => section.id === sectionId);
  const isPdf = document.ingestion.kind === "pdf";
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => {
    if (!selection.sequence) return;
    const target = selection.reference ? reader.current?.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(selection.reference.blockId)}"]`) : reader.current;
    target?.focus({ preventScroll: true });
    if (!selection.reference) {
      reader.current?.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    const quote = target?.querySelector("mark") ?? target;
    quote?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
  }, [selection]);
  function jump(id: string) { setSectionId(id); setSelection(s => ({ reference: null, sequence: s.sequence + 1 })); }
  return <section className="provided-workspace" aria-labelledby="provided-heading">
    <div className="provided-heading"><div><span className="eyebrow">Provided document · Local source</span><h2 id="provided-heading" ref={heading} tabIndex={-1}>{document.title}</h2><p className="quiet-label">{isPdf ? `${document.sections.length} physical PDF pages` : "Pasted text · No page numbers"} · {document.sections.reduce((n, s) => n + s.blocks.length, 0)} source blocks</p></div><button type="button" className="button secondary" onClick={onClear}>Clear document</button></div>
    <p className="reading-note">Read canonical wording and find exact passages. Live AI is unavailable. Clearing or reloading removes this document from the application’s active state.</p>
    {!!warnings.length && <details className="extraction-notes" open><summary>Extraction notes ({warnings.length})</summary><ul>{warnings.map((warning, i) => <li key={i}>{warningMessage(warning)}</li>)}</ul></details>}
    {!isPdf && <p className="reading-note">Line endings are normalized to LF. Other pasted wording and whitespace are preserved.</p>}
    <div className="provided-grid"><div className="provided-tools">
      <form onSubmit={event => { event.preventDefault(); setSubmitted(search.trim()); }}><label htmlFor="provided-search">Find exact wording</label><p className="input-help">Literal, case-insensitive search within source blocks. Line breaks and spaces must match.</p><div className="input-row"><input id="provided-search" type="search" autoComplete="off" spellCheck={false} value={search} maxLength={200} onChange={event => setSearch(event.target.value)} /><button type="submit" className="button secondary">Find</button></div></form>
      <div aria-live="polite">{submitted && <><div className="filter-row"><p className="quiet-label">{results.length > 100 ? "Showing the first 100 matches. Narrow your search." : `${results.length} ${results.length === 1 ? "match" : "matches"}`}</p><button className="text-button" type="button" onClick={() => { setSearch(""); setSubmitted(""); }}>Clear search</button></div>{results.slice(0, 100).map(result => <article className="search-result" key={`${result.reference.blockId}-${result.reference.start}`}><p>{result.snippet}</p><EvidenceLink documents={[document]} reference={result.reference} allowedIds={[document.id]} onOpen={(reference, element) => { trigger.current = element; setSectionId(result.section.id); setSelection(s => ({ reference, sequence: s.sequence + 1 })); }} /></article>)}</>}</div>
      <AiPanel document={document} enabled={mockAiEnabled} onOpen={(reference, element) => {
        const section = document.sections.find(s => s.blocks.some(b => b.id === reference.blockId));
        if (!section) return;
        trigger.current = element; setSectionId(section.id); setSelection(s => ({ reference, sequence: s.sequence + 1 }));
      }} />
    </div><div className="provided-paper">
      <div className="provided-navigation"><label htmlFor="provided-section">{isPdf ? "Physical PDF page" : "Source"}</label><select id="provided-section" value={sectionId} onChange={event => jump(event.target.value)}>{document.sections.map(section => <option key={section.id} value={section.id}>{section.title}{!section.blocks.length ? " · No extracted text" : ""}</option>)}</select>{isPdf && <div className="page-buttons"><button type="button" className="text-button" disabled={!pageIndex} onClick={() => jump(document.sections[pageIndex - 1].id)}>← Previous</button><span>{pageIndex + 1} / {document.sections.length}</span><button type="button" className="text-button" disabled={pageIndex === document.sections.length - 1} onClick={() => jump(document.sections[pageIndex + 1].id)}>Next →</button></div>}</div>
      <div ref={reader} className="provided-reader" tabIndex={-1} aria-label="Canonical source text"><SourceSections document={document} reference={selection.reference} sectionId={sectionId} /></div>
      {selection.reference && <div className="source-footer"><button type="button" className="text-button" onClick={() => { if (trigger.current?.isConnected) trigger.current.focus(); else heading.current?.focus(); }}>← Return to source link</button></div>}
    </div></div>
  </section>;
}
