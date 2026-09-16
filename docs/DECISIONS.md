# Engineering decisions

These decisions describe the scaffold and harness. Product architecture and AI
behavior remain planned, not implemented. Add short dated entries for material
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
