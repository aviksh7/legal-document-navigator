# Architecture

## Current implementation

- Next.js 16.3.3 App Router and React 19.2.8, with routes in `src/app/`.
- TypeScript strict mode; `@/*` resolves to `src/*`.
- Tailwind 4 and the generated PostCSS configuration.
- Next.js Core Web Vitals and TypeScript ESLint presets.
- A starter page, shared layout, stylesheet, and public starter assets.
- No document pipeline, application API, AI provider, or persistence layer.

Keep `next.config.ts` minimal. Preserve the generated TypeScript plugin and type
includes. Next.js owns `next-env.d.ts` and `.next/`; generate them, do not commit
or hand-edit them. Keep the managed AGENTS block and CLAUDE forwarding reference.

## Planned boundaries, not implemented

Keep rendering and interaction in the app layer. Put deterministic document
transformations in small TypeScript modules only when needed, separate from
network calls and UI. Future provider credentials and calls belong on the server;
client code must not import them.

The intended flow is input validation → document representation with stable
source references → deterministic processing → structured AI response → runtime
and evidence validation → presentation. This is a design constraint, not an
existing pipeline or a commitment to specific libraries.

Add directories and interfaces when the first concrete use exists. Avoid generic
provider frameworks, repositories, event buses, and persistence abstractions.
Any external processing must first define data disclosure, retention, and failure
behavior in [Security](SECURITY.md) and [AI system](AI_SYSTEM.md).
