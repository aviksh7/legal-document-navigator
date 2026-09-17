import { useState } from "react";
import { EvidenceLink, StatementContent, type OpenSource } from "./evidence";
import { comparisonIsValid } from "./model";
import type { WorkspaceFixture } from "./types";

export function CompareView({ fixture, added, onAdded, onOpen }: { fixture: WorkspaceFixture; added: boolean; onAdded: (value: boolean) => void; onOpen: OpenSource }) {
  const [changesOnly, setChangesOnly] = useState(true);
  const rows = fixture.comparison.filter((item) => !changesOnly || item.kind !== "unchanged");
  return <section id="comparison">
    <div className="section-heading"><div><span className="eyebrow">Read across versions</span><h2>What changed?</h2></div></div>
    <p className="section-intro">Compare the original agreement with a prepared revision, clause by clause.</p>
    {!added ? <div className="empty-state comparison-empty"><span className="document-glyph" aria-hidden="true">Ⅱ</span><h3>A second version makes the changes visible</h3><p>The revised sample changes notice, probation and expenses, adds a review clause, and removes an allowance.</p><button className="button primary" type="button" onClick={() => onAdded(true)}>Add sample revision <span aria-hidden="true">+</span></button><span className="quiet-label">Synthetic versions · prepared comparison</span></div> : <>
      <div className="comparison-toolbar"><span className="quiet-label">Original <span aria-hidden="true">→</span> Revised</span><button className="text-button" type="button" onClick={() => onAdded(false)}>Remove revision</button></div>
      <p className="reading-note">{fixture.comparisonCoverage}</p>
      <div className="filter-row"><label><input type="checkbox" checked={changesOnly} onChange={(event) => setChangesOnly(event.target.checked)} /> Show changes only</label><span className="quiet-label">{rows.length} clauses shown</span></div>
      <div className="comparison-list">{rows.map((item) => <article className="comparison-row" key={item.id}>
        <div className="comparison-row-heading"><h3>{item.title}</h3><span className={`change-label ${item.kind}`}>{item.kind}</span></div>
        {!comparisonIsValid(fixture, item) ? <div className="unavailable-message" role="status">Comparison unavailable. A source reference could not be validated.</div> : <>
          <div className="comparison-sides">{(["original", "revised"] as const).map((side) => <div className="comparison-side" key={side}><span className="eyebrow">{side === "original" ? "Original" : "Revised"}</span>{item[side].length ? item[side].map((reference) => <div key={`${reference.documentId}-${reference.blockId}`}><blockquote>{reference.quote}</blockquote><EvidenceLink documents={fixture.documents} reference={reference} allowedIds={[side === "original" ? fixture.originalId : fixture.revisedId]} onOpen={onOpen} /></div>) : <p className="muted absent-clause">{item.kind === "unresolved" ? "No established counterpart in this comparison." : `Not present in the ${side} sample.`}</p>}</div>)}</div>
          <StatementContent statement={item.explanation} documents={fixture.documents} allowedIds={[fixture.originalId, fixture.revisedId]} onOpen={onOpen} />
        </>}
      </article>)}</div>
    </>}
  </section>;
}
