# Four-audience validation — 2026-10-17

## Passed in isolation

16 tests, TypeScript and Sites build passed. The access tests execute the actual store, reader SQL, membership APIs and MCP handler with fictional data in in-memory SQLite. Injected identities in these isolated tests represent already-verified ingress; production has no test identity bypass.

- All 16 audience/viewer combinations (owner, paid, registered, public versus owner, active paid, active free, anonymous).
- Unregistered signed-in readers receive no membership privileges.
- Reader list/body contain only published_revision, including when a newer private title/body exists.
- Immediate audience restriction, exclusive paid expiry, paid deactivation and registration revocation.
- Re-registration cannot restore revoked privileges or enable paid access.
- Registration ignores no client claims: additional ID/tier fields are rejected, and the membership key derives only from injected identity.
- Owner-only, same-origin membership administration; unknown IDs cannot be manufactured as members.
- Seven MCP tool names and operations; all reject missing owner identity.
- publish_entry accepts each explicit audience; missing audience retains current scope; invalid audience is rejected.
- unpublish_entry preserves history and resets audience to owner.
- Existing published records default to owner on migration without changing their revisions.
- Owner archive continues to find private historical content and open the matching revision.

## Passed on existing owner-private Site

Site: https://ai-diary-owner-test.hisashi-ishiha27957.chatgpt.site

Implementation checkpoint source: 0710b16c6551850feb8443a753f3eb7ef480e283.
Checkpoint saved version: appgprj_6ad2f8d246c081919860dd7e420d0590~appgver_b3e7fc0febc08191b982832139180198.
Checkpoint deployment: appgdep_6ad3084b21b4819185ea7680ff6d67e1 (succeeded, environment revision 3).
Subsequent source synchronization adds validation documentation and isolated test coverage only; the application code is unchanged.

- Migration 0002 applied; members table exists with the documented columns.
- The original two fictional articles and five revisions matched the pre-migration snapshot after ignoring the newly added visibility field. Both articles migrated to owner.
- Real ChatGPT MCP calls saved a new fictional article, edited it, read an older revision, listed entries, exported entries, explicitly published each of the four audiences, and unpublished it.
- The published revision stayed 1 while a private revision 2 existed.
- App-level anonymous HTTP reads used the documented Site service-access boundary (which supplies no visitor identity): paid/registered/owner permalinks returned 404 and were absent from the list; public returned 200 with revision 1 only. Private revision 2 markers were absent throughout.
- Changing public to owner immediately removed the list entry and changed the same permalink to 404. Responses were no-store; no previously fetched public body reappeared.
- Unsigned requests forging the owner ID/email were rejected at the Sites ingress (401).
- Service-access requests with forged owner ID/email were rejected by membership registration (401), owner management and get_entry APIs (403), and /mcp (401). Private archive and membership pages returned 404 without draft markers.
- /account without a user identity rendered only the documented sign-in link; a forged user identity did not register or impersonate a member.
- members remains empty on the hosted Site: no fictional or actual non-owner IDs were inserted there.
- Site policy remains sole owner, no additional viewers/groups/external visitors. Referrer collection remains disabled.
- New fictional test article is finally draft + owner, with both revisions preserved.

## Explicit limits

The private Site policy blocks non-owner accounts before application code. No second user's hosted sign-in, hosted free registration, paid-member browser session, or owner membership form submission is claimed as verified. Those behaviors are tested with the actual application functions in isolation instead. The owner previously confirmed archive keyword/revision navigation; new audience labels and membership forms still need manual owner browser acceptance.

Do not weaken the Site sharing policy to complete these tests. A public rollout or a separate shared test Site needs authorization and suitable accounts. Actual checkout, billing and payment webhooks are not implemented. No real articles, conversation history, payments, or subscriber data were used.
