"use client";
import {useEffect,useRef,useState} from "react";

type ChartConfig={type:"bar"|"line"|"pie"|"doughnut";title?:string;labels:string[];datasets:{label:string;data:number[]}[]};
function valid(v:unknown):v is ChartConfig{
 if(!v||typeof v!=="object")return false;
 const c=v as Partial<ChartConfig>;
 return ["bar","line","pie","doughnut"].includes(c.type||"")&&
 Array.isArray(c.labels)&&c.labels.length>0&&c.labels.length<=40&&c.labels.every(x=>typeof x==="string"&&x.length<=100)&&
 Array.isArray(c.datasets)&&c.datasets.length>0&&c.datasets.length<=8&&c.datasets.every(d=>typeof d.label==="string"&&d.label.length<=120&&Array.isArray(d.data)&&d.data.length===c.labels!.length&&d.data.every(v=>typeof v==="number"&&Number.isFinite(v)));
}
export function ArticleChart({source}:{source:string}){
 const canvas=useRef<HTMLCanvasElement>(null);
 const [error,setError]=useState("");
 const config=(()=>{try{const v:unknown=JSON.parse(source);return valid(v)?v:null;}catch{return null;}})();
 useEffect(()=>{
  if(!config||!canvas.current)return;
  let disposed=false;let destroy=()=>{};
  import("chart.js/auto").then(({default:Chart})=>{
   if(disposed||!canvas.current)return;
   const chart=new Chart(canvas.current,{type:config.type,data:{labels:config.labels,datasets:config.datasets},options:{responsive:true,maintainAspectRatio:false,plugins:{title:{display:Boolean(config.title),text:config.title}},scales:config.type==="bar"||config.type==="line"?{y:{beginAtZero:true}}:undefined}});
   destroy=()=>chart.destroy();
  }).catch(()=>{if(!disposed)setError("グラフを読み込めませんでした。");});
  return ()=>{disposed=true;destroy();};
 },[source]);
 if(!config)return <p role="alert">グラフのデータ形式が正しくありません。</p>;
 return <figure className="article-chart"><div className="article-chart-canvas"><canvas ref={canvas} role="img" aria-label={config.title||"記事のグラフ"}/></div>{error&&<figcaption>{error}</figcaption>}<details><summary>グラフの数値データ</summary><table><thead><tr><th>項目</th>{config.datasets.map((d,i)=><th key={i}>{d.label}</th>)}</tr></thead><tbody>{config.labels.map((label,i)=><tr key={i}><th>{label}</th>{config.datasets.map((d,j)=><td key={j}>{d.data[i]}</td>)}</tr>)}</tbody></table></details></figure>;
}
const STOCK=/^[A-Z0-9.\-]{1,20}:[A-Z0-9.\-]{1,24}$/;
export function StockEmbed({symbol}:{symbol:string}){
 const [loaded,setLoaded]=useState(false);
 if(!STOCK.test(symbol))return <p>株価の銘柄コードが正しくありません。</p>;
 const url="https://s.tradingview.com/widgetembed/?symbol="+encodeURIComponent(symbol)+"&interval=D&theme=light&style=1";
 return <figure className="article-external-embed"><figcaption>株価チャート：{symbol}（TradingView）</figcaption>{loaded?<iframe src={url} title={symbol+" の株価チャート"} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-popups" />:<button type="button" onClick={()=>setLoaded(true)}>外部の株価チャートを読み込む</button>}<p><a href={"https://www.tradingview.com/symbols/"+encodeURIComponent(symbol.replace(":","-"))+"/"} target="_blank" rel="noopener noreferrer">TradingView で見る ↗</a></p></figure>;
}
export function TweetEmbed({id}:{id:string}){
 const [loaded,setLoaded]=useState(false);
 if(!/^\d{10,25}$/.test(id))return <p>X の投稿 ID が正しくありません。</p>;
 const link="https://x.com/i/status/"+id;
 return <figure className="article-external-embed"><figcaption>X の投稿</figcaption>{loaded?<iframe src={"https://platform.twitter.com/embed/Tweet.html?id="+id} title="X の投稿" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-popups"/>:<button type="button" onClick={()=>setLoaded(true)}>X の投稿を読み込む</button>}<p><a href={link} target="_blank" rel="noopener noreferrer">X で投稿を開く ↗</a></p></figure>;
}
