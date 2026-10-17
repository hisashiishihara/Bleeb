# Editor/media deployment validation — 2026-10-17

## Deployment

- GitHub application source: `5aaf327456f19162fd5a561929399f49f3ceb4ce` (main).
- Site source: `6bba737f8ce429196d8061bf4459f33e666c6f10` (same application changes, existing Site identity retained).
- Site: https://ai-diary-owner-test.hisashi-ishiha27957.chatgpt.site
- Version: 8, `appgprj_6ad2f8d246c081919860dd7e420d0590~appgver_2239e5374bfc8191a9b38ca69daa9d79`.
- Deployment: `appgdep_6ad318e8cec481919917eff1aa2a7adf`, succeeded 2026-10-17T06:43:44Z.
- Existing public audience unchanged, access policy revision remains 2.
- `.openai/hosting.json`: existing D1 `DB` retained; R2 `MEDIA` added. Sites provisions the private binding. No bucket public endpoint/domain was configured. Real R2 put/get remains unverified below.
- Hosted schema-only migration `drizzle/0003_media.sql` applied during deployment before Worker upload. Live DB overview and row read confirmed `media_assets` with expected seven columns and zero rows. No reset/deletion.

## Passed

- Both GitHub CI test check runs for the target commit succeeded.
- 20 local tests, TypeScript checking and production build succeeded.
- Anonymous real HTTP: home and existing public fictional article return 200; /owner/new and existing archive edit URL return 404 with private/no-store.
- Anonymous unknown media UUID returns 404 with private/no-store.
- Upload endpoint rejects both unauthenticated and forged owner ID/email headers with 403. No media record written.
- Authenticated owner MCP regression: save_draft, update_entry, get_entry of old r1, publish_entry with owner visibility, unpublish_entry, list_entries and export_entries all succeeded.
- Regression fixture `41068e0e-ee6a-4ecc-8567-d48bbd65d27f` contains two fictional revisions and remains an owner-only draft. Existing public articles were not changed.
- Export comparison confirmed all preexisting five entry records and ten revision records were unchanged.
- Site MCP connection remains present after deployment.

## Acceptance tests still pending (not passed)

The cloud browser reached the Site but had no owner session. Secure owner sign-in was declined. No credentials, service token or forged headers were used to bypass owner authentication.

Consequently these required browser/R2 tests are NOT verified:
- Browser creation/edit/save/reload, preview and .md import/download.
- Real PNG and short MP4/WebM upload, Markdown insertion and playback.
- Real private/unpublished media denial and visibility changes after explicit publication/withdrawal.
- Real video Range 206/Content-Range behavior, owner-authenticated bad MIME/signature/size and cross-origin upload rejection.
- Authenticated owner archive/editor navigation and browser historic revision display.

Pure validation/range/SQL tests passing does not establish real Sites/R2 behavior. Complete EDITOR_MEDIA.md acceptance gates with fictional assets in an authenticated owner browser before claiming end-to-end completion. Current caps: images 10 MiB, videos 24 MiB; no resumable upload or unused-media garbage collection. No membership, billing, external hosting or public audience changes were performed.
