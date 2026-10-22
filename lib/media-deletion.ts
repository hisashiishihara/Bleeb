import { DiaryError, entryId } from "./input.ts";
import { MEDIA_ID_RE, revisionReferencesMedia } from "./media-rules.ts";

export type AssetSummary = {
 id:string;entry_id:string;storage_key:string;content_type:string;byte_size:number;
 original_name:string;created_at:string;
};

/** Owner operations must authorize the request *before* calling this function.
 * Preserve append-only article revisions; only the R2 bytes and media index are destroyed.
 */
export async function deleteMedia(
 db:D1Database, storage:R2Bucket, mediaId:string, expectedEntryId?:string
):Promise<{media_id:string;entry_id?:string;deleted:boolean}>{
 if(!MEDIA_ID_RE.test(mediaId))throw new DiaryError("invalid_media_id","Invalid media ID",400);
 if(expectedEntryId!==undefined)entryId(expectedEntryId);
 const media=await db.prepare(
  "SELECT id,entry_id,storage_key FROM media_assets WHERE id=?"
 ).bind(mediaId).first<Pick<AssetSummary,"id"|"entry_id"|"storage_key">>();
 if(!media)return {media_id:mediaId,deleted:false};
 if(expectedEntryId!==undefined && media.entry_id!==expectedEntryId)
  throw new DiaryError("not_found","Media not found in the selected article",404);

 // D1 claim prevents another request publishing the object during R2 deletion.
 // The migration's triggers reject new article revisions referencing the claim.
 const claim=crypto.randomUUID();
 await db.prepare(
  "UPDATE media_assets SET deletion_claim=?,deletion_claimed_at=unixepoch('now') "+
  "WHERE id=? AND (deletion_claim IS NULL OR deletion_claimed_at<unixepoch('now')-900) "+
  "AND NOT EXISTS (SELECT 1 FROM entries e JOIN entry_revisions r "+
  "ON r.entry_id=e.id AND r.revision=e.latest_revision "+
  "WHERE e.id=media_assets.entry_id AND e.status='published' AND e.published_revision IS NOT NULL "+
  "AND (instr(r.body_md,'/media/'||media_assets.id)>0 OR r.hero_media_id=media_assets.id))"
 ).bind(claim,mediaId).run();
 const held=await db.prepare("SELECT deletion_claim FROM media_assets WHERE id=?")
  .bind(mediaId).first<{deletion_claim:string|null}>();
 if(held?.deletion_claim!==claim){
  const active=await db.prepare(
   "SELECT r.body_md,r.hero_media_id FROM entries e JOIN entry_revisions r "+
   "ON r.entry_id=e.id AND r.revision=e.latest_revision "+
   "WHERE e.id=? AND e.status='published' AND e.published_revision IS NOT NULL"
  ).bind(media.entry_id).first<{body_md:string;hero_media_id:string|null}>();
  if(revisionReferencesMedia(active,mediaId))
   throw new DiaryError("media_in_published_revision",
    "Remove this file from the published article revision before deleting",409);
  throw new DiaryError("media_delete_in_progress","Media deletion is already in progress",409);
 }
 // R2 cannot participate in a D1 transaction: remove metadata only when
 // the object is confirmed absent. An ambiguous failure retains the claim.
 try{
  await storage.delete(media.storage_key);
  if(await storage.head(media.storage_key))
   throw new DiaryError("media_delete_incomplete","Storage still contains the file",503);
 }catch(error){
  try{
   if(await storage.head(media.storage_key))
    await db.prepare("UPDATE media_assets SET deletion_claim=NULL,deletion_claimed_at=NULL "+
      "WHERE id=? AND deletion_claim=?").bind(mediaId,claim).run();
  }catch{}
  throw error;
 }
 await db.prepare("DELETE FROM media_assets WHERE id=? AND deletion_claim=?")
  .bind(mediaId,claim).run();
 const survivor=await db.prepare("SELECT id FROM media_assets WHERE id=?").bind(mediaId).first<{id:string}>();
 if(survivor)throw new DiaryError("media_delete_incomplete","Media metadata cleanup failed; retry later",503);
 return {media_id:mediaId,entry_id:media.entry_id,deleted:true};
}

export async function ownerArticleMedia(db:D1Database,articleId:string){
 entryId(articleId);
 const article=await db.prepare("SELECT id,latest_revision,published_revision,status FROM entries WHERE id=?")
  .bind(articleId).first<{id:string;latest_revision:number;published_revision:number|null;status:string}>();
 if(!article)throw new DiaryError("not_found","Article not found",404);
 const rows=await db.prepare(
  "SELECT id,entry_id,storage_key,content_type,byte_size,original_name,created_at "+
  "FROM media_assets WHERE entry_id=? ORDER BY created_at DESC,id DESC"
 ).bind(articleId).all<AssetSummary>();
 const active=article.status==="published" && article.published_revision!==null
  ?await db.prepare("SELECT body_md,hero_media_id FROM entry_revisions WHERE entry_id=? AND revision=?")
    .bind(articleId,article.latest_revision).first<{body_md:string;hero_media_id:string|null}>()
  :null;
 return {entry:article,assets:rows.results.map(row=>({
  id:row.id,content_type:row.content_type,byte_size:row.byte_size,
  original_name:row.original_name,created_at:row.created_at,
  in_published_revision:revisionReferencesMedia(active,row.id)
 }))};
}
