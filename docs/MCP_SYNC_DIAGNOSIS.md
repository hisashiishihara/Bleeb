# MCP synchronization diagnosis — 2026-10-17

## Confirmed live evidence

An owner-only, read-only diagnostic was added to the existing MCP list_entries response in application commit `1cc6e86293268345dde0d2fce0aee59810bd3012`. It calls the exact POST handler in-process with fixed method tools/list and returns that handler's result as `mcp_diagnostics.tools_list`. The outer tools/call must pass existing verified owner authorization first. It makes no external network call and no data writes. A test compares the probe to a normal tools/list response, verifies unauthenticated callers cannot retrieve it, and checks no mutation_requests writes.

This diagnostic-only change was deployed once as Site version 14:
- Site source commit: `a494230b3c9704581bbe881e85e745bd5623f018`.
- Saved version: `appgprj_6ad2f8d246c081919860dd7e420d0590~appgver_51ff8016ba7c8191ad41d8d7041d178a`.
- Deployment: `appgdep_6ad380ec28a48191bc1347ab00a47b02` (succeeded).
- CI, 42 local tests, TypeScript and production build passed.

An actual authenticated list_entries call to the deployed Site returned probe same-runtime-tools-list-v1 with 13 descriptors:

save_draft, list_entries, get_entry, update_entry, publish_entry, unpublish_entry, export_entries, import_media_from_url, upload_media, upload_chatgpt_image, set_entry_hero_media, clear_entry_hero_media, delete_media.

The live upload_chatgpt_image descriptor contained:

```json
{
  "_meta": {"openai/fileParams": ["file"]},
  "file": {
    "type": "object",
    "properties": {
      "download_url": {"type": "string"},
      "file_id": {"type": "string"},
      "mime_type": {"type": "string"},
      "file_name": {"type": "string"}
    },
    "required": ["download_url", "file_id"],
    "additionalProperties": false
  }
}
```

The file schema is the value of inputSchema.properties.file. It declares all four documented properties, requires only download_url/file_id, and is referenced by the top-level fileParams field. No documented file-schema violation was found (https://developers.openai.com/plugins/reference, Define file inputs).

At the same time, this ChatGPT/Codex conversation exposed only 12 callable aiDiary tools and omitted upload_chatgpt_image. Existing authenticated owner reads worked. Recent error logs contained no failed /mcp invocations.

## Diagnosis boundary

The live Site does return the 13th tool and its metadata. The current discrepancy is downstream of the Site response, between the Sites/App registration or scan and the tools presented to this conversation. This excludes a current 12-tool application response as the explanation. This probe was collected on version 14; it does not retroactively assert a captured tools/list response from version 13.

The available management tools do not expose the stored App tool descriptors, per-tool scan/schema rejection results, or registration/synchronization logs. Consequently stale conversation discovery, registration filtering, and a host fileParams capability issue cannot yet be distinguished. Do not label this conclusively a cache bug or claim synchronization is fixed based only on another deployment.

## Preservation

Existing Site URL, canonical plugin ID, connection endpoint, owner authorization, DB and MEDIA bindings and audience policy are retained. No migrations, article mutations, media mutations or publishing tools were called during diagnosis. The deployment updates diagnostic code only. No file URLs, credentials, article contents, or personal image bytes are included in this report.


## Follow-up: native fileParams bridge became callable (2026-10-17)

The connected ChatGPT conversation later exposed all 13 tools, including
`upload_chatgpt_image`; this was confirmed from the callable tool inventory
and did **not** require making another deployment. The prior 12-tool
discrepancy no longer reproduces in that conversation. Its original cause
(registration lag, presentation caching, or other hosting behavior) remains
unproven.

The owner invoked the actual new tool with a previously generated 1672×941
PNG, ~2.7 MB, targeting an unpublished fictional article with `usage=inline`.
The file reached the plugin interface, but the operation failed before
storing an R2 object with `Only PNG, JPEG, GIF and WebP are supported`.
The file itself is a valid PNG; the file handoff reported its MIME as
`application/octet-stream`, which the original transport adapter rejected
before download.

A follow-up source fix now treats only ChatGPT fileParams octet-stream
metadata as *untyped*, downloads it under the existing strict HTTPS
host allowlist, bounded size, no-credentials/no-referrer and redirect policy,
then detects actual PNG/JPEG/GIF/WebP from magic bytes. Ordinary
`import_media_from_url` retains strict image-MIME enforcement.

**Still pending:** Deploy the MIME fix to the existing Site and retry an
actual fileParams upload. Calling the tool and reaching MIME validation is
not proof of successful file download or R2 persistence.
