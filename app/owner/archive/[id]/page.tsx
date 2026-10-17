import { notFound } from "next/navigation";
import { MediaMarkdown } from "../../../components/media-markdown";
import { database } from "../../../../lib/store";
import { requireOwnerPage } from "../../../../lib/owner-page";
import { getOwnerArchiveEntry } from "../../../../lib/owner-archive";

export const dynamic="force-dynamic";
export const revalidate=0;
export const metadata={title:"記事の履歴",robots:{index:false,follow:false}};
type Props={params:Promise<{id:string}>;searchParams:Promise<{revision?:string}>};
const date=(stamp:string)=>new Intl.DateTimeFormat("ja-JP",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(stamp));

export default async function PrivateEntry({params,searchParams}:Props){
  await requireOwnerPage();
  const {id}=await params;
  const {revision}=await searchParams;
  const selected=revision===undefined?undefined:Number(revision);
  let result:Awaited<ReturnType<typeof getOwnerArchiveEntry>>;
  try { result=await getOwnerArchiveEntry(database(),id,selected); } catch { notFound(); }
  const {entry,history,content}=result;
  const isCurrent=entry.status==="published" && entry.latest_revision===content.revision;
  return <article className="article owner">
    <a className="back-link" href="/owner/archive">← 自分のアーカイブ</a>
    <p className="eyebrow">PRIVATE ARCHIVE / REVISION {content.revision}</p>
    <h1>{content.title}</h1>
    <p className="owner-lead">{entry.status==="draft"?"非公開の下書き":"記事として公開中"} · 閲覧範囲 {entry.visibility} · 最新 r{entry.latest_revision} · 表示版 {entry.status!=="published"?"なし":"r"+entry.latest_revision}</p>
    <p className="owner-lead">このリビジョン: {date(content.saved_at)} {isCurrent?"（現在の表示版）":"（履歴のリビジョン・本人限定）"}</p>
    <p><a className="back-link" href={"/owner/archive/"+encodeURIComponent(id)+"/edit"}>✎ この文章を編集する（最新版から新規リビジョンを作成） →</a></p>
    <div className="revision-links"><strong>履歴を読む</strong>
      {history.map(item=><a key={item.revision} aria-current={content.revision===item.revision?"page":undefined} href={"/owner/archive/"+encodeURIComponent(id)+"?revision="+item.revision}>r{item.revision}</a>)}
    </div>
    {content.hero_media_id&&<img className="hero-image" src={"/media/"+content.hero_media_id} alt={content.hero_alt_text||content.title} loading="lazy"/>}
    <div className="prose"><MediaMarkdown body={content.body_md}/></div>
  </article>;
}
