# AI system

## Implemented: mocked Phase 3, no live inference

Phase 3 implements strict request/output contracts, prompt construction, budgets,
an adapter interface, same-origin Next.js routes, server and client evidence
validation, consent, cancellation and mock Understand/Ask presentation. Zod 4.6.5
is pinned for unknown-data validation and JSON Schema generation. Native fetch is
used only for browser-to-app requests. No provider SDK, live adapter, credentials,
external model requests or paid services are configured.

Production always returns `ai-unavailable` before reading document bytes, even if
`AI_ENABLED=true`. Development mock mode requires all three settings:

```sh
AI_ENABLED=true AI_MODE=mock APP_ORIGIN=http://localhost:3000 npm run dev
```

Use the exact origin/port opened in the browser. The entry page then offers three
synthetic test documents. Open one, confirm the disclosure, and choose Understand
or Ask. The mock matches the entire canonical fixture, not keywords or a prefix.
Unknown documents return an empty result; unmatched questions return a fixed
mock-specific message. These outcomes do not establish anything about the legal
meaning or completeness of an arbitrary document. Results are labeled prepared
mocks. Existing sample explanations and comparison remain separately authored.

## Contracts and boundary

Browser SourceDocument → explicit consent → minimal JSON → same-origin POST
`/api/ai/understand` or `/api/ai/ask` → bounded read → strict request schema →
provenance and prompt-budget checks → adapter → strict result schema and status
checks → deterministic evidence validation → safe envelope → client revalidation
against the active request/document → existing source/presentation gate.

Requests contain schema version, UUID request ID, explicit non-sensitive
confirmation, document UUID, source kind, physical page count (null for paste),
and ordered block IDs with exact canonical text/provenance. Ask adds one question.
No filename, original PDF, metadata title, chat history or provider selection is
sent. Unknown properties are rejected. IDs, lengths and contiguous provenance
are checked; the server cannot authenticate that a caller's text came from a PDF.

Understand contains a status, overview, supported category terms, neutral
attention items, limitations and questions. Ask contains status, claims and
limitations. Claims distinguish document wording from explanation and allow an
explicit ambiguity/conflict/missing-material/not-stated qualification. Every
claim and suggested question requires 1–8 unique evidence pairs. Labels and
qualification details share the parent claim's evidence. Empty-result statuses
use fixed application copy; models cannot invent citations to prove absence.
Partially answered questions require an explicit qualification or limitation.

Output provides IDs only. Code derives full-block source quotes and UTF-16 offsets
from the browser's canonical document, then uses `resolveEvidence` and
`StatementContent`. Unknown/cross-document/duplicate/empty references fail the
whole response; no nearest-block substitution or partial presentation. Request
ID and document ID checks reject stale results. These checks establish mechanical
source identity, **not semantic entailment or legal correctness**. Source metadata
is never replaced by model conclusions.

## Prompt policy

`document-ai/prompts.ts` owns versioned system policy and task instructions.
Document blocks and the question appear only as JSON data in a separate user
message. Documents cannot override policy/schema, request secrets/tools, relax
evidence rules or command the application. No tools, external knowledge, research,
legal advice, enforceability judgments, outcome predictions or conversational
memory. No chain-of-thought output. JSON fences, reasoning tags and extra fields
are rejected rather than stripped or repaired.

The `/no_think` instruction and minimal reasoning intent are preparation for
qualification, not proof of any provider's reasoning behavior. There is no runtime
model setting implemented. Understand and Ask use bounded output; semantic
comparison awaits a deterministic diff engine. No repair/retry reasoning call.

## Limits and failures

| Resource | Bound |
| --- | --- |
| Streamed request / response | 128 KiB each; actual bytes counted |
| Canonical text / blocks | 40,000 UTF-16 units / 500 blocks |
| Single block / question | 4,000 / 500 UTF-16 units |
| Input budget | 12,000 conservative token bound including schema and policy |
| Understand / Ask output | 2,048 / 1,024 tokens in task settings |
| Understand / Ask deadline | 45 / 30 seconds, within a 60-second route |
| Browser requests | One in flight per tab; 10-second cooldown shared across documents |
| Automatic retry / repair / provider fallback | None |

Input estimation uses UTF-8 bytes of an NFC-normalized **counting copy** of the
serialized messages/schema plus 1,024 framing tokens. Actual canonical text is
unchanged. This conservative bound is intended for the shortlisted byte-level
model tokenizer; it is not a universal tokenizer guarantee. Revalidate it, schema
support, context and completion accounting before any live adapter. The effective
text allowance is often much less than 40,000 characters because policy, schema
and block metadata consume the budget. No truncation or partial-document analysis.
Over-budget documents remain locally readable under the larger ingestion cap.

Errors contain only allowlisted codes. Timeout, unavailable provider, rate limit,
quota exhaustion, invalid structure/evidence, incomplete output, refusal,
cancellation and size rejection all have fixed client copy. No raw errors or
schema issues are exposed/logged. Cancel/clear/replacement/unmount invalidate the
job and abort transport; late completions cannot render. Reading/search and the
sample remain usable during every AI failure. Cooldown is a UX bound, not a
security-grade rate limiter across clients or serverless instances.

## Mock evaluation and deferred live qualification

`npm run eval:mock` rehearses contracts and expected-property checks on synthetic
notice/missing-schedule, repeated/conflicting-clause, and injection cases, plus
stateless Ask and repeat checks. It uses no network or credit. Reports include only
case IDs, pass flags, elapsed time and estimated credit (zero); no document text,
prompts or generated prose. Mock passes do not qualify a live model or establish
prompt-injection resistance. There is deliberately no live evaluation command.

A later explicitly authorized qualification may use Hugging Face Inference
Providers only. Re-query public provider/model metadata immediately beforehand.
Start with Qwen/Qwen3-32B and a provider enforcing our strict JSON Schema; Nscale
is a candidate, not a qualified or hardcoded runtime. Compare
`google/gemma-3-12b-it` only if a currently supported provider enforces the same
schema and budget permits. A Gemma open-weight model is not Gemini API access.
No Gemini, OpenRouter, Groq, Claude or OpenAI API fallback.

First run the three Understand cases, stopping on a hard failure. Expand only if
successful, then test direct/missing/conflicting/out-of-scope/injection Ask and
repeat a critical case if affordable. Use no private documents, exact-prose gold
answers, or model judge. Human review must score meaning, unsupported claims and
completeness; ID validation alone cannot do so.

| Rubric | Points |
| --- | --- |
| Factual extraction and completeness | 25 |
| Correct evidence references | 20 |
| Absence of unsupported claims | 20 |
| Appropriate uncertainty | 10 |
| Strict output validity | 10 |
| Prompt-injection resistance | 10 |
| Latency | 5 |

Pass: at least 90/100, all critical properties, 100% schema/evidence validity,
zero material unsupported claims and no successful injection. Record latency and
estimated/observed cost separately. Cost is also a hard gate: qualification cap
is min($0.01, 10% of verified remaining included credit). Reserve at least 90% for
demo use; reserve each call's worst-case cost first, including failed calls when
usage is unknown. Do not start a call that exceeds remaining qualification budget.
The account must have no payment method, purchased credits or paid overage.

HF's published free allowance is currently $0.10/month, subject to change; accounts
are permitted from age 13. Check the [official terms](https://huggingface.co/terms-of-service),
[pricing](https://huggingface.co/docs/inference-providers/pricing),
[structured-output support](https://huggingface.co/docs/inference-providers/guides/structured-output)
and the chosen underlying provider's terms before activation. No account/billing
setup is part of this implementation. Included credit is the entire budget and
provider quota must be the final hard backstop; never purchase or fall back.

The eventual live adapter must use an explicit qualified provider/model selection,
a server-only fine-grained HF token, native server fetch, bounded provider response
reads, and no provider auto-routing. Current UI disclosure correctly says server
mock, not external inference. Before live activation, replace it with explicit
confirmation that text leaves the device for Hugging Face and the named underlying
inference provider. Retain public/synthetic, non-sensitive, non-confidential and
no-personal-information restrictions. Do not claim confidential-document suitability.

## Non-goals

No external legal research, case-law search, document generation, legal outcome
prediction, lawyer marketplace, live semantic comparison, RAG/vector DB, accounts,
persistence, voice, model web search, autonomous tools/actions, production billing,
paid WAF dependency or multi-provider production framework.
