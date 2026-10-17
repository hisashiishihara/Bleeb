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

test("all 16 viewer/audience combinations, private revisions, instant audience changes and expiration",async()=>{
 const {db,sqlite}=fixture();
 try {
  await registerMember(db,identity("free"));await registerMember(db,identity("paid"));
  await setMembership(db,{user_id:"paid",tier:"paid",active:true,paid_active:true,paid_until:"2099-01-01T00:00:00Z"});
  const viewers=[await resolveViewer(db,identity("owner"),true),await resolveViewer(db,identity("paid"),false),await resolveViewer(db,identity("free"),false),await resolveViewer(db,null,false)];
  const allowed={owner:[true,false,false,false],paid:[true,true,false,false],registered:[true,true,true,false],public:[true,true,true,true]};
  for(const audience of Object.keys(allowed)){
   const entry=await store.saveDraft(db,{title:"架空 "+audience,body_md:"saved public candidate",request_id:req()});
   assert.equal(entry.visibility,"owner");
   await store.publishEntry(db,{entry_id:entry.entry_id,revision:1,visibility:audience,request_id:req()});
   await store.updateEntry(db,{entry_id:entry.entry_id,expected_revision:1,title:"UNPUBLISHED SECRET TITLE",body_md:"UNPUBLISHED SECRET BODY",request_id:req()});
   for(let i=0;i<viewers.length;i++){
    const result=await readableEntry(db,entry.slug,viewers[i]);
    assert.equal(!!result,allowed[audience][i],audience+" viewer "+i);
    if(result){assert.equal(result.body_md,"saved public candidate");assert.ok(!result.title.includes("SECRET"));}
    const list=await readableEntries(db,viewers[i]);
    assert.equal(list.some(x=>x.slug===entry.slug),allowed[audience][i]);
    assert.ok(!JSON.stringify(list).includes("SECRET"));
   }
   await store.publishEntry(db,{entry_id:entry.entry_id,revision:1,visibility:"owner",request_id:req()});
   assert.equal(await readableEntry(db,entry.slug,viewers[1]),null);
   const legacy=await store.publishEntry(db,{entry_id:entry.entry_id,revision:1,request_id:req()});
   assert.equal(legacy.visibility,"owner");
   await assert.rejects(store.publishEntry(db,{entry_id:entry.entry_id,revision:1,visibility:"everyone",request_id:req()}));
   await store.unpublishEntry(db,{entry_id:entry.entry_id,request_id:req()});
   const saved=await store.getEntry(db,{entry_id:entry.entry_id});assert.equal(saved.entry.visibility,"owner");assert.equal(saved.entry.published_revision,null);
   assert.equal(await readableEntry(db,entry.slug,viewers[0]),null); // drafts are read via owner archive
   const archive=await getOwnerArchiveEntry(db,entry.entry_id,2);assert.equal(archive.content.body_md,"UNPUBLISHED SECRET BODY");
  }
  const expiring=await store.saveDraft(db,{title:"架空期限",body_md:"paid lifetime fixture",request_id:req()});
  await store.publishEntry(db,{entry_id:expiring.entry_id,revision:1,visibility:"paid",request_id:req()});
  const expired=await resolveViewer(db,identity("paid"),false,Date.parse("2099-01-01T00:00:00Z"));
  assert.equal(expired.paid,false);
  assert.equal(expired.registered,true);
  assert.equal(await readableEntry(db,expiring.slug,expired),null);
  await setMembership(db,{user_id:"paid",tier:"paid",active:true,paid_active:false});
  assert.deepEqual(await resolveViewer(db,identity("paid"),false),{owner:false,registered:true,paid:false});
  await registerMember(db,identity("paid"));assert.equal((await resolveViewer(db,identity("paid"),false)).paid,false);
  await setMembership(db,{user_id:"free",tier:"registered",active:false,paid_active:false});
  await registerMember(db,identity("free"));assert.equal((await resolveViewer(db,identity("free"),false)).registered,false);
  assert.deepEqual(await resolveViewer(db,identity("unregistered"),false),{owner:false,registered:false,paid:false});
  assert.equal((await searchOwnerArchive(db,{q:"UNPUBLISHED SECRET BODY"})).entries.length,4);
 }finally{sqlite.close();}
});

test("registration derives identity from Sites, refuses self-upgrades and protects membership management",async()=>{
 const {db,sqlite}=fixture();
 try {
  const base="https://test.example.invalid";
  const request=(path,data,headers={})=>new Request(base+path,{method:"POST",headers:{Origin:base,"Content-Type":"application/json",...headers},body:JSON.stringify(data)});
  assert.equal((await registration(request("/api/membership",{action:"register"}))).status,401);
  assert.equal((await registration(request("/api/membership",{action:"register",tier:"paid",user_id:"owner"},{"oai-authenticated-user-id":"free"}))).status,400);
  assert.equal((await registration(request("/api/membership",{action:"register"},{"oai-authenticated-user-id":"free"}))).status,303);
  assert.equal((await resolveViewer(db,identity("free"),false)).paid,false);
  assert.equal((await registration(request("/api/membership",{action:"register"},{Origin:"https://evil.invalid","oai-authenticated-user-id":"free"}))).status,403);
  const upgrade={user_id:"free",tier:"paid",active:true,paid_active:true,paid_until:"2099-01-01T00:00:00Z"};
  assert.equal((await admin(request("/api/owner/members",upgrade,{"oai-authenticated-user-id":"free","oai-authenticated-user-email":"free@example.invalid"}))).status,403);
  assert.equal((await admin(request("/api/owner/members",upgrade,ownerHeaders))).status,303);
  assert.equal((await resolveViewer(db,identity("free"),false)).paid,true);
  assert.equal((await admin(request("/api/owner/members",upgrade,{...ownerHeaders,Origin:"https://evil.invalid"}))).status,403);
 }finally{sqlite.close();}
});

test("all seven MCP operations keep owner authorization and support explicit visibility",async()=>{
 const {sqlite}=fixture();
 try {
  assert.equal(tools.length,7);
  const call=async(name,args,headers=ownerHeaders)=>{
   const response=await mcp(new Request("https://test.example.invalid/mcp",{method:"POST",headers,body:JSON.stringify({jsonrpc:"2.0",id:1,method:"tools/call",params:{name,arguments:args}})}));
   return (await response.json()).result;
  };
  for(const tool of tools) assert.equal((await call(tool.name,{},{})).isError,true);
  let result=await call("save_draft",{title:"架空MCP",body_md:"first",request_id:req()});const entry=JSON.parse(result.content[0].text);
  assert.ok(!(await call("list_entries",{})).isError);
  assert.ok(!(await call("get_entry",{entry_id:entry.entry_id})).isError);
  assert.ok(!(await call("update_entry",{entry_id:entry.entry_id,expected_revision:1,title:"架空MCP",body_md:"second",request_id:req()})).isError);
  for(const v of ["owner","paid","registered","public"]){
   result=await call("publish_entry",{entry_id:entry.entry_id,revision:1,visibility:v,request_id:req()});assert.equal(JSON.parse(result.content[0].text).visibility,v);
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
