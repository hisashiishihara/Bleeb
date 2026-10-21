/** Pure, conservative validation shared by the R2 upload and serving routes. */
export const MEDIA_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 24 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = VIDEO_MAX_BYTES + 128 * 1024;
export const MEDIA_TYPES = ["image/jpeg","image/png","image/gif","image/webp","video/mp4","video/webm"] as const;
export type MediaType = typeof MEDIA_TYPES[number];

export function validMediaType(type:unknown):type is MediaType {
 return typeof type==="string" && MEDIA_TYPES.some(value=>value===type);
}
export function kind(type:MediaType):"image"|"video" {
 return type.startsWith("image/")?"image":"video";
}
export function mediaMaxBytes(type:MediaType):number {
 return kind(type)==="image"?IMAGE_MAX_BYTES:VIDEO_MAX_BYTES;
}
/** The MIME alone is untrusted. Check the actual file's container signature. */
export function matchesSignature(type:MediaType, bytes:Uint8Array):boolean {
 const at=(a:number,chars:string)=>chars.split("").every((c,i)=>bytes[a+i]===c.charCodeAt(0));
 if(type==="image/jpeg")return bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff;
 if(type==="image/png")return bytes.length>=8 && [137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b);
 if(type==="image/gif")return at(0,"GIF87a")||at(0,"GIF89a");
 if(type==="image/webp")return at(0,"RIFF")&&at(8,"WEBP");
 if(type==="video/mp4")return bytes.length>=12&&at(4,"ftyp");
 if(type==="video/webm")return bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3;
 return false;
}
/** Only this app's canonical media links can become public. */
export function referencesMedia(body:string,id:string):boolean {
 return MEDIA_ID_RE.test(id)&&body.includes("/media/"+id);
}
/** A stored asset is in use when the latest reader-visible revision refers to
 * its canonical inline URL or selects it as the hero image. */
export function revisionReferencesMedia(
 revision:{body_md:string;hero_media_id:string|null}|null|undefined,id:string
):boolean {
 return !!revision && (revision.hero_media_id===id || referencesMedia(revision.body_md,id));
}
export function mediaMarkdown(id:string,name:string,type:MediaType):string {
 const safeName=name.replace(/[\[\]\\\n\r]/g," ").slice(0,90).trim()||"media";
 return "!["+(kind(type)==="video"?"video:":"")+safeName+"](/media/"+id+")";
}
export function parseByteRange(value:string|null,size:number):{start:number;end:number}|null|false {
 if(value===null)return null;
 if(!Number.isSafeInteger(size)||size<=0)return false;
 const match=/^bytes=(\d*)-(\d*)$/.exec(value);
 if(!match||(match[1]===""&&match[2]===""))return false;
 let start:number,end:number;
 if(match[1]===""){
   const suffix=Number(match[2]);if(!Number.isSafeInteger(suffix)||suffix<=0)return false;
   start=Math.max(0,size-suffix);end=size-1;
 }else{
   start=Number(match[1]);end=match[2]===""?size-1:Number(match[2]);
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=size||start>end)return false;
   end=Math.min(size-1,end);
 }
 return {start,end};
}
