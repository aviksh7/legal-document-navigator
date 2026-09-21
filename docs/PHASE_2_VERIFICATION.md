# Phase 2 implementation verification

Performed locally with Node 24.18.0, synthetic data only. No commit or push.

## Commands

- Exact `pdfjs-dist@6.3.289` install: succeeded; npm audit reported zero vulnerabilities.
- `npm run check`: repository hygiene, all tests, lint and typecheck passed before
  the normal production build failed. Turbopack reported `globals.css` worker
  `binding to a port: Operation not permitted`. An elevated retry reproduced it.
  This is the previously documented host restriction, not a passing default build.
- Final `npm run test`: 115 passing tests, six files. All existing sample tests
  retained. No browser/E2E package added.
- Final `npm run check:repo`, `npm run lint`, `npm run typecheck`: passed.
- Final `npm run build -- --webpack`: passed, static `/` and `/workspace` routes.
- `git diff --check`: passed. No staged content.

## Parser and browser acceptance

Modern public API acceptance uses generated PDFs: normal repeated text/two pages,
password required, empty-password encryption, malformed object tree, blank and
image-only pages, low overall text, single blank separator versus multiple sparse
pages, >100 pages, forms, <20 usable characters, excessive overlapping extracted
text and cancellation. Unit adapters separately exercise malformed public output,
attachments/permissions/XFA rejection, character/item limits, stuck parser/page
deadlines, native worker failure/disposal and late-job ownership.

In-app Chromium browser: modern bundled worker succeeded under Turbopack development
and webpack production. Production exercised PDF success, page search/exact highlight,
malformed and password-required rejection, image-only rejection, sparse review and
explicit acceptance, empty separator warning/navigation, oversized/empty/wrong-header
files, >100 pages, insufficient text and excessive extracted text. Paste exercised
success, blank/short/oversized rejection, exact spacing/line breaks, literal script
markup rendered as text, clear/retry and reset on reload. Cancellation and replacement
by paste were exercised; the replacement remained active afterwards.

Inspected desktop at 1280 px and mobile at 390/320 px. Narrow source/paste screens
reflowed without page overflow. Sample browser regression covered Understand,
source dialog/Escape, adding the revision, Compare, prepared missing-Schedule-A
answer and unsupported question. The full sample model regression suite also passes.

## Privacy and cleanup evidence; remaining verification gaps

Browser resource inventory after PDF intake showed only same-origin fonts, CSS,
app/parser chunks, the bundled worker chunk and sample-route prefetches. No document
filename, source text or search entered the page URL or observed resource URLs.
Console inspection during acceptance showed no application/parser warning/error
payloads. Source audit found no application storage, network, content logging,
HTML injection or object-URL APIs. Text is escaped React content. No object URL is
created; none needs revocation. Unit lifecycle checks assert parser destruction,
page cleanup, native termination and correct replacement-worker ownership.

Live Chrome DevTools inspection was limited: extension file selection returned
`Not allowed`, and native browser control subsequently became unavailable. A full
live storage/request-body/worker-heap inspection was therefore not completed.
The resource inventory and code/lifecycle checks above are the available evidence;
they do not establish browser/OS memory erasure. No extension permissions were changed.

The normal Turbopack production build still needs a host permitting its local
worker port. Safari/Firefox and a representative range of multilingual/font/CMap
PDFs have not been accepted here. Only the tested extraction path is provisioned;
auxiliary assets, OCR and visual reading-order reconstruction remain deferred.
Quality thresholds are heuristics, not completeness/confidence measurements.

## Changed files

Existing files: `AGENTS.md`, `README.md`, `package.json`, `package-lock.json`;
`docs/{AI_SYSTEM,ARCHITECTURE,DECISIONS,DESIGN,PRODUCT,SECURITY,TESTING}.md`;
`src/app/{globals.css,layout.tsx,page.tsx}`;
`src/features/document-workspace/{types.ts,model.ts,model.test.ts,evidence.tsx,source-panel.tsx,workspace.tsx}`.

New files: this verification record, `src/features/document-workspace/source-sections.tsx`,
and the following under `src/features/document-ingestion/`:

- `types.ts`, `processing.ts`, `processing.test.ts`
- `pdf-text.ts`, `pdf-text.test.ts`, `pdf.ts`, `pdf.test.ts`
- `pdf-runtime.ts`, `pdf-runtime.test.ts`, `pdfjs.d.ts`
- `jobs.ts`, `jobs.test.ts`, `messages.ts`
- `intake.tsx`, `source-workspace.tsx`, `testing/synthetic-pdf.ts`

Working tree: 20 modified tracked files and 18 untracked new files; nothing staged.
Synthetic binary acceptance fixtures stay in ignored `.local/`, outside the change.
