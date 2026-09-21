# Architecture

## Current implementation

Next.js 16.3.3 App Router, React 19.2.8, strict TypeScript and Tailwind 4. Preserve
framework-managed files and read the installed Next.js docs before changing APIs.

`src/app/page.tsx` and `src/app/workspace/page.tsx` are Server Components. The
workspace receives serializable authored fixture data and owns client-side tab,
comparison, answer, source selection, and dialog state. Views use local React
state and explicit props; no state library is used. Phase 3 adds bounded mock API routes.

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

Sample workflows are synchronous fixtures. Development scenarios sit behind
`NODE_ENV === "development"` branches, with no URL/storage activation mechanism.
Source content uses one active reader: a desktop aside or native modal dialog.

## Browser-local ingestion

`DocumentIntake` is a client island on the server-rendered entry page. Only browser
event handlers receive a File or pasted text. Intake itself sends neither to a server.
Only an explicitly confirmed development mock request sends canonical blocks to
the same-origin AI route; original PDF bytes never leave through this path. Server output supplies
the app and public sample; the browser requests same-origin code/fonts/worker.

`document-ingestion/processing.ts` owns pure validation, conservative partitioning,
quality rules and source contract checks. `pdf-text.ts` validates unknown streamed
items and text budgets. `pdf.ts` reads local bytes, owns deadlines, public parser
policy and sequential extraction; `pdf-runtime.ts` lazily loads modern PDF.js
6.3.289 and its matching bundled module worker. It uses `workerPort`/`PDFWorker`
public transport, not a custom protocol. No legacy build, CDN, preparation script,
CMaps, standard-font assets or WASM is provisioned. Add auxiliary assets only
after representative extraction fixtures demonstrate a need.

Result is `ready | needs-review` (document + warnings), `error` (allowlisted code),
or `cancelled`. Partial failures never publish a partial source document. Public
password handling rejects password-required PDFs. `isPureXfa`, `getFieldObjects`,
`getAttachments`, and `getPermissions` reject currently unsupported content.
These checks do not detect every encryption mode or every omitted visual object.
Encryption that opens without a password challenge can pass.

### Canonical text and evidence

- Paste: CRLF and lone CR become LF; all other characters/whitespace stay unchanged.
- PDF: concatenate each public `TextItem.str` in returned order, adding LF after
  `hasEOL`. `disableNormalization: true` prevents additional worker normalization;
  PDF.js still normalizes whitespace internally. No invented spaces, trim,
  dehyphenation, Unicode normalization or sentence reconstruction is performed.
- PDF sections are physical 1-based pages, including empty pages. Paste has one
  text section and no page number. No heading or legal-section semantics inferred.
- Split at blank-line boundaries, retaining delimiters in the preceding block.
  Long blocks split at a nearby LF/space in the latter half of 4,000 code units,
  otherwise at a safe UTF-16 boundary. Concatenation recovers a text-bearing unit
  exactly, including whitespace-only pages. Empty strings have no evidence blocks.
  Page boundaries are structural, not inserted source text.
- Every accepted intake gets a fresh `crypto.randomUUID()`; no hash or filename
  identity. Same active document retains its ID. Reingestion gets a new ID.
  Sections are `s-0001` etc.; globally ordered blocks `b-000001` etc., including
  repeated wording as distinct blocks. Canonical identity remains document+block.
- Block provenance has page (PDF only) and start/end in that page's canonical
  text, or in normalized pasted text. Existing evidence offsets are block-relative
  UTF-16 indices. Quotes must match that slice exactly. PDF exactness is against
  canonical extracted text, never a promise of original bytes/visual spacing.

Real intake extends `SourceDocument`, using version `provided`, nullable unknown
legal metadata, and ingestion provenance. It reuses `SourceSections`, literal
search, `EvidenceLink`, and `resolveEvidence`; no parallel evidence identity/model.
The real reader renders one physical page at a time and caps search at 100 shown
matches. Sample original/revised fixtures retain their existing behavior.

### Bounds and quality heuristics

Limits use UTF-16 code units unless explicitly letters/numbers:

| Resource | Limit |
| --- | --- |
| File | Nonempty, ≤10 MiB; `%PDF-` in first 1,024 bytes, then successful parsing |
| Physical pages | 100 |
| PDF text | 500,000 total; 100,000 per page, including inserted LF |
| Paste | 200,000 before and after line-ending normalization |
| Streamed items | 20,000/page; 100,000/document |
| Evidence blocks | 4,000 characters/block; 5,000/document |
| Time | 30 seconds/job; 5 seconds/page extraction |

MIME type and extension are picker hints, not authoritative validation. A signature
is not proof of validity or safety. Browser parsing cannot establish that a file is
benign. Empty/whitespace-only paste fails; at least 20 Unicode letters/numbers are
needed overall. PDF zero usable characters → `no-extractable-text`; 1–19 →
`insufficient-extracted-text`. Every page below 40 gets a warning. Review triggers
when average usable characters/page is below 100, or at least two sparse pages
constitute ≥30% of pages, or unusual characters occur (precisely U+0000–0008,
U+000B–001F, U+007F, U+FFFD). TAB/LF do not trigger this check. Characters remain unchanged.
These conservative initial heuristics are not completeness/confidence scores.

`LatestJob` aborts previous processing and gates all result/progress updates by
job identity. Cancel, replacement, unmount and page lifecycle reset invalidate it.
Success/error/cancel/timeout release the stream/page/loading task, terminate the
native worker and clear its global reference. No Blob/object URL is created.
Browser file reads/GC are not forcibly erasable; worker deadlines do not guarantee
a hard peak memory cap against decompression or parser allocations.

## Mocked Phase 3 boundary

`document-ai/` contains strict Zod contracts, pure provenance/evidence validation,
versioned prompts, request/response byte bounds, a narrow adapter, an exact-fixture
mock, bounded handler and browser client, and Understand/Ask presentation. The
client converts validated evidence IDs into the existing full-block
SourceReferences. It does not create a fake WorkspaceFixture for provided documents.

`server.ts` is marked server-only. `/api/ai/understand` and `/api/ai/ask` are Node
POST routes. A development-only configuration enables mocks; production always
fails closed before body reads. The server passes only an enabled boolean to the
client. No provider credentials or SDK is present. Mock fixtures are explicitly
synthetic; arbitrary documents never inherit their authored explanations.

Zod validates unknown requests and model-shaped output, separate from the existing
typed presentation checks. A whole invalid response is withheld on both server and
client. Source blocks and metadata remain immutable. No application document or
result persistence, cache, telemetry, or content logging is added.

See [AI system](AI_SYSTEM.md) for schemas, prompt policy, limits, failures and the
future HF qualification gate. Semantic comparison and live inference are deferred.
