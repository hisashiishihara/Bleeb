# Archive deployment validation — 2026-10-17

Source: 5540df1fc6fc743e745f288b53cf265b22a9bc7c, plus explicit private/no-store headers for owner pages and APIs.
Site: https://ai-diary-owner-test.hisashi-ishiha27957.chatgpt.site
Sites source commit: 89192339e8c04cd75a23025b10b0877db5075531
Saved version: appgprj_6ad2f8d246c081919860dd7e420d0590~appgver_0a911e5ed1a48191ae6ddd8be7ee5fcc
Deployment: appgdep_6ad3017a125c8191bd7b583e734bf96c (succeeded, environment revision 3).

## Passed

- 11 automated tests, TypeScript check, and Sites production build.
- Hosted migration 0001: referrer_daily exists with only day, entry_id, source_host, hits columns.
- Existing fictional article and its three revision records match the before-deployment snapshot exactly.
- All seven existing MCP tools succeeded after deployment; new fictional fixture saved, edited, old revision read, published and unpublished. Both articles are currently private drafts.
- Owner archive, historic revision page and referrer dashboard deny unsigned/forged callers (401 at ingress; service-only or service plus forged identity returns 404 without private content).
- Owner pages return Cache-Control: private, no-store, max-age=0 and CDN-Cache-Control: no-store, including denied responses.
- Owner get/export POST APIs reject service plus forged identity with 403.
- AI_DIARY_REFERRER_TRACKING_ENABLED is explicitly false. A synthetic referrer POST returned 204 and referrer_daily remained empty.
- Access remains owner-only, with no groups or external visitors. No custom domain or public sharing was configured.

## Pending owner browser acceptance

Cloud Browser takeover did not work for the owner. On 2026-10-17 the owner explicitly chose to test in their own browser and authorized proceeding with deployment/source synchronization. No authentication bypass was introduced.

The following are not claimed as passed on the hosted owner UI:
- Owner archive list and draft visibility.
- Title/body/historic revision keyword and exact-tag search.
- Historic revision navigation and content rendering.
- Referrer dashboard positive display using fictional hosted aggregate data.
- Cache behavior after a successful authenticated owner response.

Local aggregate/schema tests passed; positive hosted referrer aggregation/display has not been exercised. Tracking remains disabled. No synthetic aggregate rows were seeded.

## Manual test fixture

Open /owner/archive. The fictional title is “架空アーカイブ検証：軌道図書館”.
- Latest body keyword: 銀河棚902.
- Historic-only body keyword: 瑠璃環701.
- Latest tag: archive-current-902.
- Historic-only tag: archive-historic-701.
- Entry: e42540b3-f559-4884-ba2d-ef99cade885d; revisions 1 and 2.
- Reading r1 should show 瑠璃環701; reading r2 should show 銀河棚902.
- /owner/referrers should currently show no data.

General-public sharing, membership, payments, Search Console, and further backup development are outside this change.
