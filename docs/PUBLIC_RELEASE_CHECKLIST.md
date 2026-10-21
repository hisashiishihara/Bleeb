# Bleeb public OSS release checklist

Bleeb is intended as a **ChatGPT Sites-specific, conversation-first CMS**. Current Sites hosting is included in ChatGPT Plus / Pro subscriptions (subject to eligibility, Codex usage and hosting/storage limits). This is **not a claim that the Plus subscription itself is free**, nor a promise of perpetual zero cost. [Official terms](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites).

## Required before switching this repository from Private to Public

- [x] Run Gitleaks against the reachable Git history on a clean CI checkout: **198 commits scanned, no leaks found** (2026-10-18). Also ran the supplementary 199-commit / 346-text-blob heuristic scan. Review inaccessible/unreferenced history and credentials stored outside Git separately; no scanner is perfect.
- [ ] Inspect `.openai/hosting.json`, deployment files and source history (including removed workflows) for real owner identity, tokens, credentials, private URLs, signed download URLs, internal access IDs, article contents, backups and test artifacts. Do not publish real Site secrets or user data.
- [ ] Independent clean Plus-account install: not available for this release review; **do not claim independently verified one-click setup**. Preserve the documented manual install limitations.
- [ ] Recheck live Site sharing and anonymous access before altering access policy: the production blog is already public for explicitly public articles, but publication of the GitHub repository is a **separate** security decision. Verify current owner routes, private media and MCP authorization.
- [ ] Run `npm test`, `npm run typecheck`, `npm run build` in ChatGPT Work. GitHub Actions workflows are removed; keep the exact checked commit and command results.
- [ ] Check LICENSE, dependencies, examples, README claims, data-retention expectations and the platform's current Sites availability/pricing limits.
- [ ] Have the owner explicitly approve switching GitHub visibility to Public. Do **not** automatically change the Site audience or publish private blog content.

## What was checked during the October 2026 preparation

- Current tracked-file **names** (about 150 Git tree entries) did not reveal obvious `.env`, key, SQLite database, private-backup or credential file names.
- GitHub Actions [historical public-release audit workflow](https://github.com/hisashiishihara/Bleeb/blob/c8693af0edf9fea94141638007f1223db7141337/.github/workflows/public-release-secret-audit.yml) passed on 2026-10-18: 183 reachable commits, 330 unique text blobs inspected and zero high-confidence pattern matches. It does not cover undiscovered secret formats, unreferenced blobs or independent account setup.
- The source documents and license have been inspected, but a full history-aware secret audit and clean-account onboarding are **not completed**.
- The media-deletion regression now protects media referenced in the current reader-visible revision of a published entry, even if `published_revision` points to an older entry revision.
- Deployment is independent of GitHub pushes. Publishing this repository does not grant permission to expose its production D1/R2 data, Site ownership, or MCP mutation tools.

## Suggested positioning

> **Already using ChatGPT Plus?** Run a conversation-first personal blog on ChatGPT Sites without renting a separate server, within the hosting and usage limits included in your plan. Draft, revise, add media and publish through ChatGPT. Your articles are stored in D1 and media in R2. Open-source BSD-3-Clause.

This is a technical project, not a one-click installer. Keep that distinction in documentation and announcements.
