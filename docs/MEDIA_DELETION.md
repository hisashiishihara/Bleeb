# Private R2 media deletion — 2026-10-17

## What deletion means

The owner explicitly requests a single media UUID. The application permanently
deletes that R2 object, verifies it is absent, and removes its D1 `media_assets`
record. This is **not** the same as removing Markdown text from an article.

Past revision records are append-only and remain intact. Any old revision that
contained a link to the deleted media will still have that text, but the media URL
returns 404. To protect currently displayed articles, the deletion action refuses
a file referenced by the latest reader-visible revision of a published article, regardless of visibility.

## Interfaces

- Browser: `/owner/media?entry_id=<entry id>`. The editor links to this page.
  It displays owner-only media metadata and offers an explicit, confirmed
  irreversible deletion button.
- Browser REST: `DELETE /api/owner/media/{media_id}`. Requires verified Sites
  owner ID + email + server switch and exact same-origin Origin. This is not a
  public endpoint and cannot be invoked merely by knowing a UUID.
- ChatGPT: Site-hosted MCP tool `delete_media` with required `media_id` and
  optional `entry_id` for an exact article guard. It passes through the
  existing verified owner authentication gate. It is never called
  automatically or inferred from a vague reference.

If the owner wants to remove a file in an existing published article, first
save a new revision without the Markdown reference (it becomes reader-visible immediately on already-published articles). Explicitly publish again only to change publication state or audience. Then perform file deletion.

Before R2 removal, D1 stores a permanent `media_deletions` intent that fences the canonical media ID and key, including cross-article references. Draft deletion uses this same path. The intent survives metadata/article deletion and is never unlocked by elapsed time or an R2 error. Only metadata cleanup follows R2 removal. A failed delete leaves D1 metadata intact
for a retry. The R2 object is checked absent after `delete` before the metadata
record is removed. If it was already deleted, a retry completes the cleanup. Retries need no waiting period and may overlap safely because none can reopen references or reuse the key. A failed/unknown DELETE may still complete late, so HEAD seeing bytes never cancels the intent. Old revisions remain readable to the owner, but cannot be restored/published with a deleted-media reference; remove the reference or upload a new asset. Saving a body edit clears a hero that already has a deletion intent, so a draft containing the same deleted asset in both body and hero can be repaired in one edit.

## One-off cleanup

Specific private file and article identifiers must be passed out of band in the
owner's authenticated deployment session, rather than committed to source.
Never delete any other file or change publication visibility. Verify R2 and
D1 deletion in the Site before reporting completion.

## Deployment tests

- Retain existing owner/public Sites policy, D1 rows and article history,
  existing media upload/read behavior and the current 12 MCP tools.
- If MCP tool definitions change, their Site-hosted registration must be refreshed; updating
  GitHub alone does not automatically update the connected plugin interface.
- Validate 409 for media referenced by the latest reader-visible revision of a published article;
  verify same-origin and forged-header denial; verify unrelated assets untouched.
- Do not claim permanent deletion if the R2 or D1 verification was not done.
