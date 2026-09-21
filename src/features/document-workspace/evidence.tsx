import { presentStatement, resolveEvidence } from "./model";
import type { SourceDocument, SourceReference, Statement } from "./types";

export type OpenSource = (reference: SourceReference, trigger: HTMLElement) => void;

export function EvidenceLink({ documents, reference, allowedIds, onOpen }: { documents: SourceDocument[]; reference: SourceReference; allowedIds: string[]; onOpen: OpenSource }) {
  const result = resolveEvidence(documents, reference, allowedIds);
  if (!result.ok) return <span className="unavailable">Source unavailable</span>;
  if (result.document.version === "provided") {
    const label = result.block.provenance?.kind === "pdf" ? `PDF page ${result.block.provenance.pageNumber}` : "Pasted text";
    return <button type="button" className="citation" onClick={(event) => onOpen(reference, event.currentTarget)} aria-label={`Read ${label}, block ${Number(result.block.id.slice(2))}`}>
      {label} · Block {Number(result.block.id.slice(2))} <span aria-hidden="true">↗</span>
    </button>;
  }
  return <button type="button" className="citation" onClick={(event) => onOpen(reference, event.currentTarget)} aria-label={`Read ${result.document.versionLabel}, section ${result.section.number}: ${result.section.title}`}>
    <span aria-hidden="true">§</span> {result.section.number} <span className="citation-version">{result.document.versionLabel}</span> <span aria-hidden="true">↗</span>
  </button>;
}

export function StatementContent({ statement, documents, allowedIds, onOpen, showBasis = true }: { statement: Statement; documents: SourceDocument[]; allowedIds: string[]; onOpen: OpenSource; showBasis?: boolean }) {
  const result = presentStatement(documents, statement, allowedIds);
  if (!result.ok) return <div className="unavailable-message" role="status"><strong>Explanation unavailable</strong><p>Its source reference could not be validated. This statement has been withheld.</p></div>;
  return <div className="statement">
    {showBasis && <span className="eyebrow subtle">{statement.kind === "limited" ? "Information incomplete" : statement.basis === "document-wording" ? "Document wording" : "Explanation"}</span>}
    <p>{statement.text}</p>
    {statement.qualification && <p className="qualification"><span className="qualification-label">{statement.qualification.reason === "missing-material" ? "Missing material" : statement.qualification.reason === "ambiguous" ? "Wording unclear" : statement.qualification.reason === "conflicting" ? "Conflicting passages" : "Not specified"}</span>{statement.qualification.detail}</p>}
    {!!statement.references.length && <div className="citations" aria-label="Supporting source passages">{statement.references.map((reference, i) => <EvidenceLink key={`${reference.documentId}-${reference.blockId}-${i}`} documents={documents} reference={reference} allowedIds={allowedIds} onOpen={onOpen} />)}</div>}
  </div>;
}
