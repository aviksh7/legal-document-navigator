# Design

## Current state

The generated Next.js page, styling, metadata, fonts, and assets remain in place.
There is no product interface or adopted component library.

## Requirements for future UI

- Make source material and the evidence behind explanations easy to inspect.
- Distinguish extracted facts, AI interpretation, and uncertainty in plain language.
- Show loading, empty, invalid-input, unsupported-input, and failure states.
  Never present rejected output as a successful analysis.
- Use semantic controls, visible focus, keyboard access, readable contrast, and
  responsive layouts. Preserve document readability on narrow screens and at zoom.
- Explain what document data leaves the device before external processing occurs.
- Make any future retention choice explicit; do not promise privacy the system
  has not technically established.

These are acceptance requirements, not verified properties of an implemented
product. Establish concrete flows before introducing tokens, components, or motion.
Verify behavior in a browser as described in [Testing](TESTING.md).
