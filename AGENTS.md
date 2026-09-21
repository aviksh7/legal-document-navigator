<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Repository map

Current state: Next.js App Router with a synthetic document workspace, browser-local
PDF/paste ingestion and a development-only mocked AI boundary. Live AI is disabled.

- [README](README.md): setup and commands.
- [Product](docs/PRODUCT.md): public scope and acceptance goals.
- [Architecture](docs/ARCHITECTURE.md): current structure and planned boundaries.
- [Design](docs/DESIGN.md): intended interaction and accessibility requirements.
- [AI system](docs/AI_SYSTEM.md): future contracts, evidence checks, and failures.
- [Security](docs/SECURITY.md): repository hygiene and planned data protections.
- [Testing](docs/TESTING.md): checks, browser verification, and future test layers.
- [Decisions](docs/DECISIONS.md): adopted choices and revisit triggers.

## Working rules

- Work on `main`; keep changes focused and reviewable. Commit or push only when
  explicitly requested.
- Use npm and the Node version in `.nvmrc`. Preserve the lockfile and generated
  Next.js conventions, including this managed block and `CLAUDE.md` forwarding.
- Keep documentation explicit about current behavior versus planned work.
- Add dependencies only for a concrete need. Do not introduce product UI, AI,
  authentication, storage infrastructure, or speculative abstractions as harness work.
- Keep secrets, real documents, and local notes out of source, public assets,
  logs, screenshots, and commit-facing text. Honor local Git exclusions.
- Future AI explains meaning; deterministic code establishes or validates facts
  where practical. Require runtime-validated structured outputs and source evidence.
- Unsupported output must fail safely. Make uncertainty explicit and avoid
  unnecessary retention or logging of document content.

## Verification and handoff

- Run `npm run check` for repository hygiene, lint, type checking, and build.
- Follow `docs/TESTING.md` for relevant browser checks and future tests.
- Inspect the full proposed change, including untracked files and staged content.
- Report changed files, commands and results, deferred work, and remaining risks.
  Agent confidence is not verification; never claim a check ran when it did not.
