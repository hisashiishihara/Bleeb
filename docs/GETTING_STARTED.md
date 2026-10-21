# Install Bleeb

Bleeb runs on ChatGPT Sites with Site-hosted MCP, D1 (`DB`) and private R2 (`MEDIA`). It needs no VPS or separately billed OpenAI API key by default. Plan eligibility and hosting limits depend on current platform terms; consult the [official Sites guide](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites).

## Requirements

- An account with ChatGPT Sites and access to Work/Codex deployment tools.
- Access to this repository and permission to create a Site.
- A trusted owner identity and Site secrets.

## New installation

1. Ask Work to create a **new private Site** from `hisashiishihara/Bleeb`, including `app/`, `lib/`, `plugin/`, `drizzle/` and `.openai/hosting.json`.
2. Bind D1 as `DB` and R2 as `MEDIA`. Apply numbered migrations **only to the new database**; never reset production data.
3. Configure owner email and test Sites-injected identity. Enable `AI_DIARY_OWNER_API_ENABLED=true` only after spoofed/unsigned owner access is rejected.
4. Set `SITE_ORIGIN` (bare HTTPS origin), `SITE_TITLE` and `SITE_DESCRIPTION` for a new Site. Defaults preserve the reference deployment. Check RSS, sitemap and robots before indexing. Layout, About, Privacy and other site-specific text still require customization.
5. Publish the private test Site; install/connect its Site-hosted MCP plugin and verify test drafts, editing, publishing, unpublishing and media access.
6. Validate public vs owner-only read boundaries before opening a test Site to anonymous visitors.

Example Work instruction:

```text
Create a NEW private ChatGPT Site from hisashiishihara/Bleeb.
Bind new D1 DB and private R2 MEDIA, set up trusted owner authentication,
and enable Site-hosted MCP with fictional test data only.
Check draft/publish/unpublish/media and blocked anonymous owner access.
Do NOT touch my existing blog, Site, articles or storage.
```

## Existing Site updates

For `観測と思考` (`https://blog.odorikani.net`), **deploy to the existing Site** rather than following the new-install steps. Never re-run existing migrations or change D1/R2, visibility, owner secrets or MCP connections without explicit approval. See [deployment handoff](SITES_HANDOFF.md).

## Development checks

```sh
npm install
npm test
npm run typecheck
npm run build
```

GitHub pushes do not deploy Sites. Article content updates through D1/MCP normally need no code redeploy.

[Usage](USAGE.md) · [Security validation](SITES_AUTH_VALIDATION.md) · [Release checklist](PUBLIC_RELEASE_CHECKLIST.md)
