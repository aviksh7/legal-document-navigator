import type { WorkspaceFixture } from "./types";

export type PreviewState = { status: "ready" | "loading" | "partial" | "failure" | "invalid-evidence"; fixture: WorkspaceFixture };
export function DevelopmentScenarios({ baseline, state, onChange }: { baseline: WorkspaceFixture; state: PreviewState; onChange: (state: PreviewState) => void }) {
  if (process.env.NODE_ENV !== "development") return null;
  return <details className="development-scenarios"><summary>Development scenarios</summary><label htmlFor="scenario">Preview state</label><select id="scenario" value={state.status} onChange={(event) => {
    const status = event.target.value as PreviewState["status"];
    const fixture = structuredClone(baseline);
    if (status === "invalid-evidence") {
      fixture.overview.references[0].end = 999999;
      fixture.terms[1].statement.references[0].version = "revised";
      fixture.attention[0].statement.references[0].blockId = "missing-block";
    }
    if (status === "partial") fixture.terms = fixture.terms.filter((term) => term.category !== "Money");
    onChange({ status, fixture });
  }}><option value="ready">Normal sample</option><option value="loading">Loading layout</option><option value="partial">Partial information</option><option value="failure">Workspace failure</option><option value="invalid-evidence">Invalid evidence</option></select><p>Development only. No processing or timers are simulated.</p></details>;
}
