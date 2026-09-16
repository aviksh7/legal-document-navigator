# Product

## Current state

The repository contains a Next.js starter page and an engineering harness. It
does not accept legal documents, produce analysis, or provide legal advice.

## Planned purpose

Help people read legal documents with explanations they can check against the
source. Initial users, supported document formats, jurisdictional scope, and
the first complete workflow must be agreed before feature implementation.

Acceptance requirements for future document-derived explanations:

- Users can inspect the supporting source for each claim.
- Deterministic software establishes or validates facts where practical; AI
  explains meaning within validated constraints.
- Uncertainty, missing evidence, and unsupported inputs are visible.
- Invalid output produces a clear failure rather than a plausible unsupported answer.
- Document handling follows explicit, technically verified retention and logging rules.

## Scope boundaries

This harness adds no product UI, AI integration, authentication, database, ORM,
vector storage, or application state framework. Do not imply these capabilities
exist. Record actual scope decisions in [Decisions](DECISIONS.md) before expanding
the architecture. [Design](DESIGN.md) covers intended interaction requirements.
