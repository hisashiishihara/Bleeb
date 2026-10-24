# Platform validation and operational evidence

The original 2026-10-17 document was a **pre-deployment investigation**. Its claims that Sites, MCP, public HTTP access or publication were untested are outdated. This file records what is known now, without conflating GitHub tests with live operation.

## Latest reported production verification — v45 (2026-10-24)

The owner-provided ChatGPT Work report describes the existing `https://blog.odorikani.net` Site, **updated in place**:

- Production v45 deployment: `appgdep_6adc51de6b988191b81f7965e17ef55e`.
- Deployed source commit: `36f66c33ed831b9854a2c030e34820002a8ecbda` (percentage image widths with automatic centering).
- 112 automated tests, type-check, and production build reported successful; production HTTP 200 reported.
- For the private article draft at revision r33, generated HTML from the same renderer used in production showed `"width=75%"` as a **75%-wide, centered image**. **The actual signed-in production browser display was not visually verified.**
- No new D1 migration in v45; article data, D1/R2 bindings, Site identity, MCP plugin, custom domain, About/Privacy, and other deployment settings were reported unchanged.

### Earlier migration verification — v43 (2026-10-24)

- Deployment: `appgdep_6adc2db7b98881919b530491a88b304f`, source `2bb46c2424dfaa5fbe01dd8afc37d4998117e7dd`.
- `0005_media_deletion_fence.sql` applied successfully and `media_deletions` was confirmed.
- Article/revision/media counts were reported preserved (11 articles, 150 revisions, 8 media objects); the site retained the About/Privacy text, custom domain, existing MCP plugin, and owner access.
- Public posts and media, `/login`, anonymous denial, RSS, and sitemap were checked; a restored D1 logical backup was reported.

These are **Work/user-reported deployment results**, not independently repeated checks in this repository. Earlier v38 observations were valid for that older deployment, but are no longer the latest status.

## Still separate from source and Work-local verification

- Actual signed-in browser appearance of the 75%-wide centered image, note clipboard/paste, Hatena Bookmark clicks, mobile rendering, and external forms are **browser-level** checks.
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
