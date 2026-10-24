# Article visualizations and CSS layers

Article Markdown remains portable. Rich embeds use fenced code blocks; unsupported renderers show their plain-text source instead.

## Chart.js
```chart
{
  "type": "bar",
  "title": "Adobe ARR（億ドル）",
  "labels": ["全社 ARR", "AI-first ARR"],
  "datasets": [{"label": "億ドル", "data": [275, 6.5]}]
}
```

Chart types: `bar`, `line`, `pie`, `doughnut`. Supports up to 40 labels and 8 datasets. Values must be finite JSON numbers. Chart.js is bundled locally; no chart-specific third-party data requests. The data table below the chart remains accessible.

## Stock chart
A valid TradingView symbol includes the exchange prefix:

```stock
NASDAQ:ADBE
```

The TradingView iframe loads automatically when the article renders (the iframe itself is lazy-loaded by the browser). This contacts TradingView without a reader click. Real-time prices and availability depend on TradingView and its terms; no market quotes are stored in D1. The stock block currently accepts only the exchange-qualified ticker symbol; `asof` and `range` are not supported.

## X post
Use the numeric ID from `https://x.com/<account>/status/<id>`:

```x
1234567890123456789
```

This likewise uses a reader-triggered embedded view with an ordinary link fallback. Rendering depends on X's current embed policy, access and consent. Never store credentials or external HTML in article data.

## Styles
- `app/styles/base.css`: reset and structural layout.
- `app/styles/owner.css`: editing and private archive UI.
- `app/styles/theme.css`: the shipped 「観測と思考」 look; user-replaceable later.
- `app/styles/reader.css`: shared reader page layout.
- `app/styles/embeds.css`: fixed accessibility and layout for article extensions.

`app/globals.css` imports these in order. A future theme mechanism can switch `theme.css` without touching database, publication, or MCP code. This change does not introduce a theme installer or public code execution.

## Math (KaTeX)
Inline math: `$E=mc^2$`. Display math uses double dollar delimiters on separate lines:

```markdown
$$
E = mc^2
$$
```

## Code syntax highlighting
Use a regular fenced code block with a language name (for example `python`, `typescript`, `bash`, `sql`). Unsupported languages remain readable without code execution.

## Footnotes
Standard GFM notes:
```markdown
A claim with a source.[^source]
[^source]: An external citation.
```

## Table of contents and heading links
Articles with at least two level-2 or level-3 headings receive a collapsible, automatically generated table of contents. Headings have stable GitHub-style slug IDs. No handwritten HTML or script is needed.

## YouTube
Use the 11-character video ID, not a freeform iframe:

```youtube
dQw4w9WgXcQ
```

The visitor clicks to load from `youtube-nocookie.com`; a normal YouTube link is always available. Embedding can be disabled by third-party privacy or content restrictions.

## Mermaid diagrams
Write Mermaid markup in a standard fenced block:

```mermaid
sequenceDiagram
  participant User as 利用者
  participant ChatGPT
  participant aiDiary
  User->>ChatGPT: 記事を作成
  ChatGPT->>aiDiary: save_draft
  aiDiary-->>User: 下書き保存
```

The diagram renderer is loaded lazily in the browser and uses Mermaid's `securityLevel: "strict"`. Author-provided HTML and script execution are not enabled. If rendering fails, the original diagram source remains available in a disclosure below the figure. Diagram syntax is a Mermaid subset of UML notation, not a full UML interchange implementation.

## Image display width

An optional Markdown image title can set the display width as a percentage
of the article's text area:

```markdown
![Screenshot](/media/example-image-id "width=75%")
```

Supported values are whole percentages from `1%` through `100%`.
A normal Markdown image without the `"width=...%"` title is unchanged.
The width is responsive: images do not overflow their container.
Ordinary image titles remain standard tooltips; arbitrary CSS, pixel widths,
raw HTML, and width options for the `video:` extension are not supported.
The image bytes in R2 are not resized or recompressed.
