import { useRef, useState } from "react";
import { EvidenceLink, StatementContent, type OpenSource } from "./evidence";
import { matchQuestion, searchDocument } from "./model";
import { revealIfNeeded } from "./navigation";
import type { WorkspaceFixture } from "./types";

export function AskNavigateView({ fixture, selectedId, onSelected, onOpen }: { fixture: WorkspaceFixture; selectedId: string | null; onSelected: (id: string | null) => void; onOpen: OpenSource }) {
  const [input, setInput] = useState("");
  const [questionError, setQuestionError] = useState<"empty" | "unsupported" | null>(null);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const answerHeading = useRef<HTMLHeadingElement>(null);
  const document = fixture.documents.find((doc) => doc.id === fixture.originalId)!;
  const question = fixture.questions.find((q) => q.id === selectedId);
  const results = searchDocument(document, submittedSearch);
  function select(id: string) {
    onSelected(id);
    setQuestionError(null);
    requestAnimationFrame(() => revealIfNeeded(answerHeading.current));
  }
  return <>
    <section id="ask"><span className="eyebrow">Stay close to the document</span><h2>Ask & Navigate</h2><p className="section-intro">Start with a question, or find the wording yourself.</p>
      <form className="question-form" onSubmit={(event) => { event.preventDefault(); const found = matchQuestion(fixture.questions, input); onSelected(found?.id ?? null); setQuestionError(found ? null : input.trim() ? "unsupported" : "empty"); }}>
        <label htmlFor="question-input">Question about the original agreement</label>
        <p id="question-help" className="input-help">This sample has prepared answers for the questions below. Typed questions use a limited set of matching phrases.</p>
        <div className="input-row"><input id="question-input" value={input} onChange={(event) => setInput(event.target.value)} maxLength={500} placeholder="e.g. What is the notice period?" aria-describedby={`question-help${questionError === "empty" && !question ? " question-error" : questionError === "unsupported" && !question ? " question-unsupported" : ""}`} aria-invalid={questionError === "empty" && !question} /><button type="submit" className="button primary">Find answer <span aria-hidden="true">→</span></button></div>
        {questionError === "empty" && !question && <p className="field-error" id="question-error" role="alert">Enter a question or choose one below.</p>}
      </form>
      <div className="answer-region" aria-live="polite" aria-atomic="false">
        {questionError === "unsupported" && !question && <div className="unavailable-message" id="question-unsupported"><h3>This question is outside the prepared sample</h3><p>No answer was generated. Choose a question below, or use Find in document to explore the source.</p></div>}
        {question && <article className="answer" key={question.id}><span className="eyebrow">Prepared answer · Original</span><h3 ref={answerHeading}>{question.question}</h3><StatementContent statement={question.answer} documents={fixture.documents} allowedIds={[fixture.originalId]} onOpen={onOpen} /></article>}
      </div>
      <h3 className="small-heading">Explore a question</h3><div className="question-list">{fixture.questions.map((q) => <button type="button" key={q.id} aria-pressed={selectedId === q.id} onClick={() => select(q.id)}>{q.question}<span aria-hidden="true">↗</span></button>)}</div>
    </section>
    <section id="find" className="content-section"><h2>Find in document</h2><p className="section-intro">Literal text search in the original sample. No interpretation or semantic matching.</p>
      <form onSubmit={(event) => { event.preventDefault(); setSubmittedSearch(search.trim()); }}><label htmlFor="source-search">Word or phrase</label><div className="input-row"><input type="search" id="source-search" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={200} placeholder="e.g. written notice" /><button className="button secondary" type="submit">Search</button></div></form>
      <div aria-live="polite">{submittedSearch && <><div className="filter-row"><p className="quiet-label">{results.length ? `${results.length} ${results.length === 1 ? "match" : "matches"}` : "No matches"} for “{submittedSearch}”</p><button className="text-button" type="button" onClick={() => { setSearch(""); setSubmittedSearch(""); }}>Clear search</button></div>{results.map((result) => <article className="search-result" key={`${result.reference.blockId}-${result.reference.start}`}><h3>{result.section.title}</h3><p>{result.snippet}</p><EvidenceLink documents={fixture.documents} reference={result.reference} allowedIds={[document.id]} onOpen={onOpen} /></article>)}</>}</div>
    </section>
    <section id="contents" className="content-section"><h2>Document contents</h2><ol className="contents-list">{document.sections.map((section) => <li key={section.id}><button type="button" onClick={(event) => { const block = section.blocks[0]; onOpen({ documentId: document.id, blockId: block.id, version: document.version, quote: block.text, start: 0, end: block.text.length }, event.currentTarget); }}><span className="quiet-label">{section.number}</span>{section.title}<span aria-hidden="true">↗</span></button></li>)}</ol></section>
  </>;
}
