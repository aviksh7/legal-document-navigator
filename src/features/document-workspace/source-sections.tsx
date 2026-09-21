import { resolveEvidence } from "./model";
import type { SourceDocument, SourceReference } from "./types";

/** Both sample and real intake render the same canonical text and exact spans. */
export function SourceSections({ document, reference, sectionId }: { document: SourceDocument; reference: SourceReference | null; sectionId?: string }) {
  const resolved = reference ? resolveEvidence([document], reference, [document.id]) : null;
  if (resolved && !resolved.ok) return <p className="unavailable-message">Source unavailable. The reference could not be validated.</p>;
  return <>{document.sections.filter(section => !sectionId || section.id === sectionId).map(section => <section className="source-section" key={section.id} data-section-id={section.id} tabIndex={-1}>
    <h3>{!section.kind && <span>{section.number}</span>}{section.title}</h3>
    {!section.blocks.length && <p className="empty-page">No text extracted from this page. Extraction may be incomplete; the page may contain an image or scan.</p>}
    {section.blocks.map(block => {
      const selected = resolved?.ok && resolved.block.id === block.id;
      return <p key={block.id} data-block-id={block.id} tabIndex={-1} dir="auto" className={`${document.ingestion ? "canonical-text " : ""}${selected ? "selected-passage" : ""}`}>
        {selected ? <>{block.text.slice(0, resolved.reference.start)}<mark>{block.text.slice(resolved.reference.start, resolved.reference.end)}</mark>{block.text.slice(resolved.reference.end)}</> : block.text}
      </p>;
    })}
  </section>)}</>;
}
