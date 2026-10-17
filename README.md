# aiDiary

A conversation-first personal publishing system. Think with ChatGPT, ask it to save a draft, revise it, and explicitly publish it to a public blog.

**Current state:** design only. The canonical target is ChatGPT Sites + a Site-hosted MCP plugin + D1. No application or Site has been deployed yet.

## Intended interaction

1. Discuss an idea in ChatGPT.
2. Ask aiDiary to save a private draft from the discussion.
3. Revise the draft from the chat, preserving revisions.
4. Explicitly publish; the public blog reflects the new content without a frontend redeployment.
5. Export portable Markdown copies for backup and migration.

Publishing is always an explicit, authenticated operation. No chat history is automatically imported or published.

## Architecture

~~~text
ChatGPT conversation
     |
     | personal Site-hosted MCP plugin (author only)
     v
ChatGPT Site server-side actions
     |
     +---- D1: posts, private drafts, revisions
     |
     +---- Public pages: published revisions only
     |
     +---- Markdown export/backup (portability)
~~~

There is no mandatory NUC, VPS, Apache, CGI, cron job, or built-in paid LLM request. ChatGPT generates or edits the prose; aiDiary stores and publishes it.

## Documentation

- [Requirements](docs/REQUIREMENTS.md)
- [Design and data model](docs/DESIGN.md)
- [Roadmap and acceptance tests](docs/ROADMAP.md)

The July 2026 Python CGI/Apache static-generator plan has been **superseded** by the 2026-10-17 design. The principle of portable Markdown survives, but **D1 is the live source of truth** and Markdown is the export and recovery format.

## Platform dependencies

The first implementation requires a real end-to-end check of Sites deployment, D1 persistence, owner authentication, Site-hosted MCP plugin connection, and article publication from a ChatGPT conversation. These are not considered tested simply because the platform documents the individual features.

- [Creating and using ChatGPT Sites](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites)
- [Hosting a plugin with ChatGPT Sites](https://help.openai.com/en/articles/20001547-hosting-a-plugin-with-chatgpt-sites)
- [Data and connections](https://learn.chatgpt.com/docs/sites/data-and-connections)

## License

Target license: BSD-3-Clause. Add the LICENSE file before an initial release.
