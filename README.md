# Legal Document Navigator

A synthetic legal-document workspace for understanding terms, comparing prepared
versions, and finding source passages. This phase uses authored fixtures only.
There is no real document intake, live AI, legal research, account, or storage.
The explanations have not been legally verified.

## Run locally

Use Node **24.18.0** from `.nvmrc`, npm, and the committed lockfile.

```sh
npm ci
npm run dev
```

Open http://localhost:3000 and choose **Open sample agreement**. The workspace
starts with Understand; Compare adds a prepared revision; Ask & Navigate offers
six prepared questions and literal source search. Questions and selections stay
in page memory and reset on reload. No API keys or application services are needed.

## Verification

```sh
npm run check
```

The gate runs repository hygiene, Vitest, lint, generated route types plus strict
TypeScript, and a production build. Individual commands are `check:repo`, `test`,
`lint`, `typecheck`, and `build`. After building, use `npm run start` for browser
verification. The existing `next/font` build step may need network access; fonts
are served locally to browsers. This is not an offline build guarantee.

Vitest is the only added test dependency. Pure tests cover fixture integrity,
evidence validation, comparison membership, prepared-question matching, and
literal search. No browser-test packages are installed. See
[Testing](docs/TESTING.md) for manual checks and their limits.

Development includes an explicit scenario selector for loading, partial, failure,
and invalid-evidence presentations. It is excluded from production rendering and
has no URL or storage override. The normal sample has no fake processing delays.

## Architecture and documentation

Routes live in `src/app/`; the feature lives in `src/features/document-workspace/`.
Canonical evidence identity is document ID plus block ID. Quote, offsets, and
version are validated before a claim is shown; invalid references are not repaired.

- [Product scope](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Design and accessibility](docs/DESIGN.md)
- [Future AI boundary](docs/AI_SYSTEM.md)
- [Security and privacy limits](docs/SECURITY.md)
- [Testing](docs/TESTING.md)
- [Decisions](docs/DECISIONS.md)

Work stays on `main`. Commit and push only when explicitly requested. Private
notes and real documents must not enter fixtures, public files, or repository text.
