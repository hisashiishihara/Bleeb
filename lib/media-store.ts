import { env } from "cloudflare:workers";
import { DiaryError } from "./input";
import { mediaMaxBytes, matchesSignature, validMediaType, type MediaType, referencesMedia } from "./media-rules";

export type MediaRow={
  id:string;entry_id:string;storage_key:string;content_type:MediaType;
  byte_size:number;original_name:string;created_at:string;
};
export function bucket():R2Bucket {
 const b=(env as unknown as {MEDIA?:R2Bucket}).MEDIA;
 if(!b)throw new DiaryError("media_unavailable","R2 MEDIA binding not configured",503);
 return b;
}
export async function createMedia(db:D1Database,store:R2Bucket,entryId:string,file:File) {
 if(!file||!validMediaType(file.type))throw new DiaryError("invalid_media","Unsupported image/video type",400);
 if(!file.size||file.size>mediaMaxBytes(file.type))throw new DiaryError("media_too_large","File exceeds current upload limit",413);
 const prefix=new Uint8Array(await file.slice(0,32).arrayBuffer());
 if(!matchesSignature(file.type,prefix))throw new DiaryError("invalid_media","File signature does not match its type",400);
 const owner=await db.prepare("SELECT id FROM entries WHERE id=?").bind(entryId).first<{id:string}>();
 if(!owner)throw new DiaryError("not_found","Entry not found",404);
 const id=crypto.randomUUID();
 const key="entries/"+entryId+"/"+id;
 const name=(file.name||"media").slice(0,180).replace(/[\u0000-\u001f\u007f]/g,"_");
 await store.put(key,file,{httpMetadata:{contentType:file.type}});
 try{
   await db.prepare("INSERT INTO media_assets(id,entry_id,storage_key,content_type,byte_size,original_name,created_at) VALUES(?,?,?,?,?,?,?)")
     .bind(id,entryId,key,file.type,file.size,name,new Date().toISOString()).run();
 }catch(e){
   await store.delete(key).catch(()=>{});
   throw e;
 }
 return {id,entry_id:entryId,url:"/media/"+id,content_type:file.type,byte_size:file.size,
  markdown:"!["+(file.type.startsWith("video/")?"video:":"")+name.replace(/[\[\]\\\n\r]/g," ").slice(0,90)+"](/media/"+id+")"};
}
export async function readableMedia(db:D1Database,id:string,owner:boolean):Promise<MediaRow|null> {
 const asset=await db.prepare("SELECT * FROM media_assets WHERE id=?").bind(id).first<MediaRow>();
 if(!asset)return null;
 if(owner)return asset;
 const published=await db.prepare(
   "SELECT r.body_md,r.hero_media_id FROM entries e JOIN entry_revisions r ON r.entry_id=e.id AND r.revision=e.published_revision "+
   "WHERE e.id=? AND e.status='published' AND e.visibility='public' AND e.published_revision IS NOT NULL"
 ).bind(asset.entry_id).first<{body_md:string;hero_media_id:string|null}>();
 return published&&(published.hero_media_id===id||referencesMedia(published.body_md,id))?asset:null;
}
