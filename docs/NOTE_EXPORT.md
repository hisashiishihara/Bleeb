# Copy an article to note

Bleeb is the authoritative article archive. note is an optional distribution channel; publishing or editing on note never modifies Bleeb.

## Owner workflow

In the saved article editor (`/owner/archive/{id}/edit`):

1. Save unsaved edits; the rich-text copy action uses the current saved revision.
2. Click **「本文をコピー（書式付き）」**.
3. Click **「note の新規投稿を開く」** and paste into note.
4. Add the title, review formatting and media, and publish on note yourself.

Clipboard permission failures display a **manual Markdown copy** fallback. The note link is independent of clipboard permissions and opens in a separate tab.

**The former Movable Type (MT) TXT download/import feature was removed.** Neither the browser editor nor the API offers that export format. Standard `export_entries` remains available for Bleeb content backup.

## Security

- `GET /owner/archive/{id}/note-copy?revision=N` is owner-only, read-only and revision-locked. Unauthorized requests return 404; stale revisions return 409.
- Successful requests return `{title, html, text}` as JSON with private no-store headers. The browser clipboard uses both `text/html` and `text/plain`.
- Only a currently public, published article gets its original URL appended. Drafts and owner-only articles never expose a source permalink in copy data.
- Raw HTML is escaped; unsafe link schemes are excluded. Private media URLs become placeholders instead of transferring private R2 objects to note.
- No note credentials, unofficial API, automatic posting, publication, synchronization or D1/R2 mutation is involved.

## Limits

The HTML subset supports paragraphs, headings, lists, links, emphasis, code and quotes. Images, videos, Mermaid, charts and other rich embeds need manual adaptation; inspect the pasted article before publishing.

Implementation: `lib/note-copy.ts`, `app/owner/archive/[id]/note-copy/route.ts`, `tests/note-copy.test.mjs`.
