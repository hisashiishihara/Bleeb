import { anonymous, publishedReaderScope, type Viewer, type Visibility } from "./access.ts";

/** Reader-only navigation. Every SQL query enforces status and audience before
 * filtering the latest saved revision; never include drafts or history.
 */
export type ArchiveItem={
 slug:string;published_at:string;updated_at:string;visibility:Visibility;
 title:string;summary:string|null;tags_json:string;
};
export type ArchiveFilters={q:string;month:string;tag:string;offset:number};
export function parseArchiveFilters(input:{q?:string;month?:string;tag?:string;offset?:string}):ArchiveFilters {
 const q=typeof input.q==="string"?input.q.trim().slice(0,100):"";
 const tag=typeof input.tag==="string"?input.tag.trim().slice(0,40):"";
 const month=typeof input.month==="string"&&/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month)?input.month:"";
 const raw=typeof input.offset==="string"?input.offset:"";
 const offset=/^(0|[1-9]\d{0,4})$/.test(raw)?Math.min(Number(raw),9900):0;
 return {q,month,tag,offset};
}

export async function readableArchive(db:D1Database,viewer:Viewer=anonymous,f:ArchiveFilters,limit=30) {
 const conditions=[publishedReaderScope(viewer)];
 const values:(string|number)[]=[];
 if(f.month){
  // Tokyo's publishing calendar is UTC+9 (no daylight-saving time).
  conditions.push("strftime('%Y-%m',e.published_at,'+9 hours')=?");
  values.push(f.month);
 }
 if(f.tag){
  conditions.push("EXISTS (SELECT 1 FROM json_each(CASE WHEN json_valid(r.tags_json) THEN r.tags_json ELSE '[]' END) jt WHERE jt.value=?)");
  values.push(f.tag);
 }
 if(f.q){
  conditions.push("(instr(r.title,?)>0 OR instr(coalesce(r.summary,''),?)>0 OR instr(r.body_md,?)>0)");
  values.push(f.q,f.q,f.q);
 }
 const pageSize=Math.max(1,Math.min(50,Number.isSafeInteger(limit)?limit:30));
 const sql="SELECT e.slug,e.published_at,e.updated_at,e.visibility,r.title,r.summary,r.tags_json "+
  "FROM entries e JOIN entry_revisions r ON r.entry_id=e.id AND r.revision=e.latest_revision "+
  "WHERE "+conditions.join(" AND ")+" ORDER BY e.published_at DESC,e.id DESC LIMIT ? OFFSET ?";
 const rows=await db.prepare(sql).bind(...values,pageSize+1,f.offset).all<ArchiveItem>();
 return {items:rows.results.slice(0,pageSize),hasMore:rows.results.length>pageSize};
}

export async function readableArchiveMonths(db:D1Database,viewer:Viewer=anonymous){
 const rows=await db.prepare(
  "SELECT strftime('%Y-%m',e.published_at,'+9 hours') AS month,COUNT(*) AS count "+
  "FROM entries e WHERE "+publishedReaderScope(viewer)+" GROUP BY month ORDER BY month DESC LIMIT 240"
 ).all<{month:string;count:number}>();
 return rows.results;
}

export async function readableTagCounts(db:D1Database,viewer:Viewer=anonymous){
 const rows=await db.prepare(
  "SELECT jt.value AS tag,COUNT(*) AS count FROM entries e "+
  "JOIN entry_revisions r ON r.entry_id=e.id AND r.revision=e.latest_revision "+
  "JOIN json_each(CASE WHEN json_valid(r.tags_json) THEN r.tags_json ELSE '[]' END) jt "+
  "WHERE "+publishedReaderScope(viewer)+" AND jt.type='text' AND length(jt.value)>0 "+
  "GROUP BY jt.value ORDER BY count DESC,jt.value ASC LIMIT 200"
 ).all<{tag:string;count:number}>();
 return rows.results;
}
