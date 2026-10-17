import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {DatabaseSync} from "node:sqlite";
import {deleteMedia,ownerArticleMedia} from "../lib/media-deletion.ts";
const mediaId="0039655a-516c-4416-abba-9e570d0e4a31";
const otherId="1039655a-516c-4416-abba-9e570d0e4a31";
const entryId="37799b00-3526-4083-ae3b-66b89aaf4281";
const key="entries/"+entryId+"/"+mediaId;

function fixture(){
 const sqlite=new DatabaseSync(":memory:");
 sqlite.exec("PRAGMA foreign_keys=ON");
 for(const n of ["0000_initial","0002_article_access","0003_media"])
   sqlite.exec(readFileSync(new URL("../drizzle/"+n+".sql",import.meta.url),"utf8"));
 sqlite.prepare("INSERT INTO entries(id,slug,status,visibility,latest_revision,published_revision,created_at,updated_at) VALUES(?,?,'published','owner',2,1,'now','now')")
  .run(entryId,"fixture");
 sqlite.prepare("INSERT INTO entry_revisions(entry_id,revision,title,body_md,summary,tags_json,saved_at) VALUES(?,?,?, ?,NULL,'[]','now')")
  .run(entryId,1,"published","![793.jpg](/media/"+mediaId+")");
 sqlite.prepare("INSERT INTO entry_revisions(entry_id,revision,title,body_md,summary,tags_json,saved_at) VALUES(?,?,?, ?,NULL,'[]','now')")
  .run(entryId,2,"new draft","Updated article without image");
 sqlite.prepare("INSERT INTO media_assets(id,entry_id,storage_key,content_type,byte_size,original_name,created_at) VALUES(?,?,?,?,?,?,?)")
  .run(mediaId,entryId,key,"image/jpeg",128,"793.jpg","now");
 const db={
  prepare(sql){return {bind(...args){
   return {first(){return sqlite.prepare(sql).get(...args)||null},
     all(){return {results:sqlite.prepare(sql).all(...args)}},
     run(){return sqlite.prepare(sql).run(...args)}};
  }}}
 };
 const bytes=new Set([key]);let fail=false;const events=[];
 const r2={
  async delete(name){events.push("delete");if(fail)throw new Error("R2 down");bytes.delete(name);},
  async head(name){events.push("head");return bytes.has(name)?{}:null;}
 };
 return {sqlite,db,r2,bytes,events,setFail(v){fail=v}};
}
test("active published revision blocks deleting its file, even if owner-only",async()=>{
 const f=fixture();try{
  await assert.rejects(()=>deleteMedia(f.db,f.r2,mediaId,entryId),e=>e.code==="media_in_published_revision"&&e.status===409);
  assert.deepEqual(f.events,[]);
  assert.equal(f.sqlite.prepare("SELECT count(*) AS n FROM media_assets").get().n,1);
 }finally{f.sqlite.close();}
});
test("after publishing a new revision without image, R2 and D1 are both deleted",async()=>{
 const f=fixture();try{
  f.sqlite.prepare("UPDATE entries SET published_revision=2 WHERE id=?").run(entryId);
  const list=await ownerArticleMedia(f.db,entryId);
  assert.equal(list.assets.length,1);
  assert.equal(list.assets[0].in_published_revision,false);
  assert.deepEqual(await deleteMedia(f.db,f.r2,mediaId,entryId),{media_id:mediaId,entry_id:entryId,deleted:true});
  assert.deepEqual(f.events,["delete","head"]);
  assert.equal(f.bytes.has(key),false);
  assert.equal(f.sqlite.prepare("SELECT count(*) AS n FROM media_assets").get().n,0);
  assert.equal(f.sqlite.prepare("SELECT count(*) AS n FROM entry_revisions").get().n,2);
  assert.equal((await ownerArticleMedia(f.db,entryId)).assets.length,0);
  assert.deepEqual(await deleteMedia(f.db,f.r2,mediaId),{media_id:mediaId,deleted:false});
 }finally{f.sqlite.close();}
});
test("R2 deletion failure retains D1 metadata for retry",async()=>{
 const f=fixture();try{
  f.sqlite.prepare("UPDATE entries SET status='draft',published_revision=NULL WHERE id=?").run(entryId);
  f.setFail(true);
  await assert.rejects(()=>deleteMedia(f.db,f.r2,mediaId),/R2 down/);
  assert.equal(f.sqlite.prepare("SELECT count(*) AS n FROM media_assets").get().n,1);
  assert.equal(f.bytes.has(key),true);
  f.setFail(false);
  await deleteMedia(f.db,f.r2,mediaId);
  assert.equal(f.bytes.has(key),false);
 }finally{f.sqlite.close();}
});
test("invalid or mismatched IDs cannot delete or probe another article",async()=>{
 const f=fixture();try{
  await assert.rejects(()=>deleteMedia(f.db,f.r2,"../../wrong"),e=>e.status===400);
  await assert.rejects(()=>deleteMedia(f.db,f.r2,mediaId,otherId),e=>e.status===404);
  assert.equal(f.bytes.has(key),true);
  assert.deepEqual(f.events,[]);
 }finally{f.sqlite.close();}
});
