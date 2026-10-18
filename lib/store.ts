import { env } from "cloudflare:workers";
import { DiaryError, entryId, requestId, revisionNumber, validateDraft, slugFor } from "./input";
import { makeExport, type ExportEntry, type ExportRevision } from "./export";

type Entry = ExportEntry;
import { visibility } from "./access";
import { deleteMedia } from "./media-deletion";
import { bucket, createMedia } from "./media-store";
import { downloadImage, configuredImageHosts } from "./remote-image";
import { MEDIA_ID_RE } from "./media-rules";
import { downloadChatGPTImage } from "./chatgpt-file";
export { readableEntries as publicEntries, readableEntry as publicEntry } from "./reader-store";
type Revision = ExportRevision;
type MutationRow = { operation: string; response_json: string };
type DB = D1Database;
const NOW = () => new Date().toISOString();

export function database(): DB {
  const db = (env as unknown as { DB?: DB }).DB;
  if (!db) throw new DiaryError("storage_unavailable", "D1 DB binding is missing", 503);
  return db;
}

export function authorizedOwner(request: Request): void {
  const e = env as unknown as { AI_DIARY_OWNER_EMAIL?: string; AI_DIARY_OWNER_API_ENABLED?: string };
  const actual = request.headers.get("oai-authenticated-user-email");
  // Sites ingress authenticates callers and replaces client-supplied identity headers.
  // A service bypass token alone supplies no user identity and is never an author.
  if (!request.headers.get("oai-authenticated-user-id") || !e.AI_DIARY_OWNER_EMAIL || !actual ||
      actual.trim().toLowerCase() !== e.AI_DIARY_OWNER_EMAIL.trim().toLowerCase()) {
    throw new DiaryError("forbidden", "Owner authentication is required", 403);
  }
  if (e.AI_DIARY_OWNER_API_ENABLED !== "true") {
    // Proves real MCP identity propagation without echoing personal identifiers.
    throw new DiaryError("owner_api_disabled", "Verified owner identity received; owner API is disabled", 403);
  }
}

async function prior(db: DB, id: string): Promise<MutationRow | null> {
  return db.prepare("SELECT operation,response_json FROM mutation_requests WHERE request_id=?").bind(id).first<MutationRow>();
}

async function mutate<T>(db: DB, id: string, operation: string, response: T, writes: D1PreparedStatement[]): Promise<T> {
  const previous = await prior(db, id);
  if (previous) {
    if (previous.operation !== operation) throw new DiaryError("request_conflict", "request ID used for another operation", 409);
    return JSON.parse(previous.response_json) as T;
  }
  const save = db.prepare("INSERT INTO mutation_requests (request_id,operation,response_json,created_at) VALUES (?,?,?,?)")
    .bind(id, operation, JSON.stringify(response), NOW());
  try {
    // D1 batch is transactional: an error rolls back all statements.
    await db.batch([...writes, save]);
  } catch (error) {
    const concurrent = await prior(db, id);
    if (concurrent) {
      if (concurrent.operation !== operation) throw new DiaryError("request_conflict", "request ID collision", 409);
      return JSON.parse(concurrent.response_json) as T;
    }
    if (String(error).includes("UNIQUE") || String(error).includes("FOREIGN KEY")) {
      throw new DiaryError("conflict", "Concurrent update or duplicate slug", 409);
    }
    throw error;
  }
  return response;
}

async function requireEntry(db: DB, id: string): Promise<Entry> {
  const row = await db.prepare("SELECT * FROM entries WHERE id=?").bind(id).first<Entry>();
  if (!row) throw new DiaryError("not_found", "Entry not found", 404);
  return row;
}

export async function saveDraft(db: DB, args: unknown) {
  const a = args as Record<string,unknown>;
  const req = requestId(a.request_id);
  const existing = await prior(db, req);
  if (existing) {
    if (existing.operation !== "save_draft") throw new DiaryError("request_conflict", "request ID collision", 409);
    return JSON.parse(existing.response_json);
  }
  const draft = validateDraft(a);
  const id = crypto.randomUUID();
  const slug = slugFor(draft.title, id);
  const now = NOW();
  const response = { entry_id: id, slug, status: "draft", revision: 1, visibility: "owner" };
  return mutate(db, req, "save_draft", response, [
    db.prepare("INSERT INTO entries(id,slug,status,latest_revision,published_revision,created_at,updated_at) VALUES(?,?,'draft',1,NULL,?,?)").bind(id, slug, now, now),
    db.prepare("INSERT INTO entry_revisions(entry_id,revision,title,body_md,summary,tags_json,saved_at) VALUES(?,1,?,?,?,?,?)").bind(id, draft.title, draft.body_md, draft.summary ?? null, JSON.stringify(draft.tags), now)
  ]);
}

export async function listEntries(db: DB, args: unknown) {
  const a = (args ?? {}) as Record<string,unknown>;
  const status = a.status ?? "all";
  if (!["all", "draft", "published"].includes(String(status))) throw new DiaryError("invalid_input", "invalid status");
  const limit = a.limit === undefined ? 50 : Number(a.limit);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new DiaryError("invalid_input", "invalid limit");
  const query = status === "all"
    ? "SELECT id,slug,status,visibility,latest_revision,published_revision,created_at,updated_at,published_at FROM entries ORDER BY updated_at DESC,id DESC LIMIT ?"
    : "SELECT id,slug,status,visibility,latest_revision,published_revision,created_at,updated_at,published_at FROM entries WHERE status=? ORDER BY updated_at DESC,id DESC LIMIT ?";
  const prepared = db.prepare(query);
  const rows = await (status === "all" ? prepared.bind(limit) : prepared.bind(status, limit)).all<Entry>();
  return { entries: rows.results };
}

export async function getEntry(db: DB, args: unknown) {
  const a = args as Record<string,unknown>;
  const id = entryId(a.entry_id);
  const entry = await requireEntry(db, id);
  const revision = a.revision === undefined ? entry.latest_revision : revisionNumber(a.revision);
  const content = await db.prepare("SELECT * FROM entry_revisions WHERE entry_id=? AND revision=?").bind(id, revision).first<Revision>();
  if (!content) throw new DiaryError("not_found", "Revision not found", 404);
  return { entry, revision: content };
}

export async function updateEntry(db: DB, args: unknown) {
  const a = args as Record<string,unknown>;
  const id = entryId(a.entry_id);
  const req = requestId(a.request_id);
  const expected = revisionNumber(a.expected_revision);
  const previous = await prior(db, req);
  if (previous) {
    if (previous.operation !== "update_entry") throw new DiaryError("request_conflict", "request ID collision", 409);
    return JSON.parse(previous.response_json);
  }
  const draft = validateDraft(a);
  const entry = await requireEntry(db, id);
  if (entry.latest_revision !== expected) {
    throw new DiaryError("stale_revision", "Expected " + expected + ", current " + entry.latest_revision, 409);
  }
  const next = expected + 1;
  const now = NOW();
  const response = { entry_id: id, status: entry.status, revision: next, published_revision: entry.published_revision };
  return mutate(db, req, "update_entry", response, [
    db.prepare("UPDATE entries SET latest_revision=?,updated_at=? WHERE id=? AND latest_revision=?").bind(next, now, id, expected),
    db.prepare("INSERT INTO entry_revisions(entry_id,revision,title,body_md,summary,tags_json,saved_at,hero_media_id,hero_alt_text) "+
      "SELECT ?,?,?,?,?,?,?,hero_media_id,hero_alt_text FROM entry_revisions WHERE entry_id=? AND revision=?")
      .bind(id,next,draft.title,draft.body_md,draft.summary ?? null,JSON.stringify(draft.tags),now,id,expected)
  ]);
}

export async function publishEntry(db: DB, args: unknown) {
  const a = args as Record<string,unknown>;
  const id = entryId(a.entry_id);
  const req = requestId(a.request_id);
  const rev = revisionNumber(a.revision);
  const previous = await prior(db, req);
  if (previous) {
    if (previous.operation !== "publish_entry") throw new DiaryError("request_conflict", "request ID collision", 409);
    return JSON.parse(previous.response_json);
  }
  const entry = await requireEntry(db, id);
  // The reader view always resolves the newest revision. A publish operation
  // that selects an old revision would appear to succeed but display another.
  if (rev !== entry.latest_revision) throw new DiaryError("stale_revision", "Only the latest revision can be displayed; restore an older one as a new revision", 409);
  const candidate = await db.prepare("SELECT revision FROM entry_revisions WHERE entry_id=? AND revision=?").bind(id,rev).first<{revision:number}>();
  if (!candidate) throw new DiaryError("not_found", "Saved revision not found", 404);
  const now = NOW();
  // Omitted audience preserves current scope; old clients never broaden it.
  const audience = visibility(a.visibility === undefined ? (entry.visibility === "public" ? "public" : "owner") : a.visibility);
  const response = { entry_id: id, slug: entry.slug, status: "published", revision: rev, visibility: audience, public_path: "/posts/" + entry.slug };
  return mutate(db, req, "publish_entry", response, [
    db.prepare("UPDATE entries SET status='published',visibility=?,published_revision=?,published_at=?,updated_at=? WHERE id=?")
      .bind(audience, rev, now, now, id)
  ]);
}

/** Permanently remove a draft and its owned media. Never operates on published
 * entries, even if their visibility is owner-only.
 * R2 is deleted and verified before any D1 data is removed; a failed R2
 * operation leaves all D1 records available for a retry.
 */
export async function deleteDraft(db: DB, args: unknown) {
  const input = args as Record<string,unknown>;
  const id = entryId(input.entry_id);
  const expected = revisionNumber(input.expected_revision);
  const req = requestId(input.request_id);
  const previous = await prior(db,req);
  if(previous) {
    if(previous.operation!=="delete_draft") throw new DiaryError("request_conflict","Request ID collision",409);
    return JSON.parse(previous.response_json);
  }
  const entry = await requireEntry(db,id);
  if(entry.status!=="draft" || entry.published_revision!==null || entry.visibility!=="owner")
    throw new DiaryError("not_a_draft","Only private drafts can be deleted",409);
  if(entry.latest_revision!==expected)
    throw new DiaryError("stale_revision","Draft changed. Reload before deleting",409);

  const media = await db.prepare("SELECT storage_key FROM media_assets WHERE entry_id=?")
    .bind(id).all<{storage_key:string}>();
  if(media.results.length) {
    const storage=bucket();
    for(const asset of media.results) {
      // Recheck state between R2 operations; the final D1 batch also guards
      // against a stale version or an article that became published.
      const current = await requireEntry(db,id);
      if(current.status!=="draft" || current.latest_revision!==expected ||
         current.visibility!=="owner" || current.published_revision!==null)
        throw new DiaryError("stale_revision","Draft changed during deletion",409);
      try {
        await storage.delete(asset.storage_key);
        if(await storage.head(asset.storage_key))
          throw new Error("R2 object remains after delete");
      } catch {
        throw new DiaryError("media_delete_failed","Could not remove draft media. No article records were deleted; retry",503);
      }
    }
  }

  const allowed="id=? AND status='draft' AND visibility='owner' AND published_revision IS NULL AND latest_revision=?";
  const response={entry_id:id,status:"deleted",deleted:true,deleted_media:media.results.length};
  // Conditions on *every* table mutation keep a concurrent publish/edit from
  // losing any D1 records. They execute inside D1's atomic batch.
  const statements=[
    db.prepare("DELETE FROM referrer_daily WHERE entry_id=? AND EXISTS (SELECT 1 FROM entries WHERE "+allowed+")")
      .bind(id,id,expected),
    db.prepare("DELETE FROM media_assets WHERE entry_id=? AND EXISTS (SELECT 1 FROM entries WHERE "+allowed+")")
      .bind(id,id,expected),
    db.prepare("DELETE FROM entry_revisions WHERE entry_id=? AND EXISTS (SELECT 1 FROM entries WHERE "+allowed+")")
      .bind(id,id,expected),
    db.prepare("DELETE FROM entries WHERE "+allowed).bind(id,expected),
    // changes() reflects the guarded DELETE immediately above. The request is
    // not marked successful if nothing was removed.
    db.prepare("INSERT INTO mutation_requests(request_id,operation,response_json,created_at) "+
      "SELECT ?,'delete_draft',?,? WHERE changes()=1")
      .bind(req,JSON.stringify(response),NOW())
  ];
  try { await db.batch(statements); } catch {
    const replay=await prior(db,req);
    if(replay?.operation==="delete_draft")return JSON.parse(replay.response_json);
    throw new DiaryError("delete_failed","Draft deletion failed. Refresh and try again",409);
  }
  if(!await prior(db,req))
    throw new DiaryError("stale_revision","Draft changed during deletion. Refresh and try again",409);
  return response;
}

export async function unpublishEntry(db: DB, args: unknown) {
  const a = args as Record<string,unknown>;
  const id = entryId(a.entry_id);
  const req = requestId(a.request_id);
  const previous = await prior(db, req);
  if (previous) {
    if (previous.operation !== "unpublish_entry") throw new DiaryError("request_conflict", "request ID collision", 409);
    return JSON.parse(previous.response_json);
  }
  await requireEntry(db, id);
  const response = { entry_id: id, status: "draft", visibility: "owner", published_revision: null };
  return mutate(db, req, "unpublish_entry", response, [
    db.prepare("UPDATE entries SET status='draft',visibility='owner',published_revision=NULL,published_at=NULL,updated_at=? WHERE id=?").bind(NOW(), id)
  ]);
}

export async function exportEntries(db: DB, args: unknown) {
  const a = (args ?? {}) as Record<string,unknown>;
  const ids = a.entry_ids;
  if (ids !== undefined && (!Array.isArray(ids) || ids.length > 100 || !ids.every(x => typeof x === "string" && /^[a-zA-Z0-9-]{8,80}$/.test(x)))) {
    throw new DiaryError("invalid_input", "invalid entry_ids");
  }
  const includeDrafts = a.include_drafts === true;
  const all = await db.prepare("SELECT * FROM entries ORDER BY created_at,id").all<Entry>();
  const entries = all.results.filter(x => (includeDrafts || x.status === "published") && (ids === undefined || (ids as string[]).includes(x.id)))
    // Public-only export must describe exactly what readers see. Full owner backup
    // preserves original publication pointers and every historical revision.
    .map(x => includeDrafts || x.status !== "published" ? x : {...x, published_revision:x.latest_revision});
  if (entries.length > 100) throw new DiaryError("export_too_large", "Export in smaller batches", 413);
  const revisions: Revision[] = [];
  for (const entry of entries) {
    const revs = await db.prepare("SELECT * FROM entry_revisions WHERE entry_id=? ORDER BY revision").bind(entry.id).all<Revision>();
    revisions.push(...revs.results.filter(x => includeDrafts || x.revision === entry.published_revision));
  }
  return makeExport(entries, revisions, NOW());
}


/** Shared revision precondition for owner media uploads.
 * Keep this check before reading bytes or writing to R2.
 */
async function requireCurrentMediaRevision(db: DB, id: string, value: unknown): Promise<void> {
 const expected=revisionNumber(value);
 const entry=await requireEntry(db,id);
 if(entry.latest_revision!==expected)
  throw new DiaryError("stale_revision","Article changed; reload the latest revision",409);
}

type HeroArgs=Record<string,unknown>;
async function newHeroRevision(db:DB,input:HeroArgs,action:string,mediaResult?:Record<string,unknown>){
 const id=entryId(input.entry_id),req=requestId(input.request_id);
 const existing=await prior(db,req);
 if(existing){
  if(existing.operation!==action)throw new DiaryError("request_conflict","Request ID used for another operation",409);
  return JSON.parse(existing.response_json);
 }
 const expected=revisionNumber(input.expected_revision);
 const article=await requireEntry(db,id);
 if(article.latest_revision!==expected)throw new DiaryError("stale_revision","Expected "+expected+", current "+article.latest_revision,409);
 const heroId=input.hero_media_id;
 if(heroId!==null){
  if(typeof heroId!=="string"||!MEDIA_ID_RE.test(heroId))throw new DiaryError("invalid_media_id","Invalid hero image ID");
  const asset=await db.prepare("SELECT id FROM media_assets WHERE id=? AND entry_id=? AND content_type LIKE 'image/%'")
   .bind(heroId,id).first<{id:string}>();
  if(!asset)throw new DiaryError("not_found","Hero image must belong to the selected article",404);
 }
 if(input.alt_text!==undefined && (typeof input.alt_text!=="string"||input.alt_text.length>200))
  throw new DiaryError("invalid_input","Image alt text must be at most 200 characters",400);
 const alt=heroId===null?null:(typeof input.alt_text==="string"?input.alt_text:null);
 const next=expected+1,now=NOW();
 const response={entry_id:id,status:article.status,revision:next,published_revision:article.published_revision,
  hero_media_id:heroId,hero_alt_text:alt,...mediaResult};
 return mutate(db,req,action,response,[
  db.prepare("UPDATE entries SET latest_revision=?,updated_at=? WHERE id=? AND latest_revision=?").bind(next,now,id,expected),
  db.prepare("INSERT INTO entry_revisions(entry_id,revision,title,body_md,summary,tags_json,saved_at,hero_media_id,hero_alt_text) "+
   "SELECT entry_id,?,title,body_md,summary,tags_json,?,?,? FROM entry_revisions WHERE entry_id=? AND revision=?")
   .bind(next,now,heroId,alt,id,expected)
 ]);
}

export async function setHeroMedia(db:DB,args:unknown){
 const input=args as HeroArgs;
 return newHeroRevision(db,input,"set_entry_hero_media");
}
export async function clearHeroMedia(db:DB,args:unknown){
 const input={...(args as HeroArgs),hero_media_id:null};
 return newHeroRevision(db,input,"clear_entry_hero_media");
}

/** Download only from an explicit trusted HTTPS-host allowlist. Never expose
 * source URLs, signed query strings, or redirects in persisted records. */
export async function importMediaFromUrl(db:DB,args:unknown){
 const input=args as HeroArgs;
 const id=entryId(input.entry_id),req=requestId(input.request_id);
 const existing=await prior(db,req);
 if(existing){
  if(existing.operation!=="import_media_from_url")throw new DiaryError("request_conflict","Request ID used for another operation",409);
  return JSON.parse(existing.response_json);
 }
 await requireCurrentMediaRevision(db,id,input.expected_revision);
 if(input.usage!=="hero"&&input.usage!=="inline")
  throw new DiaryError("invalid_input","Usage must be hero or inline");
 if(typeof input.source_url!=="string")throw new DiaryError("invalid_image_url","Source URL required");
 const configured=(env as unknown as {AI_DIARY_IMAGE_SOURCE_HOSTS?:string}).AI_DIARY_IMAGE_SOURCE_HOSTS;
 const {image}=await downloadImage(input.source_url,configuredImageHosts(configured));
 const asset=await createMedia(db,bucket(),id,image);
 // Inline imports only return Markdown; the caller saves a new revision explicitly.
 return commitUploadedMedia(db,input,id,req,asset,"import_media_from_url",asset.markdown);
}


/** Commit a newly stored R2 asset, deleting unused bytes on failure or
 * when another request with the same idempotency key already won.
 */
async function commitUploadedMedia(db:DB,input:HeroArgs,id:string,req:string,
 asset:Awaited<ReturnType<typeof createMedia>>,operation:"upload_chatgpt_image"|"import_media_from_url",inlineMarkdown:string){
 try{
  let result:Record<string,unknown>;
  if(input.usage==="hero"){
   result=await newHeroRevision(db,{...input,hero_media_id:asset.id},operation,
    {media_id:asset.id,media_url:asset.url});
  }else{
   result=await mutate(db,req,operation,
    {entry_id:id,usage:"inline",media_id:asset.id,media_url:asset.url,markdown:inlineMarkdown},[]);
  }
  if(result.media_id!==asset.id)await deleteMedia(db,bucket(),asset.id,id).catch(()=>{});
  return result;
 }catch(error){
  await deleteMedia(db,bucket(),asset.id,id).catch(()=>{});
  throw error;
 }
}

/** Resolve a ChatGPT host-file reference, validate signed HTTPS download and
 * transfer actual image bytes to private R2. This never broadens publication.
 */
export async function uploadChatGPTImage(db:DB,args:unknown){
 const input=args as HeroArgs;
 const id=entryId(input.entry_id),req=requestId(input.request_id);
 const existing=await prior(db,req);
 if(existing){
  if(existing.operation!=="upload_chatgpt_image")
   throw new DiaryError("request_conflict","Request ID used for another operation",409);
  return JSON.parse(existing.response_json);
 }
 await requireCurrentMediaRevision(db,id,input.expected_revision);
 if(input.usage!=="hero"&&input.usage!=="inline")
  throw new DiaryError("invalid_input","Usage must be hero or inline");
 if(input.alt_text!==undefined && (typeof input.alt_text!=="string"||input.alt_text.length>200))
  throw new DiaryError("invalid_input","Image alt text must be at most 200 characters",400);
 const hosts=(env as unknown as {AI_DIARY_CHATGPT_FILE_HOSTS?:string}).AI_DIARY_CHATGPT_FILE_HOSTS;
 const image=await downloadChatGPTImage(input.file,hosts);
 const asset=await createMedia(db,bucket(),id,image);
 return commitUploadedMedia(db,input,id,req,asset,"upload_chatgpt_image",asset.markdown);
}

export async function dispatch(db: DB, action: string, args: unknown) {
  if (!args || typeof args !== "object" || Array.isArray(args)) throw new DiaryError("invalid_input", "JSON object required");
  switch(action) {
    case "save_draft": return saveDraft(db,args);
    case "list_entries": return listEntries(db,args);
    case "get_entry": return getEntry(db,args);
    case "update_entry": return updateEntry(db,args);
    case "publish_entry": return publishEntry(db,args);
    case "unpublish_entry": return unpublishEntry(db,args);
    case "delete_draft": return deleteDraft(db,args);
    case "export_entries": return exportEntries(db,args);
    case "set_entry_hero_media": return setHeroMedia(db,args);
    case "clear_entry_hero_media": return clearHeroMedia(db,args);
    case "import_media_from_url": return importMediaFromUrl(db,args);
    case "upload_chatgpt_image": return uploadChatGPTImage(db,args);
    case "delete_media": {
      const input=args as Record<string,unknown>;
      return deleteMedia(db,bucket(),typeof input.media_id==="string"?input.media_id:"",
        typeof input.entry_id==="string"?input.entry_id:undefined);
    }
    default: throw new DiaryError("not_found", "Unknown operation", 404);
  }
}

