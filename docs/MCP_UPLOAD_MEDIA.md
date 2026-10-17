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
