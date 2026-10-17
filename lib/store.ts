import { env } from "cloudflare:workers";
import { DiaryError, entryId, requestId, revisionNumber, validateDraft, slugFor } from "./input";
import { makeExport, type ExportEntry, type ExportRevision } from "./export";

type Entry = ExportEntry;
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
  // Until authenticated header provenance is verified on a deployed Site, owner APIs are off.
  if (e.AI_DIARY_OWNER_API_ENABLED !== "true" || !e.AI_DIARY_OWNER_EMAIL || !actual ||
      actual.trim().toLowerCase() !== e.AI_DIARY_OWNER_EMAIL.trim().toLowerCase()) {
    throw new DiaryError("forbidden", "Owner authentication is required", 403);
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
  const response = { entry_id: id, slug, status: "draft", revision: 1 };
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
    ? "SELECT id,slug,status,latest_revision,published_revision,created_at,updated_at,published_at FROM entries ORDER BY updated_at DESC,id DESC LIMIT ?"
    : "SELECT id,slug,status,latest_revision,published_revision,created_at,updated_at,published_at FROM entries WHERE status=? ORDER BY updated_at DESC,id DESC LIMIT ?";
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
    db.prepare("INSERT INTO entry_revisions(entry_id,revision,title,body_md,summary,tags_json,saved_at) VALUES(?,?,?,?,?,?,?)").bind(id, next, draft.title, draft.body_md, draft.summary ?? null, JSON.stringify(draft.tags), now)
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
  const candidate = await db.prepare("SELECT revision FROM entry_revisions WHERE entry_id=? AND revision=?").bind(id,rev).first<{revision:number}>();
  if (!candidate) throw new DiaryError("not_found", "Saved revision not found", 404);
  const now = NOW();
  const response = { entry_id: id, slug: entry.slug, status: "published", revision: rev, public_path: "/posts/" + entry.slug };
  return mutate(db, req, "publish_entry", response, [
    db.prepare("UPDATE entries SET status='published',published_revision=?,published_at=?,updated_at=? WHERE id=?")
      .bind(rev, now, now, id)
  ]);
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
  const response = { entry_id: id, status: "draft", published_revision: null };
  return mutate(db, req, "unpublish_entry", response, [
    db.prepare("UPDATE entries SET status='draft',published_revision=NULL,published_at=NULL,updated_at=? WHERE id=?").bind(NOW(), id)
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
  const entries = all.results.filter(x => (includeDrafts || x.status === "published") && (ids === undefined || (ids as string[]).includes(x.id)));
  if (entries.length > 100) throw new DiaryError("export_too_large", "Export in smaller batches", 413);
  const revisions: Revision[] = [];
  for (const entry of entries) {
    const revs = await db.prepare("SELECT * FROM entry_revisions WHERE entry_id=? ORDER BY revision").bind(entry.id).all<Revision>();
    revisions.push(...revs.results.filter(x => includeDrafts || x.revision === entry.published_revision));
  }
  return makeExport(entries, revisions, NOW());
}

export async function publicEntries(db: DB, limit = 50) {
  const rows = await db.prepare(
    "SELECT e.slug,e.published_at,r.title,r.summary FROM entries e JOIN entry_revisions r ON r.entry_id=e.id AND r.revision=e.published_revision WHERE e.status='published' AND e.published_revision IS NOT NULL ORDER BY e.published_at DESC LIMIT ?"
  ).bind(limit).all<{slug:string;published_at:string;title:string;summary:string|null}>();
  return rows.results;
}

export async function publicEntry(db: DB, slug: string) {
  if (!/^[a-z0-9-]{1,90}$/.test(slug)) return null;
  return db.prepare(
    "SELECT e.slug,e.published_at,e.updated_at,r.title,r.summary,r.body_md FROM entries e JOIN entry_revisions r ON r.entry_id=e.id AND r.revision=e.published_revision WHERE e.slug=? AND e.status='published' AND e.published_revision IS NOT NULL"
  ).bind(slug).first<{slug:string;published_at:string;updated_at:string;title:string;summary:string|null;body_md:string}>();
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
    case "export_entries": return exportEntries(db,args);
    default: throw new DiaryError("not_found", "Unknown operation", 404);
  }
}
