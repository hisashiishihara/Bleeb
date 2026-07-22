# aiDiary Requirements

## 1. Purpose

aiDiary is a lightweight publishing tool that turns long AI-assisted thinking sessions into readable, date-based public writing.

It is not a general-purpose CMS, social network, raw chat archive, or globally consistent wiki.

> Preserve the result of AI-assisted thinking as human-readable writing, publish it on the user's own website, and keep it readable without requiring a running application or database.

## 2. Problems to Solve

### 2.1 AI conversations become fragmented

Long AI conversations gradually become slower and harder to manage. Users must periodically start new conversations, causing context and conclusions to become fragmented across multiple threads.

### 2.2 Raw chat logs are difficult to read

AI conversations contain repeated questions, corrections, abandoned ideas, tangents, duplicated explanations, and context useful only to the original participant. Publishing them as-is preserves the process but produces poor reading material.

### 2.3 Social networks are unsuitable for long-form thought

Social networks are optimized for short posts, images, immediate reactions, and algorithmic timelines. They provide weak support for long-form thought that should remain readable for years.

### 2.4 Wikis are expensive to maintain

A wiki attempts to preserve the current, consistent version of knowledge. As content grows, authors must reconcile contradictions, update related pages, remove stale conclusions, and merge duplicated explanations.

A diary may preserve changing opinions without treating them as errors.

## 3. Product Position

| Tool | Primary role |
|---|---|
| AI chat | Explore and develop ideas |
| aiDiary | Preserve and publish the result of thinking |
| Wiki | Maintain a current and internally consistent body of knowledge |
| Social media | Distribute short content and receive immediate reactions |

Core distinction:

> AI conversations are temporary. The resulting thought should not be.

## 4. Target Users

- Developers who already operate a personal or project website
- People who use ChatGPT, Claude, Gemini, or similar tools for extended thinking
- Users who want to publish long-form thought without deploying a full CMS
- Users who prefer plain files, static HTML, and self-hosting
- Users migrating away from proprietary note services

Typical uses:

- Add a developer's thinking log to an existing website
- Summarize and publish an AI discussion
- Document rejected technical approaches
- Record how a design decision evolved
- Maintain a public development diary
- Preserve long-form essays outside social media
- Create a durable handoff between separate AI conversations

## 5. Design Principles

1. **Markdown is the source of truth.**
2. **Writing may be dynamic; reading must be static.**
3. **Publishing may require software. Reading must not.**
4. **No database.**
5. **No daemon.**
6. **No container required.**
7. **No built-in AI dependency.**
8. **Existing websites must remain independent of aiDiary.**
9. **A broken CGI must not make published entries unreadable.**
10. **Generated data must be replaceable from primary Markdown sources.**
11. **The product must remain narrow enough to resist CMS-style expansion.**

Short form:

> No database. No daemon. No container. Just CGI and Markdown.

## 6. MVP Functional Requirements

### 6.1 Entry model

Each entry shall support:

- title
- publication date
- slug
- tags
- status: `draft` or `published`
- Markdown body
- optional summary
- creation timestamp
- update timestamp

### 6.2 Markdown storage

- Each entry shall be stored as a human-readable `.md` file.
- Metadata shall be stored in YAML front matter.
- File paths shall be derived from validated dates and slugs.
- Client-provided arbitrary filesystem paths shall never be accepted.
- Published and draft content shall remain recoverable without aiDiary.

Example:

```markdown
---
title: Why web diaries return in the AI era
date: 2026-07-22
slug: why-web-diaries-return
tags:
  - ai
  - personal-web
status: published
created_at: 2026-07-22T18:00:00+09:00
updated_at: 2026-07-22T18:30:00+09:00
---

Article body.
```

### 6.3 HTTP API

The MVP shall expose an HTTP API suitable for ChatGPT Actions and other AI clients.

```text
POST /entries
GET  /entries/{id}
PUT  /entries/{id}
POST /entries/{id}/publish
POST /entries/{id}/unpublish
GET  /entries
GET  /context
GET  /openapi.json
```

Deletion is intentionally excluded from the MVP. Entries may be unpublished but not remotely destroyed.

### 6.4 Authentication

- Mutating API endpoints shall require an HTTP Bearer token.
- Token comparison shall use constant-time comparison.
- Tokens shall not be stored inside published directories.
- Tokens shall never be written to application or access logs.
- Separate write and publish tokens may be supported.
- Read-only public endpoints shall not require authentication unless configured otherwise.

### 6.5 Static site generation

Publishing an entry shall generate:

- article HTML
- home page
- year archive
- month archive
- tag archive
- RSS or Atom feed
- optional JSON search index

Published files shall be served directly by Apache, Nginx, or another ordinary web server.

### 6.6 Draft workflow

- New entries shall default to `draft`.
- Publishing shall require an explicit API call.
- Updating a draft shall not affect the public site.
- Updating a published entry shall rebuild affected static outputs atomically.

### 6.7 Existing website integration

aiDiary shall support installation below an existing website, for example:

```text
https://example.com/diary/
https://example.com/cgi-bin/aidiary.cgi/
```

It shall not require ownership of the website root.

### 6.8 Today's Referrers

The MVP shall support tDiary-style referrer visibility.

- Aggregate external HTTP referrers per article and date
- Ignore empty referrers
- Ignore internal navigation
- Allow known bots and crawlers to be excluded
- Render a “Today's Referrers” section or static data fragment
- Store referrer data separately from article Markdown
- Tolerate missing or malformed referrer logs without blocking publishing

Search query terms are not guaranteed because modern browsers and search engines often omit them.

### 6.9 RSS or Atom

- Published entries shall appear in a feed.
- Feed generation shall occur at publish or rebuild time.
- Feed generation shall not require a database.
- Feed URLs shall remain stable.

### 6.10 Search and tags

MVP search shall remain lightweight:

- tag archive pages
- optional static JSON full-text index
- no external search server
- no vector database

### 6.11 OpenAPI

- aiDiary shall publish an OpenAPI document.
- The document shall describe Bearer authentication and supported endpoints.
- The schema shall be usable by ChatGPT Actions without custom middleware.

## 7. Non-Functional Requirements

### 7.1 Portability

- Primary target: Apache CGI
- Secondary compatibility target: any CGI-capable web server
- Python shall be the only mandatory runtime dependency where practical.
- Installation shall not require root access where ordinary CGI hosting permits user scripts.

### 7.2 Minimal environment impact

Installation should require only:

1. copying the CGI package
2. creating content and output directories
3. creating a configuration file
4. configuring a Bearer token
5. enabling CGI routing

No mandatory database server, systemd unit, Docker service, reverse proxy, background worker, message queue, or Redis.

### 7.3 Reliability

- Writes shall use temporary files followed by atomic replacement.
- Concurrent modification shall be guarded by file locking.
- Rebuilds shall not leave partially generated public pages.
- A failed rebuild shall preserve the previously published site.
- Markdown files shall remain readable even if generated HTML is lost.

### 7.4 Security

- Request body size shall be limited.
- Slugs shall be strictly validated.
- HTML input shall be rejected or sanitized according to configuration.
- CGI scripts and secrets shall live outside the public document root.
- Error responses shall not expose filesystem paths or secrets.
- Published output shall escape untrusted metadata.
- Remote deletion shall not be enabled in the MVP.

### 7.5 Performance

- Page reads shall be handled entirely by static file serving.
- CGI execution shall occur only for API operations or explicit maintenance.
- The MVP does not need optimization for high write concurrency.
- Rebuilding a personal-scale site of several thousand entries should remain practical.

### 7.6 Data ownership

- Users shall retain direct access to all primary content.
- No proprietary export operation shall be required.
- Git shall be supported as an optional versioning and backup mechanism.
- Generated indexes and knowledge summaries shall be disposable.

## 8. Explicitly Out of Scope for MVP

- graphical administration panel
- user registration
- multiple authors
- comments
- social timeline
- follower graph
- recommendation algorithm
- plugin marketplace
- relational database
- built-in LLM
- vector database
- collaborative real-time editing
- advanced role-based access control
- wiki-style global consistency enforcement
- SaaS hosting platform

## 9. Future Knowledge Layer

The knowledge layer shall be implemented after the publishing MVP and shall never overwrite diary entries.

Planned capabilities:

- tags across entries
- stable topics across changing tag names
- chronological thought timelines
- summaries of changes in opinion
- current conclusions
- rejected alternatives
- reasons for changes
- unresolved questions
- context packages for starting a new AI conversation

```text
Diary entries       = immutable primary sources
Tag indexes         = mechanically generated views
Thought timelines   = generated chronological views
Knowledge summaries = AI-generated, disposable derived data
```

The knowledge layer shall always link back to supporting diary entries.

## 10. Licensing

aiDiary shall be released under:

```text
BSD-3-Clause
```

The license reflects the project's preference for permissive use, portability, minimal restrictions, commercial compatibility, and protection against unauthorized use of contributor names for endorsement.
