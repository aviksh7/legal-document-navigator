# AI system

## Current state

There is no model integration, prompt, schema library, provider SDK, or AI endpoint.
Provider choice, model choice, processing limits, and budgets are undecided.

## Planned contract

- AI explains meaning; deterministic software should establish or validate facts
  where practical. Model assertions alone do not establish facts.
- Responses must use typed structured contracts with runtime validation at the
  external boundary. TypeScript types alone cannot validate a provider response.
- Document-derived claims must reference real source evidence. Deterministic
  checks must verify reference existence and quoted text or spans against the
  document representation. These checks do not prove an interpretation is correct.
- Uncertainty and missing evidence must be explicit in both the response contract
  and its eventual presentation.
- Treat document text and model output as untrusted data. Embedded instructions
  must not grant tools, change system policy, or bypass validation.

## Planned failure and evaluation behavior

Reject malformed contracts, invalid references, and unsupported claims rather
than displaying them as validated output. Define safe user-facing failures for
provider timeouts, refusals, and limits; do not log document content to debug them.

When AI is implemented, use small synthetic fixtures for contract and evidence
checks, plus separate semantic evaluations for interpretation quality. Mock
provider responses in routine tests. Any live evaluation must be explicit and
separate from the default CI gate. No schemas or evaluation tooling are installed
by this harness. See [Testing](TESTING.md) and [Security](SECURITY.md).
