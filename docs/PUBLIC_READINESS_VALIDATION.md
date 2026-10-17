# Owner/public readiness validation — 2026-10-17

Current policy: owner/public only. Membership registration and management are disabled; their records/tables are retained. Earlier four-audience validation is historical.

## Deployment

- Site: https://ai-diary-owner-test.hisashi-ishiha27957.chatgpt.site
- Source: 1fc01115b874b75edafdbb1f9fd6eb7e5d8d8367
- Saved version: appgprj_6ad2f8d246c081919860dd7e420d0590~appgver_40f6f08a1df08191be7af087dc44cf2d
- Deployment: appgdep_6ad30d223cbc8191ba03735f1b0314d4 (succeeded)
- Site audience remains owner-only. No audience-change tool was called.
- No new SQL migration or data reset was needed.

## Passed

- 16 tests, TypeScript checking, production build.
- Actual reader SQL rejects drafts even if their stored visibility is public, and never selects an unpublished revision.
- Legacy paid/registered rows remain readable only by the owner. Paid/free memberships and supplied membership claims grant no special access. Explicit paid/registered publish requests fail.
- Membership endpoints return 404 even for the owner; account and membership pages are disabled.
- All seven MCP calls preserve owner authorization; runtime owner calls saved, updated, published, read, listed, exported and unpublished the fictional fixture.
- Existing three articles and seven revisions matched the before-change snapshot exactly.
- Via documented service access with no visitor identity, the homepage and fictional public permalink exposed only published revision 1. A requested revision=2 query still returned revision 1. Existing drafts returned 404.
- After unpublishing, the same permalink returned 404 and disappeared from the list, with no-store responses. Republishing revision 1 required no application deployment.
- All seven owner POST APIs rejected service access plus forged owner identity (403). MCP calls rejected it (401). Registration and membership management returned 404 without writes.
- Normal owner pages, referrer dashboard, historic revision URLs and disabled endpoints return no private content to callers lacking verified owner identity.
- RSC/prefetch requests contained no private markers; the owner archive redirect was followed once and returned 404 with private/no-store. A direct regular request also returned 404.
- Unsigned internet requests to home, public fixture and owner archive are still rejected at the private Sites ingress (401/no-store), as intended before approval.
- Runtime reader pages returned no-store/must-revalidate; protected/404 pages returned private/no-store. No public content cache was enabled.
- Referrer tracking remains disabled; no payment service or real article was used.

## Concrete approval checkpoint

One fictional article is deliberately public at application level but still behind the private Site policy:
- Title: 架空の一般公開テスト：星の図書館
- Permalink: /posts/entry-4dd37477
- Entry: 4dd37477-51ba-4a4f-af7f-9fd7242340e5
- Published revision: 1 (contains 星の図書館A)
- Private latest revision: 2 (contains 星の図書館B-PRIVATE; never published)
- The previous three articles remain private drafts.

General-public Site access still requires the owner's explicit confirmation. The service-access tests above are app-level anonymous tests, not anonymous internet end-to-end tests. After approval, change the Site audience and immediately test unsigned/no-cookie public reads, forged headers, protected URLs/APIs/MCP, metadata, RSC and withdrawal. Restore owner-only access if a protection fails. See PUBLIC_ROLLOUT.md.

The owner can review the fixture while signed in before authorizing the audience change. No custom domain, real article publishing, membership rollout or billing is part of that approval.
