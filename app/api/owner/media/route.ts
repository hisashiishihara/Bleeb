import { authorizedOwner, database } from "../../../../lib/store";
import { bucket, createMedia } from "../../../../lib/media-store";
import { MAX_UPLOAD_BYTES } from "../../../../lib/media-rules";
import { entryId, DiaryError } from "../../../../lib/input";
import { isSameOriginPost } from "../../../../lib/referrers";

export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};

export async function POST(request:Request){
 try{
   authorizedOwner(request);
   // Browser-only upload: require an Origin, unlike server-side MCP calls.
   if(!isSameOriginPost(request.url,request.headers.get("origin")))throw new DiaryError("forbidden","Same-origin upload required",403);
   const size=Number(request.headers.get("content-length")||"0");
   if(!Number.isFinite(size)||size>MAX_UPLOAD_BYTES)throw new DiaryError("too_large","Request too large",413);
   if(!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;"))throw new DiaryError("invalid_input","Multipart form required");
   const data=await request.formData();
   const id=entryId(data.get("entry_id"));
   const file=data.get("file");
   if(!(file instanceof File))throw new DiaryError("invalid_input","A file is required");
   const result=await createMedia(database(),bucket(),id,file);
   return Response.json(result,{status:201,headers});
 }catch(error){
   const err=error instanceof DiaryError?error:new DiaryError("upload_failed","Upload failed",500);
   return Response.json({error:err.code,message:err.message},{status:err.status,headers});
 }
}
