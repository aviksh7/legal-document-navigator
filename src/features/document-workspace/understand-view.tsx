import { StatementContent, type OpenSource } from "./evidence";
import { presentStatement } from "./model";
import { categories, type WorkspaceFixture } from "./types";

export function UnderstandView({ fixture, onOpen, onQuestion }: { fixture: WorkspaceFixture; onOpen: OpenSource; onQuestion: (id: string) => void }) {
  const evidenceProps = { documents: fixture.documents, allowedIds: [fixture.originalId], onOpen };
  return <>
    <section id="overview" className="overview-section">
      <div className="section-heading"><div><span className="eyebrow">A first reading</span><h2>The agreement at a glance</h2></div><span className="quiet-label">Original version</span></div>
      <StatementContent statement={fixture.overview} {...evidenceProps} showBasis={false} />
      <p className="reading-note">Prepared explanations of a synthetic document. They have not been legally verified and do not cover every rule of Indian employment law.</p>
    </section>
    <section id="attention" className="content-section">
      <div className="section-heading"><h2>Points to clarify <span className="count">{fixture.attention.length}</span></h2></div>
      <p className="section-intro">A few places where more detail would help you understand the wording.</p>
      <div className="attention-list">{fixture.attention.map((item, i) => <article className="attention-item" key={item.id}>
        <span className="attention-number" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
        <div><span className="attention-label">{item.label}</span><h3>{presentStatement(fixture.documents, item.statement, [fixture.originalId]).ok ? item.title : "Point to clarify unavailable"}</h3><StatementContent statement={item.statement} {...evidenceProps} showBasis={false} />{presentStatement(fixture.documents, item.statement, [fixture.originalId]).ok && <button className="text-button question-followup" type="button" onClick={() => onQuestion(item.questionId)}>Explore this question <span aria-hidden="true">→</span></button>}</div>
      </article>)}</div>
    </section>
    <section id="terms" className="content-section">
      <div className="section-heading"><h2>Key terms <span className="count">{fixture.terms.length}</span></h2></div>
      <p className="section-intro">Grouped for reading. Each explanation links back to the agreement.</p>
      {categories.map((category) => <section className="term-category" id={`category-${category.toLowerCase()}`} key={category}>
        <h3 className="category-title">{category}</h3>
        {fixture.terms.filter((term) => term.category === category).map((term) => <article className="term-row" key={term.id}><h4>{presentStatement(fixture.documents, term.statement, [fixture.originalId]).ok ? term.label : "Term unavailable"}</h4><StatementContent statement={term.statement} {...evidenceProps} /></article>)}
        {!fixture.terms.some((term) => term.category === category) && <p className="muted">No terms are listed for this category in this sample.</p>}
      </section>)}
    </section>
    <section id="questions" className="content-section"><h2>Questions worth asking</h2><div className="question-list">{fixture.questions.map((question) => <button type="button" key={question.id} onClick={() => onQuestion(question.id)}>{question.question}<span aria-hidden="true">↗</span></button>)}</div></section>
  </>;
}
