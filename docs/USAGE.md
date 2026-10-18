# Using Bleeb

Connect your Bleeb **Site-hosted MCP plugin** to ChatGPT, then write naturally:

```text
Save our discussion as a draft titled "My First Post". Do not publish.
Revise that draft and keep its earlier revision.
Attach this image as the hero image.
Publish the article publicly after showing me the final text.
Unpublish that article.
```

**Publication is explicit for new drafts.** Once an article is published, later edits to its latest revision become visible immediately to its existing audience. Use a separate draft for unpublished experiments.

## Browser editor

- `/owner/new` — new draft.
- `/owner/archive` — private archive and revision history.
- `/owner/archive/{id}/edit` — edit, preview, publish, withdraw.
- `/owner/media?entry_id={id}` — manage article media.

Owner authentication is required for all editor operations.

## Media and exports

Images and short videos are stored in private R2. Uploading media does not make it public; only media referenced by an accessible article revision can be read publicly. Use ChatGPT file upload or the browser editor, subject to current type and size limits.

Use `export_entries` for portable article data, or the owner editor's note-compatible text export. **A complete cross-Site restore is not yet verified.**

[Installation](GETTING_STARTED.md) · [Architecture](DESIGN.md) · [Media details](EDITOR_MEDIA.md)
