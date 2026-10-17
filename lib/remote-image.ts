import { DiaryError } from "./input.ts";
import { IMAGE_MAX_BYTES, matchesSignature, validMediaType, type MediaType } from "./media-rules.ts";

export type ImageHostPolicy = string[];
export const MAX_HOPS = 2;
const IMAGE_TYPES = ["image/jpeg","image/png","image/gif","image/webp"] as const;
const RESTRICTED_SUFFIXES=[".localhost",".local",".internal",".test",".invalid",".home.arpa"];

export function configuredImageHosts(raw:string|undefined):ImageHostPolicy {
 const hosts=(raw??"").split(",").map(h=>h.trim().toLowerCase()).filter(Boolean);
 for(const h of hosts){
  const value=h.startsWith("*.")?h.slice(2):h;
  if(!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(value)||value.length>253||
    /^\d+(?:\.\d+)*$/.test(value)||RESTRICTED_SUFFIXES.some(s=>value.endsWith(s))||
    value.split(".").some(label=>label.startsWith("-")||label.endsWith("-")))
   throw new DiaryError("invalid_media_config","Invalid allowed image source hostname",503);
 }
 return hosts;
}
export function validateImageSource(value:string,allowed:ImageHostPolicy):URL {
 if(allowed.length===0)throw new DiaryError("image_source_unconfigured","Allowed image source hosts are not configured",503);
 if(typeof value!=="string"||value.length>2048)throw new DiaryError("invalid_image_url","Invalid image URL");
 let url:URL;
 try{url=new URL(value);}catch{throw new DiaryError("invalid_image_url","Invalid image URL");}
 const h=url.hostname.toLowerCase();
 // Reject literal IPs (including bracketed IPv6 and Unicode/encoded numeric hosts)
 // as well as ports, embedded credentials and non-public hosts.
 if(url.protocol!=="https:"||url.username||url.password||(url.port&&url.port!=="443")||
   !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(h)||
   h==="localhost"||RESTRICTED_SUFFIXES.some(s=>h.endsWith(s))||
   /^\d+(?:\.\d+)*$/.test(h)||h.length>253)
  throw new DiaryError("invalid_image_url","Only public HTTPS hostnames are permitted",400);
 const authorized=allowed.some(pattern=>pattern.startsWith("*.")
   ?h.endsWith(pattern.slice(1))&&h!==pattern.slice(2)
   :h===pattern);
 if(!authorized)throw new DiaryError("image_host_not_allowed","Image host is not on the configured allowlist",403);
 url.hash="";
 return url;
}
export async function downloadImage(
 sourceUrl:string,allowlist:ImageHostPolicy,fetcher:typeof fetch=fetch
):Promise<{image:File;final_host:string}> {
 let url=validateImageSource(sourceUrl,allowlist);
 for(let hop=0;hop<=MAX_HOPS;hop++){
  let response:Response;
  try {
   response=await fetcher(url.toString(),{
    method:"GET",redirect:"manual",credentials:"omit",referrerPolicy:"no-referrer",
    cache:"no-store",headers:{"Accept":"image/png,image/jpeg,image/webp,image/gif"},
    signal:AbortSignal.timeout(12000)
   });
  }catch{throw new DiaryError("image_fetch_failed","Remote image could not be fetched",422);}
  if([301,302,303,307,308].includes(response.status)){
   await response.body?.cancel();
   if(hop===MAX_HOPS)throw new DiaryError("too_many_redirects","Too many image redirects",422);
   const location=response.headers.get("location");
   if(!location)throw new DiaryError("invalid_redirect","Image redirect missing destination",422);
   url=validateImageSource(new URL(location,url).toString(),allowlist);
   continue;
  }
  if(!response.ok||!response.body){
   await response.body?.cancel();
   throw new DiaryError("image_fetch_failed","Image URL is not anonymously downloadable (HTTP "+response.status+")",422);
  }
  const mime=response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if(!validMediaType(mime)||!IMAGE_TYPES.some(type=>type===mime)){
   await response.body.cancel();
   throw new DiaryError("invalid_media","URL must return an allowed image MIME type",415);
  }
  const advertised=Number(response.headers.get("content-length")??0);
  if(advertised>IMAGE_MAX_BYTES){
   await response.body.cancel();
   throw new DiaryError("media_too_large","Image exceeds 10 MiB limit",413);
  }
  const chunks:Uint8Array[]=[];
  let total=0;
  const reader=response.body.getReader();
  try{
   while(true){
    const {value,done}=await reader.read();
    if(done)break;
    total+=value.byteLength;
    if(total>IMAGE_MAX_BYTES)throw new DiaryError("media_too_large","Image exceeds 10 MiB limit",413);
    chunks.push(value);
   }
  }catch(error){
   await reader.cancel().catch(()=>{});
   if(error instanceof DiaryError)throw error;
   throw new DiaryError("image_fetch_failed","Image download interrupted",422);
  }
  if(total===0)throw new DiaryError("invalid_media","Empty image",415);
  const data=new Uint8Array(total);
  let index=0;for(const chunk of chunks){data.set(chunk,index);index+=chunk.length;}
  if(!matchesSignature(mime as MediaType,data))
   throw new DiaryError("invalid_media","Remote image signature does not match MIME type",415);
  const suffix:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif"};
  const image=new File([data],"imported-image."+suffix[mime],{type:mime});
  return {image,final_host:url.hostname};
 }
 throw new DiaryError("too_many_redirects","Too many image redirects",422);
}
