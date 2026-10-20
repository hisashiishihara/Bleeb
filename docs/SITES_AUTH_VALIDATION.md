# Authentication and access checks

Bleeb uses ChatGPT Sites-provided authenticated identity for all owner operations. Writes require a verified user ID, an email matching the configured `AI_DIARY_OWNER_EMAIL` secret, and `AI_DIARY_OWNER_API_ENABLED=true`. The latter remains disabled by default.

- The owner MCP and browser mutation endpoints reject unauthorized callers.
- Application-level checks prevent anonymous access to drafts, owner-only articles and private media.
- Previous hosted tests rejected unsigned requests, forged identity headers and service-token-only requests. The tested cases do **not** prove every possible authentication bypass is impossible.
- Reader visibility is currently `owner` or `public`. Membership and paid access are disabled.
- Publishing an article does not change the Site's sharing policy. Verify both separately before making a Site public.

**After every deployment to the public Site:** verify current Site sharing, owner-only editor routes, private R2 access, MCP authorization and anonymous read paths in the target environment. Do not commit owner identifiers, tokens, private Site/admin links, signed URLs or nonpublic test article IDs. The **public canonical blog URL** may appear in documentation and feed metadata.

[Installation](GETTING_STARTED.md) · [Release checklist](PUBLIC_RELEASE_CHECKLIST.md)
