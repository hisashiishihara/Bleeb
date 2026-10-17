# aiDiary

Conversation-first personal publishing: privately save and revise Markdown from ChatGPT, then **explicitly publish** selected revisions to a readable Japanese technical blog.

**Status (2026-10-17):** An owner-only Sites PoC has verified seven MCP tools with fictional content, authenticated owner access and D1 publication. See [real environment validation](docs/SITES_AUTH_VALIDATION.md). New additions to GitHub do not automatically deploy to Sites.

## Implementation

- `/owner/archive`: authenticated private research archive, including drafts, historical full-text search, tags, and revision reading.
- `/owner/referrers`: private referral report; public-article referral aggregates are opt-in and off by default (see [access and referrer design](docs/ACCESS_AND_REFERRERS.md)).

- `app/page.tsx` and `app/posts/[slug]/page.tsx`: responsive public views, reading only saved published revisions.
- `lib/store.ts`: D1 article CRUD, revision append, publishing/unpublishing, idempotency, owner-only export.
- `app/api/owner/[action]/route.ts`: owner operations; **disabled by default** until trusted Sites authentication is demonstrated.
- `drizzle/0000_initial.sql`: initial SQLite/D1 tables.
- `plugin/tool-definitions.ts`: contracts for the seven tools served through `app/mcp/route.ts` in the owner-only test deployment.
- `scripts/bundle-to-sql.mjs`: offline export bundle to SQL conversion for recovery.
- `.openai/hosting.json`: official Sites D1 binding (`DB`); no R2 needed.

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
