import Link from "next/link";
import { workspaceFixture } from "@/features/document-workspace/fixtures";
import { DocumentIntake } from "@/features/document-ingestion/intake";

export default function Home() {
  const sample = workspaceFixture.documents[0];
  return <>
    <a className="skip-link" href="#entry-content">Skip to content</a>
    <header className="app-header"><span className="wordmark"><span className="brand-mark" aria-hidden="true">L /</span> Legal Document Navigator</span><span className="sample-badge"><span aria-hidden="true" />Local source reader</span></header>
    <main className="entry-main" id="entry-content">
      <div className="entry-heading"><span className="eyebrow">A clearer reading</span><h1>Read the agreement.<br /><span>Keep the source in view.</span></h1><p>Bring your document to a local reading workspace, or explore prepared explanations in the synthetic sample.</p></div>
      <DocumentIntake />
      <section className="entry-sample" aria-labelledby="sample-heading"><div className="sample-description"><span className="eyebrow">Explore a synthetic document</span><h2 id="sample-heading">{sample.title}</h2><p>An illustrative Product Analyst agreement, with a prepared revision to compare.</p><dl className="sample-facts"><div><dt>Location in sample</dt><dd>{sample.jurisdiction}</dd></div><div><dt>Document set</dt><dd>Original + revised version</dd></div><div><dt>Source material</dt><dd>{sample.sections.length} sections of authored text</dd></div></dl><Link className="button primary" href="/workspace">Open sample agreement <span aria-hidden="true">→</span></Link></div><div className="entry-outline"><span className="eyebrow">Inside the workspace</span><ol><li><span>01</span><div><h3>Understand</h3><p>Key terms, points to clarify, and the passages behind them.</p></div></li><li><span>02</span><div><h3>Compare</h3><p>Read selected changes alongside both versions.</p></div></li><li><span>03</span><div><h3>Ask & Navigate</h3><p>Explore prepared questions or find a phrase in the source.</p></div></li></ol></div></section>
      <div className="entry-disclosure"><span className="eyebrow">About this sample</span><p>This is synthetic material, not a real agreement or a legal template. Explanations are prepared and have not been legally verified. They do not cover every rule of Indian employment law.</p><p>Real documents open as source text only. Prepared explanations and comparison are available only for the sample.</p></div>
    </main><footer className="entry-footer"><span>Legal Document Navigator</span><span>Read with context.</span></footer>
  </>;
}
