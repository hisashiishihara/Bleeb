# note export (per article)

aiDiary stays the authoritative archive. note is an optional distribution channel, not
a mirror or source of truth. The implementation does not use unofficial note APIs
or automate publication.

## Owner workflow

On an authenticated aiDiary article editor, choose either:

- **冒頭・要約版をダウンロード** — use the summary, if available, and the first
  two body paragraphs (up to approximately 420 characters of the opening).
- **全文版をダウンロード** — convert the complete saved Markdown to conservative HTML.

Both downloads generate a UTF-8 Movable Type (MT) TXT file with a single article.
In note: open article management, select Import / Movable Type (MT), upload the file,
review the imported draft, and explicitly publish it if desired.

Official note format and import limits:
https://www.help-note.com/hc/ja/articles/16143759138329-インポート機能の仕様

## Security and preservation

- Authenticated owner access is required server-side; anonymous or unauthorized
  requests return 404. No external API calls, D1 changes or R2 changes occur.
- The editor blocks exports while local edits are unsaved. The download also checks
  the expected latest revision number; stale requests return 409.
- A source link is appended **only** when the exported revision is the current
  public published revision (status=published, visibility=public). It is absent
  for drafts, owner-only posts or unreleased newer revisions.
- No changes to the original article, tags, history, visibility, or publication.
- HTML is escaped and unsafe link schemes are not emitted.
- Image references are placeholders, not remote media URLs. Private R2 assets are
  not leaked or published. Images must be uploaded separately within note.
  note officially recognizes imported image URLs ending in JPEG, PNG or GIF,
  not private WebP media references.

## Limitations

- The Markdown-to-HTML converter covers basic paragraphs, headings, lists, links,
  emphasis, code blocks and quotes. Complex embeds and other syntax require review.
- Note can ignore tags, formatting and some embedded content from MT, so check the
  draft before publishing. Imported posts may retain their historical publication
  timestamp rather than appearing as new items in the note feed.
- Import is asynchronous. GitHub tests validate the generated MT file, but do not
  constitute a live note import. No note connection, post ID mapping, automatic
  synchronization, or duplicate prevention is implemented.
