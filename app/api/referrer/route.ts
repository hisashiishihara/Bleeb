import { database } from "../../../lib/store";
import { isSameOriginPost } from "../../../lib/referrers";
import { recordPublicReferral, referralsEnabled } from "../../../lib/referrer-store";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  // Deliberately disabled on the owner-only test site unless opted in.
  if (!referralsEnabled()) return new Response(null, { status: 204, headers });
  if (!isSameOriginPost(request.url, request.headers.get("origin"))) {
    return new Response(null, { status: 403, headers });
  }
  const length = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(length) || length > 2500) return new Response(null, { status: 413, headers });
  const body = await request.text();
  if (body.length > 2500) return new Response(null, { status: 413, headers });
  let data: unknown;
  try { data = JSON.parse(body); } catch { return new Response(null, { status: 400, headers }); }
  if (!data || typeof data !== "object" || Array.isArray(data)) return new Response(null, { status: 400, headers });
  const input = data as Record<string, unknown>;
  // Analytics must never interfere with public viewing or surface database details.
  try { await recordPublicReferral(database(), input.slug as string, input.referrer, request.url); }
  catch { return new Response(null, { status: 503, headers }); }
  return new Response(null, { status: 204, headers });
}
