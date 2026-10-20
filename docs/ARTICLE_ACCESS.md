# Current article access and authentication

**Current behavior (October 2026):** There are **two active audiences**, `owner` and `public`. Membership registration, paid access and billing are disabled. The legacy `members` table and legacy visibility values are retained for schema compatibility, not active user features.

| Article state | Verified owner | Anonymous or other reader |
| --- | --- | --- |
| Draft (any stored visibility) | Owner archive/editor only | No access |
| Published + `owner` | Yes | No access |
| Published + `public` | Yes | Yes |
| Historical `registered` / `paid` value | Yes | No access |

## Publication and revisions

- New entries start as `draft`, visibility `owner`.
- `publish_entry` accepts the **latest revision only** and visibility `owner` or `public`. Omitting visibility preserves the existing audience and never silently broadens it.
- Reader queries require `status=published` and non-null `published_revision` as a publication marker, then read **`latest_revision`** under the audience predicate. The marker does **not** freeze a prior revision.
- A saved edit or hero change to an already published entry becomes immediately visible to its current authorized audience, without an explicit republish. Create a separate draft before making sensitive unpublished edits.
- `unpublish_entry` returns the entry to draft/owner, clears the publication pointer and retains all revisions.
- The owner archive exposes saved history only to the owner; public readers never select arbitrary revisions.

## Identity and private routes

Sites supplies trusted owner identity; server-side writes/owner reads require both the authenticated user identity and matching configured owner email, with `AI_DIARY_OWNER_API_ENABLED=true`. Incoming client-controlled identity claims cannot confer access. Owner REST mutations also reject cross-origin Origin headers. The currently active MCP surface has **12 owner-only tools**.

Non-owner sign-in provides **no** membership entitlement. The `/account`, `/owner/members`, `/api/membership` and member-management endpoints are disabled. D1 records are preserved.

Reader metadata and media endpoints enforce the same audience boundary. Private responses must not be shared in caches. Public articles can be indexed, while owner-only articles and management pages remain noindex.

## Historical context

The 2026-10-17 four-tier audience proposal (`owner`, `registered`, `paid`, `public`) was **not retained as active product behavior**. Implementing additional tiers would require new explicit authorization, entitlement and payment security work; the historical schema alone does not enable them.

See [current rollout and deployment](PUBLIC_ROLLOUT.md), [database semantics](DATABASE.md), and [security checks](SITES_AUTH_VALIDATION.md).
