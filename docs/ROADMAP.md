# aiDiary Roadmap

**Revised:** 2026-10-17. This roadmap replaces the previous Python CGI/Apache delivery plan.

## Engineering principle: minimal software (2026-10-18)

**Keep aiDiary as small as possible.** Prefer deleting code, removing unnecessary abstractions, and reusing existing Sites/ChatGPT capabilities over adding modules, state, dependencies, endpoints or services. Refactoring should **reduce total code volume and cognitive complexity**, while preserving documented behavior, privacy, authorization and test coverage. Do not optimize for line count by obscuring logic or weakening safety checks. Track changed lines, duplicated logic and dependency count; justify any net growth with a user-visible benefit. No optional feature is automatic approval to implement it.

## Feature backlog (proposals only; no implementation authorized)

| Priority | Candidate | Smallest viable approach / acceptance |
| --- | --- | --- |
| P0 | Portable backup and restore | Reuse existing Markdown export; add a verified round-trip from an isolated D1/R2 fixture before adding a new service. This supersedes the older temporary decision to deprioritize production restore; production restore still needs explicit approval. |
| P0 | Reproducible new Plus account setup | Validate a fresh Site with D1/R2, 12 MCP tools, auth and sample articles using Work; document only missing steps, no installer unless essential. |
| P1 | Owner preview before publishing | Reuse current reader/Markdown rendering and existing revision store; avoid new tables if possible. Note: public published articles already show latest saves, so a true private staging flow needs explicit design. |
| P1 | Image optimization | Measure current R2 object sizes; consider WebP resizing only if supported within the hosting runtime without new paid APIs. |
| P1 | RSS/Atom, sitemap and canonical/OGP | Add only where compatible with current noindex and owner-private Site policy; do not expose private content. |
| P1 | Related articles/internal links | Start with existing tags and SQL, not embeddings or vector storage. |
| P1 | Sites Analytics integration decision | Prefer built-in Sites Analytics UI; avoid duplicating page-view counters. Assess whether referrer_daily is still necessary. No public API for analytics export has been confirmed. |
| P2 | Scheduled publication | First validate a supported scheduler. Do not introduce a VPS/NUC dependency or assume background workers exist. |
| P2 | note/social distribution | Prefer existing note export and share links; external posting requires separate supported API/consent. |
| P2 | Voice-to-article | Draft inside ChatGPT voice/transcription, then save via existing MCP. No extra audio backend by default. |
| Research | AI-assisted web editor | Prefer ChatGPT conversation as the AI frontend. Do not introduce separately billed OpenAI API calls by default. |

**Selection policy:** implement only a user-approved feature; first check whether Sites or an existing tool already solves it. Prefer shrinking/removing existing code to new infrastructure. Every change must pass existing tests, typecheck, build and owner/private data boundaries.

## Product success criterion

In an ordinary ChatGPT conversation, the author can say:

> Save this as a draft. Revise it. Publish it.

The post appears at a public Site URL without manually moving Markdown files, running a local server, or redeploying frontend code. Draft content stays private and remains exportable as Markdown.

## Phase 0 — Foundation and platform validation

Deliverables:
- Revised README, canonical requirements, design, roadmap (this change).
- Confirm account can create/publish a Site and use D1.
- Confirm the Site owner can create and connect a Site-hosted MCP plugin.
- Check whether verified author identity is available to the MCP handler.
- Choose a supported Site framework/build output after inspecting deployment constraints.
- Decide whether author-only Site or public Site + private MCP tools is achievable without insecure workarounds.

Exit: core platform gates and any blockers are recorded; there is no assumption that separate features automatically compose safely.

## Phase 1 — Site and database skeleton

Deliverables:
- Deploy a test Site at its default URL; do not configure a custom domain yet.
- Create D1 tables for entries, immutable revisions, and idempotent requests.
- Serve public home and article routes using only published revisions.
- Test a sample published article and a private draft.
- Prove that D1 content changes are visible without republishing site code.

Exit: read path verified from an anonymous browser; a draft cannot be retrieved publicly.

## Phase 2 — ChatGPT editing integration (critical path)

Deliverables:
- Site-hosted MCP tools for save_draft, get_entry, list_entries, update_entry.
- Publish Site as necessary to create/update the plugin; install/connect on the author's personal ChatGPT account.
- Owner-only authorization, revision conflict protection, request IDs, and sanitized rendering.
- Add explicit publish_entry and unpublish_entry operations.

Exit: from a regular ChatGPT conversation, create, revise, publish, and unpublish one test entry; unauthorized writes and draft reads fail; no site-code redeployment needed for content publication.

## Phase 3 — Preservation and reliability

Deliverables:
- Export Markdown with complete metadata and selected revisions.
- Import/restore into a clean test D1 store; verify round-trip.
- Cover interrupted/retried writes, stale update, slug collisions, XSS, and private-data leaks.
- Document recovery, secrets, and operational limits.
- Add BSD-3-Clause LICENSE file before release.

Exit: a user can recover their work from portable files; tests cover privacy and publication invariants.

## Phase 4 — Usable public blog

Deliverables:
- Responsive Japanese-first design, stable permalinks, site metadata.
- Pagination and date archives.
- Tags and simple search if needed.
- RSS/Atom and canonical links.
- Attach custom domain after successful PoC and DNS verification.
- Document content ownership, disclosures, and public-launch checklist.

Exit: publicly readable personal blog with discoverable, stable articles and routine maintenance procedures.

## Phase 5 — Conversation memory/knowledge (optional)

Deliverables:
- Owner-only context retrieval filtered by time, tag and topic.
- Chronological idea development and rejected-alternative summaries derived from published/private notes with owner permission.
- Optional cross-conversation source links and portable exports.

Exit: generated summaries always link to and never silently rewrite primary entries.

## Acceptance scenario to prioritize

1. Create a draft from ChatGPT based on a small **test** conversation.
2. Verify the draft is invisible to an anonymous visitor and public APIs.
3. Revise and confirm previous revision remains recoverable.
4. Explicitly publish a revision; verify public URL and no frontend redeployment.
5. Save a newer revision to the already-published article; verify its latest revision becomes visible to the existing audience without changing visibility.
6. Publish that new revision; verify new public content.
7. Unpublish; verify all public read surfaces stop serving it.
8. Export and restore; compare title, Markdown, timestamps, status and revisions.
9. Attempt unauthorized and replayed tool calls; confirm safe rejection/idempotence.

Only then try publishing real notes.

## Scope guards

- No Python CGI, Apache deployment, long-running NUC worker, VPS, or hourly task.
- No AI API call for public viewing. ChatGPT composes content as the author directs.
- No generic CMS features, comments, social graph, payment infrastructure, or multi-author work in MVP.
- Do not add an administrative SPA when conversational tooling meets the need.
- No unconditional auto-publication of private notes.
- Do not conflate deploying code with publishing content.
- GitHub stores code and optional backups; it is not a per-post deployment trigger.

## Known external dependencies

- ChatGPT Sites availability and limitations may depend on plan/surface.
- Site-hosted MCP plugin needs an owner publish step followed by installation and connection.
- Owner authorization across the plugin and Site request boundaries **must be tested**; lack of a trusted identity source blocks the production design.
- D1 storage/throughput, execution, cache, backup/export, and custom domain support are subject to platform limits.
- This repository does not automatically deploy to Sites through git push; deployment must be explicitly verified.

## Milestones

- v0.1: proof of authenticated conversation -> published D1 entry
- v0.2: revision-safe editing, withdrawal, robust privacy tests
- v0.3: Markdown export and restore
- v0.4: feed, tags/search, custom domain
- v1.0: stable schema/migration path, documented restore and operational support

## Platform references

- https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites
- https://help.openai.com/en/articles/20001547-hosting-a-plugin-with-chatgpt-sites
- https://learn.chatgpt.com/docs/sites/data-and-connections

## Accepted direction (2026-10-17)

- **Private archive first**: give the single owner a separate web view of every draft,
  unpublished revision and published article. Search title, body across history and tags;
  ordinary readers must never enter or fetch this view.
- **tDiary-style referrers**: aggregate origins of incoming visits to published articles by
  day/article/domain into D1. Never store visitor IDs, IP addresses, raw referer paths or
  query strings. Opt-in only when public viewing is explicitly enabled and validated.
- **Visibility after the private archive**: distinguish a saved draft from a selected published
  revision; future per-article audience tiers: owner, registered members, paid members,
  public. Authenticated owner reads all. Registered/paid access requires server-side membership
  and entitlement checks; none of those tiers should be simulated with URL secrecy.
- **Backlinks and search queries**: optionally connect Search Console once a public indexed
  site exists. Its Links report provides sampled discovered backlinks; search analytics
  provides search terms/clicks/impressions. HTTP Referer usually cannot reveal search terms.
- **Backup**: do not prioritize a backup service or production restore exercise right now;
  retain portable Markdown export as a manually invoked option.

**No general-public sharing, subscriptions, paid login, or Search Console OAuth**
are authorized by this decision. Keep the Site owner-only until requested and tested.


## Four audiences and membership (2026-10-17)

Implemented: owner/paid/registered/public visibility, migration 0002, explicit free registration, owner-only membership administration, server-side entitlement expiry, shared reader SQL gates, no-store responses, and backwards-compatible publish_entry audience selection. The 4x4 matrix runs in isolation; non-owner hosted login remains unverified under the intentionally owner-only Site policy. See ARTICLE_ACCESS.md and ACCESS_VALIDATION.md. Payments and public rollout remain separate future work.


## Current operation update (2026-10-17)

Only owner/public audiences are active. Membership registration, membership management and billing are suspended. Existing schema/data are preserved. PUBLIC_ROLLOUT.md supersedes earlier active member/audience plans; changing the Sites audience to public requires explicit owner confirmation.
