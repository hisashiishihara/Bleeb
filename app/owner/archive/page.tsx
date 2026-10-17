import { database } from "../../../lib/store";
import { requireOwnerPage } from "../../../lib/owner-page";
import { searchOwnerArchive } from "../../../lib/owner-archive";

export const dynamic="force-dynamic";
export const revalidate=0;
export const metadata={title:"自分のアーカイブ",robots:{index:false,follow:false}};
type Props={searchParams:Promise<{q?:string;status?:string;tag?:string;offset?:string}>};
const date = (stamp:string)=>new Intl.DateTimeFormat("ja-JP",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(stamp));
function tags(json:string):string[]{try{const x=JSON.parse(json);return Array.isArray(x)?x:[];}catch{return [];}}

export default async function OwnerArchive({searchParams}:Props){
  await requireOwnerPage();
  const params=await searchParams;
  const {entries,hasMore,filters}=await searchOwnerArchive(database(),{
    q:params.q,status:params.status,tag:params.tag,offset:Number(params.offset??0)
  });
  const next=new URLSearchParams();
  if(filters.q)next.set("q",filters.q);
  if(filters.tag)next.set("tag",filters.tag);
  if(filters.status!=="all")next.set("status",filters.status);
  next.set("offset",String(filters.offset+60));
  return <section className="owner">
    <p className="eyebrow">OWNER / PRIVATE</p>
    <h1>自分のアーカイブ</h1>
    <p className="owner-lead">下書き・公開記事・過去リビジョンも含む個人用の記録。ここは本人専用です。</p>
    <nav className="owner-tabs"><a href="/owner/archive" aria-current="page">記事を探す</a><a href="/owner/referrers">リンク元</a><a href="/">公開ブログ</a></nav>
    <form method="get" action="/owner/archive" className="archive-search">
      <label>キーワード<input name="q" maxLength={100} placeholder="タイトル・本文・過去の文章を検索" defaultValue={filters.q}/></label>
      <label>状態<select name="status" defaultValue={filters.status}>
        <option value="all">すべて</option><option value="draft">下書き</option><option value="published">公開済み</option>
      </select></label>
      <label>タグ<input name="tag" maxLength={40} placeholder="例: 技術" defaultValue={filters.tag}/></label>
      <button type="submit">検索</button>
    </form>
    <div className="section-head"><h2>保存済みの記事</h2><span>表示 {entries.length} 件</span></div>
    {entries.length===0?<div className="empty">該当する記事はありません。</div>:<div className="archive-list">{entries.map(e=>
      <article className="archive-result" key={e.id}>
        <div className="archive-result-head"><span className={e.status==="draft"?"owner-state-draft":"owner-state-published"}>{e.status==="draft"?"下書き":"公開済み"}</span><span>{date(e.updated_at)} 更新</span><span>最新版 r{e.latest_revision}</span></div>
        <h3><a href={"/owner/archive/"+encodeURIComponent(e.id)}>{e.title}</a></h3>
        {e.summary&&<p>{e.summary}</p>}
        {tags(e.tags_json).map(tag=><span className="tag" key={tag}>{tag}</span>)}
      </article>)}</div>}
    {hasMore&&<a className="back-link" href={"/owner/archive?"+next.toString()}>さらに表示 →</a>}
  </section>;
}
