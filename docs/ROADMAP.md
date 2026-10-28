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


## Release gates

- Gitleaks history scan passed; independent clean-account setup remains unverified.
- Verify trusted owner authentication, MCP scope, private drafts, and anonymous access boundaries.
- Pass tests, typecheck and build. Verify backup and recovery before public release.
- Keep GitHub **repository visibility** private until explicitly approved. The existing blog Site is already public for public-marked articles; never change article visibility or expose owner routes implicitly.

## Scope

No WordPress, NUC/VPS worker, generic multi-author CMS, payment system, or AI API dependency by default. GitHub code pushes do not deploy Sites; publication is a data operation.

[Usage and supported examples](USAGE.md) · [Installation](GETTING_STARTED.md) · [Architecture](DESIGN.md) · [Public release checklist](PUBLIC_RELEASE_CHECKLIST.md)
