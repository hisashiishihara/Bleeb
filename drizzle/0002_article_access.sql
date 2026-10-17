-- Existing articles deliberately become owner-only. Preserve all revisions.
ALTER TABLE entries ADD COLUMN visibility TEXT NOT NULL DEFAULT 'owner'
  CHECK (visibility IN ('owner','paid','registered','public'));

CREATE TABLE members (
  user_id TEXT PRIMARY KEY,
  registered_at TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'registered' CHECK (tier IN ('registered','paid')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  paid_active INTEGER NOT NULL DEFAULT 0 CHECK (paid_active IN (0,1)),
  paid_until TEXT,
  updated_at TEXT NOT NULL
);
