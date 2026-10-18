# Sites deployment

Use ChatGPT Work or a compatible Codex environment with [Bleeb](https://github.com/hisashiishihara/Bleeb).

- Import the source into a **new private Site** with D1 `DB`, R2 `MEDIA` and Site-hosted MCP.
- Apply migrations in order only to newly created databases.
- Configure the owner identity as a Site secret; verify authorization before enabling mutation operations.
- Test drafts, publication, private media and anonymous access with fictional entries.
- Deploy code explicitly: pushing to GitHub does **not** update an existing Site.
- Keep production articles, D1/R2 data and Site sharing unchanged unless explicitly authorized.

[Installation](GETTING_STARTED.md) · [Architecture](DESIGN.md)
