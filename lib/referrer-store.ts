import { env } from "cloudflare:workers";
import { parseReferralSource } from "./referrers";

type DB = D1Database;

export function referralsEnabled(): boolean {
  return (env as unknown as { AI_DIARY_REFERRER_TRACKING_ENABLED?: string }).AI_DIARY_REFERRER_TRACKING_ENABLED === "true";
}

/** Never record a visit to an unpublished or unrecognised article. */
export async function recordPublicReferral(db: DB, slug: string, referrer: unknown, siteUrl: string) {
  if (!referralsEnabled() || typeof slug !== "string" || !/^[a-z0-9-]{1,90}$/.test(slug)) return false;
  const source = parseReferralSource(referrer, siteUrl);
  if (!source) return false;
  const entry = await db.prepare(
    "SELECT id FROM entries WHERE slug=? AND status='published' AND published_revision IS NOT NULL"
  ).bind(slug).first<{id:string}>();
  if (!entry) return false;
  const day = new Date().toISOString().slice(0, 10);
  await db.prepare(
    "INSERT INTO referrer_daily (day,entry_id,source_host,hits) VALUES (?,?,?,1) "+
    "ON CONFLICT(day,entry_id,source_host) DO UPDATE SET hits=hits+1"
  ).bind(day, entry.id, source.host).run();
  return true;
}

export async function referrerSummary(db: DB) {
  const sources = await db.prepare(
    "SELECT source_host, SUM(hits) AS visits FROM referrer_daily "+
    "WHERE day >= date('now','-90 days') GROUP BY source_host ORDER BY visits DESC LIMIT 60"
  ).all<{source_host:string;visits:number}>();
  const articles = await db.prepare(
    "SELECT e.slug, r.title, SUM(d.hits) AS visits FROM referrer_daily d "+
    "JOIN entries e ON e.id=d.entry_id "+
    "JOIN entry_revisions r ON r.entry_id=e.id AND r.revision=e.latest_revision "+
    "WHERE d.day >= date('now','-90 days') "+
    "GROUP BY e.id,e.slug,r.title ORDER BY visits DESC LIMIT 60"
  ).all<{slug:string;title:string;visits:number}>();
  return { sources:sources.results, articles:articles.results };
}
