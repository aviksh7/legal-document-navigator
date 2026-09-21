# Security

## Current protections and limits

The app supports browser-local PDF/paste intake and synthetic authored fixtures,
with no provider credentials, live inference, or document storage. Local extraction,
reading and search stay in browser memory. An explicitly confirmed development
mock sends canonical text and one optional question to this app's server. No
original PDF or filename is sent. Production AI always fails closed before body
reads. No content is placed in URLs, analytics or application logs. Reload resets the workspace. Browser or
operating-system behavior is outside this application-level statement.

There is no server action, analytics, content logging,
localStorage, sessionStorage, IndexedDB or cookie use. App code and parser assets
are served over the network; this is not an offline/no-network claim. Browser
extensions, devtools, clipboard history, swap, crash recovery, browser form
retention and OS behavior cannot be controlled or securely erased by this app.
Paste disables autocomplete/spellcheck; clear, replacement, page lifecycle and
unmount release active content state. No PDF Blob/object URLs are created.

PDFs are untrusted. The 10 MiB input cap, sequential pages, text/item/page/block
caps and abortable 30s job/5s page deadlines reduce abuse. Native worker termination
keeps cancellation independent of a stalled parser. They cannot guarantee bounded
peak memory during decompression or eliminate parser vulnerabilities. Exactly
pinned PDF.js must be reviewed for advisories on upgrade. No document JavaScript,
HTML, link actions, annotations, images or PDF canvas are executed/rendered. No
metadata, embedded attachment or parser exception is displayed or logged. The
filename is only a length-bounded, control-filtered display title, never identity.

Only supported public APIs inform rejection of forms, attachments, copy restrictions,
and password challenges. No private encryption inspection; documents opening with
an empty password may be accepted. Text-only extraction can omit material beyond
these checks; users must inspect the original. Malformed chunks fail closed with
an allowlisted recovery message. Any replacement/control characters trigger review
and remain in canonical text. Source text is escaped by React, with whitespace and
direction handling; document instructions remain data, never application policy.

Only synthetic documents are bundled publicly. Source text is rendered as text,
not injected HTML. Document/block identity, version, quotes and offsets are
validated before supported claims render; failures are not silently repaired.
The development scenario selector has no production UI or URL/storage override.
The existing Google-font build fetch is retained; runtime fonts are self-hosted.

Git ignores common environment files, credentials, local scratch directories,
dependencies, and generated output. Local exclusions can supplement shared rules.

`npm run check:repo` checks Git-index paths, including force-added ignored files,
and visible untracked paths. It rejects ignored paths and generic environment,
credential, and private/scratch names. Diagnostics contain counts, not file names
or contents. It does not read file contents or scan Git history, and is not a
secret scanner. A pass cannot establish that public text contains no private data.

Before committing, explicitly select files and review `git diff --cached`,
`git diff --cached --check`, and `git status --short`. Before staging, also review
untracked files: ordinary `git diff` does not show them. Do not force-add excluded
material. CI runs after publication and cannot prevent the first disclosure.

Keep secrets, real legal documents, extracted text, model responses, and private
notes out of source, `public/`, logs, screenshots, and commit-facing descriptions.
Use ignored `.local/` for scratch work and synthetic examples for public fixtures.
No environment template is needed yet; add an exact allowlist exception only when
a real template with placeholders is introduced. If a credential is exposed,
revoke or rotate it; removing a file does not remove it from history.

## Mock AI server protections

The two POST routes require a configured exact same origin and JSON content type,
reject cross-site fetch metadata and query parameters, cap actual streamed bytes,
validate strict schemas and provenance, and enforce complete prompt budgets.
Deadlines include body reads. No automatic retries, repair calls or provider
fallback exist. Client responses are independently validated and bound to the
current request/document before display. Plain React text rendering escapes model
text; no HTML/Markdown execution or model-created links are introduced.

Server errors contain only allowlisted codes, not raw exceptions, schema issues,
source text, prompts, answers, filenames or secrets. Responses use no-store and
nosniff. Do not enable hosting/APM body capture or payload traces. App memory is
transient, not secure erasure; hosting/platform access logs are outside this code.
The deployment must not add document capture or third-party content telemetry.

`AI_ENABLED` is a kill switch. Mock activation also needs development NODE_ENV,
`AI_MODE=mock`, and `APP_ORIGIN`. Production stays off even if flags are set.
One in-flight request and cooldown per browser tab deter accidental repeated use;
they do not authenticate users or provide distributed rate limiting. No claim of
an in-memory global serverless spending cap is made. Current mock spend is zero
because there is no external inference adapter or endpoint in executable code.
Future HF usage must have only included credits, no payment or overage facility,
and fail closed on exhausted quota. Optional Vercel WAF must not require paid
billing; correctness at $0 cannot depend on it.

## Required protections for future live features, not implemented

- Reassess validation and resource limits for each new format or processing path.
- Keep provider secrets on the server, never in `NEXT_PUBLIC_*` variables.
- Avoid unnecessary document retention and logging, including error reporting,
  caches, analytics, and provider payload traces.
- Define actual data lifetimes and deletion behavior before introducing storage.
- Explain external processing and verify provider retention policies before
  making privacy claims.
- Treat document instructions and model output as untrusted; validate structured
  responses and evidence before presentation.

No persistence, authentication, or security product is introduced by this harness.
Review dependencies and permissions when a concrete feature requires them.
