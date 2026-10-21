# Public blog operation and release boundaries

**Current state:** `観測と思考` is an internet-accessible ChatGPT Site at `https://blog.odorikani.net`. As reported after the **2026-10-20 v38 deployment**, public article access, noindex removal for selected public pages, RSS/sitemap, private-route rejection, and data preservation were checked on the live Site. This supersedes the **pre-public-release** instructions from 2026-10-17. GitHub repository visibility is a separate decision.

## Present behavior

- Publishing and Site code deployment are different: D1 publication is performed by the owner; a GitHub push does not deploy ChatGPT Sites.
- Active audiences: `owner` and `public` only. Status `draft` is not reader-visible; published reader content is the **latest saved revision**. `published_revision` is a historical publication marker, not the displayed content selector.
- Anonymous visitors can read only `published + public`. Owner-only articles, drafts, revision history, owner pages, owner APIs and all **12 MCP tools** remain protected.
- Registration, member administration and paid features are disabled; retained D1 tables do not grant reader access.
- A published article edited later changes immediately for readers with access. Publishing, unpublishing or narrowing an audience requires deliberate owner action.
- Cache control remains conservative (`private, no-store`); indexing permission is independent of caching.
- Public home, public article detail, About and Privacy opt into indexing. Owner-only articles, management pages, archive and tag indexes remain `noindex` under current policy.
- `/feed.xml`, `/sitemap.xml` and `/robots.txt` are public. They enumerate **only** public published articles regardless of owner login state; the homepage and static pages are also in the sitemap.
- Referrer counting is opt-in and disabled unless `AI_DIARY_REFERRER_TRACKING_ENABLED=true`.

## Safe updates to the existing Site

1. Confirm the reviewed GitHub commit passed tests, type-check and production build.
2. **Update the existing Site**. Do not create a replacement, change its custom domain, reconnect/recreate its plugin, reset D1/R2, modify article visibility, or run old migrations again.
3. Reconfirm verified owner authentication, anonymous 404s for private routes/media and MCP mutation denial.
4. Check real HTTP metadata: no `X-Robots-Tag: noindex` on intentionally indexable pages, and no accidentally inherited `index` on private pages.
5. Check public RSS/sitemap against the current public-only D1 rows, ensure non-public entries are absent, and verify redirect/canonical URLs.
6. Report GitHub commit, Work test/typecheck/build results, Sites deployment ID, checked production URLs and any unverified browser actions.

**Historical note:** The original 2026-10-17 document required explicit owner approval *before the initial public launch*. That gate has already been passed for this Site. It must not be interpreted as permission to expose any additional previously private content or change GitHub repository visibility.
