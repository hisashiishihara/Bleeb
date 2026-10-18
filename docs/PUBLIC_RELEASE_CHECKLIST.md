# Public OSS release checklist

aiDiary is intended as a **ChatGPT Sites-specific, conversation-first CMS**. Current Sites hosting is included in ChatGPT Plus / Pro subscriptions (subject to eligibility, Codex usage and hosting/storage limits). This is **not a claim that the Plus subscription itself is free**, nor a promise of perpetual zero cost. [Official terms](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites).

## Required before switching this repository from Private to Public

- [ ] Perform a **full Gitleaks Git history and working-tree secret scan** on a fresh clone. The preliminary Actions heuristic scan passed (183 commits, 330 unique text blobs, zero high-confidence matches); this does **not** replace Gitleaks, manual verification or inspection of unreferenced objects. Review any findings; rotate exposed credentials, and handle history rewriting only with an explicit plan.
- [ ] Inspect `.openai/hosting.json`, GitHub Actions workflows, deployment files and source history for real owner identity, tokens, credentials, private URLs, signed download URLs, internal access IDs, article contents, backups and test artifacts. Do not publish real Site secrets or user data.
- [ ] Verify the exact new-user setup flow from a **separate clean Plus account and empty test Site**: import source, D1/R2 bindings, migrations, trusted owner authentication, MCP connection, test article save/edit/publish/unpublish, media upload, and anonymous access.
- [ ] Confirm the Site's **public sharing** is configured separately from the article's `public` visibility, and private drafts/owner routes are inaccessible to anonymous readers.
- [ ] Run `npm test`, `npm run typecheck`, `npm run build` and review the most recent CI run.
- [ ] Check LICENSE, dependencies, examples, README claims, data-retention expectations and the platform's current Sites availability/pricing limits.
- [ ] Have the owner explicitly approve switching GitHub visibility to Public. Do **not** automatically change the Site audience or publish private blog content.

## What was checked during the October 2026 preparation

- Current tracked-file **names** (about 150 Git tree entries) did not reveal obvious `.env`, key, SQLite database, private-backup or credential file names.
- GitHub Actions [public-release history audit](../.github/workflows/public-release-secret-audit.yml) passed on 2026-10-18: 183 reachable commits, 330 unique text blobs inspected and zero high-confidence pattern matches. It does not cover undiscovered secret formats, unreferenced blobs or independent account setup.
- The source documents and license have been inspected, but a full history-aware secret audit and clean-account onboarding are **not completed**.
- The media-deletion regression now protects media referenced in the current reader-visible revision of a published entry, even if `published_revision` points to an older entry revision.
- Deployment is independent of GitHub pushes. Publishing this repository does not grant permission to expose its production D1/R2 data, Site ownership, or MCP mutation tools.

## Suggested positioning

> **Already using ChatGPT Plus?** Run a conversation-first personal blog on ChatGPT Sites without renting a separate server, within the hosting and usage limits included in your plan. Draft, revise, add media and publish through ChatGPT. Your articles are stored in D1 and media in R2. Open-source BSD-3-Clause.

This is a technical project, not a one-click installer. Keep that distinction in documentation and announcements.
