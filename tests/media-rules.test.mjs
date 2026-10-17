import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  matchesSignature,validMediaType,mediaMaxBytes,mediaMarkdown,referencesMedia,parseByteRange,
  IMAGE_MAX_BYTES,VIDEO_MAX_BYTES,MEDIA_ID_RE
} from "../lib/media-rules.ts";
const asset="550e8400-e29b-41d4-a716-446655440000";
const bytes=(...nums)=>new Uint8Array(nums);
test("images and videos allow only conservative MIME types backed by magic bytes",()=>{
 assert.equal(validMediaType("image/svg+xml"),false);
 assert.equal(validMediaType("text/html"),false);
 assert.equal(validMediaType("image/png"),true);
 assert.equal(validMediaType("video/mp4"),true);
 assert.equal(matchesSignature("image/png",bytes(137,80,78,71,13,10,26,10)),true);
 assert.equal(matchesSignature("image/jpeg",bytes(255,216,255)),true);
 assert.equal(matchesSignature("image/gif",new TextEncoder().encode("GIF89a")),true);
 assert.equal(matchesSignature("image/webp",new TextEncoder().encode("RIFFxxxxWEBP")),true);
 assert.equal(matchesSignature("video/mp4",bytes(0,0,0,32,102,116,121,112,105,115,111,109)),true);
 assert.equal(matchesSignature("video/webm",bytes(0x1a,0x45,0xdf,0xa3)),true);
 assert.equal(matchesSignature("image/png",new TextEncoder().encode("<script>")),false);
 assert.equal(matchesSignature("video/mp4",new TextEncoder().encode("<html></html>")),false);
 assert.equal(mediaMaxBytes("image/png"),IMAGE_MAX_BYTES);
 assert.equal(mediaMaxBytes("video/webm"),VIDEO_MAX_BYTES);
});
test("safe Markdown embeds and public references require canonical identifiers",()=>{
 assert.equal(MEDIA_ID_RE.test(asset),true);
 assert.equal(MEDIA_ID_RE.test("../../../etc/passwd"),false);
 assert.equal(mediaMarkdown(asset,"photo.png","image/png"),"![photo.png](/media/"+asset+")");
 assert.equal(mediaMarkdown(asset,"video.mp4","video/mp4"),"![video:video.mp4](/media/"+asset+")");
 assert.equal(referencesMedia("![x](/media/"+asset+")",asset),true);
 assert.equal(referencesMedia("![x](/media/"+asset+")","not-id"),false);
 assert.equal(referencesMedia("![x](/media/"+asset+")","f50e8400-e29b-41d4-a716-446655440000"),false);
});
test("single bounded byte ranges for HTML5 video",()=>{
 assert.deepEqual(parseByteRange(null,100),null);
 assert.deepEqual(parseByteRange("bytes=0-9",100),{start:0,end:9});
 assert.deepEqual(parseByteRange("bytes=20-",100),{start:20,end:99});
 assert.deepEqual(parseByteRange("bytes=-10",100),{start:90,end:99});
 assert.deepEqual(parseByteRange("bytes=50-999",100),{start:50,end:99});
 for(const bad of ["bytes=50-10","bytes=100-101","bytes=0-1,9-11","bogus","bytes=-0"]){
   assert.equal(parseByteRange(bad,100),false);
 }
});
test("media SQL keeps asset ownership and old published revision intact",()=>{
 const sql0=readFileSync(new URL("../drizzle/0000_initial.sql",import.meta.url),"utf8");
 const sql2=readFileSync(new URL("../drizzle/0002_article_access.sql",import.meta.url),"utf8");
 const sql3=readFileSync(new URL("../drizzle/0003_media.sql",import.meta.url),"utf8");
 const sql4=readFileSync(new URL("../drizzle/0004_hero_media.sql",import.meta.url),"utf8");
 const d=new DatabaseSync(":memory:");
 try{
  d.exec(sql0+"\n"+sql2+"\n"+sql3+"\n"+sql4);
  d.exec(`INSERT INTO entries(id,slug,status,visibility,latest_revision,published_revision,created_at,updated_at) VALUES('e1','abc','published','public',2,1,'t','t');
    INSERT INTO entry_revisions(entry_id,revision,title,body_md,summary,tags_json,saved_at) VALUES('e1',1,'Live','![a](/media/${asset})',NULL,'[]','t');
    INSERT INTO entry_revisions(entry_id,revision,title,body_md,summary,tags_json,saved_at) VALUES('e1',2,'Private','![a](/media/111e8400-e29b-41d4-a716-446655440000)',NULL,'[]','t');
    INSERT INTO media_assets VALUES('${asset}','e1','entries/e1/${asset}','image/png',8,'photo.png','t');`);
  const data=d.prepare("SELECT e.status,e.visibility,r.body_md FROM entries e JOIN entry_revisions r ON r.entry_id=e.id AND r.revision=e.published_revision").get();
  assert.equal(referencesMedia(data.body_md,asset),true);
  assert.equal(data.body_md.includes("111e8400"),false);
  assert.throws(()=>d.prepare("INSERT INTO media_assets VALUES('x','nonexistent','key','image/png',8,'file','t')").run());
 }finally{d.close();}
});
