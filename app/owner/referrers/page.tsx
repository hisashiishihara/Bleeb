import { database } from "../../../lib/store";
import { requireOwnerPage } from "../../../lib/owner-page";
import { referrerSummary } from "../../../lib/referrer-store";

export const dynamic="force-dynamic";
export const revalidate=0;
export const metadata={title:"リンク元",robots:{index:false,follow:false}};
export default async function Referrers(){
  await requireOwnerPage();
  const {sources,articles}=await referrerSummary(database());
  return <section className="owner">
    <p className="eyebrow">OWNER / REFERRERS</p>
    <h1>リンク元</h1>
    <p className="owner-lead">過去90日間に公開記事へ来た外部サイトの参照元。個人情報を保存せずドメイン単位で集計します。</p>
    <nav className="owner-tabs"><a href="/owner/archive">記事を探す</a><a href="/owner/referrers" aria-current="page">リンク元</a><a href="/">公開ブログ</a></nav>
    <div className="section-head"><h2>参照元サイト</h2><span>推定遷移回数（ユニークユーザー数ではありません）</span></div>
    <div className="referrer-list">
      {sources.length===0?<p>まだ参照元データはありません。オーナー限定 Site では収集は無効のままです。</p>:sources.map(s=>
        <div className="referrer-item" key={s.source_host}><a href={"https://"+s.source_host+"/"} target="_blank" rel="noopener noreferrer nofollow">{s.source_host} ↗</a><strong>{s.visits}</strong></div>
      )}
    </div>
    <div className="section-head"><h2>よく読まれた記事</h2></div>
    <div className="referrer-list">
      {articles.length===0?<p>集計された記事はありません。</p>:articles.map(a=>
        <div className="referrer-item" key={a.slug}><span>{a.title}</span><strong>{a.visits}</strong></div>
      )}
    </div>
    <p className="archive-note">検索語句や全ての被リンクを取得するものではありません。ブラウザ側で参照元が伏せられた訪問は記録されません。Google 検索語句・リンクの調査には Search Console を別途使用します。</p>
  </section>;
}
