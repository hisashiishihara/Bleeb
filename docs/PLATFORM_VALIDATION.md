# aiDiary platform validation and release gates (2026-10-17)

This document separates **documented platform support** from **verified end-to-end operation**.

## Confirmed in current public documentation

- ChatGPT Sites on Plus/Pro can host web experiences and persistent D1.
- Official `openai/sites` vinext template uses `@openai/sites-vite-plugin`, a `.openai/hosting.json` D1 binding, and a Cloudflare Vite plugin.
- Sites can host MCP tools and create an installable plugin after the Site **owner** publishes.
- Sites Sign in with ChatGPT forwards `oai-authenticated-user-email` to server code.
- Hosted plugins must be installed **and connected** in the intended ChatGPT account; publish again after tools are changed.

References:
- https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites
- https://help.openai.com/en/articles/20001547-hosting-a-plugin-with-chatgpt-sites
- https://learn.chatgpt.com/docs/sites/data-and-connections
- https://github.com/openai/sites

## Not yet verified and therefore blocked

1. This GitHub connection can update source, but **does not create or publish Sites**. Deploy from ChatGPT Work/Codex with Sites access.
2. Site-backed D1 migrations on the account, and publication without code deployment, must be exercised on an actual Site.
3. Site-hosted MCP tools have not been provisioned; `plugin/tool-definitions.ts` is **a contract description, not a live MCP server**.
4. The trusted identity on a Site-hosted MCP **write** invocation has not been proven. Do not enable owner routes, connect a live plugin, or enable production authoring until a security test verifies that requests cannot spoof `oai-authenticated-user-email`.
5. The Site is not publicly published, and anonymous-vs-owner permissions have not been proven. The acceptance suite requires **real HTTP** tests of each.
6. Markdown export conversion is implemented; D1 restoration on an actual Site has not been tested.

## Security guardrails

- `AI_DIARY_OWNER_API_ENABLED` must be exactly `true` **and** `AI_DIARY_OWNER_EMAIL` must match verified server-injected identity; default is **deny** for all owner APIs.
- Do **not** set `AI_DIARY_OWNER_API_ENABLED=true` until the ingress strips/overrides any spoofed identity header. Using the browser sign-in alone is not enough proof for MCP.
- Never put a personal email, token, cookie, secrets or manuscript content in GitHub.
- Public SQL joins **only** `published_revision`; authored revisions remain separate.
- No seed data or actual conversation text is committed or published.
- Keep any initial Site shared only with its owner. An internet-public Site is a separate approval gate.
- UI is noindexed for test purposes; production SEO is a separate decision.

## Test checklist before enabling publication

- [ ] Create Site in Work, load this repository with the official starter, configure D1 and run migration
- [ ] Confirm Site-hosted MCP registration has trustworthy owner identity
- [ ] Test forged headers / unsigned requests on owner API and MCP tools
- [ ] In ordinary ChatGPT, connected plugin saves a fake private draft
- [ ] Anonymous visitor cannot retrieve the draft
- [ ] Update draft, verify old revision, and explicitly publish
- [ ] Anonymous public permalink displays published version
- [ ] Change draft again: public permalink still uses previous published revision
- [ ] Publish new revision without redeploying Site application
- [ ] Unpublish: homepage and permalink both hide article
- [ ] Export JSON + Markdown; restore to empty test D1; compare content and metadata
- [ ] Only after all tests and user confirmation, consider broad public sharing

## Important operational note

A GitHub push alone never deploys this Site. Sites owner publication is a separate workflow. Site URL and plugin installation card are not known until Sites actually creates them.
