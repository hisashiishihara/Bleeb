import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { readableRecentFull } from "../lib/reader-store.ts";
import { parseArchiveFilters,readableArchive,readableArchiveMonths,readableTagCounts } from "../lib/reader-archive.ts";

const anon={owner:false,registered:false,paid:false};
const owner={owner:true,registered:false,paid:false};
const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

function fixture(){
 const sqlite=new DatabaseSync(":memory:");
 for(const name of ["0000_initial","0002_article_access","0003_media","0004_hero_media"])
  sqlite.exec(read("drizzle/"+name+".sql"));
 const db={prepare(sql){return {bind(...args){return {all:async()=>({results:sqlite.prepare(sql).all(...args)}),
  first:async()=>sqlite.prepare(sql).get(...args)??null};},all:async()=>({results:sqlite.prepare(sql).all()})}}};
 function add(id,status,visibility,date,title,body,tags,oldBody="Old version"){
  const rev=status==="draft"?1:2;
  sqlite.prepare("INSERT INTO entries(id,slug,status,visibility,latest_revision,published_revision,created_at,updated_at,published_at) VALUES(?,?,?,?,?,?, ?,?,?)")
    .run(id,"article-"+id,status,visibility,rev,status==="published"?1:null,date,date,date);
  sqlite.prepare("INSERT INTO entry_revisions(entry_id,revision,title,body_md,summary,tags_json,saved_at) VALUES(?,1,?,?,?,?,?)")
    .run(id,"Older "+title,oldBody,"old summary","[]",date);
  if(rev===2)sqlite.prepare("INSERT INTO entry_revisions(entry_id,revision,title,body_md,summary,tags_json,saved_at) VALUES(?,2,?,?,?,?,?)")
    .run(id,title,body,"Summary of "+title,JSON.stringify(tags),date);
 }
 add("public1","published","public","2026-10-17T15:30:00Z","Newest science","Rare physics content",["技術","AI"],"unreleased old secret");
 add("public2","published","public","2026-10-17T14:00:00Z","Second thought","About experiments",["思想"]);
 add("owner1","published","owner","2026-10-17T12:00:00Z","Secret owner","Secret owner phrase",["技術","秘密"]);
 add("public3","published","public","2026-09-25T00:00:00Z","Third public","Article from September",["技術"]);
 add("public4","published","public","2026-09-20T00:00:00Z","Fourth public","The oldest visible item",[]);
 add("draft1","draft","owner","2026-10-18T00:00:00Z","Draft hidden","Unpublished confidential body",["秘密"]);
 return {sqlite,db};
}
test("home returns exactly three newest full bodies, sorted for each audience",async()=>{
 const f=fixture();try{
  const visitor=await readableRecentFull(f.db,anon,99);
  assert.equal(visitor.length,3);
  assert.deepEqual(visitor.map(x=>x.slug),["article-public1","article-public2","article-public3"]);
  assert.match(visitor[0].body_md,/Rare physics content/);
  assert.equal(visitor[0].title,"Newest science");
  const authorized=await readableRecentFull(f.db,owner);
  assert.deepEqual(authorized.map(x=>x.slug),["article-public1","article-public2","article-owner1"]);
  assert.ok(!JSON.stringify(authorized).includes("Draft hidden"));
 }finally{f.sqlite.close();}
});
test("Tokyo calendar months filter at UTC midnight and preserve article order",async()=>{
 const f=fixture();try{
  const months=await readableArchiveMonths(f.db,anon);
  assert.deepEqual(months.map(x=>[x.month,x.count]),[["2026-10",2],["2026-09",2]]);
  const october=await readableArchive(f.db,anon,parseArchiveFilters({month:"2026-10"}));
  assert.deepEqual(october.items.map(x=>x.slug),["article-public1","article-public2"]);
  assert.deepEqual((await readableArchiveMonths(f.db,owner)).map(x=>[x.month,x.count]),[["2026-10",3],["2026-09",2]]);
 }finally{f.sqlite.close();}
});
test("tag categories, search and pagination never leak owner or draft content",async()=>{
 const f=fixture();try{
  const tags=await readableTagCounts(f.db,anon);
  assert.deepEqual(tags.map(x=>[x.tag,x.count]),[["技術",2],["AI",1],["思想",1]]);
  const ownerTags=await readableTagCounts(f.db,owner);
  assert.deepEqual(ownerTags.map(x=>[x.tag,x.count]),[["技術",3],["AI",1],["思想",1],["秘密",1]]);
  const tag=await readableArchive(f.db,anon,parseArchiveFilters({tag:"技術"}));
  assert.deepEqual(tag.items.map(x=>x.slug),["article-public1","article-public3"]);
  const secret=await readableArchive(f.db,anon,parseArchiveFilters({q:"Secret owner phrase"}));
  assert.equal(secret.items.length,0);
  const hidden=await readableArchive(f.db,owner,parseArchiveFilters({q:"Unpublished confidential"}));
  assert.equal(hidden.items.length,0);
  const past=await readableArchive(f.db,anon,parseArchiveFilters({q:"unreleased old secret"}));
  assert.equal(past.items.length,0);
  const body=await readableArchive(f.db,anon,parseArchiveFilters({q:"Rare physics"}));
  assert.equal(body.items[0].slug,"article-public1");
  assert.equal((await readableArchive(f.db,anon,parseArchiveFilters({tag:"' OR 1=1 --"}))).items.length,0);
  const page=await readableArchive(f.db,anon,parseArchiveFilters({}),2);
  assert.equal(page.items.length,2);assert.equal(page.hasMore,true);
  const next=await readableArchive(f.db,anon,parseArchiveFilters({offset:"2"}),2);
  assert.deepEqual(next.items.map(x=>x.slug),["article-public3","article-public4"]);
  assert.equal(next.hasMore,false);
 }finally{f.sqlite.close();}
});
test("filter parsing is bounded, and reader pages do not use owner archive",()=>{
 assert.deepEqual(parseArchiveFilters({month:"2026-13",offset:"-1",q:"  hello ",tag:"　AI　"}),
  {q:"hello",month:"",tag:"AI",offset:0});
 assert.equal(parseArchiveFilters({q:"x".repeat(110)}).q.length,100);
 const home=read("app/page.tsx"),archive=read("app/archive/page.tsx"),tags=read("app/tags/page.tsx");
 assert.match(home,/readableRecentFull\(database\(\),await currentViewer\(\),3\)/);
 assert.match(home,/<MediaMarkdown body=\{post\.body_md\}/);
 assert.match(archive,/readableArchive\(db,viewer,filters\)/);
 assert.match(tags,/readableTagCounts\(database\(\),await currentViewer\(\)\)/);
 for(const page of [archive,tags])assert.match(page,/index:false,follow:false/);
 assert.match(read("app/layout.tsx"),/href="\/archive"/);
 assert.match(read("app/layout.tsx"),/href="\/tags"/);
});
