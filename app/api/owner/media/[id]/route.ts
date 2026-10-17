import { authorizedOwner, database } from "../../../../../lib/store";
import { deleteMedia } from "../../../../../lib/media-deletion";
import { bucket } from "../../../../../lib/media-store";
import { DiaryError } from "../../../../../lib/input";
import { isSameOriginPost } from "../../../../../lib/referrers";

export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store","CDN-Cache-Control":"no-store"};

export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  authorizedOwner(request);
  if(!isSameOriginPost(request.url,request.headers.get("origin")))
   throw new DiaryError("forbidden","Same-origin request required",403);
  const {id}=await params;
  const result=await deleteMedia(database(),bucket(),id);
  return Response.json(result,{headers});
 }catch(e){
  const error=e instanceof DiaryError?e:new DiaryError("delete_failed","Unable to delete media",500);
  return Response.json({error:error.code,message:error.message},{status:error.status,headers});
 }
}
