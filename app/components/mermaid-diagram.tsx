"use client";
import {useEffect,useId,useRef,useState} from "react";

export function MermaidDiagram({source}:{source:string}){
 const reactId=useId();
 const id="mermaid-"+reactId.replace(/[^a-zA-Z0-9_-]/g,"");
 const [svg,setSvg]=useState<string|null>(null);
 const [error,setError]=useState(false);
 const container=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  let cancelled=false;
  setSvg(null);setError(false);
  if(source.length>20000){setError(true);return;}
  import("mermaid").then(async ({default:mermaid})=>{
   mermaid.initialize({startOnLoad:false,securityLevel:"strict",theme:"neutral",suppressErrorRendering:true});
   const result=await mermaid.render(id,source);
   if(!cancelled)setSvg(result.svg);
  }).catch(()=>{if(!cancelled)setError(true);});
  return ()=>{cancelled=true;};
 },[id,source]);
 useEffect(()=>{
  if(!svg||!container.current)return;
  // SVG is emitted by Mermaid with securityLevel=strict, never from author HTML.
  container.current.innerHTML=svg;
  return ()=>{if(container.current)container.current.replaceChildren();};
 },[svg]);
 return <figure className="article-mermaid" aria-label="Mermaid ダイアグラム">
  <div className="article-mermaid-graphic" ref={container}/>
  {error?<figcaption>ダイアグラムを表示できませんでした。下のソースを確認してください。</figcaption>:!svg?<figcaption>図を読み込み中…</figcaption>:null}
  <details><summary>Mermaid ソースを表示</summary><pre><code>{source}</code></pre></details>
 </figure>;
}
