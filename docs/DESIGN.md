# Bleeb Architecture

**Stack:** ChatGPT Sites + Site-hosted MCP + D1 (`DB`) + private R2 (`MEDIA`).

```text
ChatGPT conversation → owner-authenticated MCP tools
                                 ↓
                          article operations
                          ↙             ↘
                   D1 revisions       R2 media
                          ↓
                  Sites reader pages
```

## Principles

- **Smallest maintainable implementation wins.** Refactor to remove duplicate logic, unnecessary dependencies and unused paths. Never trade away authorization, correctness or tests for fewer lines.
- Use Sites hosting, platform identity and built-in features before creating custom infrastructure.
- Keep code deployment, article publication and Site sharing separate. No extra LLM API billing by default.

## Content and permissions

D1 stores entries, immutable revisions, mutation deduplication and media metadata. R2 stores file bytes. The **latest revision** of an already-published article is reader-visible within its current audience; `published_revision` remains a legacy publication marker. Drafts are private. Active article audiences are **owner** and **public**; membership and payments are disabled.

Every write must verify **trusted owner identity** before touching data. Anonymous readers must not access drafts, owner routes, private media or mutation endpoints. Site sharing is separate from the article's visibility. Media deletion must protect assets referenced by the latest visible revision. Migration `0005_media_deletion_fence.sql` adds permanent D1 deletion intents and triggers that block references during and after R2 removal. Intents never expire or reopen access; concurrent retries only delete the same immutable key. Draft deletion uses this same fence.

## Operations

Site-hosted MCP (**12 owner-only tools**) manages draft creation, revision updates, publication, withdrawal and media actions. A small owner-only web editor also supports copy-to-note and public-article bookmarking. Changes to articles persist in D1 without a Site code deployment. Use optimistic revision checks and idempotency keys for safe updates.

Public discovery endpoints `/feed.xml` (RSS 2.0), `/sitemap.xml` and `/robots.txt` query only public, published articles, **independent of viewer identity**. The public homepage, public article metadata, About and Privacy are indexable; private/owner routes remain noindex. The production canonical host is `https://blog.odorikani.net` (currently set as `SITE_ORIGIN` in `lib/public-discovery.ts`); new installations must change this to their own domain before enabling indexing.

## Proposed optional commerce integration (2026-10-28; not deployed)

The owner selected **Bleeb + merchant-daemon** as the direction for a future commerce workflow. Bleeb provides the ChatGPT Sites hosting shell, authenticated management UI and MCP, and patterns for D1/R2 persistence; [merchant-daemon](https://github.com/hisashiishihara/merchant-daemon) retains a separate canonical commerce model and provider adapters. Reuse minimal common infrastructure, **not** blog article schemas or article publication logic. This proposal does **not** change the current 12 owner-only MCP tools, live Blog, public routes, or production D1/R2.

Suggested planned internal composition:
```text
Bleeb existing Site
  /owner/archive and article MCP       [existing]
  /owner/commerce and commerce MCP     [proposed optional module]
                   |
         merchant-daemon domain ports
                   |
     commerce_* D1 records + commerce/ R2 keys
                   |
          revision-bound merchant approval
                   |
         Shopify outbound API [test only]
```

**Security/correctness gates:** Keep merchant records separate from `entries`/`entry_revisions` and `media_assets`; blog media bytes/ownership and R2 deletion fences must not accidentally apply to commerce media. Use explicit ledger namespace, migration files and D1/R2 recovery boundaries. Commerce approval is tied to an exact product revision, unlike current Bleeb articles where edits to a published article appear immediately. A stale approval, unbound product target, unidentified merchant or uncertain Shopify result must fail closed. Do not assume an authenticated Bleeb owner session authenticates outside merchants; the first PoC is owner-operated/test-merchant only. Require an approved separate merchant-auth scheme before inviting real sellers. Require test coverage for anonymous access, site identity spoofing, article regression, migration/rollback, object lifecycles, merchant isolation and external API retries.

**Operational gates:** Build on a private staging Site and run relevant existing Bleeb tests/typecheck/build plus new integration tests before suggesting production changes. The existing `blog.odorikani.net` Site and its real D1/R2 data are OUT OF SCOPE for automatic migration or deployment. Shopify dev-store writes and real email webhook/reply processing require distinct authenticated test environments and authorization. No VPS or scraping for the first milestone. If Sites lacks essential ingress, outgoing network or retry capabilities, record the evidence and escalate a narrowly scoped platform decision.

[Merchant-daemon requirements](https://github.com/hisashiishihara/merchant-daemon/issues/1) · [Bleeb roadmap](ROADMAP.md).

## Reliability and release

Preserve revision history. Export content in portable formats; verify a full import/restore before treating it as disaster recovery. Apply migrations in order and never reset production D1/R2. Test access boundaries, unauthorized requests, XSS, revision conflicts, backups and deployment behavior. A GitHub push does not automatically update the Site.

See [database schema](DATABASE.md), [MCP validation](SITES_AUTH_VALIDATION.md), [media handling](EDITOR_MEDIA.md), and [release checks](PUBLIC_RELEASE_CHECKLIST.md).

## Shared authorization and mutation rules

Published reader queries share `publishedReaderScope`: published status and a non-null publication marker are required before applying owner/public scope. Historical `paid` and `registered` values remain inaccessible to non-owners. Public media reads still require public visibility; media deletion protection also covers owner-only published articles. Both use the same inline/hero reference predicate without conflating their SQL audiences.

`lib/store.ts` keeps mutation orchestration in one file. Completed-request lookup is shared by article and media operations, including recovery after an atomic batch loses an idempotency race. Revision preconditions are shared before revision writes and external image I/O. D1 batch transactions, optimistic lock SQL, replay-before-validation ordering, owner checks and R2 failure cleanup remain unchanged. Draft deletion retains its separate multi-table guards and R2-first sequence.

GitHub Actions workflows are removed. Validate source in Work with `npm test`, `npm run typecheck` and `npm run build`; deploy only on a separate explicit request.
