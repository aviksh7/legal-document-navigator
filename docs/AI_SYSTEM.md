# AI system

## Current state

No model, provider, prompt, AI endpoint, schema library, or live legal research is
integrated. Explanations and comparisons are authored synthetic fixture content.
Typed questions match explicit normalized aliases; no semantic inference occurs.
Unknown questions produce a clear unsupported state and supported alternatives.

Real PDF/paste intake establishes canonical source blocks deterministically before
any future interpretation. It never invokes the sample's authored analysis for a
provided document. Extraction warnings describe possible missing text, not legal
findings. PDF quotes are exact against canonical PDF.js output; paste quotes use
the line-ending-normalized input. Neither proves interpretation or completeness.

## Current evidence gate

Document ID plus block ID identifies evidence. Presentation validates document
membership, block uniqueness, version consistency, offset bounds and exact quote
agreement. Every supported statement requires evidence. Any failed reference
withholds its statement; the UI never repairs it. Partial information has an
explicit qualification and is not converted into certainty.

Fixture integrity and pure-model tests check these mechanical rules. They do not
establish legal correctness, verify interpretation quality, or replace validation
of unknown external data.

## Required future boundary, not implemented

AI explains meaning; deterministic code establishes or validates facts where
practical. Future external responses need runtime-validated structured contracts,
then evidence checks, before they populate the presentation model. TypeScript
alone cannot validate external output.

Treat document instructions and model output as untrusted. They must not grant
tools or change application policy. Define safe failures for malformed output,
unsupported claims, missing evidence, timeouts, refusals and limits. Never log
sensitive document content for debugging.

Future tests should mock providers and separately evaluate interpretation quality.
Live evaluations must be explicit and outside the default CI gate. Provider,
model, limits, budget and external-processing policy remain undecided.
