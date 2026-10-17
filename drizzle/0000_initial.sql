-- Applied by ChatGPT Sites hosting. Do not seed real content.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS entries (
 id TEXT PRIMARY KEY,
 slug TEXT NOT NULL UNIQUE,
 status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
 latest_revision INTEGER NOT NULL CHECK (latest_revision >= 1),
 published_revision INTEGER,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 published_at TEXT,
 CHECK (published_revision IS NULL OR published_revision > 0),
 CHECK (status = 'published' OR published_revision IS NULL),
 CHECK (status = 'draft' OR published_revision IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS entry_revisions (
 entry_id TEXT NOT NULL REFERENCES entries(id),
 revision INTEGER NOT NULL CHECK (revision >= 1),
 title TEXT NOT NULL,
 body_md TEXT NOT NULL,
 summary TEXT,
 tags_json TEXT NOT NULL DEFAULT '[]',
 saved_at TEXT NOT NULL,
 PRIMARY KEY (entry_id,revision)
);

CREATE TABLE IF NOT EXISTS mutation_requests (
 request_id TEXT PRIMARY KEY,
 operation TEXT NOT NULL,
 response_json TEXT NOT NULL,
 created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entries_public ON entries(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_revisions_entry ON entry_revisions(entry_id, revision DESC);
