import { authorizedOwner, database, dispatch } from "../../../../lib/store";
import { DiaryError } from "../../../../lib/input";
import { isSameOriginPost } from "../../../../lib/referrers";

export const dynamic = "force-dynamic";
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  try {
    authorizedOwner(request);
    if (request.headers.has("origin") && !isSameOriginPost(request.url,request.headers.get("origin"))) {
      throw new DiaryError("forbidden","Same-origin request required",403);
    }
    const { action } = await context.params;
    const length = Number(request.headers.get("content-length") ?? "0");
    if (length > 180000) throw new DiaryError("too_large", "Request too large", 413);
    const body = await request.text();
    if (body.length > 180000) throw new DiaryError("too_large", "Request too large", 413);
    let args: unknown;
    try { args = JSON.parse(body); } catch { throw new DiaryError("invalid_json", "Malformed JSON"); }
    const result = await dispatch(database(), action, args);
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const err = error instanceof DiaryError ? error : new DiaryError("internal_error","Operation failed",500);
    return Response.json({ error: err.code, message: err.message }, { status:err.status, headers:{"Cache-Control":"no-store"} });
  }
}
