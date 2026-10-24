# Public blog operation and release boundaries

**Current state (reported 2026-10-24):** `観測と思考` is an internet-accessible ChatGPT Site at `https://blog.odorikani.net`, updated in place to **v45** (deployment `appgdep_6adc51de6b988191b81f7965e17ef55e`, source `36f66c33ed831b9854a2c030e34820002a8ecbda`). Work reported 112 tests, type-check and build passing; generated HTML for a width-specified draft image was centered. The signed-in browser appearance has not been verified. v43 introduced the additive `0005` D1 migration; v45 added no migration. This supersedes the **pre-public-release** instructions from 2026-10-17. GitHub repository visibility remains a separate decision.

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
- Markdown images with a valid quoted `"width=N%"` title (integer 1–100) are displayed at that percentage of the text width and automatically centered; ordinary image rendering is unchanged. See [Usage](USAGE.md#images-and-videos).

## Safe updates to the existing Site

1. Confirm the reviewed GitHub commit passed tests, type-check and production build.
2. **Update the existing Site**. Do not create a replacement, change its custom domain, reconnect/recreate its plugin, reset D1/R2, modify article visibility, or run old migrations again.
3. Reconfirm verified owner authentication, anonymous 404s for private routes/media and MCP mutation denial.
4. Check real HTTP metadata: no `X-Robots-Tag: noindex` on intentionally indexable pages, and no accidentally inherited `index` on private pages.
5. Check public RSS/sitemap against the current public-only D1 rows, ensure non-public entries are absent, and verify redirect/canonical URLs.
6. Report GitHub commit, Work test/typecheck/build results, Sites deployment ID, checked production URLs and any unverified browser actions.

**Historical note:** The original 2026-10-17 document required explicit owner approval *before the initial public launch*. That gate has already been passed for this Site. It must not be interpreted as permission to expose any additional previously private content or change GitHub repository visibility.
