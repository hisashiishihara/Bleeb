import ReactMarkdown from "react-markdown";
import { notFound } from "next/navigation";
import { database, publicEntry } from "../../../lib/store";

export const dynamic = "force-dynamic";
const jpDate = (value:string) => new Intl.DateTimeFormat("ja-JP",{timeZone:"Asia/Tokyo",year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(value));

type Props = {params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props) {
  const {slug} = await params;
  const item = await publicEntry(database(), slug);
  if (!item) return {title:"ページが見つかりません",robots:{index:false,follow:false}};
  return {title:item.title,description:item.summary ?? item.title,openGraph:{title:item.title,description:item.summary ?? item.title,type:"article"},robots:{index:false,follow:false}};
}

export default async function Post({params}:Props) {
  const {slug} = await params;
  const item = await publicEntry(database(),slug);
  if (!item) notFound();
  return (
    <article className="article">
      <a className="back-link" href="/">← 記事一覧へ戻る</a>
      <header className="article-header">
        <p className="eyebrow">JOURNAL ENTRY</p>
        <h1>{item.title}</h1>
        {item.summary && <p className="article-summary">{item.summary}</p>}
        <div className="article-meta"><span>公開 {jpDate(item.published_at)}</span><span>更新 {jpDate(item.updated_at)}</span></div>
      </header>
      <div className="prose"><ReactMarkdown skipHtml>{item.body_md}</ReactMarkdown></div>
      <a className="back-link lower" href="/">← 記事一覧へ</a>
    </article>
  );
}
