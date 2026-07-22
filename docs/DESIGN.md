# aiDiary Design

## 1. Architecture Overview

aiDiary uses a write-dynamic, read-static architecture.

```text
ChatGPT / Claude / Gemini / API client
                  |
                  | HTTPS + Bearer token
                  v
             aiDiary CGI
                  |
        +---------+----------+
        |                    |
        v                    v
 Markdown source        Static renderer
        |                    |
        |                    v
        |              Generated HTML
        |              archives / feed
        |                    |
        +--------------------+
                             v
                    Existing web server
                    serves static files
```

Referrer processing remains independent:

```text
Apache access log
        |
        v
Referrer collector
        |
        v
Generated JSON or HTML fragment
        |
        v
Published diary pages
```

## 2. Component Responsibilities

### 2.1 CGI entry point

The CGI entry point shall:

- parse CGI environment variables
- route requests using `REQUEST_METHOD` and `PATH_INFO`
- enforce request size limits
- validate Bearer authentication
- parse JSON request bodies
- call application services
- serialize JSON responses
- map internal errors to safe HTTP responses

It shall not contain rendering, storage, or business logic directly.

### 2.2 Application services

```text
create_entry()
get_entry()
list_entries()
update_entry()
publish_entry()
unpublish_entry()
build_site()
build_entry()
build_indexes()
build_feed()
collect_referrers()
export_context()
```

These functions shall be callable without CGI so they can be tested and reused by command-line maintenance tools.

### 2.3 Markdown repository

The repository shall:

- resolve entry identifiers to validated paths
- load and parse front matter
- preserve Markdown bodies
- perform atomic writes
- lock entries during updates
- enumerate entries without a database
- distinguish draft and published status through metadata

### 2.4 Static renderer

The renderer shall:

- convert Markdown to HTML
- apply templates
- generate archive pages
- generate tag pages
- generate RSS or Atom
- generate optional static search data
- write to a staging directory
- atomically activate completed output

### 2.5 Referrer collector

The collector shall:

- parse a documented web server log format
- normalize target URLs
- normalize external referrer URLs
- filter internal URLs
- filter configured bots
- aggregate by target article and calendar date
- produce generated data independent from source Markdown

### 2.6 Context exporter

The context exporter shall return selected diary content for use in a new AI conversation.

Filters may include tags, topics, date range, publication status, entry limit, and sort order.

Output formats:

- Markdown
- JSON

## 3. Proposed Repository Layout

```text
aidiary/
├── LICENSE
├── README.md
├── docs/
│   ├── REQUIREMENTS.md
│   ├── DESIGN.md
│   └── ROADMAP.md
├── pyproject.toml
├── src/
│   └── aidiary/
│       ├── __init__.py
│       ├── cgi_main.py
│       ├── config.py
│       ├── errors.py
│       ├── models.py
│       ├── routing.py
│       ├── security.py
│       ├── services/
│       │   ├── entries.py
│       │   ├── publishing.py
│       │   ├── context.py
│       │   └── referrers.py
│       ├── storage/
│       │   ├── markdown_repository.py
│       │   ├── atomic.py
│       │   └── locking.py
│       ├── rendering/
│       │   ├── markdown.py
│       │   ├── templates.py
│       │   ├── archives.py
│       │   ├── feed.py
│       │   └── search.py
│       └── api/
│           └── openapi.py
├── themes/
│   └── default/
│       ├── entry.html
│       ├── index.html
│       ├── archive.html
│       ├── tag.html
│       └── static/
├── examples/
│   ├── apache.conf
│   ├── config.toml
│   └── chatgpt-action-openapi.json
├── tests/
└── tools/
    ├── rebuild.py
    └── import_markdown.py
```

Deployment layout:

```text
/opt/aidiary/
├── aidiary.pyz
├── aidiary.cgi
├── config.toml
├── content/
├── data/
├── themes/
└── staging/

/var/www/example.com/
└── diary/
    ├── index.html
    ├── rss.xml
    └── ...
```

## 4. Deployment Model

### 4.1 Python packaging

Development:

- Python 3.12+
- `pyproject.toml`
- `uv`
- `pytest`

User-facing distribution should aim for a `.pyz` zip application or a small vendored package plus CGI launcher.

```sh
#!/bin/sh
exec /usr/bin/python3 /opt/aidiary/aidiary.pyz
```

### 4.2 Apache integration

```apache
ScriptAlias "/cgi-bin/aidiary.cgi" "/opt/aidiary/aidiary.cgi"

<Directory "/opt/aidiary">
    Options +ExecCGI
    Require all granted
</Directory>

Alias "/diary/" "/var/www/example.com/diary/"

<Directory "/var/www/example.com/diary">
    Options -Indexes
    Require all granted
</Directory>
```

The exact CGI path format must be validated during the prototype because `PATH_INFO` handling varies with server configuration.

## 5. Configuration

Proposed `config.toml`:

```toml
[site]
title = "Developer's Diary"
base_url = "https://example.com/diary"
language = "ja"
timezone = "Asia/Tokyo"

[paths]
content = "/opt/aidiary/content"
public = "/var/www/example.com/diary"
staging = "/opt/aidiary/staging"
data = "/opt/aidiary/data"
theme = "/opt/aidiary/themes/default"

[auth]
write_token_file = "/opt/aidiary/secrets/write.token"
publish_token_file = "/opt/aidiary/secrets/publish.token"

[render]
feed_type = "rss"
entries_per_page = 20
allow_raw_html = false

[referrers]
enabled = true
log_file = "/var/log/apache2/aidiary-access.log"
internal_hosts = ["example.com", "www.example.com"]
bot_patterns = ["bot", "crawler", "spider"]
```

Environment variables may override selected settings. Secrets should not be stored directly in the main configuration committed to Git.

## 6. Data Model

### 6.1 Entry

```python
@dataclass(frozen=True)
class Entry:
    title: str
    date: date
    slug: str
    tags: tuple[str, ...]
    status: Literal["draft", "published"]
    markdown: str
    summary: str | None
    created_at: datetime
    updated_at: datetime
```

### 6.2 Stable identity

Recommended source path:

```text
content/2026/07/2026-07-22-why-web-diaries-return.md
```

Recommended canonical ID:

```text
2026-07-22/why-web-diaries-return
```

### 6.3 Front matter

```yaml
---
id: 2026-07-22/why-web-diaries-return
title: Why web diaries return in the AI era
date: 2026-07-22
slug: why-web-diaries-return
tags:
  - ai
  - personal-web
status: published
summary: A discussion of why AI creates a new need for public web diaries.
created_at: 2026-07-22T18:00:00+09:00
updated_at: 2026-07-22T18:30:00+09:00
---
```

## 7. API Design

Base path:

```text
/cgi-bin/aidiary.cgi
```

### 7.1 Create entry

```http
POST /entries
Authorization: Bearer <write-token>
Content-Type: application/json
```

```json
{
  "title": "AI時代にWeb日記が必要になる理由",
  "date": "2026-07-22",
  "slug": "why-web-diaries-return",
  "tags": ["AI", "Web日記"],
  "markdown": "本文",
  "summary": "概要",
  "status": "draft",
  "request_id": "chat-20260722-001"
}
```

Rules:

- server defaults status to `draft`
- duplicate `request_id` shall not create a duplicate entry
- slug may be supplied or generated
- arbitrary paths are prohibited

### 7.2 Get entry

```http
GET /entries/{id}
Authorization: Bearer <write-token>
```

Returns source Markdown and metadata.

### 7.3 Update entry

```http
PUT /entries/{id}
Authorization: Bearer <write-token>
Content-Type: application/json
```

A full replacement is simpler and safer than JSON Patch for the MVP. Optimistic concurrency should use `updated_at` or a revision hash.

### 7.4 Publish

```http
POST /entries/{id}/publish
Authorization: Bearer <publish-token>
```

Publication sequence:

1. acquire publication lock
2. validate source
3. mark entry published
4. write Markdown atomically
5. build into staging
6. validate generated output
7. atomically activate output
8. release lock

### 7.5 Unpublish

```http
POST /entries/{id}/unpublish
Authorization: Bearer <publish-token>
```

The source remains present. Generated public files and indexes are rebuilt without the entry.

### 7.6 Context export

```http
GET /context?tags=aidiary,ai&limit=10&order=asc
Authorization: Bearer <write-token>
Accept: text/markdown
```

### 7.7 OpenAPI

```http
GET /openapi.json
```

The document shall define Bearer authentication, schemas, response codes, request limits, and descriptions suitable for AI clients.

## 8. Authentication and Authorization

Two-token model:

- write token: create, read source, and update drafts
- publish token: publish and unpublish

A single-token configuration may be allowed for simple deployments.

Authentication algorithm:

1. read `HTTP_AUTHORIZATION`
2. require `Bearer ` prefix
3. reject missing or oversized credentials
4. load configured token securely
5. compare using `secrets.compare_digest`
6. return `401` without revealing details

The AI client shall not receive shell execution, arbitrary file access, arbitrary path selection, configuration editing, token retrieval, or remote deletion.

## 9. File Safety

### 9.1 Atomic Markdown write

```text
write target.md.tmp
fsync
os.replace(target.md.tmp, target.md)
```

### 9.2 Locking

Use `fcntl.flock()` on Unix for individual entry writes and full publication rebuilds. A lock timeout shall return a retryable error.

### 9.3 Static output activation

```text
staging/build-<revision>/
        |
        | complete build and validation
        v
atomic symlink switch or directory rename
        |
        v
public/current/
```

Where deployment constraints prevent symlinks, replace files individually only after a complete staging build.

## 10. Rendering

### 10.1 Markdown

- CommonMark-compatible
- fenced code blocks
- optional tables
- safe escaping
- raw HTML disabled by default

### 10.2 Templates

Required templates:

- entry
- home
- archive
- tag
- feed

No plugin API in MVP.

### 10.3 Permalinks

Recommended:

```text
/diary/2026/07/22/why-web-diaries-return/index.html
```

### 10.4 Rebuild scope

The MVP may rebuild the complete site on publication. Later optimization may rebuild only the changed article, home page, affected archives, affected tags, feed, and search index.

## 11. Today's Referrers

### 11.1 Apache log format

```apache
LogFormat "%{%Y-%m-%dT%H:%M:%S%z}t\t%U\t%{Referer}i\t%a\t%{User-Agent}i" aidiary
CustomLog "/var/log/apache2/aidiary-access.log" aidiary
```

### 11.2 Storage

```text
data/referrers/2026/07/22.json
```

```json
{
  "/diary/2026/07/22/example/": [
    {
      "referrer": "https://example.net/article",
      "count": 4
    },
    {
      "referrer": "https://www.google.com/",
      "count": 2
    }
  ]
}
```

### 11.3 Rendering options

1. include referrer data during periodic static rebuild
2. publish static JSON and load it client-side

Option 2 allows referrers to change without rebuilding article HTML while article reading remains independent of CGI.

## 12. Knowledge Layer Design

The future knowledge layer shall derive views from diary entries.

### 12.1 Tags

Tags are author-facing labels and may vary over time.

### 12.2 Topics

Topics are stable identifiers used to follow an idea across time.

```yaml
tags:
  - ChatGPT
  - Web日記
topics:
  - aidiary
  - public-thinking
```

### 12.3 Thought timeline

```text
2026-07-20: Considered tDiary and existing CMS products
2026-07-21: Decided existing CMS products were too heavy
2026-07-22: Selected Python CGI and static HTML
2026-07-23: Added a derived knowledge layer to the roadmap
```

### 12.4 Current-state summary

An AI-generated current view shall include:

- current conclusion
- major changes
- rejected approaches
- unresolved questions
- source diary links
- generation timestamp

This summary is disposable and shall never replace diary sources.

## 13. Error Handling

```json
{
  "error": {
    "code": "invalid_slug",
    "message": "The supplied slug is invalid."
  }
}
```

Expected status codes:

- `200` successful read or update
- `201` created
- `400` invalid request
- `401` missing or invalid token
- `404` entry not found
- `409` duplicate or revision conflict
- `413` request too large
- `422` valid JSON with invalid content
- `500` internal failure
- `503` lock or temporary build failure

## 14. Testing Strategy

### Unit tests

- front matter parsing
- slug validation
- path generation
- token validation
- Markdown rendering
- archive generation
- feed generation
- referrer normalization
- context filtering

### Integration tests

- simulated CGI environment
- create → update → publish
- interrupted build preserves old public site
- concurrent update handling
- OpenAPI schema validation
- ChatGPT Action-compatible requests

### Security tests

- path traversal attempts
- malformed authorization headers
- oversized requests
- HTML injection in metadata
- duplicate request IDs
- symlink attacks in writable directories

## 15. Architectural Boundaries

- AI clients create content; aiDiary validates and stores it.
- Markdown is primary; HTML is generated.
- Diary entries are historical sources; knowledge summaries are derived.
- Referrer data is observational metadata; it is not embedded in source Markdown.
- Public reading must not execute Python.
- A convenience feature must not introduce a mandatory database or daemon.
