# Product

## Implemented: local intake and synthetic workspace

Phase 2 adds **Upload PDF**, **Paste text**, and the retained **Open sample
agreement** entry. Real intake opens only canonical source text, literal search,
validated evidence highlights, and physical PDF page navigation. It does not
generate summaries, legal analysis, comparisons or answers for provided documents.
Unknown parties, type and jurisdiction remain absent. The version is **Provided
document**, never an assertion that an arbitrary file is an original.

Extraction happens in this browser without an application document request or
persistence. Clear/reload resets it. Errors support another file or paste; low
overall coverage or unusual characters require explicit review. Sparse pages
retain page-level warnings and empty-page navigation. These are heuristics, not
confidence or completeness scores, and do not diagnose a scan.

The first product phase helps document readers explore an agreement they might
sign. It is a fixture demonstration, not live analysis or legal advice.

- `/` offers local intake alongside an explicitly synthetic employment agreement.
- `/workspace` opens Understand with an overview, attention items, seven term
  categories, and suggested questions.
- Compare adds a prepared revision and shows six selected clause comparisons.
  The prepared mapping is not computed or claimed to cover all changes.
- Ask & Navigate offers six prepared questions, limited exact-alias matching,
  literal text search, and section navigation.
- All supported statements link to validated source spans. A failed reference
  withholds the affected statement. Missing information and ambiguity are explicit.

The synthetic agreement refers to Bengaluru, India. It is not a legal template,
does not cover every rule of Indian employment law, and has not been legally
verified. Neutral, document-specific wording replaces legal risk scores.

## Implemented: development-only mocked AI

An optional development configuration adds consent and mocked Understand/Ask to
the provided-document reader. Three clearly synthetic test documents have prepared
responses with validated source links, missing-information and conflict states.
Other documents receive no mock analysis. This exercises the server boundary;
it is not model inference or a quality evaluation of a model. Production AI is
disabled, and the source reader/sample remain available. No live calls or credit
are used. See [AI system](AI_SYSTEM.md).

## Boundaries

No original PDF uploads, OCR, live AI/provider calls, research, auth, database, persistence, RAG,
semantic comparison, exports, or analytics. No chat history or generic chatbot.
Password-required PDFs, forms/XFA, attachments and public copy restrictions are
unsupported. Image-only PDFs need text/OCR supplied elsewhere. Text extraction
can omit visual/non-text content and reorder wording; consult the original.
See [Architecture](ARCHITECTURE.md) for exact limits and canonical-text rules.

## Acceptance

Readers can reach the evidence from every supported explanation, distinguish
uncertainty from failure, navigate by keyboard, and use the same workflow on
narrow screens. Verification evidence is documented separately; types or agent
confidence alone do not establish correctness or accessibility conformance.
