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

Every write must verify **trusted owner identity** before touching data. Anonymous readers must not access drafts, owner routes, private media or mutation endpoints. Site sharing is separate from the article's visibility. Media deletion must protect assets referenced by the latest visible revision.

## Operations

Site-hosted MCP (**12 owner-only tools**) manages draft creation, revision updates, publication, withdrawal and media actions. A small owner-only web editor also supports copy-to-note and public-article bookmarking. Changes to articles persist in D1 without a Site code deployment. Use optimistic revision checks and idempotency keys for safe updates.

Public discovery endpoints `/feed.xml` (RSS 2.0), `/sitemap.xml` and `/robots.txt` query only public, published articles, **independent of viewer identity**. The public homepage, public article metadata, About and Privacy are indexable; private/owner routes remain noindex. The production canonical host is `https://blog.odorikani.net` (currently set as `SITE_ORIGIN` in `lib/public-discovery.ts`); new installations must change this to their own domain before enabling indexing.

## Reliability and release

Preserve revision history. Export content in portable formats; verify a full import/restore before treating it as disaster recovery. Apply migrations in order and never reset production D1/R2. Test access boundaries, unauthorized requests, XSS, revision conflicts, backups and deployment behavior. A GitHub push does not automatically update the Site.

See [database schema](DATABASE.md), [MCP validation](SITES_AUTH_VALIDATION.md), [media handling](EDITOR_MEDIA.md), and [release checks](PUBLIC_RELEASE_CHECKLIST.md).
