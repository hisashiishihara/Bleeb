import {authorizedOwner,database} from "../../../../../lib/store";
import {getOwnerArchiveEntry} from "../../../../../lib/owner-archive";
import {noteClipboardPayload} from "../../../../../lib/note-copy";

export const dynamic="force-dynamic";
const headers={
 "Cache-Control":"private, no-store, max-age=0",
 "CDN-Cache-Control":"no-store",
 "X-Content-Type-Options":"nosniff",
 "X-Robots-Tag":"noindex, nofollow, noarchive"
};
const error=(status:number)=>new Response(null,{status,headers});

/** Read-only: copies exactly the saved owner revision and never contacts note. */
export async function GET(request:Request,context:{params:Promise<{id:string}>}){
 try{authorizedOwner(request);}catch{return error(404);}
 const url=new URL(request.url);
 if([...url.searchParams.keys()].some(key=>key!=="revision"))return error(400);
 const expected=Number(url.searchParams.get("revision"));
 if(!Number.isSafeInteger(expected)||expected<1)return error(400);
 let record:Awaited<ReturnType<typeof getOwnerArchiveEntry>>;
 try{
  const {id}=await context.params;
  record=await getOwnerArchiveEntry(database(),id);
 }catch{return error(404);}
 if(record.entry.latest_revision!==expected)return error(409);
 const data=noteClipboardPayload(record.entry,record.content,url.origin);
 return Response.json({title:data.title,html:data.html,text:data.text},{headers});
}
