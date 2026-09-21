# Phase 3 mock verification — 2026-09-20

## Implemented scope

Development-only mock Understand/Ask, strict Zod contracts, same-origin routes,
request/prompt limits, source-ID validation on server and client, canonical quote
mapping, consent, cancellation, cooldown and fixed failures. Exactly matching
synthetic documents receive authored mock responses. Arbitrary documents do not.
No live adapter, provider credentials, account/billing setup or inference requests.
Estimated and actual inference credit consumption for this work: $0.

New code is under `src/features/document-ai/` and `src/app/api/ai/`. Entry/intake,
the provided-document reader, CSS, package manifests and architecture/security/
product/testing documentation were updated. Existing deterministic ingestion and
sample evidence/comparison logic are retained.

## Commands and results

- `npm install --save-exact zod@4.6.5 --ignore-scripts --no-audit --no-fund`:
  succeeded; Zod was already transitively installed, now pinned as a direct runtime
  dependency. Offline attempt lacked registry cache. No other dependency added.
- `npm run check`: final run passed on Node 24.18.0: repository hygiene, **186 tests
  in 10 files**, lint, typecheck and default Turbopack production build. Phase 3
  contributes 71 tests. Required host permission for the build's worker ports and
  existing Google Fonts fetch. The initial sandboxed run failed at Turbopack port
  binding, not tests/lint/types. A webpack fallback also passed with font network
  access before the final successful default build.
- `npm run eval:mock`: passed 7 rehearsal tests, no provider calls. This is not a
  model qualification or a semantic quality score.
- `git diff --check`: passed; tracked changes, new files and staged state reviewed.
  Nothing staged, committed or pushed.

## Browser and production checks

Development used webpack on localhost:3100 with explicit mock flags and exact
APP_ORIGIN. Browser checks used only authored synthetic content:

- Confirmation checkbox initially blocks both AI actions. Disclosure says app
  server mock with no external inference, and restricts documents/questions to
  non-sensitive public/synthetic content without personal information.
- All three fixture Understand paths rendered: missing Schedule A, conflicting
  thirty/sixty-day clauses with distinct block 2/3 references, and adversarial
  source instructions with only the prepared payment explanation in the result.
  The last case verifies mock plumbing, not a model's injection resistance.
- Suggested fee question populated Ask and returned a qualified missing-material
  response. Ten-second cooldown disabled subsequent calls.
- Evidence highlighted exact full-block canonical text, moved focus to block 2,
  and keyboard activation of Return restored focus to the initiating source link.
- Literal search still found the expected passage. Clear removed source, mock
  result, question and consent and focused intake. Reload reset the workspace.
- Reflow checked at 1280, 390 and 320 px; DOM scroll width did not exceed client
  width. Mobile tools no longer use a second constrained scroll area. A default
  viewport screenshot was inspected; this is not a full visual/accessibility audit.
- No warnings/errors appeared in the inspected development console logs. Server
  preview output contained request paths/timing, not document bodies. Native browser
  fetch binding was corrected after an initial safe-unavailable response, and a
  regression test now covers it.

Production used the final build on localhost:3101 with AI_ENABLED=true,
AI_MODE=mock, and APP_ORIGIN deliberately set. Direct POSTs with empty JSON to
both routes returned HTTP 503, `{ok:false,code:"ai-unavailable"}`, and no-store.
The browser showed no mock controls, even with attempted enable query parameters.
Synthetic paste, local literal search and the original sample workspace still
worked. Preview servers were stopped after verification.

## Remaining limits

Timeouts, malformed/oversized responses, quota/refusal/incomplete-output errors,
invalid evidence, stale responses, cancellation and no-retry behavior were tested
with injected transports/adapters. The immediate mock is not a live latency or
quota test. No full browser network capture, new PDF browser regression sweep,
screen-reader assessment, Vercel deployment, WAF configuration or hosted CI run
was performed in this phase. Existing PDF parser tests passed in the full suite.

Live HF qualification, current model/provider metadata recheck, underlying terms,
strict-provider-schema compatibility, real token accounting/cost reservations and
human semantic evaluation remain required before implementing/enabling a live
adapter. ID validation proves source membership, not entailment. No private or
confidential-document suitability is claimed. Semantic comparison remains deferred.
