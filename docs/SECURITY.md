# Security

## Current protections and limits

The app uses synthetic authored fixtures, with no document intake, application
secrets, external processing, or storage. Questions, searches and selections stay
in React memory. They are not placed in URLs or sent by the application to a
server, analytics, or logging service. Reload resets the workspace. Browser or
operating-system behavior is outside this application-level statement.

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

- Validate input type, size, and processing limits at trust boundaries.
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
