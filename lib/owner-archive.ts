import { entryId, DiaryError } from "./input.ts";
type DB = D1Database;

export type ArchiveItem = {
  id: string;
  slug: string;
  status: "draft" | "published";
  visibility: "owner"|"paid"|"registered"|"public";
  latest_revision: number;
  matched_revision: number;
  published_revision: number | null;
  updated_at: string;
  title: string;
  summary: string | null;
  tags_json: string;
};
export function archiveFilters(input: {q?:string;status?:string;tag?:string;offset?:number}) {
  const q = (input.q ?? "").trim().slice(0,100);
  const tag = (input.tag ?? "").trim().slice(0,40);
  const status = input.status === "draft" || input.status === "published" ? input.status : "all";
  const offset = Number.isSafeInteger(input.offset) && input.offset! >= 0 && input.offset! <= 10000 ? input.offset! : 0;
  return {q,tag,status,offset};
}
export async function searchOwnerArchive(db:DB, input:{q?:string;status?:string;tag?:string;offset?:number}) {
  const filter = archiveFilters(input);
  const where: string[] = [];
  const revisionWhere: string[] = ["s.entry_id=e.id"];
  const params: (string|number)[] = [];
  if (filter.q) {
    revisionWhere.push("(instr(s.title,?)>0 OR instr(s.body_md,?)>0 OR instr(coalesce(s.summary,''),?)>0)");
    params.push(filter.q,filter.q,filter.q);
  }
  if (filter.tag) {
    revisionWhere.push("EXISTS (SELECT 1 FROM json_each(s.tags_json) jt WHERE jt.value=?)");
    params.push(filter.tag);
  }
  if (filter.status !== "all") { where.push("e.status=?"); params.push(filter.status); }
  const sql =
    "SELECT e.id,e.slug,e.status,e.visibility,e.latest_revision,e.published_revision,e.updated_at,r.revision AS matched_revision,r.title,r.summary,r.tags_json "+
    "FROM entries e JOIN entry_revisions r ON r.entry_id=e.id AND r.revision=(SELECT MAX(s.revision) FROM entry_revisions s WHERE "+revisionWhere.join(" AND ")+") "+
    (where.length ? "WHERE "+where.join(" AND ")+" " : "") +
    "ORDER BY e.updated_at DESC,e.id DESC LIMIT ? OFFSET ?";
  const rows=await db.prepare(sql).bind(...params,61,filter.offset).all<ArchiveItem>();
  return {entries:rows.results.slice(0,60),hasMore:rows.results.length>60,filters:filter};
}
export type ArchiveRevision = {
  entry_id:string;revision:number;title:string;summary:string|null;
  body_md:string;tags_json:string;saved_at:string;
};
export async function getOwnerArchiveEntry(db:DB,id:string,revision?:number) {
  entryId(id);
  const entry=await db.prepare("SELECT * FROM entries WHERE id=?").bind(id).first<ArchiveItem>();
  if(!entry) throw new DiaryError("not_found","Entry not found",404);
  const history=await db.prepare(
    "SELECT revision,title,summary,tags_json,saved_at FROM entry_revisions WHERE entry_id=? ORDER BY revision DESC LIMIT 100"
  ).bind(id).all<Omit<ArchiveRevision,"body_md"|"entry_id">>();
  const selected=revision ?? entry.latest_revision;
  if(!Number.isSafeInteger(selected) || selected < 1) throw new DiaryError("invalid_revision","Invalid revision",400);
  const content=await db.prepare("SELECT * FROM entry_revisions WHERE entry_id=? AND revision=?").bind(id,selected).first<ArchiveRevision>();
  if(!content) throw new DiaryError("not_found","Revision not found",404);
  return {entry,history:history.results,content};
}
