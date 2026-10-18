import { authorizedOwner, database } from "../../../../../lib/store";
import { getOwnerArchiveEntry } from "../../../../../lib/owner-archive";
import { noteExport, type NoteMode } from "../../../../../lib/note-export";

export const dynamic="force-dynamic";
const base={
 "Cache-Control":"private, no-store, max-age=0",
 "CDN-Cache-Control":"no-store",
 "X-Content-Type-Options":"nosniff",
 "X-Robots-Tag":"noindex, nofollow, noarchive"
};
const error=(status:number)=>new Response(null,{status,headers:base});

/** Read-only owner export: never changes article state and never contacts note.
 * The revision precondition prevents exporting a different revision than the editor shows.
 */
export async function GET(request:Request,context:{params:Promise<{id:string}>}){
 try{authorizedOwner(request);}catch{return error(404);}
 const url=new URL(request.url);
 const mode=url.searchParams.get("mode");
 if(mode!=="excerpt"&&mode!=="full")return error(400);
 const expected=Number(url.searchParams.get("revision"));
 if(!Number.isSafeInteger(expected)||expected<1)return error(400);
 let record:Awaited<ReturnType<typeof getOwnerArchiveEntry>>;
 try{
  const {id}=await context.params;
  record=await getOwnerArchiveEntry(database(),id);
 }catch{return error(404);}
 if(record.entry.latest_revision!==expected)return error(409);
 const data=noteExport(record.entry,record.content,mode as NoteMode,url.origin);
 if(url.searchParams.get("format")==="clipboard") {
   if(mode!=="full")return error(400);
   return Response.json({title:record.content.title,html:data.html,text:record.content.body_md+(data.sourceUrl?"\n\nOriginal: "+data.sourceUrl:"")},{headers:base});
 }
 if(url.searchParams.has("format"))return error(400);
 if(new TextEncoder().encode(data.content).byteLength>10_000_000)return error(413);
 return new Response(data.content,{status:200,headers:{
  ...base,"Content-Type":"text/plain; charset=utf-8",
  "Content-Disposition":'attachment; filename="'+data.filename+'"'
 }});
}
