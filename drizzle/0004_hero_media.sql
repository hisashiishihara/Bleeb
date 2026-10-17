-- Non-destructive, per-revision hero image and alt text.
ALTER TABLE entry_revisions ADD COLUMN hero_media_id TEXT;
ALTER TABLE entry_revisions ADD COLUMN hero_alt_text TEXT;
CREATE INDEX IF NOT EXISTS idx_entry_revisions_hero_media ON entry_revisions(hero_media_id);
