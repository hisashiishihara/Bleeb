# ChatGPT Sites publishing PoC (proposed)

Status: **PROPOSED** — not an approved replacement for [REQUIREMENTS.md](REQUIREMENTS.md) or [DESIGN.md](DESIGN.md).

## Why this proposal exists

The original aiDiary design (July 2026) specifies Python CGI, Markdown as the source of truth, and statically generated pages. The next experiment asks a different question:

> Can the author tell ChatGPT "save this as a draft", "revise it", and "publish it" in a normal conversation, with a public blog reflecting the result without rebuilding or deploying its frontend?

Validate this before changing the original requirements or committing to a provider-specific architecture.

## Product boundary

- One author; anonymous public readers.
- ChatGPT composes content in the conversation. aiDiary does **not** call a paid LLM API.
- A draft is never public; publication requires an explicit author action.
- Published entries are readable via ordinary URLs without logging in to ChatGPT.
- An unpublished entry disappears from public list, search, feeds, and direct article reads.
- There is no web administration UI in the PoC.
- The first PoC does not import real private conversations or publish private drafts.

## Candidate architecture

```text
Author in ChatGPT
    |  Installed, connected personal plugin
    v
MCP tools hosted by ChatGPT Site
    |  Server-side identity/authorization
    v
D1: drafts, published entries, revision metadata
    |
    v
Site pages: public entry and index read (published only)

Optional later: R2 image attachments; Markdown export/backups to a private repository.
```

The Site is deployed once for the PoC. Publishing a new article updates data in D1; it should **not** require a new Site deployment. Keep deployment of code separate from publication of content.

## Proposed tool/API surface (minimum)

| Tool | Action | Authorization |
| --- | --- | --- |
| `save_draft` | Save a new draft; default to private | Author |
| `list_entries` | List author's drafts and published entries | Author |
| `get_entry` | Retrieve full Markdown text and revision | Author |
| `update_entry` | Update with expected revision | Author |
| `publish_entry` | Explicitly publish a specified revision | Author + explicit user intent |
| `unpublish_entry` | Withdraw without deleting | Author |
| `export_entry` | Export portable Markdown/front matter | Author |

All mutations must be authenticated and authorized **at the server boundary**; never trust a caller-provided owner identifier, an editable client field, or a UI-only check. Publishing should be an unmistakably separate action, not a `status` field silently accepted by `save_draft`. Use request IDs for retry safety and revision checks against concurrent edits.

The exact framework, MCP transport, authentication/connection flow, and D1 binding must be selected with the Sites runtime and tested in a real deployment. This document does **not** assert that a generic HTTP endpoint is automatically public or that any existing ChatGPT chat can invoke the tool without installing/connecting the plugin.

## Proposed storage (PoC only)

```sql
CREATE TABLE entries (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    body_md TEXT NOT NULL,
    summary TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    published_at TEXT,
    revision INTEGER NOT NULL DEFAULT 1
);
```

Tags may start as a small normalized field or a separate `entry_tags` table. Store timestamps in UTC and render dates for `Asia/Tokyo`. Escape titles and sanitize rendered Markdown with raw HTML disabled. Choose stable permalinks; make draft/public read paths separate.

**Important decision:** D1 is primary storage in this PoC, which conflicts with existing "Markdown is the source of truth" and "no database" guardrails. Do not rewrite those requirements until the PoC succeeds and the owner explicitly selects migration. If the owner chooses Markdown as primary, investigate a Git-backed publishing alternative instead of pretending both approaches are the same.

## First acceptance test

1. Create a Site containing a public entry list, an entry permalink, and a D1 binding.
2. Add the MCP tools; deploy the Site; install and connect its personal plugin on the author's ChatGPT account.
3. From an ordinary ChatGPT conversation, ask: "Save this test note as a draft." Verify it exists only in an authorized author read.
4. Ask: "Publish that draft." Verify that it appears to an unauthenticated browser at a stable URL **without rebuilding/deploying code**.
5. Revise from chat; verify public content changes and old update attempts fail on revision mismatch.
6. Unpublish; verify all public endpoints/feeds stop exposing it.
7. Confirm an anonymous request cannot call mutations or read a draft; confirm errors do not expose secrets.
8. Export the entry as portable Markdown with metadata and restore it into a fresh test store.
9. Document whether this works in the author's personal ChatGPT plan and on both web and desktop chat.

Any unsupported platform behavior should be recorded explicitly as **BLOCKED**, not replaced by an undocumented assumption.

## Practical execution sequence

1. **PoC, no custom domain:** Build in ChatGPT Work or supported Codex Sites flow with a sample entry and D1.
2. **Plugin integration:** Install the Site-hosted plugin, test all tool calls from chat, especially authorization and explicit publishing.
3. **Data portability:** Provide a Markdown export and a documented backup/recovery check.
4. **Decision:** Choose either Sites+D1 as a new target or the existing CGI+Markdown architecture. Only then update the canonical requirements/design/roadmap.
5. **Production:** Add feeds, tags, redirects, a custom domain, backups, and observability after the interaction loop works.

## Safety/reliability boundaries

- Do not embed secrets in frontend code or GitHub.
- Treat draft text and conversation excerpts as private until the author explicitly publishes.
- Make public reads query only published entries server-side. Merely hiding draft links in the UI is insufficient.
- Preserve original revision history and audit author-triggered publication transitions; support withdrawal.
- Do not assume Sites storage can be downloaded or auto-synced to GitHub without implementation and a proven recovery path.
- Keep code changes in reviewed GitHub PRs; content publishing is a separate operation from deploying code.

## Sources checked (2026-10-17)

- [Creating and using ChatGPT Sites](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites)
- [Hosting a plugin with ChatGPT Sites](https://help.openai.com/en/articles/20001547-hosting-a-plugin-with-chatgpt-sites)
- [Data and connections](https://learn.chatgpt.com/docs/sites/data-and-connections)
