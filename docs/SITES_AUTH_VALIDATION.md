# Owner-only Sites authentication validation — 2026-10-17

## Root cause and fix

The initial checkpoint deliberately omitted AI_DIARY_OWNER_API_ENABLED. All seven tools therefore returned the same generic owner authentication error even when Sites forwarded valid owner identity.

Owner authorization now requires both the Sites-injected site-scoped user ID and an email matching AI_DIARY_OWNER_EMAIL. It separately reports a disabled owner API only after identity matches. AI_DIARY_OWNER_API_ENABLED must still be exactly true; missing configuration denies access. Service bypass tokens alone are never article-author identities.

The Site MCP adapter implements the documented stateless POST /mcp protocol (2026-07-28), delegates to the existing dispatch operations, and returns MCP errors for rejected operations. The hosting manifest declares the mcp capability.

Runtime owner email remains a Sites secret. No identity values, tokens, or cookies are committed. Do not hardcode a production enable flag in source. Maintain the owner-only Sites access policy; changing the audience requires separate authorization.

## Real environment evidence

- Owner-only Site: https://ai-diary-owner-test.hisashi-ishiha27957.chatgpt.site
- Access policy: sole owner, no other viewers, groups, editors, or external visitors.
- D1 tables entries, entry_revisions, and mutation_requests exist.
- While disabled, a real ChatGPT list_entries call returned “Verified owner identity received; owner API is disabled”. This proves both injected identity fields reached application authorization and the configured owner email matched.
- After enabling the runtime flag and deploying the same saved application version, all seven tools succeeded through the actual ChatGPT plugin.
- Unsigned requests and requests forging owner email/ID were rejected by ingress (401) on browser APIs and /mcp.
- With service access plus forged owner email/ID, a read-only checkpoint reported authenticated=false and owner_match=false: ingress removed the forged identity.
- After enabling authoring, all seven /api/owner/<action> endpoints rejected forged owner headers: 401 without service access, 403 with service access (14 negative checks).
- /mcp also rejected unsigned and service-bypass calls with forged identity (401). Service bypass does not substitute for MCP user authorization.

These checks prove the tested forged-header and service-bypass paths are denied. A second person's signed-in account was not used; owner isolation additionally relies on the inspected owner-only Sites policy and server-side owner email match.

## Fictional article acceptance

A single explicitly fictional moon-cafe article was used. No prior conversation or real article was published.

1. list_entries returned an empty store.
2. save_draft created revision 1; home excluded it and its permalink returned 404.
3. update_entry created revision 2; get_entry still returned unchanged revision 1.
4. publish_entry published revision 2; a real HTTP read returned 200 and its expected content.
5. update_entry created revision 3; published_revision stayed 2. HTTP still showed revision 2 and excluded revision 3.
6. export_entries returned all three revisions and Markdown files.
7. publish_entry published revision 3 without any application deployment during article operations. HTTP showed revision 3 and excluded revision 2's distinct content.
8. unpublish_entry cleared published_revision. Home excluded the article and its permalink returned 404. The final article remains a private draft with three retained revisions.

All seven MCP tools were exercised successfully. Six existing tests, TypeScript checking, and the Sites build passed. Full Markdown restoration into a separate empty hosted D1 database remains unverified; Markdown export and the existing offline restore tests passed. Browser visual QA was not performed.

## Deployment trace

Sites source commit: 17873cba3d1cae855ef5da2e1bdadcbe2d0c4dbf.
Saved version: appgprj_6ad2f8d246c081919860dd7e420d0590~appgver_dee603144c288191aa960f3aeb9ae6ee.
Enabled deployment: appgdep_6ad2fb56d33081918c4b070f4a1d67bb (runtime revision 2).
No internet-public sharing or custom domain was configured.
