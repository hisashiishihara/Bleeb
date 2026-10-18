import React, {isValidElement} from "react";
import ReactMarkdown from "react-markdown";
import {ArticleChart,StockEmbed,TweetEmbed} from "./article-embeds";
import { MEDIA_ID_RE } from "../../lib/media-rules";

export function MediaMarkdown({body}:{body:string}){
 return <ReactMarkdown skipHtml components={{
  pre:({children})=>{
   if(isValidElement(children)){
    const p=children.props as {className?:string;children?:React.ReactNode};
    const source=typeof p.children==="string"?p.children.trim():"";
    if(p.className==="language-chart"&&source.length<=20000)return <ArticleChart source={source}/>;
    if(p.className==="language-stock"&&source.length<=100)return <StockEmbed symbol={source}/>;
    if(p.className==="language-x"&&source.length<=100)return <TweetEmbed id={source}/>;
   }
   return <pre>{children}</pre>;
  },
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
