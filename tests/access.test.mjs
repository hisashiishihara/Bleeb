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
const {GET:noteFile}=await import("../app/owner/archive/[id]/export-note/route.ts");
function fixture(){
  const sqlite=new DatabaseSync(":memory:");
  for(const file of ["0000_initial.sql","0001_referrers.sql","0002_article_access.sql","0003_media.sql","0004_hero_media.sql"]) sqlite.exec(readFileSync(new URL("../drizzle/"+file,import.meta.url),"utf8"));
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

test("owner read diagnostics return the exact runtime tools/list without writes",async()=>{
 const {sqlite}=fixture();
 try {
  const request=(method,params,headers={})=>new Request("https://test.example.invalid/mcp",{
   method:"POST",headers:{"Content-Type":"application/json",...headers},
   body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})
  });
  const direct=await (await mcp(request("tools/list"))).json();
  const response=await (await mcp(request("tools/call",{name:"list_entries",arguments:{limit:1}},ownerHeaders))).json();
  const result=JSON.parse(response.result.content[0].text);
  assert.deepEqual(result.mcp_diagnostics.tools_list,direct.result);
  assert.equal(result.mcp_diagnostics.tools_list.tools.length,12);
  const image=result.mcp_diagnostics.tools_list.tools.find(t=>t.name==="upload_chatgpt_image");
  assert.deepEqual(image._meta["openai/fileParams"],["file"]);
  const denied=await (await mcp(request("tools/call",{name:"list_entries",arguments:{limit:1}}))).json();
  assert.equal(denied.result.isError,true);
  assert.ok(!JSON.stringify(denied).includes("mcp_diagnostics"));
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM mutation_requests").get().n,0);
 }finally{sqlite.close();}
});


test("owner/public matrix blocks drafts, displays latest revisions, protects legacy scopes and immediate restrictions",async()=>{
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
   assert.equal(result.body_md,"UNRELEASED SECRET BODY");
   assert.equal(result.title,"UNRELEASED SECRET TITLE");
   assert.ok(JSON.stringify(await readableEntries(db,viewer)).includes("SECRET"));
  }
  await store.publishEntry(db,{entry_id:entry.entry_id,revision:3,visibility:"owner",request_id:req()});
  for(const viewer of [anon,fakeClaims]) assert.equal(await readableEntry(db,entry.slug,viewer),null);
  assert.equal((await readableEntry(db,entry.slug,owner)).body_md,"UNRELEASED SECRET BODY");
  assert.equal((await store.publishEntry(db,{entry_id:entry.entry_id,revision:3,request_id:req()})).visibility,"owner");
  for(const legacy of ["paid","registered"]){
   await assert.rejects(store.publishEntry(db,{entry_id:entry.entry_id,revision:3,visibility:legacy,request_id:req()}));
   await db.prepare("UPDATE entries SET visibility=? WHERE id=?").bind(legacy,entry.entry_id).run();
   assert.equal(await readableEntry(db,entry.slug,fakeClaims),null);
   assert.equal((await store.publishEntry(db,{entry_id:entry.entry_id,revision:3,request_id:req()})).visibility,"owner");
  }
  assert.equal((await searchOwnerArchive(db,{q:"UNRELEASED SECRET BODY"})).entries[0].matched_revision,3);
  await store.unpublishEntry(db,{entry_id:entry.entry_id,request_id:req()});
  const final=await store.getEntry(db,{entry_id:entry.entry_id});
  assert.equal(final.entry.visibility,"owner");assert.equal(final.entry.published_revision,null);
  assert.equal((await store.getEntry(db,{entry_id:entry.entry_id,revision:1})).revision.body_md,"PRIVATE DRAFT BODY");
 }finally{sqlite.close();}
});

test("owner-only published article shows latest body and cover without anonymous access",async()=>{
 const {db,sqlite}=fixture();
 try{
  const id="66c6f1dd-b078-43d6-8a1d-0098d98c2297";
  const saved=await store.saveDraft(db,{title:"Fixture owner article",body_md:"previous text",request_id:req()});
  await db.prepare("INSERT INTO media_assets(id,entry_id,storage_key,content_type,byte_size,original_name,created_at) VALUES(?,?,?,?,?,?,?)")
   .bind(id,saved.entry_id,"entries/"+saved.entry_id+"/"+id,"image/webp",123,"image.webp","now").run();
  await store.publishEntry(db,{entry_id:saved.entry_id,revision:1,visibility:"owner",request_id:req()});
  await store.updateEntry(db,{entry_id:saved.entry_id,expected_revision:1,title:"Latest owner article",body_md:"latest text",request_id:req()});
  const hero=await store.setHeroMedia(db,{entry_id:saved.entry_id,expected_revision:2,hero_media_id:id,alt_text:"private image",request_id:req()});
  assert.equal(hero.revision,3);
  assert.equal(hero.published_revision,1); // legacy pointer is preserved for audit
  const owner={owner:true,registered:false,paid:false},anon={owner:false,registered:false,paid:false};
  const latest=await readableEntry(db,saved.slug,owner);
  assert.equal(latest.title,"Latest owner article");
  assert.equal(latest.body_md,"latest text");
  assert.equal(latest.hero_media_id,id);
  assert.equal(await readableEntry(db,saved.slug,anon),null);
  assert.equal((await readableEntries(db,anon)).length,0);
  const {readableMedia}=await import("../lib/media-store.ts");
  assert.equal(await readableMedia(db,id,false),null);
  assert.equal((await readableMedia(db,id,true)).id,id);
  await store.unpublishEntry(db,{entry_id:saved.entry_id,request_id:req()});
  assert.equal(await readableEntry(db,saved.slug,owner),null);
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

test("twelve MCP tools remain owner-only and publish schema permits only owner/public",async()=>{
 const {sqlite}=fixture();
 try {
  assert.equal(tools.length,12);
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
  const stale=await call("publish_entry",{entry_id:entry.entry_id,revision:1,visibility:"public",request_id:req()});
  assert.equal(stale.isError,true);
  for(const v of ["owner","public"]){
   const result=await call("publish_entry",{entry_id:entry.entry_id,revision:2,visibility:v,request_id:req()});
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
  sqlite.exec("INSERT INTO entries VALUES('legacy01','legacy','published',1,1,'t','t','t'); INSERT INTO entry_revisions(entry_id,revision,title,body_md,summary,tags_json,saved_at) VALUES('legacy01',1,'old','unchanged',NULL,'[]','t');");
  sqlite.exec(readFileSync(new URL("../drizzle/0002_article_access.sql",import.meta.url),"utf8"));
  assert.equal(sqlite.prepare("SELECT visibility FROM entries").get().visibility,"owner");
  assert.equal(sqlite.prepare("SELECT body_md FROM entry_revisions").get().body_md,"unchanged");
 }finally{sqlite.close();}
});

test("hero changes appear immediately on the latest published revision",async()=>{
 const {db,sqlite}=fixture();
 try{
  const mediaId="550e8400-e29b-41d4-a716-446655440000";
  const entry=await store.saveDraft(db,{title:"Test hero",body_md:"Original",request_id:req()});
  await db.prepare("INSERT INTO media_assets(id,entry_id,storage_key,content_type,byte_size,original_name,created_at) VALUES(?,?,?,?,?,?,?)")
   .bind(mediaId,entry.entry_id,"entries/"+entry.entry_id+"/"+mediaId,"image/png",100,"fixture.png","now").run();
  const anon={owner:false,registered:false,paid:false};
  await store.publishEntry(db,{entry_id:entry.entry_id,revision:1,visibility:"public",request_id:req()});
  const first=await store.setHeroMedia(db,{entry_id:entry.entry_id,expected_revision:1,hero_media_id:mediaId,alt_text:"illustration",request_id:req()});
  assert.equal(first.revision,2);
  assert.equal(first.published_revision,1);
  assert.equal((await readableEntry(db,entry.slug,anon)).hero_media_id,mediaId);
  assert.equal((await store.getEntry(db,{entry_id:entry.entry_id})).revision.hero_media_id,mediaId);
  const {readableMedia}=await import("../lib/media-store.ts");
  assert.equal((await readableMedia(db,mediaId,false)).id,mediaId);
  await store.publishEntry(db,{entry_id:entry.entry_id,revision:2,visibility:"public",request_id:req()});
  assert.equal((await readableEntry(db,entry.slug,anon)).hero_media_id,mediaId);
  assert.equal((await readableEntries(db,anon))[0].hero_media_id,mediaId);
  assert.equal((await readableMedia(db,mediaId,false)).id,mediaId);
  const next=await store.updateEntry(db,{entry_id:entry.entry_id,expected_revision:2,title:"Test hero",body_md:"Body changed",request_id:req()});
  assert.equal((await store.getEntry(db,{entry_id:entry.entry_id})).revision.hero_media_id,mediaId);
  assert.equal(next.published_revision,2);
  const cleared=await store.clearHeroMedia(db,{entry_id:entry.entry_id,expected_revision:3,request_id:req()});
  assert.equal(cleared.revision,4);
  assert.equal(await readableMedia(db,mediaId,false),null);
  await store.publishEntry(db,{entry_id:entry.entry_id,revision:4,visibility:"public",request_id:req()});
  assert.equal((await readableEntry(db,entry.slug,anon)).hero_media_id,null);
  assert.equal(await readableMedia(db,mediaId,false),null);
  assert.equal((await store.getEntry(db,{entry_id:entry.entry_id,revision:2})).revision.hero_media_id,mediaId);
  await assert.rejects(store.setHeroMedia(db,{entry_id:entry.entry_id,expected_revision:2,hero_media_id:mediaId,request_id:req()}),e=>e.status===409);
  const e2=await store.saveDraft(db,{title:"Other",body_md:"x",request_id:req()});
  await assert.rejects(store.setHeroMedia(db,{entry_id:e2.entry_id,expected_revision:1,hero_media_id:mediaId,request_id:req()}),e=>e.status===404);
 }finally{sqlite.close();}
});

test("trusted HTTPS image import saves R2 and hero revision, respects existing publication and visibility",async()=>{
 const {db,sqlite}=fixture();
 const oldFetch=globalThis.fetch;
 const previousHosts=globalThis.__diaryTestEnv.AI_DIARY_IMAGE_SOURCE_HOSTS;
 const previousMedia=globalThis.__diaryTestEnv.MEDIA;
 try{
  const entry=await store.saveDraft(db,{title:"Image import",body_md:"No hero yet",request_id:req()});
  await store.publishEntry(db,{entry_id:entry.entry_id,revision:1,visibility:"public",request_id:req()});
  const stored=new Map();
  globalThis.__diaryTestEnv.AI_DIARY_IMAGE_SOURCE_HOSTS="images.example.com";
  globalThis.__diaryTestEnv.MEDIA={
   async put(key,value){stored.set(key,await value.arrayBuffer());},
   async delete(key){stored.delete(key);},
   async head(key){return stored.has(key)?{key}:null;}
  };
  globalThis.fetch=async()=>new Response(new Uint8Array([137,80,78,71,13,10,26,10]),{
   headers:{"Content-Type":"image/png"}
  });
  const idempotency=req();
  const args={entry_id:entry.entry_id,expected_revision:1,source_url:"https://images.example.com/image.png",
   usage:"hero",alt_text:"Generated image",request_id:idempotency};
  const imported=await store.importMediaFromUrl(db,args);
  assert.equal(imported.revision,2);
  assert.equal(imported.published_revision,1);
  assert.equal((await store.importMediaFromUrl(db,args)).media_id,imported.media_id);
  assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM media_assets").first()).count,1);
  const {readableMedia}=await import("../lib/media-store.ts");
  assert.equal((await readableMedia(db,imported.media_id,false)).id,imported.media_id);
  await store.publishEntry(db,{entry_id:entry.entry_id,revision:2,visibility:"public",request_id:req()});
  assert.equal((await readableEntry(db,entry.slug)).hero_media_id,imported.media_id);
  assert.equal((await readableMedia(db,imported.media_id,false)).id,imported.media_id);
  assert.equal(stored.size,1);
  // A conflicting operation must never reuse the image import's request ID.
  await assert.rejects(store.clearHeroMedia(db,{entry_id:entry.entry_id,expected_revision:2,
   request_id:idempotency}),e=>e.code==="request_conflict");
  // Stale requests must be rejected before fetching or writing to R2.
  let fetchCount=0;
  globalThis.fetch=async()=>{fetchCount++;throw new Error("unexpected download");};
  await assert.rejects(store.importMediaFromUrl(db,{...args,request_id:req(),
   expected_revision:1}),e=>e.code==="stale_revision");
  assert.equal(fetchCount,0);
  assert.equal(stored.size,1);
  await assert.rejects(store.importMediaFromUrl(db,{...args,request_id:req(),source_url:"http://images.example.com/x.png",expected_revision:2}),e=>e.status===400);
 }finally{
  sqlite.close();
  globalThis.fetch=oldFetch;
  globalThis.__diaryTestEnv.AI_DIARY_IMAGE_SOURCE_HOSTS=previousHosts;
  globalThis.__diaryTestEnv.MEDIA=previousMedia;
 }
});

test("ChatGPT-generated fileParams image uploads via signed URL and remains unpublished",async()=>{
 const {db,sqlite}=fixture();
 const oldFetch=globalThis.fetch;
 const previousHosts=globalThis.__diaryTestEnv.AI_DIARY_CHATGPT_FILE_HOSTS;
 const previousMedia=globalThis.__diaryTestEnv.MEDIA;
 const stored=new Map(),requests=[];
 try {
  globalThis.__diaryTestEnv.AI_DIARY_CHATGPT_FILE_HOSTS="files.oaiusercontent.com";
  globalThis.__diaryTestEnv.MEDIA={
   async put(key,value){stored.set(key,await value.arrayBuffer());},
   async delete(key){stored.delete(key);},
   async head(key){return stored.has(key)?{key}:null;}
  };
  const raw=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);
  globalThis.fetch=async (url,options)=>{
   requests.push({url,options});
   return new Response(raw,{headers:{"Content-Type":"application/octet-stream"}});
  };
  const tool=tools.find(t=>t.name==="upload_chatgpt_image");
  assert.deepEqual(tool?._meta?.["openai/fileParams"],["file"]);
  assert.deepEqual(tool?.inputSchema.properties.file.required,["download_url","file_id"]);
  assert.deepEqual(Object.keys(tool?.inputSchema.properties.file.properties).sort(),
   ["download_url","file_id","mime_type","file_name"].sort());
  const entry=await store.saveDraft(db,{title:"FileParams test",body_md:"Original published",request_id:req()});
  await store.publishEntry(db,{entry_id:entry.entry_id,revision:1,visibility:"public",request_id:req()});
  const file={download_url:"https://files.oaiusercontent.com/transfer.png?temporary=secret",file_id:"file_test",mime_type:"image/png",file_name:"generated.png"};
  const args={entry_id:entry.entry_id,expected_revision:1,file,usage:"hero",alt_text:"Generated PNG",request_id:req()};
  const direct=await store.uploadChatGPTImage(db,args);
  assert.equal(direct.revision,2);
  assert.equal(direct.published_revision,1);
  assert.equal(direct.hero_alt_text,"Generated PNG");
  assert.equal(stored.size,1);
  assert.equal(requests.length,1);
  assert.equal(requests[0].options.credentials,"omit");
  assert.equal(requests[0].options.redirect,"manual");
  assert.equal(requests[0].options.referrerPolicy,"no-referrer");
  assert.equal((await readableEntry(db,entry.slug)).hero_media_id,direct.media_id);
  assert.equal((await store.getEntry(db,{entry_id:entry.entry_id,revision:2})).revision.hero_media_id,direct.media_id);
  assert.equal((await store.uploadChatGPTImage(db,args)).media_id,direct.media_id);
  assert.equal(requests.length,1);
  // No unvalidated URL may be fetched, even with valid caller owner credentials.
  await assert.rejects(store.uploadChatGPTImage(db,{...args,file:{...file,download_url:"https://evil.example.com/x.png"},expected_revision:2,request_id:req()}),
   e=>e.code==="image_host_not_allowed");
  assert.equal(requests.length,1);
  await assert.rejects(store.uploadChatGPTImage(db,{...args,file:{...file,download_url:"http://files.oaiusercontent.com/x.png"},expected_revision:2,request_id:req()}),
   e=>e.code==="invalid_image_url");
  assert.equal(requests.length,1);
  // Explicitly verify actual JSON-RPC route preserves owner guard.
  const rpcBody=JSON.stringify({jsonrpc:"2.0",id:3,method:"tools/call",
   params:{name:"upload_chatgpt_image",arguments:{...args,expected_revision:2,request_id:req()}}});
  const anonymous=await mcp(new Request("https://test.example.invalid/mcp",{method:"POST",body:rpcBody}));
  assert.equal((await anonymous.json()).result.isError,true);
  assert.equal(requests.length,1);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM media_assets").first()).n,1);
 }finally{
  sqlite.close();
  globalThis.fetch=oldFetch;
  globalThis.__diaryTestEnv.AI_DIARY_CHATGPT_FILE_HOSTS=previousHosts;
  globalThis.__diaryTestEnv.MEDIA=previousMedia;
 }
});



test("note export is owner-only, read-only and revision-locked",async()=>{
 const {db,sqlite}=fixture();
 try{
  const saved=await store.saveDraft(db,{title:"PRIVATE NOTE TITLE",body_md:"PRIVATE BODY SHOULD NOT LEAK",summary:"only owner summary",request_id:req()});
  const url=(mode,revision)=>"https://test.example.invalid/owner/archive/"+saved.entry_id+"/export-note?mode="+mode+"&revision="+revision;
  const context={params:Promise.resolve({id:saved.entry_id})};
  const get=(mode,revision,headers={})=>noteFile(new Request(url(mode,revision),{headers}),context);
  for(const headers of [{},{"oai-authenticated-user-id":"pretend"},{"oai-authenticated-user-id":"pretend","oai-authenticated-user-email":"fake@example.invalid"}]){
   const response=await get("full",1,headers);
   assert.equal(response.status,404);
   assert.equal(await response.text(),"");
  }
  const before=sqlite.prepare("SELECT count(*) as n FROM mutation_requests").get().n;
  const owner=await get("full",1,ownerHeaders);
  assert.equal(owner.status,200);
  assert.match(owner.headers.get("Content-Disposition"),/attachment; filename=/);
  assert.match(owner.headers.get("Cache-Control"),/no-store/);
  assert.match(await owner.text(),/PRIVATE BODY SHOULD NOT LEAK/);
  assert.equal((await get("unknown",1,ownerHeaders)).status,400);
  assert.equal((await get("full",999,ownerHeaders)).status,409);
  assert.equal(sqlite.prepare("SELECT count(*) as n FROM mutation_requests").get().n,before);
  await store.updateEntry(db,{entry_id:saved.entry_id,expected_revision:1,title:"LATER DRAFT",body_md:"LATEST PRIVATE",summary:"new",request_id:req()});
  assert.equal((await get("full",1,ownerHeaders)).status,409);
  const excerpt=await get("excerpt",2,ownerHeaders);
  assert.equal(excerpt.status,200);
  assert.doesNotMatch(await excerpt.text(),/\/posts\//);
  await store.publishEntry(db,{entry_id:saved.entry_id,revision:2,visibility:"public",request_id:req()});
  const live=await get("excerpt",2,ownerHeaders);
  const liveContent=await live.text();
  assert.match(liveContent,/https:\/\/test\.example\.invalid\/posts\//);
  assert.match(liveContent,/STATUS: Draft/);
  await store.updateEntry(db,{entry_id:saved.entry_id,expected_revision:2,title:"DRAFT AFTER PUBLICATION",body_md:"UNPUBLISHED SECRET",request_id:req()});
  const now=await get("excerpt",3,ownerHeaders);
  assert.match(await now.text(),/https:\/\/test\.example\.invalid\/posts\//);
 }finally{sqlite.close();}
});


test("draft deletion is owner-only, revision guarded, idempotent, and removes all draft records",async()=>{
 const {db,sqlite}=fixture();
 try{
  const entry=await store.saveDraft(db,{title:"DELETE THIS DRAFT",body_md:"Original",request_id:req()});
  await store.updateEntry(db,{entry_id:entry.entry_id,expected_revision:1,title:"DELETE THIS DRAFT",body_md:"Revised",request_id:req()});
  const url="https://test.example.invalid/api/owner/delete_draft";
  const request=(revision,headers={},request_id=req())=>new Request(url,{
    method:"POST",headers:{"Content-Type":"application/json",...headers},
    body:JSON.stringify({entry_id:entry.entry_id,expected_revision:revision,request_id})
  });
  for(const unauthorized of [{},{"oai-authenticated-user-id":"forged","oai-authenticated-user-email":"other@example.invalid"}]){
   assert.equal((await ownerApi(request(2,unauthorized),{params:Promise.resolve({action:"delete_draft"})})).status,403);
  }
  const csrf=await ownerApi(request(2,{...ownerHeaders,Origin:"https://attacker.invalid"}),{params:Promise.resolve({action:"delete_draft"})});
  assert.equal(csrf.status,403);
  const stale=await ownerApi(request(1,ownerHeaders),{params:Promise.resolve({action:"delete_draft"})});
  assert.equal(stale.status,409);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM entries").first()).n,1);
  const rid=req();
  const success=await ownerApi(request(2,ownerHeaders,rid),{params:Promise.resolve({action:"delete_draft"})});
  assert.equal(success.status,200);
  assert.equal((await success.json()).deleted,true);
  for(const table of ["entries","entry_revisions","media_assets","referrer_daily"])
   assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM "+table).first()).n,0);
  const replay=await ownerApi(request(2,ownerHeaders,rid),{params:Promise.resolve({action:"delete_draft"})});
  assert.equal(replay.status,200);
  assert.equal((await replay.json()).deleted,true);
  const old=await ownerApi(request(2,ownerHeaders),{params:Promise.resolve({action:"delete_draft"})});
  assert.equal(old.status,404);
  assert.equal((await store.listEntries(db,{})).entries.length,0);
 }finally{sqlite.close();}
});

test("published entries cannot be deleted, including owner-only articles",async()=>{
 const {db,sqlite}=fixture();
 try{
  const entry=await store.saveDraft(db,{title:"PROTECT THIS ARTICLE",body_md:"Permanent text",request_id:req()});
  await store.publishEntry(db,{entry_id:entry.entry_id,revision:1,visibility:"owner",request_id:req()});
  await assert.rejects(store.deleteDraft(db,{entry_id:entry.entry_id,expected_revision:1,request_id:req()}),
    e=>e.code==="not_a_draft"&&e.status===409);
  assert.equal((await store.getEntry(db,{entry_id:entry.entry_id})).revision.body_md,"Permanent text");
  // Draft delete is browser-only, and not an undisclosed 14th MCP tool.
  const m=await mcp(new Request("https://test.example.invalid/mcp",{method:"POST",headers:ownerHeaders,
   body:JSON.stringify({jsonrpc:"2.0",id:4,method:"tools/call",params:{name:"delete_draft",
    arguments:{entry_id:entry.entry_id,expected_revision:1,request_id:req()}}})}));
  const response=(await m.json()).result;
  assert.equal(response.isError,true);
  assert.equal(tools.length,12);
  assert.equal((await store.getEntry(db,{entry_id:entry.entry_id})).entry.status,"published");
 }finally{sqlite.close();}
});

test("deleting draft media removes its R2 bytes, D1 media, history and referrer rows",async()=>{
 const {db,sqlite}=fixture();
 const previous=globalThis.__diaryTestEnv.MEDIA;
 const keys=new Set(),events=[];
 const storage={
  async delete(key){events.push("delete");keys.delete(key);},
  async head(key){events.push("head");return keys.has(key)?{key}:null;}
 };
 globalThis.__diaryTestEnv.MEDIA=storage;
 try{
  const entry=await store.saveDraft(db,{title:"Draft with media",body_md:"illustration",request_id:req()});
  const id="550e8400-e29b-41d4-a716-446655440000";
  const key="entries/"+entry.entry_id+"/"+id;
  await db.prepare("INSERT INTO media_assets(id,entry_id,storage_key,content_type,byte_size,original_name,created_at) VALUES(?,?,?,?,?,?,?)")
   .bind(id,entry.entry_id,key,"image/png",100,"test.png","now").run();
  keys.add(key);
  await db.prepare("INSERT INTO referrer_daily(day,entry_id,source_host,hits) VALUES(?,?,?,?)")
   .bind("2026-10-18",entry.entry_id,"example.com",1).run();
  const result=await store.deleteDraft(db,{entry_id:entry.entry_id,expected_revision:1,request_id:req()});
  assert.equal(result.deleted_media,1);
  assert.deepEqual(events,["delete","head"]);
  assert.equal(keys.size,0);
  for(const table of ["entries","entry_revisions","media_assets","referrer_daily"])
   assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM "+table).first()).n,0);
 }finally{globalThis.__diaryTestEnv.MEDIA=previous;sqlite.close();}
});

test("R2 removal failures prevent D1 draft deletion; retries safely remove it",async()=>{
 const {db,sqlite}=fixture();
 const previous=globalThis.__diaryTestEnv.MEDIA;
 const keys=new Set(),events=[];
 let fail=true;
 globalThis.__diaryTestEnv.MEDIA={
  async delete(key){events.push("delete");if(fail)throw Error("R2 unavailable");keys.delete(key);},
  async head(key){events.push("head");return keys.has(key)?{key}:null;}
 };
 try{
  const entry=await store.saveDraft(db,{title:"Draft R2 failure",body_md:"x",request_id:req()});
  const id="650e8400-e29b-41d4-a716-446655440000";
  const key="entries/"+entry.entry_id+"/"+id;keys.add(key);
  await db.prepare("INSERT INTO media_assets(id,entry_id,storage_key,content_type,byte_size,original_name,created_at) VALUES(?,?,?,?,?,?,?)")
   .bind(id,entry.entry_id,key,"image/png",100,"test.png","now").run();
  await assert.rejects(store.deleteDraft(db,{entry_id:entry.entry_id,expected_revision:1,request_id:req()}),
   e=>e.status===503&&e.code==="media_delete_failed");
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM entries").first()).n,1);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM entry_revisions").first()).n,1);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM media_assets").first()).n,1);
  assert.ok(keys.has(key));
  fail=false;
  const result=await store.deleteDraft(db,{entry_id:entry.entry_id,expected_revision:1,request_id:req()});
  assert.equal(result.deleted,true);
  assert.equal(keys.size,0);
 }finally{globalThis.__diaryTestEnv.MEDIA=previous;sqlite.close();}
});
