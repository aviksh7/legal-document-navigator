# Engineering decisions

These decisions describe the harness and synthetic workspace. Real processing and
AI behavior remain planned, not implemented. Add short dated entries for material
choices; do not maintain a second specification here.

## 2026-09-15 — Preserve the framework scaffold

**Decision:** keep the App Router, strict TypeScript setup, Tailwind, ESLint presets,
managed Next.js AGENTS block, and CLAUDE forwarding reference.
**Reason:** use the installed framework's conventions and bundled documentation.
**Consequence:** generated types remain ignored and are recreated before type checking.
**Revisit:** a concrete feature or framework upgrade requires a change.

## 2026-09-15 — One runtime, package manager, and branch

**Decision:** Node 24.18.0 in `.nvmrc`, npm with its committed lockfile,
and one working branch, `main`. No automatic commits or pushes.
**Reason:** make local setup and CI reproducible and review straightforward.
**Consequence:** runtime upgrades require updating the pin and rerunning checks.
**Revisit:** a security update or supported-runtime requirement.

## 2026-09-15 — Minimal validation before feature work

**Decision:** repository hygiene, lint, generated types plus TypeScript, and a
production build form the initial gate. CI uses pinned action commits and no
application services or secrets. The existing font build may use the network.
**Reason:** establish useful checks with existing dependencies.
**Consequence:** test frameworks arrive with meaningful suites; browser checks are
manual when relevant. This gate does not establish product correctness.
**Revisit:** the first deterministic module, integration, or user workflow.

## 2026-09-15 — Explicit future AI and data boundaries

**Decision:** require structured runtime-validated responses, source evidence,
safe failures, explicit uncertainty, and minimal document retention/logging.
**Reason:** explanations must be inspectable and unsupported output must not look verified.
**Consequence:** no AI provider, authentication, database, ORM, vector storage,
LangChain, or state library is selected or installed now.
**Revisit:** an agreed feature demonstrates a concrete need; document the tradeoff first.

## 2026-09-15 — Synthetic document workspace

**Decision:** implement entry plus Understand, Compare and Ask & Navigate using
typed synthetic fixtures, local React state, and a shared responsive source reader.
**Reason:** establish a reviewable product workflow before real document handling.
**Consequence:** comparisons and answers are prepared; unsupported questions and
uncertainty are explicit. No upload, parser, API, persistence, auth or analytics.
**Revisit:** the first authorized real input or processing boundary.

## 2026-09-15 — Canonical evidence identity

**Decision:** identify evidence with document ID plus block ID; validate document
membership, version, exact quotes and offsets before rendering supported claims.
**Reason:** a matching quote alone must not select or repair evidence identity.
**Consequence:** invalid references withhold the affected statement. Mechanical
validation makes no claim about legal correctness or interpretation quality.
**Revisit:** new document formats require richer stable source locators.

## 2026-09-15 — First meaningful deterministic test suite

**Decision:** add Vitest 4.1.11 as the only new direct dependency and run its pure
model/evidence suite in the local and CI quality gates.
**Reason:** the product introduces deterministic behavior worth testing. Vitest 4
supports the existing Node type package without an unrelated dependency upgrade.
**Consequence:** no DOM environment, Testing Library, Playwright, axe, or coverage
package is installed. Browser review is tool-assisted/manual.
**Revisit:** the first meaningful component or automated browser suite.

## 2026-09-15 — Development previews only

**Decision:** guard loading, partial, failure and invalid-evidence scenario controls
with development-only branches; no production route, URL or storage override.
**Reason:** verify failure layouts without implying live analysis or processing.
**Consequence:** the normal sample is immediate and has no fake timers.
**Revisit:** real asynchronous document processing is authorized.
