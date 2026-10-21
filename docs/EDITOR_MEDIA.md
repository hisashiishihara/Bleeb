# aiDiary — owner browser Markdown editor and private media

## Purpose

The owner can edit existing aiDiary articles directly in a browser without
ChatGPT, save revisions, and upload local images/videos. The Site-hosted MCP currently exposes 12 owner-only tools, including `delete_media`,
for explicit irreversible media deletion. The browser uses the same revision model.

## Routes

- `/owner/new`: author a new *private draft*. After saving, navigate to edit.
- `/owner/archive/{entry_id}/edit`: edit the latest saved revision.
- `/owner/archive/{entry_id}`: read old revisions, navigate to editor.
- `POST /api/owner/save_draft` and `POST /api/owner/update_entry`: same owner authorization, request IDs and optimistic revision checks used by MCP.
- `POST /api/owner/publish_entry`: explicit selected revision + visibility
  (`owner` or `public`); no implicit publication on Save.
- `POST /api/owner/unpublish_entry`: explicit withdrawal.
- `POST /api/owner/media`: owner-only multipart upload, requires matching
  same-origin Origin; accepts `file` and an existing `entry_id`.
- `DELETE /api/owner/media/{id}`: owner-only same-origin permanent deletion,
  also available from `/owner/media?entry_id={entry_id}`. Deletion requires
  first removing the media reference from the selected published revision.
  Original revision Markdown records are deliberately retained.
- `GET|HEAD /media/{id}`: streams from private R2 after server-side authorization
  and supports a single HTTP byte range for MP4/WebM playback.

All state-changing requests use established Sites-injected owner identity.
Never trust caller-set identity headers; Sites ingress must replace forged
identity (verify after each deployment). A public URL to a media object is
**not** a secret and is never the authorization rule.

## Storage and migration

Enable R2 binding `MEDIA` in `.openai/hosting.json` and local Vite R2 config.
Apply migration `drizzle/0003_media.sql` **before deployment**. This migration
creates `media_assets` with owner entry ID, R2 object key, detected MIME, size,
name and creation time. It must not reset existing D1 data or revisions.

The R2 bucket is NOT public and has no custom public domain. All access goes
through the dynamic, authenticated/authorized route; anonymous browsers can
fetch a media file *only when* the media ID belongs to a public published
article and its **latest saved Markdown revision** references it.
On an already published public article, a newly saved revision becomes reader-visible
immediately; media referenced there may become public as well. To prepare media
privately, use a separate private draft instead. Changing visibility or
unpublishing takes effect immediately for media as well as article text.

For owner-only content, the same `/media/{id}` path requires verified owner
authentication. Media is returned with `no-store`, `nosniff` and
`Cross-Origin-Resource-Policy: same-origin`.

## Markdown

Write standard Markdown with headings, links, code blocks, and images. The browser editor can import the body from a local `.md` file and download the current body as a `.md` file (these actions do not by themselves mutate published content).
Images are inserted with:

`![説明](/media/<uuid>)`

The following deliberately small extension embeds HTML5 video while storing
plain Markdown source:

`![video:説明](/media/<uuid>)`

The browser preview and public article renderer recognize this local
video form. Arbitrary HTML inside Markdown is disabled. Use ordinary
Markdown links to external media when direct upload is not appropriate.

Current formats:
- JPEG, PNG, GIF, WebP up to **10 MiB**.
- MP4, WebM up to **24 MiB**.

These are conservative **application caps**, not a claim about all possible
Sites/R2 upload limits. Larger video files should use a separately tested
resumable/multipart upload flow; do not increase these limits until Sites
request-size constraints and streaming behavior are verified.

Image/video type is checked against allowed MIME and file signature. No SVG,
HTML or executable file uploads. Uploading does not publish the file. The
returned Markdown is inserted into the editor buffer; **save the revision**
before it can be referenced by an article.

There is currently no automatic deletion of unused media; this intentionally
preserves files referenced by older revisions. A future garbage collector
must not delete objects reachable from any retained revision.

## Deployment and acceptance gates

1. Confirm existing public site and all owner-only pages continue working.
2. Save a Sites version with R2 MEDIA binding and the new D1 migration.
3. Ensure R2 binding exists, migration 0003 applied, then deploy only the
   reviewed version. Github push does **not** deploy the Site.
4. As owner: use editor to update a fake draft, preview Markdown, save, reload
   and confirm the new revision exists. Old revision must be readable.
5. Upload a fake PNG then short fake MP4/WebM; confirm owner preview works and
   range requests yield 206 and correct Content-Range.
6. Use a **private draft** with media; verify anonymous requests return 404.
   Verify a newly saved revision to an already public article shows new media
   immediately, without changing publication status or audience.
7. Explicitly publish the private draft with `public`; verify anonymous article
   and media become available, without deploying new code.
8. Unpublish/restrict article; verify anonymous media and page return 404
   immediately. Owner must retain edit/read access.
9. Verify forged auth headers, cross-origin upload, wrong file signature,
   unsupported file types, oversized uploads, guessed media ID, cache,
   RSC/prefetch and MCP regressions all fail safely.
10. Do not use real private images or videos for acceptance tests.

**Do not claim upload/media access is verified until real Sites + R2 tests
pass.** Work-local automated tests cover source, isolated SQL and mocked storage; type checks and builds do not prove live platform behavior.

No membership/billing development, changes to public Site audience,
or external hosting is part of this feature.
