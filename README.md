# Bleeb

**Your ChatGPT is your blog editor.** 🐸

Bleeb is a tiny, open-source blogging engine built specifically for **ChatGPT Sites** and **Site-hosted MCP**. Draft, revise, and publish posts directly from a ChatGPT conversation. Formerly known as aiDiary.

**No separate hosting subscription required:** With an eligible ChatGPT Plus or Pro plan, Bleeb runs within the included Sites hosting allowance—without a VPS, a rented server, or separately billed OpenAI API calls.

- **Conversation-first publishing** — Draft, edit, add media, publish, and unpublish from ChatGPT.
- **Sites-native storage** — Articles and revisions in D1; images and videos in R2.
- **Keep it tiny** — Prefer built-in platform capabilities. Refactor to reduce code size and complexity without compromising clarity, security, or tests.

## Get started

[Installation](docs/GETTING_STARTED.md) · [Usage](docs/USAGE.md) · [Roadmap](docs/ROADMAP.md) · [Architecture](docs/DESIGN.md)

Setup requires access to ChatGPT Sites, owner authentication, and an MCP connection; it is not a one-click install. **Browser login:** visit `https://YOUR-SITE-DOMAIN/login` on your Bleeb Site and sign in through ChatGPT; no login link appears in the public header. Validate private-content access controls before sharing a Site publicly.

**Pricing note:** ChatGPT Plus/Pro subscriptions are paid. Hosting availability, Codex usage limits, traffic, and storage limits are subject to current platform terms. Custom domains or other external services may incur fees.

[Official Sites guide](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites) · [Public release checklist](docs/PUBLIC_RELEASE_CHECKLIST.md)

## Development checks

For a new installation, follow [the staged private-Site setup and validation steps](docs/GETTING_STARTED.md#new-installation). Owner identity, runtime activation and the new Site's MCP connection require explicit verification. A successful deployment or an installed plugin alone does not prove article/media operations work. The current [validation record](docs/GETTING_STARTED.md#installation-validation-record-2026-10-22) distinguishes hosted checks from local tests and lists the remaining authentication handoff.

Use the ChatGPT Work development environment and GitHub for source changes. GitHub Actions workflows are intentionally removed; no NUC, VPS or separate CI runner is required.

```sh
npm install
npm test
npm run typecheck
npm run build
```

Run all checks before updating `main`. A GitHub push does not deploy an existing Site; production deployment is a separate, explicitly requested action. Tests use isolated SQLite databases and mocked R2, not production data.

## License

[BSD-3-Clause](LICENSE). You may use, modify, and redistribute the code under its terms. Authors retain their own rights to posts and media.
