import { useEffect, useRef } from "react";
import { resolveEvidence } from "./model";
import { SourceSections } from "./source-sections";
import type { OpenSource } from "./evidence";
import type { SourceDocument, SourceReference } from "./types";

export function SourcePanel({ documents, originalId, selection, narrow, open, onOpen, onReturn }: { documents: SourceDocument[]; originalId: string; selection: { reference: SourceReference | null; sequence: number }; narrow: boolean; open: boolean; onOpen: OpenSource; onReturn: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const resolved = selection.reference ? resolveEvidence(documents, selection.reference, documents.map((d) => d.id)) : null;
  const document = resolved?.ok ? resolved.document : documents.find((doc) => doc.id === originalId)!;
  useEffect(() => {
    const dialog = dialogRef.current;
    if (narrow && open && dialog && !dialog.open) dialog.showModal();
    if (narrow && !open && dialog?.open) dialog.close();
    if ((!narrow || open) && selection.sequence > 0) {
      const target = selection.reference && readerRef.current?.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(selection.reference.blockId)}"]`);
      (target || readerRef.current)?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "nearest", behavior: "instant" });
    }
  }, [selection, narrow, open]);
  const content = <>
    <div className="source-heading"><div><span className="eyebrow">Source document</span><h2 id="source-title">{document.versionLabel} agreement</h2></div>{narrow && <button type="button" className="icon-button" onClick={onReturn} aria-label="Close source">×</button>}</div>
    <div className="source-toolbar"><label className="sr-only" htmlFor="source-section">Jump to source section</label><select id="source-section" value={resolved?.ok ? resolved.section.id : ""} onChange={(event) => { const section = document.sections.find((s) => s.id === event.target.value); if (!section) return; const block = section.blocks[0]; onOpen({ documentId: document.id, version: document.version, blockId: block.id, start: 0, end: block.text.length, quote: block.text }, event.currentTarget); }}><option value="" disabled>Jump to a section</option>{document.sections.map((section) => <option key={section.id} value={section.id}>{section.number} · {section.title}</option>)}</select></div>
    <div className="source-reader" ref={readerRef} tabIndex={-1} aria-label={`${document.versionLabel} source text`}>
      {resolved && !resolved.ok ? <p className="unavailable-message">Source unavailable. The reference could not be validated.</p> : <>
        <div className="source-document-intro"><span className="eyebrow">Synthetic document</span><h3>{document.title}</h3><p>{document.parties?.join(" & ")}</p></div>
        <SourceSections document={document} reference={selection.reference} />
        <p className="source-end">End of synthetic {document.versionLabel.toLowerCase()} · {document.sections.length} sections</p>
      </>}
    </div>
    <div className="source-footer">{selection.sequence > 0 ? <button className="text-button" type="button" onClick={onReturn}>← Return to reading</button> : <span>Select any citation to inspect its wording.</span>}</div>
  </>;
  if (narrow) return <dialog ref={dialogRef} className="source-dialog" aria-labelledby="source-title" onCancel={(event) => { event.preventDefault(); onReturn(); }} onKeyDown={(event) => {
    if (event.key !== "Tab") return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button, select, a[href], [tabindex='0']"));
    const first = controls[0];
    const last = controls[controls.length - 1];
    const active = event.currentTarget.ownerDocument.activeElement;
    const outsideCycle = !controls.some((control) => control === active);
    if (event.shiftKey && (active === first || outsideCycle)) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && (active === last || outsideCycle)) { event.preventDefault(); first?.focus(); }
  }}>{content}</dialog>;
  return <aside className="source-pane" aria-labelledby="source-title">{content}</aside>;
}
