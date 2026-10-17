import { database } from "../../../lib/store";
import { bucket, readableMedia } from "../../../lib/media-store";
import { MEDIA_ID_RE, parseByteRange } from "../../../lib/media-rules";
import { currentViewer } from "../../../lib/reader";

export const dynamic="force-dynamic";
const base={
 "Cache-Control":"private, no-store, max-age=0",
 "CDN-Cache-Control":"no-store",
 "X-Content-Type-Options":"nosniff",
 "Cross-Origin-Resource-Policy":"same-origin",
 "X-Robots-Tag":"noindex, nofollow, noarchive"
};
const missing=()=>new Response(null,{status:404,headers:base});

async function serve(request:Request,context:{params:Promise<{id:string}>},head:boolean){
 const {id}=await context.params;
 if(!MEDIA_ID_RE.test(id))return missing();
 // Authorize before examining ranges or opening R2. Objects are always private.
 let asset:Awaited<ReturnType<typeof readableMedia>>;
 try{
   const viewer=await currentViewer();
   asset=await readableMedia(database(),id,viewer.owner);
 }catch{return missing();}
 if(!asset)return missing();
 const headers=new Headers(base);
 headers.set("Content-Type",asset.content_type);
 headers.set("Content-Disposition","inline");
 headers.set("Accept-Ranges","bytes");
 const range=parseByteRange(request.headers.get("range"),asset.byte_size);
 if(range===false){headers.set("Content-Range","bytes */"+asset.byte_size);return new Response(null,{status:416,headers});}
 let stored;
 try{
   const store=bucket();
   if(head){
     const obj=await store.head(asset.storage_key);
     if(!obj)return missing();
     headers.set("Content-Length",String(asset.byte_size));
     return new Response(null,{status:200,headers});
   }
   stored=await store.get(asset.storage_key,range?{range:{offset:range.start,length:range.end-range.start+1}}:undefined);
 }catch{return new Response(null,{status:503,headers:base});}
 if(!stored||!("body" in stored))return missing();
 if(range){
   headers.set("Content-Range",`bytes ${range.start}-${range.end}/${asset.byte_size}`);
   headers.set("Content-Length",String(range.end-range.start+1));
 }else headers.set("Content-Length",String(asset.byte_size));
 return new Response(stored.body,{status:range?206:200,headers});
}
export async function GET(request:Request,context:{params:Promise<{id:string}>}){
 return serve(request,context,false);
}
export async function HEAD(request:Request,context:{params:Promise<{id:string}>}){
 return serve(request,context,true);
}
