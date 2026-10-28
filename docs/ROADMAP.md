# Bleeb Roadmap

**Goal:** Publish from a ChatGPT conversation, with no separate server or separately billed AI API.

**Primary engineering rule:** **Keep the program tiny.** Prefer deleting code, sharing existing logic, and using built-in Sites features. Refactoring should reduce code size, dependencies and complexity **without sacrificing readability, tests, privacy or security**. A backlog item is not authorization to implement it.

## Priorities

| Priority | TODO | Minimal approach |
| --- | --- | --- |
| P0 | Backup and restore | Extend existing exports; test a D1/R2 round-trip in isolation. |
| P0 | Clean Plus-account installation | Reproduce a private Site setup and document blockers. |
| P1 | Private prepublication preview | Reuse rendering; design around immediately visible edits to published articles. |
| P1 | Image optimization | Measure first; use supported image transforms without new paid services. |
| Done | RSS 2.0, sitemap, robots, selective indexing | Public-only feeds and SEO metadata are implemented. Canonical URL consistency and richer OGP should be reviewed separately. |
| P1 | Related articles | Derive from existing tags and SQL; avoid embeddings. |
| P1 | Sites Analytics evaluation | Prefer built-in analytics; remove redundant tracking only after checking feature parity. |
| P2 | Four article visibility tiers | Plan **owner-only**, **registered users**, **paid registered users**, and **public**. Current active tiers remain owner/public; registration, billing, and entitlement checks are disabled. Design and verify trusted login, payment/expiry checks, server-side read authorization, and private media access before enabling either additional tier. No billing implementation is authorized by this TODO. |
| P2 | Rich content refinements | Consider accessible callouts, image captions and CSV-to-chart conversion only when existing Markdown support is insufficient. |
| P2 | Scheduled posts | Validate supported scheduling first; no VPS dependency. |
| Done | note copy and Hatena Bookmark links | Owner-only rich-text clipboard copy + external note page; public Hatena bookmarking link. MT downloads were intentionally removed; no automatic posting. |
| P2 | Voice-to-article | Use ChatGPT voice plus existing MCP save tools. |
| Research | AI web editor | Keep AI work in ChatGPT; no default extra OpenAI API billing. |


## Proposed optional integration: merchant-daemon (2026-10-28)

**Owner direction:** Use Bleeb as the **ChatGPT Sites user-interface/MCP/storage integration shell** for the separate [merchant-daemon](https://github.com/hisashiishihara/merchant-daemon) commerce control plane, instead of building a second full Sites application. This is a future optional module, **not implemented and not authorized for production deployment**. The existing Bleeb personal-blog functionality remains the primary stable product.

- Reuse Bleeb's current Sites runtime, trusted owner authentication, private owner UI, MCP patterns, D1/R2 access and bounded mutation/revision patterns.
- Add an isolated, optional owner-only commerce surface (candidate `/owner/commerce`) via a separate reviewable source change. Keep all existing article routes, revision semantics, 12 MCP article tools, feeds, sitemap, indexing, public content, and private media unchanged.
- Implement canonical `Product` / `Offer` / `Inventory` / `Approval` / `Publication` logic in merchant-daemon's provider-neutral domain. **Never represent products as blog posts or use blog publication to authorize price/inventory updates.** Articles show their latest revision immediately, but commerce publication requires exact revision approval.
- Add distinct `commerce_*` D1 tables/migration ledger/keys and namespaced private R2 assets (or independently authorized bindings). Protect against blog/media deletion cross-reference and namespace request IDs to prevent cross-domain idempotency collisions.
- Start with **one test merchant operated by the existing authorized Bleeb owner** in a separate private staging Site. Bleeb's owner login is not a multi-merchant identity provider. Merchant accounts, sender bindings, per-merchant row/media permissions and signed webhook authorization require separate explicit design before external users.
- Shopify remains the first outbound product publication target after human approval. Email+inline image ingestion, reply approval, outbound HTTPS secrets, long-running retry requirements, and inference/cost considerations must be verified against the actual Sites runtime and approved test infrastructure.
- No initial web scraping. Competitive price observation is a later adapter milestone; a future collector may be hosted separately ONLY if evidence justifies it and the owner authorizes it.
- No changes to the deployed `https://blog.odorikani.net`, existing production D1/R2, Site identity, permissions, or public routes without a separately reviewed and expressly approved rollout. Source commits alone do not deploy the Site.

**Suggested dependency order:** (1) merchant-daemon canonical domain and contract tests (#2), (2) Bleeb private staging integration / D1-R2 adapter feasibility, (3) revision-bound merchant preview and approval, (4) Shopify test-store adapter, (5) actual email delivery path. Keep merchant-daemon Issues on `hold` until explicitly released.

[Merchant-daemon architecture](https://github.com/hisashiishihara/merchant-daemon/blob/main/docs/architecture.md) · [Parent Issue #1](https://github.com/hisashiishihara/merchant-daemon/issues/1).

## Release gates

- Gitleaks history scan passed; independent clean-account setup remains unverified.
- Verify trusted owner authentication, MCP scope, private drafts, and anonymous access boundaries.
- Pass tests, typecheck and build. Verify backup and recovery before public release.
- Keep GitHub **repository visibility** private until explicitly approved. The existing blog Site is already public for public-marked articles; never change article visibility or expose owner routes implicitly.

## Scope

No WordPress, NUC/VPS worker, generic multi-author CMS, payment system, or AI API dependency by default. GitHub code pushes do not deploy Sites; publication is a data operation.

[Usage and supported examples](USAGE.md) · [Installation](GETTING_STARTED.md) · [Architecture](DESIGN.md) · [Public release checklist](PUBLIC_RELEASE_CHECKLIST.md)
