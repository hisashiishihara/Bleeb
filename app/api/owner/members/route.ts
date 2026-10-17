import { authorizedOwner, database } from "../../../../lib/store";
import { setMembership } from "../../../../lib/membership";
import { isSameOriginPost } from "../../../../lib/referrers";
import { DiaryError } from "../../../../lib/input";
export const dynamic="force-dynamic";
export async function POST(request:Request) {
  const headers={"Cache-Control":"private, no-store"};
  try {
    authorizedOwner(request);
    if(!isSameOriginPost(request.url,request.headers.get("origin"))) return new Response(null,{status:403,headers});
    const body=await request.text();
    if(body.length>2000) return new Response(null,{status:413,headers});
    const json=request.headers.get("content-type")?.includes("application/json");
    const data=json?JSON.parse(body):Object.fromEntries(new URLSearchParams(body));
    if(!json) { data.active=data.active==="true";data.paid_active=data.paid_active==="true"; }
    await setMembership(database(),data);
    return new Response(null,{status:303,headers:{...headers,Location:"/owner/members"}});
  } catch(error) {
    return Response.json({error:error instanceof DiaryError?error.code:"operation_failed"},{status:error instanceof DiaryError?error.status:500,headers});
  }
}
