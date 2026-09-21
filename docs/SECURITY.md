# Security

## Current protections and limits

The app supports browser-local PDF/paste intake and synthetic authored fixtures,
with no application secrets, external processing, or document storage. Document
bytes, text, questions, searches and selections stay in browser memory. They are
not placed in URLs or sent by the application to a
server, analytics, or logging service. Reload resets the workspace. Browser or
operating-system behavior is outside this application-level statement.

There is no server document endpoint, server action, analytics, content logging,
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

## Required protections for future features, not implemented

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
