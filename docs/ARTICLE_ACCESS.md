# Article audiences and membership

Implemented 2026-10-17. This document supersedes the future-audience section of ACCESS_AND_REFERRERS.md. Sites remains owner-private; no public rollout or payment integration is authorized.

| Article audience | Owner | Active paid member | Registered member | Anonymous / unregistered |
| --- | --- | --- | --- | --- |
| owner | yes | no | no | no |
| paid | yes | yes | no | no |
| registered | yes | yes | yes | no |
| public | yes | yes | yes | yes |

Status and visibility are independent. All new and migrated entries default to owner. Drafts and all historical or newly saved revisions are accessible only through owner APIs/archive. Reader queries always join published_revision, never latest_revision. Owner readers can see published owner articles in the regular reader view; all drafts and history remain accessible in the archive.

## Publishing

publish_entry accepts visibility=owner|paid|registered|public and a saved revision. Broader access requires explicit owner intent. Omitted visibility retains the current audience for compatibility; it never broadens access. New request IDs are required for distinct publication operations. unpublish_entry resets status=draft, visibility=owner and published_revision=NULL without deleting history. The seven MCP tool names and existing required parameters are retained.

## Identity and registration

Sites Dispatch supplies verified oai-authenticated-user-id (stable within one Site) and verified email. It removes caller-supplied identity headers. The application uses the Site-scoped ID as the membership key. Owner authorization retains both the ID/email verification and the owner API enable switch.

/account offers the documented top-level /signin-with-chatgpt flow. Authentication alone does not register a reader. An explicit same-origin POST /api/membership with action=register creates a free membership for the server-injected ID. Client IDs, tiers and payment claims are rejected. Re-registration never reactivates revoked access or changes existing entitlement.

Migration 0002 creates members with user_id, registered_at, tier, active, paid_active, paid_until and updated_at. Paid access requires active registration, tier=paid, paid_active=1 and either no expiry or a valid future paid_until. Every reader request queries the server-side row; there are no entitlement cookies, client claims or in-memory permission caches. Paid expiry is exclusive: a member loses paid access at the expiry instant and keeps registered access while their registration remains active.

## Owner management

/owner/members lists up to 100 existing registered members. Its same-origin POST /api/owner/members requires the existing verified owner gate. It can change registered/paid tier, active status, paid_active and expiry. It cannot create an arbitrary member ID; that ID must first arrive through verified registration. Account state and membership identifiers are owner-only. No real memberships are seeded, and no billing occurs.

## Read surfaces and cache

The shared audience SQL predicate runs before selecting reader list, article body, title or description. An unauthorized permalink returns generic not-found metadata and page content. There are no reader endpoints accepting an asserted user ID or audience. Owner archive, revision pages, exports and mutations continue to require owner authorization. Public referrer collection additionally requires visibility=public and stays disabled.

All responses receive private/no-store and CDN no-store headers. Pages are dynamic and non-indexable. This deliberately includes public articles, so audience reductions, revocation and expiry do not leave a public cached copy. Public caching is not part of this release.

## Test boundary

The existing owner-private Sites policy prevents non-owner readers from reaching the Worker. Keep that policy. Synthetic memberships and the full reader matrix are tested only in isolated in-memory SQLite using the actual store/query/API functions. Synthetic identity headers there represent the trusted platform ingress; they do not prove a second account's hosted sign-in. Hosted unsigned/forged-header rejection and real owner MCP operations are tested separately. Do not claim hosted paid/free login verification until separate authorized accounts and an appropriate isolated Sites access policy exist.

Before a public rollout, separately authorize the Site audience change and test real signed-in registered/paid/expired accounts, anonymous HTML/metadata, registration, management and cache behavior. No external identity or authentication protocol is guessed.

## Payments

Payment provider, checkout, verified webhook signature validation, subscription reconciliation, cancellations/refunds, and audit trail for billing events remain unimplemented. A future integration must update server-side entitlement records only after verified provider events. ChatGPT Plus/Pro is unrelated to aiDiary membership.


## Current operation update (2026-10-17)

Only owner/public audiences are active. Membership registration, membership management and billing are suspended. Existing schema/data are preserved. PUBLIC_ROLLOUT.md supersedes earlier active member/audience plans; changing the Sites audience to public requires explicit owner confirmation.
