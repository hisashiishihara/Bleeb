# Bleeb documentation

Start with the short guides. Bleeb favors **minimal code and minimal documentation**; source and automated tests are authoritative if an older design note differs.

## Start here

- [Installation](GETTING_STARTED.md) — set up a private ChatGPT Site.
- [Usage](USAGE.md) — publish articles from ChatGPT.
- [Roadmap](ROADMAP.md) — proposed features, not implementation commitments.
- [Architecture](DESIGN.md) — runtime and security boundaries.
- [Database](DATABASE.md) — D1 tables and migrations.

## Specific topics

- [Article embeds](ARTICLE_EMBEDS.md) — diagrams, charts, tables and rich Markdown.
- [Editor and media](EDITOR_MEDIA.md) · [Media deletion](MEDIA_DELETION.md) · [Remote images](REMOTE_HERO.md).
- [Article access](ARTICLE_ACCESS.md) · [Site authentication](SITES_AUTH_VALIDATION.md) · [Public rollout](PUBLIC_ROLLOUT.md).
- [Export to note](NOTE_EXPORT.md) · [Access and referrers](ACCESS_AND_REFERRERS.md).
- [Deployment](SITES_HANDOFF.md) · [Public release checklist](PUBLIC_RELEASE_CHECKLIST.md).

## Background

[Requirements](REQUIREMENTS.md), [Platform validation](PLATFORM_VALIDATION.md), and [Legacy Base64 upload removal](MCP_UPLOAD_MEDIA.md) are historical/background references, not additional features or new-user prerequisites.

**Privacy:** Do not place production posts, media, real owner identifiers or secrets in Git. Private D1/R2 contents are not part of the source repository. Deleting a tracked document does **not** erase it from Git history.
