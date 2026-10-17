/**
 * Anonymous, coarse referral classification. No visitor ID, IP, cookies,
 * query strings, full page URLs, or search terms are persisted.
 */
export type ReferralSource = { host: string; origin: string };
export function parseReferralSource(referrer: unknown, siteUrl: string): ReferralSource | null {
  if (typeof referrer !== "string" || referrer.length > 2048 || !referrer.trim()) return null;
  try {
    const source = new URL(referrer);
    const site = new URL(siteUrl);
    if (source.protocol !== "https:" || !source.hostname || source.username || source.password) return null;
    const host = source.hostname.toLowerCase();
    if (host.length > 253 || !/^[a-z0-9.-]+$/.test(host) || host === "localhost" || host.endsWith(".local")) return null;
    if (source.hostname === site.hostname || source.origin === site.origin) return null;
    return { host, origin: source.origin };
  } catch {
    return null;
  }
}
export function isSameOriginPost(requestUrl: string, originHeader: string | null): boolean {
  if (!originHeader) return false;
  try {
    return new URL(requestUrl).origin === new URL(originHeader).origin && originHeader === new URL(originHeader).origin;
  } catch {
    return false;
  }
}
