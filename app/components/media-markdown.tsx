import ReactMarkdown from "react-markdown";
import { MEDIA_ID_RE } from "../../lib/media-rules";

export function MediaMarkdown({body}:{body:string}){
 return <ReactMarkdown skipHtml components={{
  img:({src,alt})=>{
   // Video is embedded through a safe Markdown image extension:
   // ![video:説明](/media/uuid). Normal Markdown images remain supported.
   if(alt?.startsWith("video:") && typeof src==="string" && src.startsWith("/media/") &&
      MEDIA_ID_RE.test(src.slice("/media/".length))) {
     return <video controls playsInline preload="metadata" src={src} aria-label={alt.slice(6)||"動画"} style={{maxWidth:"100%",height:"auto"}}/>;
   }
   return <img src={src} alt={alt||""} loading="lazy"/>;
  }
 }}>{body}</ReactMarkdown>;
}
