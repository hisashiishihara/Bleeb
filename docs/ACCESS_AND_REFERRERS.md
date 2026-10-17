# aiDiary: private archive, audiences and referrers

Decision 2026-10-17. Source of truth for the proposed additional features.

## Private archive

Route: `/owner/archive` with `/owner/archive/{entry_id}`.

- Authenticated **owner only**, verified with the exact same Sites-injected identity and owner email check as the MCP tools.
- Includes drafts, published articles, and every preserved revision (including revisions never published).
- Filters: status, keyword appearing in any saved title/body/summary, and exact tag in any saved revision.
- The owner can inspect an explicit historic revision without making it public or editing it.
- No endpoint leaks private content through home lists, sitemap, metadata, search indexes or generic API.
- Dynamic routes are non-indexable and must be verified uncached (`Cache-Control: private, no-store`) before expanding Site access beyond owner-only.
- No owner account name, email, or other secret is embedded in HTML or source.

This is a **read-only** UI. Normal ChatGPT MCP commands remain the only editor.

## Article state and audience (next stage, not yet implemented)

A saved draft and the *published revision* are different concepts.

- `draft`: only the owner, regardless of selected future audience.
- `published + owner`: private personal knowledge article, deliberately marked as published internally.
- `published + registered`: owner and authenticated members.
- `published + paid`: owner and verified active subscribers.
- `published + public`: anonymous readers and everyone above.

Membership and paid entitlements are distinct from ChatGPT Plus or other OpenAI plan subscriptions.
To avoid accidental disclosure, do not flip the owner-only Site policy for the current
binary published/draft schema. Design and test the new audience gate on every server
read surface **before** any publicly accessible deployment. Public HTML, metadata,
feeds, shared previews and caching must all use one common audience check.

Payment provider, reader registration, multi-user auth, and general-public sharing are
not in the current implementation. Introducing those needs a separate approval.

## tDiary-like referrers (first phase)

The private `/owner/referrers` dashboard summarizes **actual visits to published pages**
for the past 90 days, grouped by referrer hostname and article. This is a referrer
counter, not a backlink crawler. A page containing a link that nobody clicks does
not appear.

Implementation:
- `app/components/referrer-ping.tsx`: browser event only after real public article view.
- `POST /api/referrer`: same-origin request, no cookies; separately gated by
  `AI_DIARY_REFERRER_TRACKING_ENABLED=true`. Disabled if unset.
- `drizzle/0001_referrers.sql`: daily hostname counts in D1.
- Server validates published-only article slug and normalizes referrer to HTTPS hostname.
- No IP, cookie ID, user agent, path, search query, fragment, or raw referer is kept.
- Duplicate page loads may be counted; counts are *events*, not users.
- With the Site still owner-only, leave tracking disabled. Do not enable before
  checking Sites rate limits, bot effects and abuse protections for a public endpoint.
- This is opt-in anonymous statistics, not a security-sensitive author mutation; any
  visitor may generate an approximate signal, so do not use it for financial settlement
  or access decisions.

Browser referrer policies often disclose only origin for cross-origin navigation.
This makes exact source-page URLs and Google search terms unavailable in many cases.

## Google Search Console (future)

For **external links Google has discovered**, use Search Console's *Links* report.
It is sampled, not a complete live index of links. The Search Console API documents
Search Analytics / Sitemaps / Sites / URL Inspection, not a public Links-report API.
Consequently do not fake a direct automatic backlink listing.

For **search phrases, clicks, impressions and positions**, Search Analytics API
can be used later with owner-authorized Google OAuth and a verified Site property.
Search Console data only exists for eligible, Google-visible pages. Never index
private drafts, subscriber content, or owner archive to make analytics work.

Docs:
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy
- https://support.google.com/webmasters/answer/9049606?hl=en
- https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- https://developers.google.com/webmaster-tools/v1/api_reference_index

## Deployment validation

1. Run automated tests and build, then deploy by Sites workflow; GitHub push does not deploy.
2. Apply D1 migration 0001; verify old article/revision data unchanged.
3. As owner, browse `/owner/archive`, search and read all fake revisions.
4. As unsigned user and forged-header caller, prove both owner archive routes and
   referrer dashboard return 404/403 without any cached body content.
5. Leave tracking disabled until public read access and abuse guards are reviewed.
6. Later, test allowed public post external-referrer events and verify D1 aggregates
   only normalized domain/day/article; unpublished and guessed slugs add no rows.
7. Keep the Site owner-only, no custom domain and no real articles during testing.

No public rollout or payment setup is authorized here.
