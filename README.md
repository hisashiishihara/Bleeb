# aiDiary

**Site title:** 「観測と思考」 — a reader-facing personal journal with a pure white editorial design. **aiDiary** remains the software/engine name, independently reusable by other authors. The Site must be redeployed separately after a source change; title/theme changes never publish or modify entries.

Conversation-first personal publishing: privately save and revise Markdown from ChatGPT, then **explicitly publish** selected revisions to a readable Japanese technical blog.

**Status (2026-10-17):** The owner Site has validated authenticated MCP operations. GitHub source now declares thirteen owner MCP tools, including working Base64 `upload_media` and the new `upload_chatgpt_image` fileParams bridge for ChatGPT-generated images. The native fileParams path still requires real-site validation after deployment. See [MCP upload gate](docs/MCP_UPLOAD_MEDIA.md). New additions to GitHub do not automatically deploy to Sites.

## Reader navigation

- **Home `/`:** the three newest articles are displayed in full, including
  Markdown, images, dates and links to their permanent article pages.
- **Date archive `/archive`:** browse published articles by month (JST), in
  reverse chronological order, with pagination.
- **Tags `/tags`:** see tag counts and filter the archive using the exact tag.
- **Search `/archive?q=...`:** simple D1 substring search over the latest
  article titles, summaries and Markdown bodies; no external Google dependency.
- All reader queries check `status=published` and visibility on the server:
  anonymous visitors cannot find drafts or owner-only posts. The owner can
  browse their own published owner-only posts, while drafts stay solely in the
  private management archive. Search results are not publicly indexed (noindex).

## Implementation

- Browser-based Markdown editor at `/owner/new` and `/owner/archive/{id}/edit`, supporting manual revisions, preview, explicit publish/withdraw, and private R2 media uploads.
- Owner archive provides a **下書きを削除** action on draft entries only. It requires owner authentication, a confirmed click, and current revision matching; published articles cannot be deleted. All draft revisions, D1 media records and R2 objects are permanently removed. A storage failure retains the D1 draft for retry. This browser operation is intentionally not exposed as an MCP tool.
- **Latest-visible revisions:** after an article is explicitly published, new saved revisions (including hero updates) immediately appear to the article's *existing authorized audience*. Drafts stay private; changing visibility or unpublishing still requires an explicit owner action. `published_revision` remains a historical legacy pointer.
- Per-article **note (MT `.txt`) export** on the owner editor offers excerpt/summary or full text; generates owner-only downloadable drafts without note API calls or publication, with public source links only when actually readable. See [note export](docs/NOTE_EXPORT.md).
- Images and short video are stored in private R2 (`MEDIA` binding); asset metadata is stored in D1 migration `0003_media.sql`. Media are accessible anonymously **only if** referenced by the selected public published revision of their own article. See `docs/EDITOR_MEDIA.md`.

- Active article audiences are `owner` and `public` only. Membership and payment development are suspended; registration/management endpoints are disabled and their stored data is retained. See [public rollout and approval gate](docs/PUBLIC_ROLLOUT.md). The Site stays owner-private until explicitly approved for general access.

- `/owner/archive`: authenticated private research archive, including drafts, historical full-text search, tags, and revision reading.
- `/owner/referrers`: private referral report; public-article referral aggregates are opt-in and off by default (see [access and referrer design](docs/ACCESS_AND_REFERRERS.md)).

- `app/page.tsx` and `app/posts/[slug]/page.tsx`: responsive public views, reading only saved published revisions.
- `lib/store.ts`: D1 article CRUD, revision append, publishing/unpublishing, idempotency, owner-only export.
- `app/api/owner/[action]/route.ts`: owner operations; **disabled by default** until trusted Sites authentication is demonstrated.
- `drizzle/0000_initial.sql`: initial SQLite/D1 tables.
- `plugin/tool-definitions.ts`: contracts for the thirteen owner MCP tools served through `app/mcp/route.ts`, including URL import, bounded Base64 image upload and host-resolved ChatGPT image file transfer.
- `scripts/bundle-to-sql.mjs`: offline export bundle to SQL conversion for recovery.
- `.openai/hosting.json`: Sites data bindings (D1 `DB` and private R2 `MEDIA`) required for the editor and media MCP tools.

## Developer checks

```sh
npm install
npm test
npm run typecheck
npm run build
```

Node 22.13+, Python 3 (for SQLite schema checks). These checks validate source and local invariants; they do **not** replace real Sites/MCP/D1 acceptance tests.

## Important boundaries

- No Python CGI, Apache, NUC/VPS, static-page regeneration, or OpenAI API inference on public reads.
- Saved drafts and newer unpublished revisions cannot appear in public SQL queries.
- An explicit `publish_entry` call is the only publication operation. No automatic chat ingestion or auto-publish.
- Do not enable the owner write API until Site authentication header provenance has been established. Both `AI_DIARY_OWNER_API_ENABLED=true` and a server-secret `AI_DIARY_OWNER_EMAIL` are required.
- No real articles or personally authored text have been seeded.

## Deploy and connect

See [Sites deployment handoff](docs/SITES_HANDOFF.md), [real owner-auth validation](docs/SITES_AUTH_VALIDATION.md) and [platform validation gates](docs/PLATFORM_VALIDATION.md). A GitHub push is **not** a Sites deployment; Site owner publication and personal plugin installation are separate actions.

Canonical documents: [Requirements](docs/REQUIREMENTS.md), [Design](docs/DESIGN.md), [Roadmap](docs/ROADMAP.md).

Planned license: BSD-3-Clause. No release should be tagged before platform acceptance.
