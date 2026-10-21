# Platform validation and operational evidence

The original 2026-10-17 document was a **pre-deployment investigation**. Its claims that Sites, MCP, public HTTP access or publication were untested are outdated. This file records what is known now, without conflating GitHub tests with live operation.

## Latest reported production verification

The owner-provided ChatGPT Work report for **v38 (2026-10-20)** describes:

- Existing Site: `https://blog.odorikani.net`.
- Deployment `appgdep_6ad6d4ddb9148191ab96b1b068f788b9`, at commit `4c64528f8507c0612905397d706acb966a6f283c`.
- 70 automated tests, type-check and build successful for that deployment.
- Production RSS 2.0, sitemap and robots.txt served HTTP 200; public entries only.
- Searchable public pages did not retain the shared `noindex` response header.
- Anonymous 404s for private entries, owner area and clipboard API; forged owner headers rejected.
- Article/revision/media metadata and D1/R2/MCP identity/configuration preserved, with no new migrations.

This is a **reported deployment outcome**, not independent confirmation of later commits.

## Still separate from source and Work-local verification

- Actual note clipboard/paste, Hatena Bookmark clicks, mobile rendering, and external forms are **browser-level** checks.
- Google Search Console verification and search-result inclusion are separate from removing `noindex`.
- Full provider-independent restore of D1 **and R2** remains a separate disaster-recovery task.
- A new user's clean Plus-account installation is not yet independently reproduced.
- Future hosting features and plan limits must be checked against current official platform terms.

## Security and deployment gates

- Require Sites-injected verified identity and `AI_DIARY_OWNER_API_ENABLED=true` before owner mutations; never trust arbitrary request headers.
- Re-check anonymous, forged-header and private-media denial after **each** Site deployment.
- Reader pages show latest saved revisions only for authorized published entries; private drafts never appear in RSS, sitemap or metadata.
- Keep current D1/R2/article data intact, with no migration or visibility changes unless explicitly requested.
- Reviewed GitHub source must be explicitly deployed to the **existing** Site by Work or an authorized deployment workflow; pushing `main` alone is insufficient.

[Architecture](DESIGN.md) · [Deployment](SITES_HANDOFF.md) · [Article access](ARTICLE_ACCESS.md)
