# Work / Sites deployment handoff

Use ChatGPT Work (web) or Codex with @Sites. Source of truth: https://github.com/hisashiishihara/ai-diary main.

1. Import or check out the source in a Sites-capable environment. Do not replace its application with a static generator or re-enable Python CGI / Apache.
2. Verify the official vinext/Sites starter build and its artifacts. The repo declares `.openai/hosting.json` with D1 binding `DB`, `vite.config.ts`, and a SQL migration in `drizzle/`. If migration discovery needs Drizzle metadata, adapt only to the **documented** Sites packaging/runtime contract.
3. Configure the test Site for **owner-only access**, D1 enabled, no custom domain, and **no actual posts**. Keep `AI_DIARY_OWNER_API_ENABLED` absent/false at first.
4. Deploy a test checkpoint only after checking the build and runtime DB binding. Record real generated Site URL.
5. Prove header provenance on both browser API and plugin MCP requests. A request with a forged `oai-authenticated-user-email` must not gain owner rights. Check supported trusted ID mechanisms, not arbitrary headers.
6. Register Site-hosted MCP tools matching `plugin/tool-definitions.ts` and `lib/store.ts` `dispatch`. Tool write permissions require verified owner identity and explicit publish intent. Never bridge unauthenticated REST to MCP.
7. Owner must publish the Site to create the plugin, then Install / Connect from the card or Plugins > Personal > Created by you. Mention the plugin in a fresh conversation.
8. Exercise the acceptance checklist in `docs/PLATFORM_VALIDATION.md`, using **fake sample posts only**. Never publish content from past conversations.
9. Report exactly which steps passed. Do not claim an MCP connection or URL exists from source alone.

### Site-adapter rule

Do not implement a guessed MCP HTTP transport. Create the hosted MCP integration using the **actual Site development/hosting API** available in that environment. Reuse the repository's validated pure article operations, and prove that the plugin caller is the intended author. If the runtime cannot propagate trusted identity, keep mutation tools disabled and report the blocker.

### Markdown backup

Owner-only `export_entries` returns an export bundle (JSON manifest including `files`, whose values are Markdown for all exported revisions). Store it securely and privately. Convert to SQLite SQL with:

```sh
node --experimental-strip-types scripts/bundle-to-sql.mjs backup.json > restore.sql
```

Import SQL **only into a fresh, empty, test database with the migration already applied**, using the Sites-supported D1 migration/SQL execution method. Check revision pointers and content after import. Production restore requires separate approval.
