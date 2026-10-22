# Install Bleeb

Bleeb runs on ChatGPT Sites with Site-hosted MCP, D1 (`DB`) and private R2 (`MEDIA`). It needs no VPS or separately billed OpenAI API key by default. Plan eligibility and hosting limits depend on current platform terms; consult the [official Sites guide](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites).

## Requirements

- An account with ChatGPT Sites and access to Work/Codex deployment tools.
- Access to this repository and permission to create a Site.
- A trusted owner identity and Site secrets.

## New installation

1. Copy the latest reviewed `main` into a **new, separate checkout**. Include `app/`, `lib/`, `plugin/`, `public/`, `drizzle/`, package/configuration files and `.openai/hosting.json`. Exclude Git credentials, `.env*`, `.dev.vars*`, `.git/`, build output and runtime data. Never copy an existing production Site's `project_id` or secrets. The repository's installation manifest intentionally has no `project_id`.
2. Run the supported Sites setup helper with this sanitized template, then create exactly one **new private Site**. Immediately save its returned project ID in the new checkout's manifest. Keep its owner-only audience; record that ID and origin separately from production. If creation or publication needs additional approval, stop and report it.
3. Declare `d1: "DB"`, `r2: "MEDIA"` and `capabilities: ["mcp"]` in that manifest. Sites provisions storage for the new project. Do not reuse production database/bucket IDs, public R2 URLs or custom domains.
4. Keep all five schema migrations in order: `0000_initial.sql`, `0001_referrers.sql`, `0002_article_access.sql`, `0003_media.sql`, `0004_hero_media.sql`. The Sites packaging helper includes `drizzle/`; hosted publication applies pending migrations. Do not also run them manually against a hosted database. Local preview migration commands affect only local storage.
5. Configure **this Site's** runtime variables through Sites settings/tools, not tracked files:

   | Key | Initial value |
   | --- | --- |
   | `AI_DIARY_OWNER_EMAIL` | Verified email of this Site's owner; store as a secret |
   | `AI_DIARY_OWNER_API_ENABLED` | `false` until trusted identity propagation is checked |
   | `SITE_ORIGIN` | This new Site's returned bare HTTPS origin |
   | `SITE_TITLE`, `SITE_DESCRIPTION` | Test-specific branding |

   Image URL imports additionally require narrowly scoped `AI_DIARY_IMAGE_SOURCE_HOSTS`; ChatGPT file transfer uses `AI_DIARY_CHATGPT_FILE_HOSTS`. Only configure verified transfer hosts. Browser file upload does not require an external image host. Layout, About, Privacy, footer/contact links and other site-specific text still require customization; the metadata variables currently customize RSS/sitemap/robots only.
6. Install dependencies and run all three checks below in Work. Build/package the exact source, push it to the **new Site's** source repository and deploy with the owner-private operation. This creates a deployed private Site, not a public audience. Verify `DB` tables (`entries`, `entry_revisions`, `mutation_requests`, `members`, `media_assets`, `referrer_daily`), hero columns and initially empty content. The legacy `members` table is expected; no membership feature is enabled.
7. Only after publication, read the Site's MCP connection details. Requesting them before the first deployment returns an error. Provisioning the plugin ID can finish shortly after deployment; read the same Site again rather than creating another Site or plugin. Use its returned plugin ID, never an existing production plugin.
8. Confirm installation/connection of the new Site-hosted plugin and that its tools are callable in the current conversation. `Already installed` does not prove a healthy authenticated connection or that tools have appeared. If necessary, select the new plugin in a new chat. Do not substitute the existing production tools.
9. With the owner API still disabled, call `list_entries` through the authenticated new plugin. The expected bootstrap response is `Verified owner identity received; owner API is disabled`. Missing/non-owner identity must instead return `Owner authentication is required`. This distinguishes verified owner propagation from a configuration error. Never supply identity headers yourself to complete a positive test. `/login` provides browser sign-in, but management is intentionally unavailable until activation.
10. Check unsigned and forged-header access. Then set `AI_DIARY_OWNER_API_ENABLED=true` **on the test Site only** and redeploy its saved version to apply the new runtime revision. Verify the owner's `list_entries` succeeds. If the plugin cannot be called, leave the flag `false` and report owner operation tests as pending.
11. Use a fictional article: save a draft, update it with `expected_revision`, verify both revisions, explicitly publish, then unpublish. Upload a tiny synthetic PNG through the authenticated editor, select/clear it as hero, delete only that test media and verify owner reads now return 404. Confirm D1 records and actual R2 bytes where access permits; a binding declaration alone is not a successful upload test.
12. Test an anonymous browser/request against management, private article/media and MCP mutations. A private Site rejects visitors at the platform boundary (for example, HTTP 401); this does **not** by itself prove application authorization or anonymous visibility of public articles. Keep the Site private. Record live tests separately from isolated SQLite/mocked-R2 tests. Do not open the audience merely to complete a test.

Example Work instruction:

```text
Create a NEW private ChatGPT Site from hisashiishihara/Bleeb.
Bind new D1 DB and private R2 MEDIA, set up trusted owner authentication,
and enable Site-hosted MCP with fictional test data only.
Check draft/publish/unpublish/media and blocked anonymous owner access.
Do NOT touch my existing blog, Site, articles or storage.
```

## Existing Site updates

For `観測と思考` (`https://blog.odorikani.net`), **deploy to the existing Site** rather than following the new-install steps. Before ANY future production code deployment from this refactor, explicitly set `SITE_ORIGIN=https://blog.odorikani.net`, `SITE_TITLE=観測と思考`, `SITE_DESCRIPTION=技術の変化を読み、企業や市場の未来を予測する個人の blog`, and `SITE_EYEBROW=OBSERVATION / THOUGHT`; otherwise generic defaults will replace the visible branding. About and Privacy are now generic starter pages: preserve the existing production copy through a separate site-specific customization before deploying this change to production. Never re-run existing migrations or change D1/R2, visibility, owner secrets or MCP connections without explicit approval. See [deployment handoff](SITES_HANDOFF.md).

## Development checks

```sh
npm install
npm test
npm run typecheck
npm run build
```

GitHub pushes do not deploy Sites. Article content updates through D1/MCP normally need no code redeploy.

## Installation validation record (2026-10-22)

Work tested source commit `408c62090cd2c84633cfdafadb799683c5c488e0` in a fresh checkout on the current account. Dependency installation, 86 tests, type checking and production build passed. A separate owner-only Site deployed successfully; five hosted migrations created the six expected tables, including visibility and media metadata. A dedicated Site-hosted MCP plugin was provisioned and reported already installed.

Anonymous page, owner, media and forged-header requests were rejected with 401/no-store. MCP HTTP diagnostics, including the documented service-access path, also returned 401. This conversation did not expose callable tools for the new plugin. The owner API therefore remained disabled and the hosted database stayed empty. Live owner draft/edit/publish/unpublish and R2 upload/delete tests are **not completed**; their isolated SQLite/mocked-storage regressions passed. The service-access failure's cause is not established; it is not evidence that valid owner MCP authentication fails.

Remaining manual handoff: select/connect the new plugin in a conversation that exposes its tools, verify the disabled-owner bootstrap response, activate only that test Site, then perform the fictional-content tests. This is not a verified one-click install, a second-account Plus eligibility test, or a storage/billing guarantee.

[Usage](USAGE.md) · [Security validation](SITES_AUTH_VALIDATION.md) · [Release checklist](PUBLIC_RELEASE_CHECKLIST.md)
