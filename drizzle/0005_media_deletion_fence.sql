-- Apply through Sites migrations; do not reset an existing hosted database.
ALTER TABLE media_assets ADD COLUMN deletion_claim TEXT;
ALTER TABLE media_assets ADD COLUMN deletion_claimed_at INTEGER;

CREATE TRIGGER IF NOT EXISTS block_revision_during_media_deletion
BEFORE INSERT ON entry_revisions
WHEN EXISTS (
 SELECT 1 FROM media_assets m
 WHERE m.entry_id=NEW.entry_id AND m.deletion_claim IS NOT NULL
 AND (instr(NEW.body_md,'/media/'||m.id)>0 OR NEW.hero_media_id=m.id)
)
BEGIN
 SELECT RAISE(ABORT,'media_deletion_in_progress');
END;

CREATE TRIGGER IF NOT EXISTS block_publication_during_media_deletion
BEFORE UPDATE OF status,latest_revision,published_revision ON entries
WHEN NEW.status='published' AND NEW.published_revision IS NOT NULL
 AND EXISTS (
  SELECT 1 FROM media_assets m
  JOIN entry_revisions r ON r.entry_id=NEW.id AND r.revision=NEW.latest_revision
  WHERE m.entry_id=NEW.id AND m.deletion_claim IS NOT NULL
  AND (instr(r.body_md,'/media/'||m.id)>0 OR r.hero_media_id=m.id)
 )
BEGIN
 SELECT RAISE(ABORT,'media_deletion_in_progress');
END;
