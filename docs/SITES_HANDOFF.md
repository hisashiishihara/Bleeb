# ChatGPT Sites deployment and handoff

Bleeb source: [hisashiishihara/Bleeb](https://github.com/hisashiishihara/Bleeb). A GitHub commit does **not** deploy code or change articles on an existing Site.

## New installation (a separate empty Site)

1. Create a **new private Site** only when the owner explicitly requests a new installation. Bind D1 `DB`, private R2 `MEDIA`, and Site-hosted MCP.
2. Apply the ordered `drizzle/` migrations only to the **new** D1 database.
3. Configure owner identity as Site secret; verify trusted owner identity, unauthorized access and test-only content before sharing.
4. Set up the deployment's canonical domain/origin and verify `/feed.xml`, `/sitemap.xml`, `/robots.txt` do not advertise another site's URLs.
5. Connect the Site-hosted MCP plugin and test all current tools using fictional entries.

## Existing `観測と思考` production Site

- **Update** `https://blog.odorikani.net` in place. Never create a new Site for a code-only update.
- First check CI and source revision. Do not reset databases, re-run completed migrations, delete private media or alter article states.
- Preserve site URL, D1/R2 bindings, history, owner authentication and connected MCP tools.
- Verify public article rendering; private 404s; owner-only browser/MCP; RSS/sitemap/robots; SEO indexing only where intended.
- Report Sites deployment ID separately from Git commit, and distinguish local/CI checks from real browser verification.

[Current rollout](PUBLIC_ROLLOUT.md) · [Installation](GETTING_STARTED.md) · [Architecture](DESIGN.md)
