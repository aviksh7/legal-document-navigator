# Architecture

## Current implementation

Next.js 16.3.3 App Router, React 19.2.8, strict TypeScript and Tailwind 4. Preserve
framework-managed files and read the installed Next.js docs before changing APIs.

`src/app/page.tsx` and `src/app/workspace/page.tsx` are Server Components. The
workspace receives serializable authored fixture data and owns client-side tab,
comparison, answer, source selection, and dialog state. Views use local React
state and explicit props; no state library or application backend exists.

`src/features/document-workspace/` contains:

- `types.ts`: document/block identities and presentation contracts.
- `fixtures.ts`: synthetic source documents, statements, prepared comparisons,
  questions and explicit qualifications.
- `model.ts`: pure evidence checks, statement presentation gate, fixture integrity,
  literal search and prepared-question matching.
- Focused views, evidence presentation, and a shared responsive source reader.
- Colocated Vitest tests for pure model behavior.

Document IDs are stable and distinct for each version. Block IDs are scoped to a
document; their pair is canonical evidence identity. Offsets use JavaScript string
indices (start inclusive, end exclusive); quoted text must exactly match that
slice. Document context and version membership are checked before presentation.
A rejected presentation result excludes the statement text. The UI never repairs
references by searching for another quote, block or version.

Normal workflows are synchronous fixtures. Development scenarios sit behind
`NODE_ENV === "development"` branches, with no URL/storage activation mechanism.
Source content uses one active reader: a desktop aside or native modal dialog.

## Future boundaries, not implemented

Real input → validated document representation → deterministic processing →
structured AI output → runtime schema and evidence validation → presentation.
Current types and fixture checks do not constitute a provider schema validator.
Future provider code and credentials belong on the server. Keep transformations
separate from provider calls; introduce no generic provider or persistence layers
without a concrete need.
