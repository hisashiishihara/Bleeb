# Owner/public operation and public rollout gate

Decision 2026-10-17. This document supersedes the active four-audience/member operation described in ARTICLE_ACCESS.md. The older documents and migration 0002 remain historical records.

## Current operation

- New articles are draft + owner. publish_entry accepts only owner or public. Omission preserves public only when the current audience is already public; otherwise it uses owner. Explicit paid/registered values are rejected.
- Reader SQL serves only status=published joined to published_revision. Non-owners can read only visibility=public. Signed-in non-owners have exactly the same rights as anonymous readers. Prior paid/registered records, if any, are readable only by the owner. No membership lookup grants reader privileges.
- Owner archive includes all drafts and history and shows visibility. All seven MCP operations, including private reads and exports, require the existing owner ID/email check and enabled owner API.
- Membership registration and management pages return 404. Their POST endpoints also return 404 without reading or mutating membership records, including for the owner. Navigation no longer offers membership or payment functions. Existing member records/tables are retained.
- Owner REST mutations reject cross-origin requests with an Origin header. MCP remains server-to-server with its verified user identity.
- Public list, permalink and metadata use the same audience-filtered reader queries. No public API accepts a revision, user ID or audience claim to bypass these queries.
- Dynamic/no-store responses and CDN no-store prevent shared caching of audience-dependent content. Public cache optimization and SEO are outside this rollout.
- The former runtime validation endpoint has been removed. Referrer tracking remains disabled.

## Required Site approval

The existing Site remains owner-private while code and HTTP safeguards are tested. A documented service-access token supplies no user identity; it can exercise app-level anonymous reader behavior behind the private Site boundary. This is not an end-to-end anonymous internet visit.

Before changing Sites access_mode to public, obtain the owner's explicit confirmation. Describe exactly which fictional article is already marked public and will become readable. Do not publish previous drafts or conversation history.

After approval, change only the Site audience, then immediately verify:

1. No-token/no-cookie GET of the public fictional permalink and homepage returns only its published revision.
2. Owner-only entries, drafts, unreleased revisions, owner pages, get/export APIs and all MCP calls reject unsigned and forged-identity clients.
3. Requests with RSC/prefetch headers or a requested private revision do not reveal private metadata or content.
4. No-store headers remain effective; switching the fictional article back to owner immediately makes anonymous reads return 404.
5. Real owner MCP calls can publish a selected revision to public without application redeployment and withdraw it again.

If a real public-ingress protection fails, restore owner-only Site access immediately and report the failure. Keep a record of the returned access policy. No custom domain, payments, membership development or real article publishing is authorized by preparation alone.
