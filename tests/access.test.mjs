import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { register } from "node:module";
// Isolated in-process Sites ingress fixtures; never included in production code.
register("data:text/javascript,"+encodeURIComponent(`export async function resolve(specifier,context,next){
  if(specifier==="cloudflare:workers") return {url:"data:text/javascript,export const env = globalThis.__diaryTestEnv;",shortCircuit:true};
  try{return await next(specifier,context);}catch(error){
    if(specifier.startsWith(".")&&!/\\.[a-z]+$/.test(specifier)) return next(specifier+".ts",context);
    throw error;
  }
}`));
globalThis.__diaryTestEnv={AI_DIARY_OWNER_API_ENABLED:"true",AI_DIARY_OWNER_EMAIL:"owner@example.invalid"};
const store=await import("../lib/store.ts");
const {resolveViewer}=await import("../lib/access.ts");
const {readableEntry,readableEntries}=await import("../lib/reader-store.ts");
const {registerMember,setMembership}=await import("../lib/membership.ts");
const {POST:registration}=await import("../app/api/membership/route.ts");
const {POST:admin}=await import("../app/api/owner/members/route.ts");
const {POST:mcp}=await import("../app/mcp/route.ts");
const {searchOwnerArchive,getOwnerArchiveEntry}=await import("../lib/owner-archive.ts");
const {tools}=await import("../plugin/tool-definitions.ts");
const {POST:ownerApi}=await import("../app/api/owner/[action]/route.ts");
function fixture(){
  const sqlite=new DatabaseSync(":memory:");
  for(const file of ["0000_initial.sql","0001_referrers.sql","0002_article_access.sql"]) sqlite.exec(readFileSync(new URL("../drizzle/"+file,import.meta.url),"utf8"));
  const db={prepare(sql){
    const bind=values=>({bind(...v){return bind(v);},async first(){return sqlite.prepare(sql).get(...values)??null;},async all(){return {results:sqlite.prepare(sql).all(...values)};},async run(){return sqlite.prepare(sql).run(...values);}});
    return bind([]);
  },async batch(statements){sqlite.exec("BEGIN");try{const out=[];for(const s of statements)out.push(await s.run());sqlite.exec("COMMIT");return out;}catch(e){sqlite.exec("ROLLBACK");throw e;}}};
  globalThis.__diaryTestEnv.DB=db;
  return {db,sqlite};
}
let sequence=0;
const req=()=>"access-test-"+(++sequence);
const identity=id=>({id,email:id+"@example.invalid"});
const ownerHeaders={"oai-authenticated-user-id":"verified-owner","oai-authenticated-user-email":"owner@example.invalid"};


test("owner/public matrix blocks drafts, unreleased revisions, legacy member scopes and immediate restrictions",async()=>{
 const {db,sqlite}=fixture();
 try {
  // Stored memberships are retained, but cannot grant access while suspended.
  await registerMember(db,identity("paid"));
  await setMembership(db,{user_id:"paid",tier:"paid",active:true,paid_active:true,paid_until:"2099-01-01T00:00:00Z"});
  assert.deepEqual(await resolveViewer(db,identity("paid"),false),{owner:false,registered:false,paid:false});
  const owner=await resolveViewer(db,identity("owner"),true);
  const anon=await resolveViewer(db,null,false);
  const fakeClaims={owner:false,registered:true,paid:true};
  const entry=await store.saveDraft(db,{title:"PRIVATE DRAFT TITLE",body_md:"PRIVATE DRAFT BODY",request_id:req()});
  assert.equal(entry.visibility,"owner");
  await db.prepare("UPDATE entries SET visibility='public' WHERE id=?").bind(entry.entry_id).run();
  assert.equal(await readableEntry(db,entry.slug,anon),null);
  assert.equal((await readableEntries(db,anon)).length,0);
  assert.equal((await getOwnerArchiveEntry(db,entry.entry_id)).content.body_md,"PRIVATE DRAFT BODY");
  await store.updateEntry(db,{entry_id:entry.entry_id,expected_revision:1,title:"PUBLIC TITLE",body_md:"PUBLIC BODY",request_id:req()});
  await store.publishEntry(db,{entry_id:entry.entry_id,revision:2,visibility:"public",request_id:req()});
  await store.updateEntry(db,{entry_id:entry.entry_id,expected_revision:2,title:"UNRELEASED SECRET TITLE",body_md:"UNRELEASED SECRET BODY",request_id:req()});
  for(const viewer of [owner,anon,fakeClaims]){
   const result=await readableEntry(db,entry.slug,viewer);
   assert.equal(result.body_md,"PUBLIC BODY");
   assert.equal(result.title,"PUBLIC TITLE");
   assert.ok(!JSON.stringify(await readableEntries(db,viewer)).includes("SECRET"));
  }
  await store.publishEntry(db,{entry_id:entry.entry_id,revision:2,visibility:"owner",request_id:req()});
  for(const viewer of [anon,fakeClaims]) assert.equal(await readableEntry(db,entry.slug,viewer),null);
  assert.equal((await readableEntry(db,entry.slug,owner)).body_md,"PUBLIC BODY");
  assert.equal((await store.publishEntry(db,{entry_id:entry.entry_id,revision:2,request_id:req()})).visibility,"owner");
  for(const legacy of ["paid","registered"]){
   await assert.rejects(store.publishEntry(db,{entry_id:entry.entry_id,revision:2,visibility:legacy,request_id:req()}));
   await db.prepare("UPDATE entries SET visibility=? WHERE id=?").bind(legacy,entry.entry_id).run();
   assert.equal(await readableEntry(db,entry.slug,fakeClaims),null);
   assert.equal((await store.publishEntry(db,{entry_id:entry.entry_id,revision:2,request_id:req()})).visibility,"owner");
  }
  assert.equal((await searchOwnerArchive(db,{q:"UNRELEASED SECRET BODY"})).entries[0].matched_revision,3);
  await store.unpublishEntry(db,{entry_id:entry.entry_id,request_id:req()});
  const final=await store.getEntry(db,{entry_id:entry.entry_id});
  assert.equal(final.entry.visibility,"owner");assert.equal(final.entry.published_revision,null);
  assert.equal((await store.getEntry(db,{entry_id:entry.entry_id,revision:1})).revision.body_md,"PRIVATE DRAFT BODY");
 }finally{sqlite.close();}
});

test("membership endpoints are inert, even for authenticated owner; owner APIs reject cross-origin calls",async()=>{
 const {db,sqlite}=fixture();
 try {
  const base="https://test.example.invalid";
  const request=(data,headers={})=>new Request(base+"/api/membership",{method:"POST",headers:{Origin:base,"Content-Type":"application/json",...headers},body:JSON.stringify(data)});
  for(const headers of [{},ownerHeaders,{"oai-authenticated-user-id":"paid"}]){
   assert.equal((await registration(request({action:"register"},headers))).status,404);
   assert.equal((await admin(request({user_id:"paid",tier:"paid",active:true,paid_active:true},headers))).status,404);
  }
  assert.equal((await db.prepare("SELECT count(*) AS n FROM members").first()).n,0);
  const context={params:Promise.resolve({action:"list_entries"})};
  assert.equal((await ownerApi(request({}, {...ownerHeaders,Origin:"https://evil.invalid"}),context)).status,403);
  assert.equal((await ownerApi(request({},ownerHeaders),context)).status,200);
 }finally{sqlite.close();}
});

test("eight MCP tools remain owner-only and publish schema permits only owner/public",async()=>{
 const {sqlite}=fixture();
 try {
  assert.equal(tools.length,8);
  assert.deepEqual(tools.find(t=>t.name==="publish_entry").inputSchema.properties.visibility.enum,["owner","public"]);
  const call=async(name,args,headers=ownerHeaders)=>{
   const response=await mcp(new Request("https://test.example.invalid/mcp",{method:"POST",headers,body:JSON.stringify({jsonrpc:"2.0",id:1,method:"tools/call",params:{name,arguments:args}})}));
   return (await response.json()).result;
  };
  for(const tool of tools)for(const headers of [{},{"oai-authenticated-user-id":"user"},{"oai-authenticated-user-email":"owner@example.invalid"},{"oai-authenticated-user-id":"other","oai-authenticated-user-email":"other@example.invalid"}]){
   assert.equal((await call(tool.name,{},headers)).isError,true);
  }
  const entry=JSON.parse((await call("save_draft",{title:"架空MCP",body_md:"first",request_id:req()})).content[0].text);
  for(const name of ["list_entries","get_entry"]) assert.ok(!(await call(name,{entry_id:entry.entry_id})).isError);
  assert.ok(!(await call("update_entry",{entry_id:entry.entry_id,expected_revision:1,title:"架空MCP",body_md:"second",request_id:req()})).isError);
  for(const v of ["owner","public"]){
   const result=await call("publish_entry",{entry_id:entry.entry_id,revision:1,visibility:v,request_id:req()});
   assert.equal(JSON.parse(result.content[0].text).visibility,v);
  }
  assert.ok(!(await call("export_entries",{include_drafts:true})).isError);
  assert.ok(!(await call("unpublish_entry",{entry_id:entry.entry_id,request_id:req()})).isError);
 }finally{sqlite.close();}
});

test("migration preserves old published content but defaults its audience to owner",()=>{
 const sqlite=new DatabaseSync(":memory:");
 try {
  sqlite.exec(readFileSync(new URL("../drizzle/0000_initial.sql",import.meta.url),"utf8"));
  sqlite.exec("INSERT INTO entries VALUES('legacy01','legacy','published',1,1,'t','t','t'); INSERT INTO entry_revisions VALUES('legacy01',1,'old','unchanged',NULL,'[]','t');");
  sqlite.exec(readFileSync(new URL("../drizzle/0002_article_access.sql",import.meta.url),"utf8"));
  assert.equal(sqlite.prepare("SELECT visibility FROM entries").get().visibility,"owner");
  assert.equal(sqlite.prepare("SELECT body_md FROM entry_revisions").get().body_md,"unchanged");
 }finally{sqlite.close();}
});
