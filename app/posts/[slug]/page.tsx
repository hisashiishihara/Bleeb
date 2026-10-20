import { MediaMarkdown } from "../../components/media-markdown";
import { ReferrerPing } from "../../components/referrer-ping";
import { notFound } from "next/navigation";
import { database, publicEntry } from "../../../lib/store";

import { currentViewer } from "../../../lib/reader";

export const dynamic = "force-dynamic";
const jpDate = (value:string) => new Intl.DateTimeFormat("ja-JP",{timeZone:"Asia/Tokyo",year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(value));

const tags=(value:string):string[]=>{try{const v:unknown=JSON.parse(value);return Array.isArray(v)?v.filter((x):x is string=>typeof x==="string"):[];}catch{return [];}};
type Props = {params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props) {
  const {slug} = await params;
  const item = await publicEntry(database(), slug, await currentViewer());
  if (!item) return {title:"ページが見つかりません",robots:{index:false,follow:false}};
  return {title:item.title,description:item.summary ?? item.title,openGraph:{title:item.title,description:item.summary ?? item.title,type:"article",...(item.hero_media_id?{images:[{url:"/media/"+item.hero_media_id,alt:item.hero_alt_text||item.title}]}:{})},robots:item.visibility==="public"?{index:true,follow:true}:{index:false,follow:false}};
}

export default async function Post({params}:Props) {
  const {slug} = await params;
  const item = await publicEntry(database(),slug, await currentViewer());
  if (!item) notFound();
  return (
    <article className="article">
      {item.visibility==="public" && <ReferrerPing slug={slug} />}
      <a className="back-link" href="/archive">← 過去ログへ戻る</a>
      <header className="article-header">
        <p className="eyebrow">JOURNAL ENTRY</p>
        <h1>{item.title}</h1>
        {item.hero_media_id&&<img className="hero-image" src={"/media/"+item.hero_media_id} alt={item.hero_alt_text||item.title} loading="eager"/>}
        {item.summary && <p className="article-summary">{item.summary}</p>}
        <div className="article-meta"><span>公開 {jpDate(item.published_at)}</span><span>更新 {jpDate(item.updated_at)}</span></div>
      </header>
      <div className="prose"><MediaMarkdown body={item.body_md}/></div>
      {tags(item.tags_json).length>0&&<nav className="reader-tags" aria-label="記事のタグ">{tags(item.tags_json).map(tag=><a key={tag} className="tag" href={"/archive?tag="+encodeURIComponent(tag)}>{tag}</a>)}</nav>}
      <a className="back-link lower" href="/archive">← 過去ログへ</a>
    </article>
  );
}
