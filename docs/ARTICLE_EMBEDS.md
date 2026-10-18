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

The external iframe is **not loaded** until the reader clicks the button. Real-time prices and availability depend on TradingView and its terms; no market quotes are stored in D1.

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
