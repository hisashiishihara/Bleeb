# URL-based image import and revisioned hero (source implementation)

## Data and behavior

- Migration: `drizzle/0004_hero_media.sql` (additive; existing revisions NULL)
- Hero is stored as `entry_revisions.hero_media_id`, **not** a mutable article-wide property.
- `update_entry` carries the current hero forward to a new draft revision.
- `set_entry_hero_media` and `clear_entry_hero_media` append a revision with the
  same title, body, summary and tags; optimistic lock `expected_revision`.
- `import_media_from_url` with `usage=hero` downloads an image to private R2,
  records it in media_assets, then creates a new hero revision. This revision stays private for drafts, but is immediately visible at the existing audience for already-published articles.
  `usage=inline` uploads and returns safe Markdown for later insertion, without
  modifying the article; both accept a unique `request_id`.
- On a **draft**, changing the hero remains private until explicitly published.
  On an **already published** article, the new hero revision becomes reader-visible
  immediately at the same existing audience. Only a status/audience change requires
  an explicit `publish_entry` call.
- Reader images and OpenGraph metadata select **latest_revision** for published
  articles after the audience check; `published_revision` is a historical marker.
  Anonymous R2 reads require a reference in the current latest revision of a
  published, public article.
- Deletion refuses media referenced in the latest reader-visible revision of any
  published article. Historic Markdown and hero IDs remain in revisions.

## URL source security and limitations

The required Site secret/environment variable `AI_DIARY_IMAGE_SOURCE_HOSTS`
contains a comma-separated allowlist of exact HTTPS source hostnames, or
wildcard subdomains, e.g. `images.example.com,*.cdn.example.com`. **No remote
download works until configured.** Configure hosts only after observing
actual publicly accessible image URLs, rather than assuming ChatGPT preview
URLs are anonymously retrievable.

- HTTPS only; no credentials, non-default ports, numeric IP literals,
  localhost or internal/reserved host suffixes.
- Every redirect hop is checked against the host allowlist; maximum two hops.
- No forwarding owner cookies/tokens/authorization or inbound request headers.
- Images only (PNG/JPEG/GIF/WebP); remote MIME and magic bytes must match.
- Hard 10 MiB body cap, streamed with bounded memory; 12-second request timeout.
- No public R2 bucket URL or public proxy: bytes are copied to the existing
  private R2 MEDIA binding; source URL/signed query string is **not stored**.
- Fetching a ChatGPT-generated image directly works **only if** its URL can
  be fetched without browser-session cookies by the Sites runtime. An internal,
  expiring, or authenticated ChatGPT image preview URL may return 401/403 and
  is *not* proof of an R2/upload defect. The owner can instead download the
  generated image and use the existing browser upload, then set it as hero via
  `set_entry_hero_media`.

## Deployment

1. Verify previous Sites deployment and R2 MEDIA binding.
2. Apply non-destructive 0004 migration, then deploy code against the same Site.
3. Set `AI_DIARY_IMAGE_SOURCE_HOSTS` narrowly for approved provider CDN hosts,
   after inspecting real accessible URLs. Never include local/intranet hosts.
4. Register/reconnect the added Site-hosted MCP tools.
5. Test with a fictional article and an explicitly permitted hosted test PNG.
6. Confirm no-leak on draft heroes and owner-only articles. For an already
   published public article, confirm its latest saved hero appears immediately
   without republishing, and that restrictions or unpublish retract media to 404.
7. Reject off-allowlist/private/internal hosts, redirects outside allowlist,
   invalid MIME/signature, too-large downloads and stale expected revisions.
8. Verify existing media deletion, browser upload and all previous MCP tools.
   Do not publish real articles or modify their visibility during acceptance.

GitHub push does not deploy ChatGPT Sites. The resulting feature is not
live until these steps and real URL/R2 browser validation succeed.
