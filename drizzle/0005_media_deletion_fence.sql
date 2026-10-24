-- Additive migration: preserve all existing media, articles and revisions.
-- Intents are permanent even after the asset/article is deleted: no foreign key
-- or cascade, no lease expiry. An uncertain R2 DELETE can finish arbitrarily late.
CREATE TABLE media_deletions (
 media_id TEXT PRIMARY KEY,
 entry_id TEXT NOT NULL,
 storage_key TEXT NOT NULL UNIQUE,
 started_at INTEGER NOT NULL
);

CREATE TRIGGER block_revision_during_media_deletion
BEFORE INSERT ON entry_revisions
WHEN EXISTS (
 SELECT 1 FROM media_deletions m
 WHERE instr(NEW.body_md,'/media/'||m.media_id)>0 OR NEW.hero_media_id=m.media_id
)
BEGIN
 SELECT RAISE(ABORT,'media_deletion_in_progress');
END;

CREATE TRIGGER block_revision_update_during_media_deletion
BEFORE UPDATE OF body_md,hero_media_id ON entry_revisions
WHEN EXISTS (
 SELECT 1 FROM media_deletions m
 WHERE instr(NEW.body_md,'/media/'||m.media_id)>0 OR NEW.hero_media_id=m.media_id
)
BEGIN
 SELECT RAISE(ABORT,'media_deletion_in_progress');
END;

CREATE TRIGGER block_publication_during_media_deletion
BEFORE UPDATE OF status,latest_revision,published_revision ON entries
WHEN NEW.status='published' AND NEW.published_revision IS NOT NULL
 AND EXISTS (
  SELECT 1 FROM media_deletions m
  JOIN entry_revisions r ON r.entry_id=NEW.id AND r.revision=NEW.latest_revision
  WHERE instr(r.body_md,'/media/'||m.media_id)>0 OR r.hero_media_id=m.media_id
 )
BEGIN
 SELECT RAISE(ABORT,'media_deletion_in_progress');
END;

-- The canonical media ID and key must never be reused, even after draft deletion.
CREATE TRIGGER block_deleted_media_reuse
BEFORE INSERT ON media_assets
WHEN EXISTS (SELECT 1 FROM media_deletions m WHERE m.media_id=NEW.id OR m.storage_key=NEW.storage_key)
BEGIN
 SELECT RAISE(ABORT,'media_deletion_in_progress');
END;
