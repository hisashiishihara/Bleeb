# Using Bleeb

1. **Use ChatGPT as usual.** Ask questions, research topics, and discuss ideas.
2. **Save something when it is worth keeping.** Just say, “Save this as a draft in Bleeb.”
3. **Revise it as needed.** Ask ChatGPT to rewrite or polish the article, edit the text yourself, or use Bleeb’s browser editor. Save the changes when you are ready.
4. **Add a cover image if you like.** Generate an image in ChatGPT and ask it to set the image as the article’s cover (hero) image. Generated images can be around **2–4 MB**, so consider asking ChatGPT to compress or convert them to **WebP** first.
5. **Publish explicitly.** Once you have reviewed the article, say, “Publish this article.” You can still edit it or unpublish it later.

**Important:** Saving a new draft does not publish it. However, edits to an *already published* article become visible to its current audience immediately. Create a separate draft if you need to work privately on major changes.

## Rich articles

Bleeb can render **tables, syntax-highlighted code, Mermaid diagrams, Chart.js charts, math, YouTube videos, X posts and TradingView stock charts**. Ask ChatGPT to include them in your Markdown draft.

For embedded content, use fenced blocks named `mermaid`, `chart`, `youtube`, `x`, or `stock`. A stock block contains a market symbol such as `NASDAQ:AAPL`; a YouTube block contains the 11-character video ID. Chart blocks accept validated JSON for bar, line, pie or doughnut charts.

External embeds may contact third parties when loaded. Preview your article before publishing and confirm the Site's current support.

## Browser editor

- `/owner/new` — create a draft.
- `/owner/archive` — browse private drafts and revision history.
- `/owner/archive/{id}/edit` — edit, preview, publish, or unpublish.
- `/owner/media?entry_id={id}` — manage article media.

Owner authentication is required. Article data is stored in D1 and media in private R2. Media uploads alone do not make files public.

For backups, use `export_entries` or the owner's note-compatible text export. Full cross-Site restore is not yet verified.

[Installation](GETTING_STARTED.md) · [Architecture](DESIGN.md)
