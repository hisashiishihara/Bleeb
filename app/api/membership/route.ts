import { database } from "../../../lib/store";
import { requestIdentity } from "../../../lib/access";
import { registerMember } from "../../../lib/membership";
import { isSameOriginPost } from "../../../lib/referrers";
import { DiaryError } from "../../../lib/input";
export const dynamic="force-dynamic";
export async function POST(request:Request) {
  const headers={"Cache-Control":"private, no-store"};
  if(!isSameOriginPost(request.url,request.headers.get("origin"))) return new Response(null,{status:403,headers});
  try {
    // There are intentionally no client-supplied IDs, tiers or entitlement fields.
    const body=await request.text();
    if(body.length>200) return new Response(null,{status:413,headers});
    const data=request.headers.get("content-type")?.includes("application/json")?JSON.parse(body):Object.fromEntries(new URLSearchParams(body));
    if(data?.action!=="register" || Object.keys(data).some(k=>k!=="action")) return new Response(null,{status:400,headers});
    await registerMember(database(),requestIdentity(request.headers));
    return new Response(null,{status:303,headers:{...headers,Location:"/account"}});
  } catch(error) {
    return Response.json({error:error instanceof DiaryError?error.code:"invalid_request"},{status:error instanceof DiaryError?error.status:400,headers});
  }
}
