# Owner MCP image upload — Base64 transport

This change adds `upload_media` to the Site-hosted owner MCP tool set.

**Input:** `entry_id`, `expected_revision`, `image_base64` (standard canonical Base64 *without* a data URI), `content_type` (JPEG, PNG, GIF or WebP), `file_name`, `usage` (`hero` or `inline`), `request_id`, and optional `alt_text`.

- Owner identity is verified by the existing `app/mcp/route.ts` guard before dispatch. Browser cross-origin upload protections are unchanged.
- `image_base64` is capped to **10 MiB decoded**; invalid Base64, non-images, wrong file signatures and absent articles are rejected.
- Uses the existing R2 `MEDIA` binding and D1 `media_assets` table. No new migrations.
- `hero`: creates a new **unpublished** revision with the uploaded image; `inline`: returns Markdown and leaves the revision untouched.
- Published article revision, article visibility, existing content and older revisions are preserved. Explicit `publish_entry` remains required.
- The MCP JSON-RPC body limit is increased **for this tool only**, to accommodate Base64. Hosting and ChatGPT tool-argument size limits may be lower.

## Platform limitation and acceptance gate

The new tool accepts Base64 supplied as a model-call argument. This **does not prove** that ChatGPT-generated image attachments are accessible to an MCP plugin as file bytes. A ChatGPT `sandbox:/mnt/data/...` path is not a public URL or automatically transferable MCP attachment. Never invent Base64 or suggest a local sandbox path can be fetched by the Site. If the client cannot supply actual Base64, use the existing authenticated browser upload or `import_media_from_url` with a genuinely public, allowlisted HTTPS source.

GitHub commits do not deploy a Site. After source checks, redeploy the same Site with DB/R2 bindings and owner identity unchanged, refresh the Site-hosted MCP plugin registration, and verify `upload_media` is discoverable. First perform a tiny fake PNG upload with `usage=inline`, confirm in R2/D1 and that the current published revision is unaffected; then test `hero` against a fictional article and explicitly publish only with owner instruction. Verify unauthorized tool calls fail. Do not publish a real article as part of this acceptance gate.


## Native ChatGPT-generated image transfer (13th tool)

The owner-only `upload_chatgpt_image` tool uses the officially documented
ChatGPT MCP extension `_meta["openai/fileParams"] = ["file"]`. The tool's
top-level `file` property has four declared string fields:
`download_url` and `file_id` required; `mime_type` and `file_name`
optional. ChatGPT resolves an actual generated image or attached file and
passes a temporary URL/reference to the Site. Never pass a sandbox pathname
as a URL, never persist a temporary signed URL or raw file ID, and never
include signed URLs in logs/error messages.

The authenticated Site downloads the image with credentials omitted,
redirects checked against an explicit HTTPS hostname allowlist, a 12-second
timeout, a 10 MiB byte limit, and image MIME + binary-signature validation.
It then calls the **same private R2 and D1 createMedia** service used by
the browser upload. Only JPEG, PNG, WebP and GIF are accepted. The
`image_base64` tool remains available for older clients.

The allowlist is `AI_DIARY_CHATGPT_FILE_HOSTS`, defaulting to
`files.oaiusercontent.com,*.oaiusercontent.com,oaisdmntprkoreacentral.blob.core.windows.net`. The Azure Blob hostname is the exact transfer endpoint observed during the October 2026 owner-site failure; no Azure-wide wildcard is allowed. If real files come from
a different OpenAI-controlled hostname, inspect the authenticated failure
privately and explicitly add **only** that exact trusted hostname. Never
allow arbitrary public URLs, wildcard TLDs, local hosts, or attacker
redirect destinations. The ordinary `AI_DIARY_IMAGE_SOURCE_HOSTS` setting
does not control this path.

A successful `usage=hero` upload writes a private newest revision,
leaving the old public revision and its visibility unchanged.
`usage=inline` writes only media and returns Markdown. Both are owner-only.

### Real-site acceptance after GitHub CI

1. Redeploy the existing Site preserving its URL, owner identity, D1, R2,
   current plugin identity and article data. Owner republish must expose 13
   tools including `upload_chatgpt_image`.
2. In a fresh ChatGPT conversation, invoke `upload_chatgpt_image` with
   a tiny **fictional** ChatGPT-generated PNG (not a fabricated file URL).
   Use `usage=inline` for an unpublished fictional draft.
3. Confirm a real `media_id`, R2 object, D1 media row, accessible owner
   preview, but no changed revision/published visibility.
4. Try `hero` with a fictional article; confirm its unpublished next
   revision and that anonymous requests cannot access the new media.
5. Confirm calls without authorized Site owner identity fail.
6. Only after these gates pass, upload the actual approved image to the
   owner's real article with `usage=hero` **without republishing**.
   The explicit `publish_entry` operation is still separate.

Platform note: Host-side resolution of generated image files into fileParams
may vary by ChatGPT surface. The server-side implementation and CI cannot
prove that a particular ChatGPT client forwards the generated image until
tested from the actual connected plugin. If the platform drops the file
parameter, fail clearly and do not substitute a textual image description.

Official documentation: https://developers.openai.com/plugins/reference
