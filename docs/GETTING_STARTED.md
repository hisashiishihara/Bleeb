# Install Bleeb

Bleeb runs on **ChatGPT Sites** with Site-hosted MCP, D1 (`DB`) and R2 (`MEDIA`). No separate server or OpenAI API key is required. Eligible Plus/Pro plans currently include Sites hosting within usage limits; the subscription itself is paid. See the [official Sites guide](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites).

## Requirements

- An account with ChatGPT Sites and Work/Codex access.
- Access to this repository and permission to create a Site.
- A trusted owner identity and Site secret configuration.

## Setup

1. Ask ChatGPT Work to create a **new private Site** from this repository, retaining `app/`, `lib/`, `plugin/`, `drizzle/`, and `.openai/hosting.json`.
2. Bind D1 as `DB` and R2 as `MEDIA`. Apply the numbered migrations in `drizzle/` in order **only to the new database**. Never reset a production database.
3. Set `AI_DIARY_OWNER_EMAIL` as a Site secret. Verify trusted platform identity; do not trust user-supplied identity headers. Enable `AI_DIARY_OWNER_API_ENABLED=true` **only after** authentication tests pass.
4. Publish the private test Site, then **Install → Connect** its Site-hosted MCP plugin in ChatGPT. Verify the tools can read and update a test entry.
5. Test draft → edit → publish → unpublish, image upload, revision conflicts, and unauthorized access.

Suggested Work request:

```text
Build Bleeb from hisashiishihara/ai-diary on a NEW private ChatGPT Site.
Keep D1 DB, R2 MEDIA, Site-hosted MCP, and owner authentication.
Use fictional test data only. Verify draft, publish, unpublish,
media and anonymous-access denial. Do not touch existing Sites.
```

## Going public

Article visibility (`owner` / `public`) and **Site sharing** are separate controls. Before sharing the Site, test anonymous access to public articles and rejection of drafts, private articles, owner routes, and mutation tools. No one-click installer or independent clean-account installation has yet been verified.

## Development checks

```sh
npm install
npm test
npm run typecheck
npm run build
```

GitHub pushes do **not** deploy the Site. Content changes through MCP normally need no code redeployment.

[Usage](USAGE.md) · [Security validation](SITES_AUTH_VALIDATION.md) · [Release checklist](PUBLIC_RELEASE_CHECKLIST.md)
