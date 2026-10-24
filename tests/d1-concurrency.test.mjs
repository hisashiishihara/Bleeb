import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {register} from 'node:module';
import {Miniflare} from 'miniflare';
register('data:text/javascript,'+encodeURIComponent(`export async function resolve(s,c,next){
 if(s==='cloudflare:workers')return {url:'data:text/javascript,export const env=globalThis.__d1TestEnv;',shortCircuit:true};
 try{return await next(s,c);}catch(e){if(s.startsWith('.')&&!/\\.[a-z]+$/.test(s))return next(s+'.ts',c);throw e;}
}`));
globalThis.__d1TestEnv={};
const store=await import('../lib/store.ts');
const {deleteMedia}=await import('../lib/media-deletion.ts');
const migrations=readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort();
// Split this repository's DDL without breaking trigger BEGIN/END bodies.
function statements(file){
 const result=[];let sql='';
 for(const raw of readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8').split('\n')){
  const line=raw.replace(/--.*$/,'').trim();if(!line)continue;sql+=' '+line;
  if(line.endsWith(';')&&(!/^\s*CREATE TRIGGER/i.test(sql)||/\bEND;$/i.test(line))){result.push(sql.trim());sql='';}
 }
 assert.equal(sql,'');return result;
}
async function migrate(db,files){for(const file of files)await db.batch(statements(file).map(sql=>db.prepare(sql)));}
let seq=0;const request=()=>`d1-regression-${++seq}`;
const mediaId='550e8400-e29b-41d4-a716-446655440000';
async function article(db,body='no media'){
 return store.saveDraft(db,{title:'Isolated D1 fixture',body_md:body,request_id:request()});
}
async function asset(db,r2,entry){
 const key=`entries/${entry.entry_id}/${mediaId}`;
 await r2.put(key,'isolated bytes');
 await db.prepare("INSERT INTO media_assets(id,entry_id,storage_key,content_type,byte_size,original_name,created_at) VALUES(?,?,?,'image/png',14,'fixture.png','now')").bind(mediaId,entry.entry_id,key).run();return key;
}

test('workerd D1 binding: migration, batch/changes, races and storage failure recovery',async t=>{
 const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("isolated tests")}}',d1Databases:['DB','UPGRADE'],r2Buckets:['MEDIA']});
 try{
  const db=await mf.getD1Database('DB'),upgrade=await mf.getD1Database('UPGRADE'),r2=await mf.getR2Bucket('MEDIA');
  globalThis.__d1TestEnv.MEDIA=r2;
  await t.test('fresh install and populated upgrade preserve all five earlier migrations',async()=>{
   await migrate(db,migrations);await migrate(upgrade,migrations.slice(0,5));
   const old=await article(upgrade,'existing body');const key=await asset(upgrade,r2,old);
   const before={};for(const table of ['entries','entry_revisions','media_assets','mutation_requests'])before[table]=(await upgrade.prepare('SELECT * FROM '+table).all()).results;
   await migrate(upgrade,migrations.slice(5));
   for(const table of Object.keys(before))assert.deepEqual((await upgrade.prepare('SELECT * FROM '+table).all()).results,before[table]);
   assert.ok(await r2.head(key));
   // Failed migration batches do not leave a partially-created schema.
   await assert.rejects(upgrade.batch([upgrade.prepare('CREATE TABLE partial_migration(id TEXT)'),upgrade.prepare('INSERT INTO missing_table VALUES(1)')]));
   assert.equal(await upgrade.prepare("SELECT name FROM sqlite_master WHERE name='partial_migration'").first(),null);
   await assert.rejects(migrate(upgrade,migrations.slice(5))); // apply once, track migrations
   assert.deepEqual((await upgrade.prepare('SELECT * FROM entries').all()).results,before.entries);
  });
  await t.test('stale publication does not write a receipt even if previous SQL changed rows',async()=>{
   const e=await article(db);const id=request();
   const raced={prepare:db.prepare.bind(db),async batch(writes){
    await store.updateEntry(db,{entry_id:e.entry_id,expected_revision:1,title:'new',body_md:'new revision',request_id:request()});
    return db.batch(writes);
   }};
   await assert.rejects(store.publishEntry(raced,{entry_id:e.entry_id,revision:1,request_id:id}),e=>e.code==='stale_revision');
   assert.equal(await db.prepare('SELECT * FROM mutation_requests WHERE request_id=?').bind(id).first(),null);
   assert.equal((await store.getEntry(db,{entry_id:e.entry_id})).entry.status,'draft');
  });
  await t.test('concurrent identical publish is idempotent, cross-operation ID collision rolls back',async()=>{
   const e=await article(db);const id=request();const args={entry_id:e.entry_id,revision:1,visibility:'public',request_id:id};
   const results=await Promise.all([store.publishEntry(db,args),store.publishEntry(db,args)]);
   assert.deepEqual(results[0],results[1]);
   assert.equal((await db.prepare('SELECT count(*) AS n FROM mutation_requests WHERE request_id=?').bind(id).first()).n,1);
   const collision=request();await store.unpublishEntry(db,{entry_id:e.entry_id,request_id:collision});
   // Inject the competing receipt between the early read and atomic write.
   const other=await article(db);const collision2=request();let once=false;
   const raced={prepare:db.prepare.bind(db),async batch(writes){
    if(!once){once=true;await store.unpublishEntry(db,{entry_id:other.entry_id,request_id:collision2});}return db.batch(writes);
   }};
   await assert.rejects(store.publishEntry(raced,{entry_id:e.entry_id,revision:1,request_id:collision2}),e=>e.code==='request_conflict');
   assert.equal((await store.getEntry(db,{entry_id:e.entry_id})).entry.status,'draft');
   assert.deepEqual(await store.publishEntry(db,args),results[0]); // replay before current state
  });
  await t.test('publication cannot restore a stale audience after concurrent unpublish',async()=>{
   const e=await article(db);await store.publishEntry(db,{entry_id:e.entry_id,revision:1,visibility:'public',request_id:request()});
   const id=request();const raced={prepare:db.prepare.bind(db),async batch(writes){
    await store.unpublishEntry(db,{entry_id:e.entry_id,request_id:request()});return db.batch(writes);
   }};
   await assert.rejects(store.publishEntry(raced,{entry_id:e.entry_id,revision:1,request_id:id}),err=>err.code==='stale_revision');
   assert.equal((await store.getEntry(db,{entry_id:e.entry_id})).entry.visibility,'owner');
   assert.equal(await db.prepare('SELECT * FROM mutation_requests WHERE request_id=?').bind(id).first(),null);
  });
  await t.test('hero precheck followed by concurrent deletion rolls back its revision and receipt',async()=>{
   const existing=(await upgrade.prepare('SELECT * FROM media_assets WHERE id=?').bind(mediaId).first());
   const id=request();const raced={prepare:upgrade.prepare.bind(upgrade),async batch(writes){await deleteMedia(upgrade,r2,mediaId);return upgrade.batch(writes);}};
   await assert.rejects(store.setHeroMedia(raced,{entry_id:existing.entry_id,expected_revision:1,hero_media_id:mediaId,request_id:id}),err=>err.code==='media_deletion_in_progress');
   assert.equal((await store.getEntry(upgrade,{entry_id:existing.entry_id})).entry.latest_revision,1);
   assert.equal(await upgrade.prepare('SELECT * FROM mutation_requests WHERE request_id=?').bind(id).first(),null);
  });
  await t.test('publication/hero/inline references remain fenced during and after real local R2 deletion',async()=>{
   const e=await article(db,'![old](/media/'+mediaId+')');const key=await asset(db,r2,e);
   const deleting={async delete(k){
    await assert.rejects(store.publishEntry(db,{entry_id:e.entry_id,revision:1,visibility:'public',request_id:request()}),err=>err.code==='media_deletion_in_progress');
    await assert.rejects(store.setHeroMedia(db,{entry_id:e.entry_id,expected_revision:1,hero_media_id:mediaId,request_id:request()}),err=>err.code==='not_found');
    await assert.rejects(store.updateEntry(db,{entry_id:e.entry_id,expected_revision:1,title:'blocked',body_md:'![new](/media/'+mediaId+')',request_id:request()}),err=>err.code==='media_deletion_in_progress');
    await r2.delete(k);
   },head:r2.head.bind(r2)};
   await deleteMedia(db,deleting,mediaId,e.entry_id);assert.equal(await r2.head(key),null);
   await assert.rejects(store.publishEntry(db,{entry_id:e.entry_id,revision:1,request_id:request()}),err=>err.code==='media_deletion_in_progress');
   await store.updateEntry(db,{entry_id:e.entry_id,expected_revision:1,title:'repaired',body_md:'removed reference',request_id:request()});
   await store.publishEntry(db,{entry_id:e.entry_id,revision:2,visibility:'public',request_id:request()});
   await store.unpublishEntry(db,{entry_id:e.entry_id,request_id:request()});
   assert.ok(await db.prepare('SELECT * FROM media_deletions WHERE media_id=?').bind(mediaId).first());
  });
  await t.test('draft deletion uses the same fence and retains it after removing the article',async()=>{
   const e=await article(upgrade); // separate ID avoids existing media identity
   const id='650e8400-e29b-41d4-a716-446655440000',key=`entries/${e.entry_id}/${id}`;
   await upgrade.prepare("INSERT INTO media_assets VALUES(?,?,?,'video/mp4',1,'clip.mp4','now')").bind(id,e.entry_id,key).run();await r2.put(key,'x');
   globalThis.__d1TestEnv.MEDIA={async delete(k){
    await assert.rejects(store.publishEntry(upgrade,{entry_id:e.entry_id,revision:2,request_id:request()}),err=>err.code==='media_deletion_in_progress');await r2.delete(k);
   },head:r2.head.bind(r2)};
   // The draft must actually refer to the file to exercise publication protection.
   await store.updateEntry(upgrade,{entry_id:e.entry_id,expected_revision:1,title:'video',body_md:'![video](/media/'+id+')',request_id:request()});
   await store.deleteDraft(upgrade,{entry_id:e.entry_id,expected_revision:2,request_id:request()});
   assert.equal(await upgrade.prepare('SELECT * FROM entries WHERE id=?').bind(e.entry_id).first(),null);
   assert.ok(await upgrade.prepare('SELECT * FROM media_deletions WHERE media_id=?').bind(id).first());
  });
  await t.test('an upload arriving before draft cleanup keeps the article and metadata intact',async()=>{
   const e=await article(db),id=request(),media='750e8400-e29b-41d4-a716-446655440000',key=`entries/${e.entry_id}/${media}`;
   const raced={prepare:db.prepare.bind(db),async batch(writes){
    await r2.put(key,'new upload');await db.prepare("INSERT INTO media_assets VALUES(?,?,?,'image/png',10,'late.png','now')").bind(media,e.entry_id,key).run();return db.batch(writes);
   }};
   await assert.rejects(store.deleteDraft(raced,{entry_id:e.entry_id,expected_revision:1,request_id:id}),err=>err.code==='stale_revision');
   assert.ok(await db.prepare('SELECT id FROM entries WHERE id=?').bind(e.entry_id).first());
   assert.ok(await db.prepare('SELECT id FROM media_assets WHERE id=?').bind(media).first());assert.ok(await r2.head(key));
   assert.equal(await db.prepare('SELECT * FROM mutation_requests WHERE request_id=?').bind(id).first(),null);
   globalThis.__d1TestEnv.MEDIA=r2;await store.deleteDraft(db,{entry_id:e.entry_id,expected_revision:1,request_id:id});assert.equal(await r2.head(key),null);
  });
 }finally{await mf.dispose();}
});
