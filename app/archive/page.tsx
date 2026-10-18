import { database } from "../../lib/store";
import { currentViewer } from "../../lib/reader";
import { parseArchiveFilters, readableArchive, readableArchiveMonths } from "../../lib/reader-archive";

export const dynamic="force-dynamic";
export const revalidate=0;
export const metadata={title:"過去ログ",robots:{index:false,follow:false}};
type Props={searchParams:Promise<{q?:string;month?:string;tag?:string;offset?:string}>};
const date=(value:string)=>new Intl.DateTimeFormat("ja-JP",{
 timeZone:"Asia/Tokyo",year:"numeric",month:"long",day:"numeric"
}).format(new Date(value));
const tags=(value:string):string[]=>{
 try{const v:unknown=JSON.parse(value);return Array.isArray(v)?v.filter((x):x is string=>typeof x==="string"):[];}
 catch{return [];}
};
const monthLabel=(month:string)=>month.replace(/^([0-9]{4})-([0-9]{2})$/,"$1年$2月");

export default async function Archive({searchParams}:Props){
 const filters=parseArchiveFilters(await searchParams);
 const db=database(),viewer=await currentViewer();
 const [result,months]=await Promise.all([
  readableArchive(db,viewer,filters),readableArchiveMonths(db,viewer)
 ]);
 const next=new URLSearchParams();
 if(filters.q)next.set("q",filters.q);
 if(filters.tag)next.set("tag",filters.tag);
 if(filters.month)next.set("month",filters.month);
 next.set("offset",String(filters.offset+30));
 return <div className="reader-archive">
   <header className="reader-index-header">
     <p className="eyebrow">JOURNAL ARCHIVE</p>
     <h1>過去ログ</h1>
     <p>記事を日付順に並べています。年月・タグ・キーワードで絞り込めます。</p>
   </header>
   <form id="search" className="reader-search" method="get" action="/archive">
     <label htmlFor="reader-search-q">記事を検索</label>
     <div className="reader-search-fields">
       <input id="reader-search-q" name="q" type="search" defaultValue={filters.q} maxLength={100} placeholder="タイトル・概要・本文を検索"/>
       <select name="month" defaultValue={filters.month} aria-label="年月で絞り込む">
         <option value="">すべての年月</option>
         {months.map(m=><option key={m.month} value={m.month}>{monthLabel(m.month)}</option>)}
       </select>
       <input name="tag" defaultValue={filters.tag} maxLength={40} placeholder="タグ" aria-label="タグで絞り込む"/>
       <button type="submit">検索</button>
     </div>
   </form>
   <section className="archive-months" aria-label="年月で探す">
     <h2>年月別</h2>
     <div className="archive-month-links">
       <a href="/archive" aria-current={!filters.month?"page":undefined}>すべて</a>
       {months.map(m=><a key={m.month} href={"/archive?month="+encodeURIComponent(m.month)}
         aria-current={filters.month===m.month?"page":undefined}>{monthLabel(m.month)} <span>{m.count}</span></a>)}
     </div>
   </section>
   <section aria-label="過去の記事">
     <div className="section-head"><h2>記事一覧</h2><span>{filters.q||filters.month||filters.tag?"絞り込み結果":"公開記事"}</span></div>
     {(filters.q||filters.month||filters.tag)&&<p className="archive-active-filters">
       {filters.q&&<>検索: 「{filters.q}」　</>}
       {filters.month&&<>年月: {monthLabel(filters.month)}　</>}
       {filters.tag&&<>タグ: {filters.tag}　</>}
       <a href="/archive">条件をクリア</a>
     </p>}
     {result.items.length===0?<p className="empty">該当する記事はありません。</p>:
       <div className="reader-archive-list">{result.items.map(item=><article className="reader-archive-item" key={item.slug}>
         <time dateTime={item.published_at}>{date(item.published_at)}</time>
         <h3><a href={"/posts/"+encodeURIComponent(item.slug)}>{item.title}</a></h3>
         {item.summary&&<p>{item.summary}</p>}
         <div className="reader-tags">{tags(item.tags_json).map(tag=>
           <a className="tag" key={tag} href={"/archive?tag="+encodeURIComponent(tag)}>{tag}</a>)}</div>
       </article>)}</div>}
     {result.hasMore&&<a className="archive-more" href={"/archive?"+next.toString()}>さらに古い記事を見る →</a>}
   </section>
 </div>;
}
