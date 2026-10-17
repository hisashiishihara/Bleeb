import { database, publicEntries } from "../lib/store";

import { currentViewer } from "../lib/reader";

export const dynamic = "force-dynamic";

const jpDate = (value:string) => new Intl.DateTimeFormat("ja-JP",{timeZone:"Asia/Tokyo",year:"numeric",month:"long",day:"numeric"}).format(new Date(value));

export default async function Home() {
  const posts = await publicEntries(database(), await currentViewer());
  return (
    <div className="home">
      <section className="intro">
        <p className="eyebrow">OBSERVATION / THOUGHT</p>
        <h1>観測と思考</h1>
        <p className="intro-copy">技術、社会、日々の出来事。<br/>見たこと、考えたことを、記録していく。</p>
      </section>
      <section aria-label="公開記事">
        <div className="section-head"><h2>記事一覧</h2><span>{posts.length} 件の記事</span></div>
        {posts.length === 0 ? (
          <div className="empty"><h3>記事を準備しています。</h3><p>公開された記事がここに表示されます。下書きは表示されません。</p></div>
        ) : <div className="post-list">
          {posts.map(post => <article className="post-summary" key={post.slug}>
            <div className="post-date">{jpDate(post.published_at)}</div>
            <div>{post.hero_media_id&&<a href={"/posts/" + encodeURIComponent(post.slug)}><img className="home-hero" src={"/media/"+post.hero_media_id} alt={post.hero_alt_text||post.title} loading="lazy"/></a>}<h3><a href={"/posts/" + encodeURIComponent(post.slug)}>{post.title}</a></h3>
            {post.summary && <p>{post.summary}</p>}</div>
            <span className="arrow" aria-hidden="true">↗</span>
          </article>)}
        </div>}
      </section>
    </div>
  );
}
