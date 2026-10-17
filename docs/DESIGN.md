# aiDiary Technical Design

**Status:** implementation target, revised 2026-10-17.
**Stack:** ChatGPT Sites, Site-hosted MCP tools, D1 relational storage, optional R2 for media.
**Replaces:** Python CGI, Apache log collector, static rebuild/atomic symlink activation.

## 1. Runtime topology

~~~text
Author: normal ChatGPT conversation
      |
      | mention/install/connect private aiDiary plugin
      v
MCP tool server hosted on aiDiary ChatGPT Site
      |
      | verify owner identity, check explicit action intent
      v
Article service -> D1 (drafts, revisions, publication pointers)
      |
      +-------------------+
      |                   |
      v                   v
Public Site routes     Owner-authorized export
(published revisions)  (portable Markdown)
      |
      v
Anonymous browser readers
~~~

Site assets and handlers are deployed as application code. Article publication changes D1 records, **not deployment artifacts**. Neither a continually running home server nor a periodic ChatGPT automation is part of this path.

Sites and its plugins have separate access/installation/connection requirements. The owner must publish the Site to create/update the hosted plugin, then install and connect it in the target ChatGPT account. Public readers do **not** receive access to mutation tools merely by opening the blog.

## 2. Runtime/platform validation gates

The architecture is the selected target, not proof that all behavior already works in the current plan/runtime. Validate:

- Sites can host server-side handlers accessing persistent D1.
- The Site can serve anonymous public pages backed by D1 while restricting owner tools.
- Site-hosted MCP tools are visible in the author's ordinary ChatGPT workflow after plugin installation/connection.
- The MCP request path supplies sufficiently trustworthy owner identity/authorization for every call.
- Content updates appear to browsers without a code redeploy; decide cache behavior.
- Export/restore APIs can operate within documented runtime limits.
- If any required gate fails, record the blocker; do not silently substitute GitHub push, hourly scheduled edits, or an unauthenticated API endpoint.

Official docs:
- https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites
- https://help.openai.com/en/articles/20001547-hosting-a-plugin-with-chatgpt-sites
- https://learn.chatgpt.com/docs/sites/data-and-connections

## 3. Data model

Draft revisions and published revisions must be distinct. A post stays public at revision N while the author edits N+1 privately.

Proposed SQLite-compatible schema, to adapt to D1 runtime:

~~~sql
CREATE TABLE entries (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  latest_revision INTEGER NOT NULL DEFAULT 0,
  published_revision INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT,
  CHECK (published_revision IS NULL OR published_revision > 0)
);

CREATE TABLE entry_revisions (
  entry_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL,
  summary TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  saved_at TEXT NOT NULL,
  PRIMARY KEY (entry_id, revision),
  FOREIGN KEY (entry_id) REFERENCES entries(id)
);

CREATE TABLE mutation_requests (
  request_id TEXT PRIMARY KEY,
  operation TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_entries_status_published
  ON entries(status, published_at);
~~~

- IDs: server-generated, unguessability is not a substitute for authorization.
- Slugs: normalized, unique, strictly validated.
- Time: stored as UTC ISO-8601; displayed Asia/Tokyo.
- Markdown body: preserved verbatim, rendered with a sanitizer/HTML escape policy.
- Tags: serialized JSON in the minimal design; normalize later if querying warrants it.
- Revision numbers increase monotonically, with compare-and-swap on the latest_revision column.
- Revision and pointer changes must complete atomically using transactions supported by the actual D1 binding; validate the transaction primitives during PoC.

### State semantics

- Create draft: entries.status=draft, latest_revision=1, published_revision=NULL.
- Update draft: append revision, increment latest_revision; no public effect.
- Publish: explicitly set published_revision to a saved revision, status=published, and published_at in one durable operation.
- Update published article: append a newer *unpublished* revision; public route still renders published_revision.
- Publish newer revision: atomically switch published_revision.
- Unpublish: status=draft and published_revision=NULL; retain internal revisions. The public route returns 404/410.

A later future revision must not become public solely because another old revision was published.

## 4. Author tool contract

Tool schemas should be small, typed, and avoid arbitrary storage operations.

~~~text
save_draft(title, body_md, summary?, tags?, request_id)
list_entries(status?, limit?, cursor?)
get_entry(entry_id, revision?)
update_entry(entry_id, expected_revision, title, body_md, summary?, tags?, request_id)
publish_entry(entry_id, revision, request_id)
unpublish_entry(entry_id, request_id)
export_entries(entry_ids?, include_drafts?, format="markdown")
~~~

Expected behavior:

- Every mutating invocation requires server-verified owner authorization.
- Publishing or unpublishing is never inferred from save_draft/update_entry.
- Only acknowledge success after the committed D1 operation returns.
- For stale revisions return conflict with current revision, rather than overwriting.
- Replayed request IDs return the original result, not a second mutation.
- Export tools must not become public data exfiltration endpoints.
- The plugin should be personal/private unless future multi-user requirements explicitly change.

Authorization is separate from connecting the plugin. Browser sign-in may give server-forwarded identity information, but a site visitor and a plugin caller can follow different auth paths. Confirm authenticated caller identity on both paths; a raw HTTP request must not be able to forge an owner identity by passing a header or user email. **Do not go live if owner verification is uncertain.**

## 5. Public read paths

The Site should implement public read-only routes, approximately:

~~~text
GET /                   -> newest published posts
GET /posts/{slug}       -> published revision only
GET /archive            -> date archive (optional MVP)
GET /health             -> non-sensitive health status (optional)
~~~

For each public read, query only entries with status=published and a non-null published_revision, and join the matching entry_revisions row. No draft content, draft revision count, secret, author token, or unpublished metadata should leak into public HTML, JSON, preview tags, search indexes, or page caches.

Start with server-rendered semantic article HTML where supported; otherwise prove equivalent accessible output and search/share metadata. Use published-revision-aware caching (short TTL or invalidation on publish). Public content can be cached; owner-authorized responses must be private/no-store.

## 6. Renderer

- CommonMark-like Markdown with safe headings, paragraphs, lists, quotes, links, and code fences.
- Raw HTML disabled or sanitized.
- Escape title, tags, description, and other user-provided metadata.
- Keep URLs stable; use canonical links and article titles.
- Responsive typography; no heavy SPA required for the MVP.
- No request to OpenAI's model API during public page loads.

## 7. Secret management and data protection

- Use platform-provided server-side secrets/bindings; never browser JavaScript or Git.
- Never trust caller-provided owner_email, account ID, path, filename, or role.
- Cap payload sizes; rate-limit where platform supports it.
- Parameterize SQL and validate all inputs.
- Keep separate public and owner authorization tests.
- In logs store operation IDs and diagnostic metadata, not draft bodies or credentials.
- No auto-ingestion or automatic publication of complete ChatGPT transcripts.
- The Site is cloud-hosted: drafts exist in its D1. Company-PC or NUC file synchronization is irrelevant to this application.

## 8. Backup, portability, disaster recovery

- Export each revision as Markdown body plus YAML/JSON metadata: id, slug, title, tags, status, creation/update/publication dates, revision, and published_revision.
- A manifest maps entries to files and records export time/schema version.
- Keep drafts in owner-only exports; NEVER in public R2/static paths.
- Encrypt or strictly restrict any remote backup copy. A private GitHub repository is an optional backup destination, not a required write path.
- Implement and test restore to a fresh D1 dataset. Do not promote the PoC to production before a full round-trip succeeds.
- Media files, if introduced, belong in R2; references in D1 and an export manifest.

## 9. Test plan

### Application tests
- create / edit / publish / unpublish state machine
- Markdown escaping/XSS regressions
- slug collision, malformed inputs, oversized payload
- idempotency, concurrent/stale revisions, failed publication
- anonymous drafts and mutation denial
- schema migration and export/restore round-trip

### Real Sites integration tests
- personal plugin installation and authenticated tool invocation
- anonymous public read of a published article
- not-found for guessed draft URL and unpublished newer revisions
- new publish visible without frontend redeployment
- public cache invalidation / documented delay
- browser/mobile display and share metadata

## 10. Implementation layout (proposed, not deployed)

~~~text
ai-diary/
  README.md
  docs/
    REQUIREMENTS.md
    DESIGN.md
    ROADMAP.md
  site/
    src/              # Sites-compatible frontend/routes and handlers
    tests/
    migrations/       # D1 schema migration scripts
  plugin/
    tools/            # Site-hosted MCP tool contracts/handlers
  examples/
    exported-entry.md
~~~

The actual framework and build commands must follow the supported Sites deployment target rather than assuming arbitrary Node/Python server processes.

## 11. Deferred capabilities

RSS/Atom feed, tags/search indexes, topic timelines, context extraction for future chats, media/R2, custom domain, redirects, Webmention, site analytics, scheduled publishing, multi-author support. Implement only when the conversation-to-public-page loop is stable.


## Article access update (2026-10-17)

[ARTICLE_ACCESS.md](ARTICLE_ACCESS.md) defines the implemented independent status/visibility model, four reader audiences, server-side membership and owner management. It supersedes earlier binary public/draft assumptions. Reader queries select only the published revision after audience authorization; drafts and history stay owner-only. Sites sharing remains owner-private, and no payment service is connected.


## Current operation update (2026-10-17)

Only owner/public audiences are active. Membership registration, membership management and billing are suspended. Existing schema/data are preserved. PUBLIC_ROLLOUT.md supersedes earlier active member/audience plans; changing the Sites audience to public requires explicit owner confirmation.
