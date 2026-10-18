# Bleeb Roadmap

**Goal:** Publish from a ChatGPT conversation, with no separate server or separately billed AI API.

**Primary engineering rule:** **Keep the program tiny.** Prefer deleting code, sharing existing logic, and using built-in Sites features. Refactoring should reduce code size, dependencies and complexity **without sacrificing readability, tests, privacy or security**. A backlog item is not authorization to implement it.

## Priorities

| Priority | TODO | Minimal approach |
| --- | --- | --- |
| P0 | Backup and restore | Extend existing exports; test a D1/R2 round-trip in isolation. |
| P0 | Clean Plus-account installation | Reproduce a private Site setup and document blockers. |
| P1 | Private prepublication preview | Reuse rendering; design around immediately visible edits to published articles. |
| P1 | Image optimization | Measure first; use supported image transforms without new paid services. |
| P1 | RSS, sitemap, canonical and OGP | Publish metadata only for genuinely public articles; honor noindex policy. |
| P1 | Related articles | Derive from existing tags and SQL; avoid embeddings. |
| P1 | Sites Analytics evaluation | Prefer built-in analytics; remove redundant tracking only after checking feature parity. |
| P2 | Scheduled posts | Validate supported scheduling first; no VPS dependency. |
| P2 | note / social distribution | Extend current export; use external APIs only with separate approval. |
| P2 | Voice-to-article | Use ChatGPT voice plus existing MCP save tools. |
| Research | AI web editor | Keep AI work in ChatGPT; no default extra OpenAI API billing. |

## Rich content verification

The following renderers **already exist in the source**; do not reimplement them before testing deployment and writing usage examples.

| Feature | Markdown syntax / renderer | Next action |
| --- | --- | --- |
| Mermaid diagrams | `mermaid` fenced code; `MermaidDiagram` | Verify diagram rendering and error handling on the live Site. |
| Chart.js charts | `chart` fenced JSON; `ArticleChart` | Document supported types: bar, line, pie and doughnut. |
| Tables | Standard GitHub-flavored Markdown tables | Verify scrolling and mobile layout. |
| Syntax highlighting | Language-tagged code fences; rehype-highlight | Verify common languages and readable dark/light styling. |
| YouTube | `youtube` fenced video ID | Check consent-to-load flow and mobile embeds. |
| Stock charts | `stock` fenced TradingView symbol (e.g. `NASDAQ:AAPL`) | Check third-party availability, privacy and mobile layout. |
| Math | Inline/block LaTeX with KaTeX | Document examples and validate rendering. |
| Table of contents | Existing `ArticleToc` | Check heading links and duplicate headings. |
| X posts | `x` fenced post ID | Check consent-to-load flow and fallback links. |

**Additional candidates:** footnotes, responsive image captions, accessible callouts, and CSV-to-chart paste workflow. First check whether existing Markdown/renderer support covers each; reject features that add disproportionate code or dependency weight.

## Release gates

- Complete full-history secret audit (including Gitleaks) and independent clean-account setup.
- Verify trusted owner authentication, MCP scope, private drafts, and anonymous access boundaries.
- Pass tests, typecheck and build. Verify backup and recovery before public release.
- Keep GitHub repository visibility and Site sharing **private** until explicitly approved.

## Scope

No WordPress, NUC/VPS worker, generic multi-author CMS, payment system, or AI API dependency by default. GitHub code pushes do not deploy Sites; publication is a data operation.

[Installation](GETTING_STARTED.md) · [Architecture](DESIGN.md) · [Public release checklist](PUBLIC_RELEASE_CHECKLIST.md)
