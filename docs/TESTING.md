# Testing and verification

## Current checks

Use Node from `.nvmrc` and install the locked dependencies with `npm ci`.

| Command | Checks |
| --- | --- |
| `npm run check:repo` | Indexed and visible new paths against repository hygiene rules. |
| `npm run lint` | ESLint, with warnings treated as failures. |
| `npm run typecheck` | `next typegen` followed by `tsc --noEmit`. |
| `npm run build` | The production Next.js build. |
| `npm run check` | All four checks above, sequentially. |

Route types are required by the scaffold's `LayoutProps`; generate them even on
a fresh checkout. Keep `next-env.d.ts`, `.next/`, and `*.tsbuildinfo` ignored.
Do not disable lint rules or build type errors just to make verification pass.

CI runs `npm ci` and these four checks with no application keys, services, AI
calls, deployments, or browser automation. Package installation and the scaffold's
Google-font downloads need network access. A successful local run does not claim
the hosted workflow has run.

## Manual review

Inspect changed and untracked files, then review staged content before a commit.
For app changes, build and run `npm run start`; check the affected routes, assets,
browser console, keyboard interaction, and narrow-screen behavior. Report exact
commands, outcomes, and skipped checks. A build alone does not prove browser behavior.

## Future tests, not installed

- **Unit:** colocated tests for deterministic transformations, edge cases, and
  schema/evidence validators. Add the first runner with meaningful tests.
- **Integration:** trust boundaries and provider adapters, using mocked responses
  for malformed output, missing evidence, timeouts, and refusals.
- **Browser:** `tests/e2e/` for complete user workflows and visible failure states
  when those workflows exist. Prefer browser coverage for async server rendering.
- **AI evaluation:** separately assess semantic quality; contract validity alone
  does not establish factual correctness. Live calls stay outside default CI.

Use small synthetic fixtures with explicit expected outcomes. Do not commit real
user documents or recorded sensitive responses. Add `test`, `test:watch`, and
`test:e2e` only when their suites exist. Coverage thresholds and formatter tooling
are deferred; there are no placeholder passing test commands.
