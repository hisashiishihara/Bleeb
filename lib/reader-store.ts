import { anonymous, audienceSql, type Viewer, type Visibility } from "./access.ts";
/** Only entries already in published status are readable; their newest saved
 * revision is the displayed revision. Audience filtering still applies first.
 */
export type ReaderEntry={slug:string;published_at:string;updated_at:string;title:string;summary:string|null;body_md:string;hero_media_id:string|null;hero_alt_text:string|null;visibility:Visibility};
export async function readableEntries(db:D1Database,viewer:Viewer=anonymous,limit=50) {
  return (await db.prepare("SELECT e.slug,e.published_at,e.visibility,r.title,r.summary,r.hero_media_id,r.hero_alt_text FROM entries e JOIN entry_revisions r ON r.entry_id=e.id AND r.revision=e.latest_revision WHERE e.status='published' AND e.published_revision IS NOT NULL AND ("+audienceSql(viewer)+") ORDER BY e.published_at DESC LIMIT ?").bind(limit).all<Pick<ReaderEntry,"slug"|"published_at"|"visibility"|"title"|"summary"|"hero_media_id"|"hero_alt_text">>()).results;
}
export async function readableEntry(db:D1Database,slug:string,viewer:Viewer=anonymous) {
  if (!/^[a-z0-9-]{1,90}$/.test(slug)) return null;
  return db.prepare("SELECT e.slug,e.published_at,e.updated_at,e.visibility,r.title,r.summary,r.body_md,r.hero_media_id,r.hero_alt_text FROM entries e JOIN entry_revisions r ON r.entry_id=e.id AND r.revision=e.latest_revision WHERE e.slug=? AND e.status='published' AND e.published_revision IS NOT NULL AND ("+audienceSql(viewer)+")").bind(slug).first<ReaderEntry>();
}
