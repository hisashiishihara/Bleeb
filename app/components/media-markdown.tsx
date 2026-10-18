import React, {isValidElement} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import {ArticleToc} from "./article-toc";
import {MermaidDiagram} from "./mermaid-diagram";
import {ArticleChart,StockEmbed,TweetEmbed,YouTubeEmbed} from "./article-embeds";
import { MEDIA_ID_RE } from "../../lib/media-rules";

export function MediaMarkdown({body}:{body:string}){
 return <><ArticleToc body={body}/><ReactMarkdown skipHtml remarkPlugins={[remarkGfm,remarkMath]} rehypePlugins={[rehypeKatex,[rehypeHighlight,{detect:false,plainText:["mermaid","chart","stock","x","youtube"]}],rehypeSlug]} components={{
  table:({children})=><div className="article-table-scroll" tabIndex={0} role="region" aria-label="記事の表"><table>{children}</table></div>,
  pre:({children})=>{
   if(isValidElement(children)){
    const p=children.props as {className?:string;children?:React.ReactNode};
    const source=typeof p.children==="string"?p.children.trim():"";
    if(p.className==="language-chart"&&source.length<=20000)return <ArticleChart source={source}/>;
    if(p.className==="language-mermaid"&&source.length<=20000)return <MermaidDiagram source={source}/>;
    if(p.className==="language-stock"&&source.length<=100)return <StockEmbed symbol={source}/>;
    if(p.className==="language-x"&&source.length<=100)return <TweetEmbed id={source}/>;
    if(p.className==="language-youtube"&&source.length<=100)return <YouTubeEmbed id={source}/>;
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
 }}>{body}</ReactMarkdown></>;
}
