# aiDiary

**ChatGPT との会話を、そのままブログ制作の入口に。** aiDiary は ChatGPT から下書き作成・推敲・画像設定・公開を操作できる、個人向けブログアプリです。現在の実装は **ChatGPT Sites + Site-hosted MCP プラグインに特化**しています。別途 NUC/VPS や WordPress を動かす必要はありません（ChatGPT Sites の利用権限と初期セットアップは必要です）。

*aiDiary is a conversation-first personal blogging app built specifically for ChatGPT Sites and its Site-hosted MCP plugin.*

## はじめに

- [導入ガイド（ChatGPT Sites に自分のブログを構築）](docs/GETTING_STARTED.md)
- [使い方（ChatGPT で下書き・修正・公開）](docs/USAGE.md)
- [ソースコードのライセンス（Modified BSD / BSD-3-Clause）](LICENSE)
- [Sites の公式ガイド](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites)

> **ご注意:** これは「リポジトリを複製するだけで自動公開される」サービスではありません。各自の ChatGPT Sites でアプリを配置し、D1/R2、所有者認証、MCP プラグインの接続を確認してください。最初は Site を所有者限定にし、テスト記事で動作を検証することを推奨します。記事の `public` 設定と Site 自体のアクセス公開は別物です。

## ライセンス

このリポジトリのプロジェクト独自コードは **修正 BSD ライセンス（BSD-3-Clause）**で提供します。ソース・バイナリの再配布および改変、商用利用は条項に従って可能です。著作権表示、ライセンス文、免責事項を保持し、権利者や貢献者の名前を無断で推奨・宣伝に使用しないでください。詳細は [LICENSE](LICENSE) を参照してください。依存ライブラリ・外部サービスには、それぞれのライセンス・利用規約が適用されます。

**Site title:** 「観測と思考」 — a reader-facing personal journal with a pure white editorial design. **aiDiary** remains the software/engine name, independently reusable by other authors. The Site must be redeployed separately after a source change; title/theme changes never publish or modify entries.

Conversation-first personal publishing: privately save and revise Markdown from ChatGPT, then **explicitly publish** selected revisions to a readable Japanese technical blog.

**Status (2026-10-17):** The owner Site has validated authenticated MCP operations. GitHub source now declares twelve owner MCP tools, including the `upload_chatgpt_image` fileParams bridge for ChatGPT-generated images. The native fileParams path still requires real-site validation after deployment. See [MCP upload gate](docs/MCP_UPLOAD_MEDIA.md). New additions to GitHub do not automatically deploy to Sites.

## Reader navigation

- **Home `/`:** the three newest published articles show a Markdown excerpt (through part of section 1 where present), images, dates and a read-more link to their full article pages.
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
- `plugin/tool-definitions.ts`: contracts for the twelve owner MCP tools served through `app/mcp/route.ts`, including URL import and host-resolved ChatGPT image file transfer.
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

License: BSD-3-Clause (see [LICENSE](LICENSE)). No release should be tagged before platform acceptance.
