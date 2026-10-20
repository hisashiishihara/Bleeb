# Owner archive, article access and referrers

This page describes **current** Bleeb behavior. The original 2026-10-17 proposals for four audience levels and an owner-private-only Site are historical; see [active access rules](ARTICLE_ACCESS.md) and [public operation](PUBLIC_ROLLOUT.md).

## Owner archive and editor

- `/owner/archive`, `/owner/archive/{id}`, `/owner/archive/{id}/edit`, `/owner/new` and `/owner/media` require verified owner identity.
- The archive includes drafts, published articles and every preserved revision, including versions never made public. It offers filters and historical revision viewing.
- The owner can edit Markdown, upload media, change the hero, publish, unpublish or delete **private drafts**. The archive is **not** read-only; browser REST and Site-hosted MCP share the owner gate.
- Reader pages never reveal private drafts/revisions through home, article metadata, RSS, sitemap, archive filtering or media routes.
- Responses remain private/no-store and owner/private routes remain noindex.

## Audience and publishing

Only `owner` and `public` are active article audiences. A draft is never reader-visible. A published owner-only article can be viewed by its owner, not anonymous readers. A published public article can be read anonymously. Registered/paid membership is disabled even if older D1 values exist.

Reader pages select the **latest saved revision** of a published entry after audience authorization. Once published, further saves to the same entry become visible immediately without changing its audience. `published_revision` is a legacy marker, not the reader-visible revision. Explicit publish/unpublish controls the status and audience.

## Optional referrer counting

The owner-only `/owner/referrers` dashboard provides approximate hostname/day/article referral events for public articles, **only when** `AI_DIARY_REFERRER_TRACKING_ENABLED=true` is configured. The flag is opt-in; no live production enabling is assumed here.

- `app/components/referrer-ping.tsx` sends a browser event on a public article page.
- `POST /api/referrer` validates same-origin requests and public published slugs.
- `drizzle/0001_referrers.sql` stores daily counters of source hostnames.
- The database does **not** record full referring URLs, search query terms, IPs, cookies, raw user agents or visitor IDs.
- Counts may contain repeat visits and are not unique visitors or a backlink crawler. Bots or abuse can affect totals.
- Before enabling, review Site rate limits, traffic impact and abuse defenses.

For Google search impressions and keywords, use a verified [Google Search Console](https://search.google.com/search-console/) property. Its Links report is not a complete backlink crawler or a freely exposed Links API. Search Console verification never justifies indexing owner/private articles.

## Deployment checks

Run tests/type-check/build, deploy the reviewed GitHub commit explicitly to the existing Site, and check real anonymous/private access. Verify any new route or metadata change does not expose owner content. Don't reapply migrations or change the Site audience just to test referral analytics.

[Current access model](ARTICLE_ACCESS.md) · [Current deployment](SITES_HANDOFF.md)
