
# aiDiary Roadmap

## Product Goal

Build the smallest practical tool that lets an AI client turn a long conversation into durable public writing on an existing website.

The first release succeeds when a user can say:

> Turn this conversation into a draft, save it, revise it, and publish it.

The result must be stored as Markdown, published as static HTML, listed in archives and a feed, and served without a database or running application.

## Phase 0 — Project Foundation

### Deliverables

- `README.md`
- `docs/REQUIREMENTS.md`
- `docs/DESIGN.md`
- `docs/ROADMAP.md`
- `LICENSE` using BSD-3-Clause
- contribution guide
- minimal issue templates
- initial architecture decision records

### Key decisions

- Python 3.12+
- Apache CGI as the primary deployment
- Markdown as the source of truth
- static HTML for all public reads
- no database
- no daemon
- no built-in AI
- no remote delete endpoint in MVP

### Exit criteria

- repository can be understood without reading implementation code
- MVP scope and non-goals are explicit
- BSD-3-Clause license is present

## Phase 1 — Local Markdown Publisher

### Goals

Prove Markdown storage and static publishing before adding HTTP or AI integration.

### Features

- load configuration
- create an entry from a local command
- parse YAML front matter
- render Markdown
- generate article page
- generate home page
- generate year and month archives
- generate tag archives
- generate RSS or Atom
- rebuild the full site
- publish through staging and atomic activation

### Suggested commands

```text
aidiary build
aidiary new --date 2026-07-22 --title "Example"
aidiary validate
```

### Exit criteria

- sample site builds from only Markdown files
- deleting generated HTML and rebuilding produces equivalent output
- a failed build leaves the old site intact
- no database or background service exists

## Phase 2 — CGI API

### Goals

Expose the publisher safely through ordinary CGI.

### Features

- CGI request parsing without the removed Python `cgi` module
- method and path routing
- JSON request and response handling
- body size limits
- safe error responses
- Bearer authentication
- create entry
- get entry source
- update entry
- publish
- unpublish
- list entries
- idempotency through `request_id`
- optimistic concurrency using revision hashes
- OpenAPI document

### Exit criteria

- API can be exercised with `curl`
- public reads remain pure static files
- invalid tokens cannot modify content
- path traversal and arbitrary filesystem access are impossible
- publication remains atomic

## Phase 3 — ChatGPT Actions Integration

### Goals

Make ChatGPT the editor and administration interface.

### Deliverables

- example Custom GPT instructions
- ChatGPT Actions-compatible OpenAPI example
- setup documentation
- safe workflow prompts
- draft-first publishing behavior
- examples for create, revise, rename, publish, unpublish, and context retrieval

### Exit criteria

- an ordinary user can configure a custom GPT without modifying aiDiary code
- ChatGPT can create, revise, and publish an entry
- ChatGPT cannot delete files or edit configuration
- secrets are not exposed to generated pages or logs

## Phase 4 — Today's Referrers

### Goals

Restore the useful feedback loop of classic web diaries without building a social network.

### Features

- documented Apache log format
- log parser
- internal-referrer exclusion
- bot filtering
- per-entry, per-day aggregation
- static JSON output
- optional article display
- manual rebuild command
- optional cron example

### Non-goals

- user tracking
- fingerprinting
- ad attribution
- invasive analytics
- guaranteed search keywords

### Exit criteria

- external referrers appear for each article
- missing logs do not break publishing
- referrer collection remains independent from Markdown
- public article loading does not require CGI execution

## Phase 5 — Packaging and Portability

### Goals

Reduce installation friction for existing websites.

### Features

- `.pyz` distribution
- tiny CGI launcher
- example Apache configuration
- installation checker
- file permission diagnostics
- example shared-hosting deployment
- backup and restore guide
- upgrade procedure with no content migration

### Possible secondary targets

- Nginx with `fcgiwrap`
- lighttpd CGI
- command-only static generation
- direct Git publishing hook

### Exit criteria

- a fresh Apache host can install aiDiary by copying files and editing one config
- no global `pip install` is required for packaged releases
- upgrades never require importing content into a database

## Phase 6 — Search and Context Export

### Goals

Make the diary useful as a bridge between separate AI conversations.

### Features

- static JSON search index
- tag filtering
- date filtering
- context export endpoint
- Markdown and JSON context formats
- configurable output size
- source links in exported context
- chronological and reverse chronological modes

### Exit criteria

- a new AI conversation can retrieve relevant past entries by tag and date
- context export does not require embeddings or a vector database
- all indexes can be deleted and regenerated

## Phase 7 — Thought Timeline

### Goals

Add a derived knowledge layer without turning aiDiary into a wiki or knowledge graph product.

### Features

- stable `topics` metadata
- topic archive pages
- chronological timeline generation
- AI-assisted extraction of major decisions, changes in opinion, rejected alternatives, reasons for changes, and unresolved questions
- current-state summaries
- mandatory source-entry links
- generation timestamps
- manual review before publication

### Data principle

```text
Diary entries       = primary evidence
Tag and topic pages  = generated indexes
Thought timelines    = generated interpretation
Current summaries    = disposable AI output
```

### Exit criteria

- users can see how an idea evolved over time
- generated summaries never modify original entries
- all knowledge-layer data can be regenerated from diary sources
- contradictions are presented as changes, not silently resolved

## Phase 8 — Open Web Feedback

### Goals

Support public reaction without becoming a centralized social platform.

### Candidate features

- Webmention receiving and display
- outgoing Webmention
- IndieWeb-compatible metadata
- improved RSS or Atom discovery
- optional lightweight reactions
- backlinks between aiDiary sites
- optional Search Console import

### Explicit exclusions

- central user accounts
- global timeline
- follower counts
- ranking
- recommendation algorithm
- engagement optimization

### Exit criteria

- external responses can return to the author's own site
- users remain owners of their domains and content
- feedback features remain optional and removable

## Phase 9 — Ecosystem, Only If Needed

This phase should begin only after real external use demonstrates demand.

Possible work:

- additional themes
- importers from tDiary, Markdown blogs, or Evernote exports
- Rust implementation of selected performance-sensitive tools
- PHP CGI-compatible implementation
- migration tools
- reusable library extraction
- multi-language documentation

Avoid creating:

- a plugin marketplace
- a hosted SaaS dependency
- a database-backed enterprise edition
- features added only to match general CMS products

## Release Plan

### v0.1.0

- Markdown repository
- static renderer
- home, entry, archive, tag, and feed generation
- local rebuild
- BSD-3-Clause license

### v0.2.0

- CGI API
- Bearer authentication
- create, read, update, publish, unpublish
- OpenAPI document

### v0.3.0

- ChatGPT Actions example
- context export
- packaged `.pyz`

### v0.4.0

- Today's Referrers
- static referrer data
- filtering and Apache examples

### v0.5.0

- static search
- topic metadata
- first Thought Timeline prototype

### v1.0.0

A stable release requires:

- documented upgrade policy
- stable Markdown format
- stable API versioning
- reproducible site rebuild
- safe atomic publishing
- tested Apache deployment
- ChatGPT Actions compatibility
- referrer support
- import and backup documentation

## Contribution Priorities

Good first contributions:

- additional tests
- templates
- documentation corrections
- Apache deployment examples
- importers
- localization
- accessibility improvements

Changes requiring strong justification:

- database support
- daemon mode
- built-in user management
- plugin framework
- embedded LLM
- JavaScript-heavy administration UI

## Project Guardrail

Before accepting a feature, ask:

1. Does it help convert thought into durable public writing?
2. Can it remain optional?
3. Can all primary data remain plain Markdown?
4. Can published pages remain readable without Python?
5. Does it preserve installation simplicity?
6. Would a separate tool be a better home for this feature?

If the answer to these questions is mostly no, the feature does not belong in aiDiary.
