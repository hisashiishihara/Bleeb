# aiDiary Requirements

**Status:** canonical product requirements, revised 2026-10-17.
**Architecture decision:** ChatGPT Sites + Site-hosted MCP plugin + D1.
**Supersedes:** original Python CGI + Apache + no-database design.

## 1. Purpose

Turn useful conclusions from AI-assisted conversations into durable, readable personal blog posts on the author's website, without copy-pasting into a separate CMS.

The essential workflow is:

> Save this as a draft. Revise it. Publish it. Update the published article.

ChatGPT is the primary *editorial interface*. aiDiary is the separate content store and public publisher. ChatGPT conversations are **never themselves public**.

## 2. Users and boundaries

- MVP: one authenticated author, any number of anonymous readers.
- Author uses a personal ChatGPT account and installs/connects an aiDiary plugin hosted on a ChatGPT Site.
- Readers use ordinary web browsers without ChatGPT accounts.
- The site remains readable if the author is not currently running ChatGPT or a local PC.
- The blog does not charge readers or invoke an LLM API for article reads or searches.
- No user registration, comments, multi-author collaboration, or general-purpose CMS in MVP.

## 3. Canonical decisions

1. **ChatGPT Sites hosts the blog** and Site-side application logic.
2. **D1 is the operational source of truth**, including drafts and published revisions.
3. Markdown is the article body format and the **portable export/backup format**, not the primary live persistence layer.
4. **Site-hosted MCP tools** are the authoring path from ChatGPT. A connected personal plugin is required.
5. Reader routes show only articles with status=published, and render their **latest saved revision** after server-side audience checks.
6. Content updates are data mutations; a new article does **not** require rebuilding/redeploying site code.
7. Initial publication requires explicit intent. Further saves or hero changes to already-published entries update the reader-visible latest revision immediately at the existing audience scope; drafts stay private.
8. Backend software on NUC or VPS is **not required** for normal blog operations.
9. The implementation must not depend on unspecified provider behavior; unsupported capabilities become explicit PoC blockers.
10. Backup and migration must remain feasible without access to a proprietary database format.

## 4. MVP functional requirements

### 4.1 Articles

Each entry has an immutable identifier, title, stable URL slug, Markdown body, optional summary, tags, status, creation/update/publication timestamps, and revision metadata.

- New entry defaults to draft.
- A draft is invisible to anonymous readers, list/search feeds, previews, and share links.
- Revising a published entry immediately updates the displayed version at its existing audience scope. Do not save sensitive material to an already-published public entry.
- The author may explicitly publish the latest saved revision or unpublish an entry. To restore an older version, save it again as the new latest revision.
- Unpublishing removes the entry from all public queries and its permalink (return 404 or 410). Historical content cannot be withdrawn from third-party caches; set cache policy appropriately.
- Slug changes must be deliberate; prefer stable permalinks and explicit redirects when implemented.
- Do not provide permanent remote deletion in MVP.

### 4.2 Authoring tools

Minimum ChatGPT MCP tool surface:

| Tool | Behavior |
| --- | --- |
| save_draft | Create a private draft from supplied title and Markdown; idempotent on request ID |
| list_entries | List authorized drafts and published entries |
| get_entry | Read complete authorized entry and revision |
| update_entry | Create a new saved revision with an expected revision/version precondition |
| publish_entry | Explicitly publish a selected saved revision |
| unpublish_entry | Withdraw the public revision without deleting history |
| export_entries | Return/download portable Markdown with metadata |

- Editing decisions are driven by the user's prompts, not autonomous extraction of all chat content.
- Initial publishing or changing audience remains a separate explicit operation. Editing an already-published entry automatically updates its displayed latest revision without changing audience.
- Clear tool results include entry ID, status, revision, and public URL only once confirmed.
- Unsafe or ambiguous publication operations should fail closed.
- Tool schemas and exact MCP transport adapt to the runtime, but semantics above are mandatory.

### 4.3 Public website

- Home page with newest published articles.
- Direct public permalink for each published article.
- Render safe Markdown with headings, links, paragraphs, lists, and fenced code.
- Show publication/update times in Asia/Tokyo.
- Responsive layout, mobile readability, semantic HTML, and metadata for sharing/search.
- Basic archive navigation; public list excludes drafts and unpublished revisions.
- Frontend/page code is deployed separately from content mutations.

### 4.4 Preservation and backup

- Export complete entries as Markdown plus metadata (front matter or accompanying machine-readable manifest).
- Include unpublished drafts only in **owner-authorized** exports.
- Preserve stable ID, slug, dates, tags, status, and revision history where practical.
- Verify that exported content can be restored to an empty test D1 database.
- Document backups, restore checks, and procedures for provider migration.
- GitHub can hold source code and optionally **private encrypted or access-controlled** content backups; it is not required for each post.

## 5. Security and privacy

- All content-mutating tools and all draft reads MUST be authenticated/authorized **server-side** for the owner.
- A successful ChatGPT/plugin connection alone is not proof that arbitrary visitors may write or read drafts.
- Trust identity only from verified platform mechanisms; do not trust arbitrary client headers, supplied emails, or caller-provided author IDs.
- Server-side allowlist a configured author identity; if author identity is unavailable inside hosted MCP tools, block production until a supported authorization mechanism is proven.
- Public APIs must enforce status=published and public audience server-side before selecting the latest revision; never rely on hidden buttons or client-side checks.
- Restrict write size, rate, and allowed Markdown; disable/sanitize raw HTML, escape metadata, validate slugs, protect secrets and logs.
- Mutations must be idempotent under retries, with revision checks to prevent stale overwrites.
- Do not silently publish a raw conversation, confidential details, connected-app content, or private notes.
- Treat D1 and R2 as cloud storage; do not claim data remains only on the author's NUC.
- Public readers must not be required to authorize third-party plugins.

## 6. Reliability

- Failed edits or publication attempts leave the previously saved, visible revision readable; successful edits to published entries update the visible latest revision.
- Updates are consistent and revisioned. A failed publish must not produce partial public state.
- Retries with the same request ID do not duplicate articles.
- Clearly report operational errors and permission failures.
- Build/test data must never be mistaken for published real content.
- Have a verified export and restoration procedure before production cutover.

## 7. MVP acceptance criteria

1. A ChatGPT conversation successfully invokes an installed, connected aiDiary plugin.
2. Asking to save a draft produces a D1 record visible to the author only.
3. Anonymous users cannot read drafts or invoke mutations, even by guessing URLs/API calls.
4. Explicit publish makes the entry available on a normal public URL.
5. Publishing does not require modifying or redeploying the frontend.
6. Saving a newer revision to an already-published entry makes that revision reader-visible at its existing audience scope, without publishing drafts.
7. A successful save updates the reader-visible latest revision for published entries; stale edits fail. Initial publication and audience changes require explicit publication.
8. Unpublish withdraws the entry from public views.
9. Markdown export and restore reproduce the article with metadata.
10. Each behavior is proven on the actual Sites environment/account, not only local mocks.

## 8. Non-goals in MVP

Python CGI, Apache hosting, referrer-log parsing, RSS/Atom, advanced search, topic timelines, AI memory extraction, auto-publish scheduling, social features, payments, embedded LLM inference, multiple authors, local NUC dependencies, real-time collaborative editing.

RSS, tags, search, context export, and topic timelines may follow after the core publishing loop succeeds. The previous tDiary-style referrer requirement is intentionally deferred; it depended on Apache logs.

## 9. Legal and licensing

The project code is licensed under BSD-3-Clause (the Modified BSD License); see [LICENSE](../LICENSE). Only publish content the author has authorized and has rights to share. Review privacy and platform policies before public launch.


## Article access update (2026-10-17)

[ARTICLE_ACCESS.md](ARTICLE_ACCESS.md) defines the implemented independent status/visibility model, four reader audiences, server-side membership and owner management. It supersedes earlier binary public/draft assumptions. Reader queries select the latest revision of status=published entries after audience authorization; drafts and full revision history stay owner-only. Sites sharing remains owner-private, and no payment service is connected.


## Current operation update (2026-10-17)

Only owner/public audiences are active. Membership registration, membership management and billing are suspended. Existing schema/data are preserved. PUBLIC_ROLLOUT.md supersedes earlier active member/audience plans; changing the Sites audience to public requires explicit owner confirmation.
