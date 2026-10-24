# Database design (current D1 schema)

This document describes the **implemented schema**, reconstructed from `drizzle/0000_initial.sql` through `0005_media_deletion_fence.sql`. Those migration files remain the authoritative DDL. `docs/DESIGN.md` contains an earlier illustrative proposal, not a complete current schema. No migration should be inferred from this document.

## Storage and ownership

- **Cloudflare D1 (SQLite)** is the operational source of truth for articles, append-only revisions, mutation replay records, media metadata and optional referrer statistics.
- **Private R2 bucket `MEDIA`** stores media bytes. `media_assets.storage_key` locates the R2 object; media bytes do not live in D1.
- Article mutation APIs require trusted owner authorization. Reader queries filter publication status and audience **server-side**. D1/R2 bindings are configured separately by the Site.
- IDs are application-generated strings. Timestamps are stored as text (UTC ISO-8601 by convention), and reader dates are displayed in Asia/Tokyo.

## Tables

| Table | Primary key | Main columns | Relationships and purpose |
| --- | --- | --- | --- |
| `entries` | `id` | `slug` (unique), `status`, `visibility`, `latest_revision`, `published_revision`, `created_at`, `updated_at`, `published_at` | Article identity, audience and lifecycle |
| `entry_revisions` | (`entry_id`, `revision`) | `title`, `body_md`, `summary`, `tags_json`, `saved_at`, `hero_media_id`, `hero_alt_text` | Immutable saved article revisions; `entry_id` references `entries.id` |
| `mutation_requests` | `request_id` | `operation`, `response_json`, `created_at` | Idempotency ledger: replay a committed result for the same operation, reject request-ID reuse for another operation |
| `media_assets` | `id` | `entry_id`, `storage_key` (unique), `content_type`, `byte_size`, `original_name`, `created_at` | Media metadata; `entry_id` references `entries.id`, `storage_key` maps to R2 |
| `referrer_daily` | (`day`, `entry_id`, `source_host`) | `hits` | Optional aggregated referral counts; `entry_id` references `entries.id` |
| `members` | `user_id` | `registered_at`, `tier`, `active`, `paid_active`, `paid_until`, `updated_at` | Historical membership schema; registration, payment and membership features are currently disabled |

Relationship overview:

```mermaid
erDiagram
  entries ||--o{ entry_revisions : has
  entries ||--o{ media_assets : owns
  entries ||--o{ referrer_daily : aggregates
```

`entry_revisions.hero_media_id` contains a media ID but **has no SQL foreign-key constraint**. `mutation_requests` and `members` have no SQL foreign key to `entries`.

## Constraints and indexes

- `entries.status`: `draft` or `published`; draft rows require `published_revision IS NULL`, and published rows require it to be non-null. `latest_revision >= 1`; publication pointer must be positive when set.
- `entries.visibility`: schema allows `owner`, `paid`, `registered`, `public` for historical compatibility, but **current application operations support only `owner` and `public`**.
- `entry_revisions.revision >= 1`; each article/revision pair is unique. `tags_json` is JSON stored as text, not a separate tags table.
- `media_assets.byte_size > 0`; `referrer_daily.hits >= 0`; membership `active` and `paid_active` are 0/1 and `tier` is `registered` or `paid`.
- Indexes: `idx_entries_public(status, published_at DESC)`, `idx_revisions_entry(entry_id, revision DESC)`, `idx_referrer_day(day)`, `idx_media_entry(entry_id)`, `idx_entry_revisions_hero_media(hero_media_id)`. The primary keys and unique slug/storage key also create uniqueness constraints.

## Lifecycle and revision semantics

1. **Create draft:** insert `entries` with `status=draft`, `visibility=owner`, `latest_revision=1`, `published_revision=NULL`; insert revision 1.
2. **Save changes:** append `entry_revisions` at `latest_revision + 1`, and update `entries.latest_revision` with an expected-revision guard. Prior revisions are retained.
3. **Publish:** explicit `publish_entry` selects the **latest** saved revision only; update `status=published`, `visibility`, `published_revision`, and publication timestamps. Never infer a broader audience merely from a save.
4. **Already published:** reader routes render the **latest saved revision**, not `published_revision`, subject to current audience restrictions. A subsequent save/hero edit is immediately visible to the existing authorized audience. `published_revision` records the last explicit publish operation and remains a legacy/history pointer.
5. **Unpublish:** reset status to draft, visibility to owner, clear `published_revision` and `published_at`; preserve revision history.
6. **Delete draft:** restricted to never-published private drafts under a revision precondition; related data and R2 bytes are removed using guarded operations. A published entry cannot use this route.

Do not interpret `published_revision` as a frozen snapshot: the current reader joins use `latest_revision` (`lib/reader-store.ts`). An authorization or publication-status change must remain effective immediately.

## Media consistency and an implementation caveat

`lib/media-store.ts` writes bytes to R2, then registers the `media_assets` row in D1, attempting cleanup if the D1 insert fails. URL and ChatGPT-image upload paths perform subsequent revision/idempotency operations and attempt to remove unused assets after errors or duplicate submissions. Because D1 and R2 are separate stores, these steps are **not a single cross-store atomic transaction**; review failure and retry paths when changing the implementation.

Public media reads in `lib/media-store.ts` check the **current `latest_revision`** of a published, public article. Before any R2 deletion, `lib/media-deletion.ts` atomically records an irreversible intent in `media_deletions`, only if no published article currently references the asset. The reference test is the same conservative canonical `/media/<UUID>` substring or exact hero ID used by `revisionReferencesMedia`; cross-article references are protected too.

The `0005` triggers reject new/updated references and publication using an intent's media ID. Intents survive metadata and draft deletion. They have **no expiry, owner handoff or cancellation**, even if HEAD still sees an object after a DELETE failure. An earlier unknown DELETE can complete late. Retries may run concurrently: each only deletes the same immutable R2 key, verifies absence, and removes the asset metadata. The permanent intent keeps old draft/history references from being republished after cleanup. Upload the file again with a new UUID to use it again.

This is not a D1/R2 transaction. Interrupted cleanup can leave fenced metadata without bytes; retry the same deletion to finish. Never clear intents, reuse their keys, or restore an old D1 backup alone after irreversible R2 deletion.

## Migration order

For a new installation, apply all files in order. For an existing Site, apply only migrations not already recorded by the hosting migration ledger:

1. `0000_initial.sql` — entries, entry_revisions, mutation_requests
2. `0001_referrers.sql` — aggregated referrers
3. `0002_article_access.sql` — visibility and legacy members
4. `0003_media.sql` — media metadata
5. `0004_hero_media.sql` — per-revision hero fields
6. `0005_media_deletion_fence.sql` — permanent media deletion intents and D1 triggers that prevent references

The `ALTER TABLE` migrations are not meant to be rerun blindly. **Do not reapply migrations, reseed or recreate production D1** as part of documentation or source deployment.

## Sources

- DDL: [`drizzle/`](../drizzle/)
- Article write/idempotency operations: [`lib/store.ts`](../lib/store.ts)
- Reader visibility: [`lib/reader-store.ts`](../lib/reader-store.ts), [`lib/access.ts`](../lib/access.ts)
- Media: [`lib/media-store.ts`](../lib/media-store.ts), [`lib/media-deletion.ts`](../lib/media-deletion.ts)
- Product and access policy: [`docs/REQUIREMENTS.md`](REQUIREMENTS.md), [`docs/ARTICLE_ACCESS.md`](ARTICLE_ACCESS.md), [`docs/PUBLIC_ROLLOUT.md`](PUBLIC_ROLLOUT.md)

## Upgrade and failure recovery for 0005

`0005` is additive: it creates an empty table and four triggers, without rewriting or deleting existing content. It must be installed before the new application code; deploying code without it fails closed with a missing-table error. Package all six migrations and use the normal Sites pending-migration path. This PR has not migrated or deployed any hosted Site.

Before a future production rollout, back up D1 and retain its migration ledger. Pause owner mutations and let old workers/in-flight R2 operations drain before migration and code cutover; old code does not honor the new fence. Confirm the `media_deletions` table, four triggers, migration completion and new worker version before resuming writes. Do not use an automatic fallback to old unfenced deletion code.

Apply each migration atomically and record its completion only on success. If migration fails before commit, keep mutations paused, inspect the ledger/schema and retry the pending migration after fixing the cause. If a partially applied schema is observed, stop and reconcile it against the retained backup/DDL; do not blindly rerun DDL or reset storage. Once new deletion intents exist, preserve them through recovery and roll forward. R2 deletes cannot be undone by restoring D1.

Work regressions cover new installation, a populated `0000`–`0004` upgrade, transactional migration failure, D1 batch rollback/`changes()`, and real local R2 bindings via Miniflare/workerd. They do not constitute hosted Sites migration verification. Cloudflare documents [D1 batch transactions](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch) and [R2 consistency](https://developers.cloudflare.com/r2/reference/consistency/).
