-- Uploaded media remains private by default and is served only through an
-- authenticated/authorized media route. Never expose the R2 bucket directly.
CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES entries(id),
  storage_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size > 0),
  original_name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_media_entry ON media_assets(entry_id);
