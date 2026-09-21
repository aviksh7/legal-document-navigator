# Testing and verification

## Commands

Use Node 24.18.0 and `npm ci`.

| Command | Purpose |
| --- | --- |
| `npm run check:repo` | Repository path hygiene. |
| `npm run test` | Vitest run once, using the Node environment. |
| `npm run lint` | ESLint, warnings treated as failures. |
| `npm run typecheck` | Next route type generation and strict TypeScript. |
| `npm run build` | Production build. |
| `npm run check` | All five checks above, sequentially. |
| `npm run start` | Run a previously built production app for browser review. |

CI runs the same five checks after `npm ci`, without application secrets or live
AI calls. The existing font build may need network access. Local success is not
evidence that hosted CI ran. Generated Next.js files and build artifacts stay
ignored.

On hosts that prohibit Turbopack's local worker port, the default build can fail
with `binding to a port: Operation not permitted`. Use the supported
`npm run build -- --webpack` fallback for production verification and report that
distinction; do not treat an environmental failure as a passing default build.
Development previews can likewise use `npm run dev -- --webpack`.

## Pure tests

Vitest 4 is the only new direct test dependency, selected to retain the existing
Node type definitions. `model.test.ts` covers authored fixture integrity, evidence
identity and membership, version/quote/offset failures, fail-closed presentation,
comparison-side rules, alias matching/collisions, and literal search. No DOM or
browser test framework is installed. Tests use synthetic content only.

Phase 2 adds tests beside `document-ingestion/`: paste/normalization/provenance,
ordered identities, text conservation (including whitespace-only PDF pages),
quality thresholds, malformed streamed records, input/output budgets, safe errors,
stale jobs, deadlines and worker cleanup. `testing/synthetic-pdf.ts` generates
small PDF bytes, including encrypted fixtures, for real modern-parser acceptance.
Its MD5/RC4 is solely a test implementation of the PDF fixture encryption format,
not application identity or security code.

The Node 24 acceptance suite uses two test-only standard API shims (`toHex` and
`getOrInsertComputed`) needed by the modern build in that runtime, and restores
them afterwards. Browser code has no such shims or legacy fallback. Node parser
acceptance uses PDF.js's Node transport; actual bundled native-worker acceptance
must also run in a browser. Current total: 115 tests across six files (73 added
in Phase 2, including the bounded-search regression test).

## Manual browser acceptance

Run production after building and exercise entry → Understand → evidence → Compare
→ Ask & Navigate. Check prepared answers, unsupported/blank questions, missing
Schedule A, literal search (including no matches), source version selection,
comparison removal, and state reset on reload.

At desktop, tablet and mobile widths, inspect overflow, typography, metadata,
comparison stacking and source dialog behavior. Also check 320 px reflow and zoom.
Use keyboard only for tabs (arrows/Home/End), source opening, focus restoration,
dialog containment and Escape. Inspect semantic structure, focus visibility,
contrast and reduced motion. Inspect console, network and storage behavior.

Run development separately to exercise the scenario selector: static loading
layout, partial categories, workspace failure/reload, and invalid evidence. Confirm
that invalid claims are withheld rather than repaired. In production, verify the
selector and its controls are absent, including with attempted URL overrides.

Browser checks are manual/tool-assisted, not a committed automated suite. Record
actual commands, results and limitations; do not claim screen-reader testing or
full accessibility conformance without performing that assessment.

For intake, verify paste → source → exact search/highlight → clear/retry, then
PDF extraction and page navigation. Exercise malformed/password-required/image-only,
sparse/insufficient text, file/page/text limits, review acceptance, cancellation,
PDF replacement by paste, and reload/back navigation. Use synthetic inputs only.
Inspect resource origins and console, network payloads, storage and worker lifetime;
verify no input contents enter a URL or request. Review peak-memory limitations
separately from timeout tests. Inspect 1280 px desktop and 390/320 px mobile widths.
See [Phase 2 verification](PHASE_2_VERIFICATION.md) for performed checks and gaps.

## Review and future work

Inspect the entire diff, untracked files, staged content and final Git status.
Do not force-add excluded private material. Add browser-testing packages only
with their first meaningful tests. Future provider and schema tests use mocks;
live semantic evaluation remains separate from CI.
