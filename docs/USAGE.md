# Using Bleeb

1. **Use ChatGPT as usual.** Ask questions, research topics, and discuss ideas.
2. **Save something when it is worth keeping.** Just say, “Save this as a draft in Bleeb.”
3. **Revise it as needed.** Ask ChatGPT to rewrite or polish the article, edit the text yourself, or use Bleeb’s browser editor. Save the changes when you are ready.
4. **Add a cover image if you like.** Generate an image in ChatGPT and ask it to set the image as the article’s cover (hero) image. Generated images can be around **2–4 MB**, so consider asking ChatGPT to compress or convert them to **WebP** first.
5. **Publish explicitly.** Once you have reviewed the article, say, “Publish this article.” You can still edit it or unpublish it later.

**Important:** Saving a new draft does not publish it. However, edits to an *already published* article become visible to its current audience immediately. Create a separate draft if you need to work privately on major changes.

## Rich articles

Bleeb renders rich content from **ordinary Markdown**. You can ask ChatGPT to write it for you, or paste these examples into the browser editor. Always preview before publishing.

### Tables, code and math

Use standard GitHub-flavored Markdown tables:

```markdown
| Feature | Status |
| --- | --- |
| Mermaid | Supported |
| Charts | Supported |
```

For colored source code, specify a language such as `python`, `typescript`, `bash` or `sql`:

````markdown
```python
print('Hello from Bleeb')
```
````

Math uses KaTeX syntax: inline `$E=mc^2$`, or a display equation:

````markdown
$$
E = mc^2
$$
````

### Mermaid diagrams

Use a fenced `mermaid` block. For example:

````markdown
```mermaid
flowchart LR
  A[ChatGPT conversation] --> B[Save draft]
  B --> C[Publish with Bleeb]
```
````

### Chart.js charts

Use `chart` followed by JSON. Chart types: `bar`, `line`, `pie`, `doughnut`.

````markdown
```chart
{
  "type": "bar",
  "title": "Posts per month",
  "labels": ["July", "August", "September"],
  "datasets": [{"label": "Posts", "data": [3, 5, 4]}]
}
```
````

The chart is interactive, and a data table is provided beneath it. Only validated chart JSON is accepted; it does not execute JavaScript.

### YouTube, X and stock charts

Paste the **YouTube video ID**, not the full URL:

````markdown
```youtube
dQw4w9WgXcQ
```
````

For an X post, use its numeric post ID:

````markdown
```x
1234567890123456789
```
````

For a **TradingView** stock chart, use an exchange-qualified ticker:

````markdown
```stock
NASDAQ:AAPL
```
````

YouTube and X embeds wait for the reader to click before loading third-party content. The stock chart is browser-lazy-loaded but may contact TradingView without a click. Availability depends on those external services.

### Table of contents and footnotes

Bleeb automatically adds a collapsible table of contents when an article contains at least two level-2 or level-3 headings:

```markdown
## Introduction
An overview of the topic.

### Background
Details that appear in the table of contents.

## Conclusion
Key takeaways.
```

Add footnotes using standard Markdown notation:

```markdown
Bleeb stores articles in D1.[^storage]

[^storage]: Images and videos are stored separately in R2.
```

### Images and videos

Upload your image or video through ChatGPT or the owner editor. Then insert the media URL returned by Bleeb:

```markdown
![Architecture diagram](/media/<image-id>)
![video:Demo clip](/media/<video-id>)
```

Replace the placeholders with real media IDs (UUIDs) from your own article. A video uses the `video:` prefix inside the image alt text. **Cover images are set separately** through Bleeb's hero-image action; an upload alone does not publish the file.

In a saved article's **アイキャッチ画像** section, use **画像をアップロードしてアイキャッチに設定**, or copy an image in your browser, click the image paste area and press **Ctrl+V / ⌘V**. PNG, JPEG, GIF and WebP images up to 10 MiB are supported. The paste area accepts image files from the clipboard; copying only an image URL does not upload it. Save unsaved article changes first. This action creates a new revision with the cover image and does not insert Markdown into the body or change visibility. For a published article, its cover updates immediately; a draft stays private. If uploading succeeds but setting the cover fails, the uploaded media ID remains available for retry or management.

### Other Markdown formatting

```markdown
> A useful quote from the discussion.

**Bold**, *italic*, and [a source link](https://example.com).

- A bullet point
- Another bullet point
```

See [Article embeds](ARTICLE_EMBEDS.md) for format limits and rendering details.

## Bookmark a public article on Hatena

On a **published, public** article's **owner editor**, click **「B! この公開記事をはてブに登録」** to open the Hatena Bookmark add screen in a new tab. Sign in with your Hatena account, optionally add tags or a comment, and confirm the bookmark manually. **You do not need a Hatena Blog.** Bleeb does not register bookmarks automatically.

The owner-only editor shows no registration link for drafts or owner-only articles. The **reader-facing article page intentionally has no B! button**; readers can still bookmark its URL through Hatena's own service, browser extension, or sharing tools. One self-bookmark does not guarantee listing in Hatena's new or popular entries.

## Share an article to note

In the owner's saved-article editor, click **「本文をコピー（書式付き）」**, then use **「note の新規投稿を開く」** to open note in another tab. These are separate operations: the link still works even if the browser blocks rich-text clipboard access. **Paste the article, set the title, check the formatting and publish manually.** If clipboard copying fails, the editor offers a manual Markdown copy fallback. Save any unsaved changes first. Images and videos are represented by placeholders and must be uploaded separately on note; complex Mermaid, chart and stock embeds may need manual adaptation.

## Browser editor

- `/owner/new` — create a draft.
- `/owner/archive` — browse private drafts and revision history.
- `/owner/archive/{id}/edit` — edit, preview, publish, or unpublish.
- `/owner/media?entry_id={id}` — manage article media.

Owner authentication is required. Article data is stored in D1 and media in private R2. Media uploads alone do not make files public.

For backups, use `export_entries` (the standard article export). Full cross-Site restore is not yet verified.

[Installation](GETTING_STARTED.md) · [Architecture](DESIGN.md)

## Public discovery and search indexing

The canonical production blog is [観測と思考](https://blog.odorikani.net); its homepage describes a technology-led perspective on companies and markets. Search discovery does not imply that Google has indexed an article or that Hatena Bookmark has featured it.

A public RSS 2.0 feed at `/feed.xml` and an XML sitemap at `/sitemap.xml` are generated from **only currently published, publicly visible articles**. No owner/session identity is consulted; drafts and owner-only articles never enter these documents. RSS is advertised by a `rel=alternate` metadata link and footer link. `/robots.txt` points crawlers at the sitemap and disallows owner/API endpoints.

Only the home page, public article pages, About, and Privacy opt in to indexing. Owner-only article pages and private tools stay `noindex`; archive and tags retain `noindex` while we review their searchable query variants. A sitemap or RSS feed does not guarantee indexing or inclusion in Hatena Bookmark's popularity rankings.
