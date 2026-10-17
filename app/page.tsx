import { database, publicEntries } from "../lib/store";

export const dynamic = "force-dynamic";

const jpDate = (value:string) => new Intl.DateTimeFormat("ja-JP",{timeZone:"Asia/Tokyo",year:"numeric",month:"long",day:"numeric"}).format(new Date(value));

export default async function Home() {
  const posts = await publicEntries(database());
  return (
    <div className="home">
      <section className="intro">
        <p className="eyebrow">TECHNOLOGY / NOTES / IDEAS</p>
        <h1>考えたことを、<br/><em>記録に残す。</em></h1>
        <p className="intro-copy">技術の検証、開発の試行錯誤、日々の発見。<br/>ChatGPT との対話から磨いた文章を、ここに蓄積します。</p>
      </section>
      <section aria-label="公開記事">
        <div className="section-head"><h2>記事</h2><span>{posts.length} 件の公開記事</span></div>
        {posts.length === 0 ? (
          <div className="empty"><h3>記事を準備しています。</h3><p>公開された記事がここに表示されます。下書きは表示されません。</p></div>
        ) : <div className="post-list">
          {posts.map(post => <article className="post-summary" key={post.slug}>
            <div className="post-date">{jpDate(post.published_at)}</div>
            <div><h3><a href={"/posts/" + encodeURIComponent(post.slug)}>{post.title}</a></h3>
            {post.summary && <p>{post.summary}</p>}</div>
            <span className="arrow" aria-hidden="true">↗</span>
          </article>)}
        </div>}
      </section>
    </div>
  );
}
