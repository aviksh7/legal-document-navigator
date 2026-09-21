# Legal Document Navigator

A browser-local legal-document source reader, with a synthetic workspace for
exploring prepared explanations and comparisons. Upload a text-bearing PDF or
paste text to read deterministic evidence blocks. Real documents receive no AI
or legal analysis. There is no account or persistence. Phase 3 adds a development-only server mock;
production AI remains disabled and no live inference adapter exists.
The sample explanations have not been legally verified.

## Run locally

Use Node **24.18.0** from `.nvmrc`, npm, and the committed lockfile.

```sh
npm ci
npm run dev
```

Open http://localhost:3000 and choose **Upload PDF**, **Paste text**, or
**Open sample agreement**. PDFs are limited to 10 MiB / 100 pages; pasted text to
200,000 UTF-16 code units. Current major browsers and a secure context (HTTPS or
localhost) are required. The sample workspace
starts with Understand; Compare adds a prepared revision; Ask & Navigate offers
six prepared questions and literal source search. Questions and selections stay
in page memory and reset on reload. No API keys or application services are needed.

## Mocked Phase 3

```sh
AI_ENABLED=true AI_MODE=mock APP_ORIGIN=http://localhost:3000 npm run dev
npm run eval:mock
```

Open a development synthetic AI test document, confirm the non-sensitive-content
disclosure, then choose **Understand · Mock** or **Ask · Mock**. Confirmation sends
canonical text to this app's server only. No Hugging Face or other inference calls
are made; estimated credit consumption is $0. Unknown documents receive no invented
mock analysis. Production remains disabled regardless of these flags. No token is
needed. See [AI system](docs/AI_SYSTEM.md) for budgets and deferred qualification.

## Verification

```sh
npm run check
```

The gate runs repository hygiene, Vitest, lint, generated route types plus strict
TypeScript, and a production build. Individual commands are `check:repo`, `test`,
`lint`, `typecheck`, and `build`. After building, use `npm run start` for browser
verification. The existing `next/font` build step may need network access; fonts
are served locally to browsers. This is not an offline build guarantee.

Vitest is the only added test dependency. Tests cover fixture integrity,
evidence validation, ingestion/normalization/identity, limits, cleanup, cancellation,
AI boundary/schema/failure handling, and real PDF.js parsing of generated synthetic PDFs. No browser-test packages are installed. See
[Testing](docs/TESTING.md) for manual checks and their limits.

Development includes an explicit scenario selector for loading, partial, failure,
and invalid-evidence presentations. It is excluded from production rendering and
has no URL or storage override. The normal sample has no fake processing delays.

## Architecture and documentation

Routes live in `src/app/`; source/evidence components live in
`src/features/document-workspace/`, ingestion in `src/features/document-ingestion/`.
Canonical evidence identity is document ID plus block ID. Quote, offsets, and
version are validated before a claim is shown; invalid references are not repaired.

PDF.js 6.3.289 is loaded only for PDF intake, using its modern public API and a
bundled same-origin module worker. No worker copy script, CDN, OCR, or auxiliary
asset pack is used. Pasted text preserves whitespace except CR/CRLF → LF. PDF
quotes are exact against PDF.js-extracted text, not original PDF bytes or layout.
Reading order and completeness are not guaranteed; suspicious extraction requires
explicit review. Local reading keeps contents in browser memory and clears them on reset/reload;
browser, extension and OS retention are outside this application guarantee.

- [Product scope](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Design and accessibility](docs/DESIGN.md)
- [Mock AI boundary and future qualification](docs/AI_SYSTEM.md)
- [Security and privacy limits](docs/SECURITY.md)
- [Testing](docs/TESTING.md)
- [Decisions](docs/DECISIONS.md)

Work stays on `main`. Commit and push only when explicitly requested. Private
notes and real documents must not enter fixtures, public files, or repository text.
