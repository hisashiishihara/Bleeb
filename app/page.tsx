import { env } from "cloudflare:workers";
import { siteBranding } from "../lib/public-discovery";
import { database } from "../lib/store";
import { readableRecentFull } from "../lib/reader-store";
import { currentViewer } from "../lib/reader";
import { MediaMarkdown } from "./components/media-markdown";
import { homeExcerpt } from "../lib/home-excerpt";

export const dynamic="force-dynamic";
export const revalidate=0;
export const metadata={robots:{index:true,follow:true}};
const jpDate=(value:string)=>new Intl.DateTimeFormat("ja-JP",{
 timeZone:"Asia/Tokyo",year:"numeric",month:"long",day:"numeric"
}).format(new Date(value));
const tags=(value:string):string[]=>{
 try{const v:unknown=JSON.parse(value);return Array.isArray(v)?v.filter((x):x is string=>typeof x==="string"):[];}
 catch{return [];}
};

export default async function Home(){
 const site=siteBranding(env as {SITE_TITLE?:string;SITE_DESCRIPTION?:string;SITE_EYEBROW?:string});
 const posts=await readableRecentFull(database(),await currentViewer(),3);
 return <div className="home journal-home">
   <section className="intro journal-intro">
     <p className="eyebrow">{site.eyebrow}</p>
     <h1>{site.title}</h1>
     <p className="intro-copy">{site.description}</p>
   </section>
   <section aria-label="最近の記事">
     <div className="section-head"><h2>最近の記事</h2><span>最新3件を紹介</span></div>
     {posts.length===0?
       <div className="empty"><h3>記事を準備しています。</h3><p>閲覧できる記事が公開されると、ここに表示されます。</p></div>:
       <div className="journal-feed">{posts.map(post=><article className="feed-entry" key={post.slug}>
         <header className="feed-entry-header">
           <p className="feed-date">{jpDate(post.published_at)}</p>
           <h2><a href={"/posts/"+encodeURIComponent(post.slug)}>{post.title}</a></h2>
           {post.hero_media_id&&<a href={"/posts/"+encodeURIComponent(post.slug)}>
             <img className="hero-image" src={"/media/"+post.hero_media_id} alt={post.hero_alt_text||post.title} loading="lazy"/>
           </a>}
           {post.summary&&<p className="article-summary">{post.summary}</p>}
         </header>
         <div className="prose"><MediaMarkdown body={homeExcerpt(post.body_md)}/></div>
         {tags(post.tags_json).length>0&&<nav aria-label={post.title+"のタグ"} className="reader-tags">
           {tags(post.tags_json).map(tag=><a className="tag" key={tag} href={"/archive?tag="+encodeURIComponent(tag)}>{tag}</a>)}
         </nav>}
         <p className="feed-permalink"><a href={"/posts/"+encodeURIComponent(post.slug)}>続きを読む →</a></p>
       </article>)}</div>}
     <nav className="feed-navigation" aria-label="記事を探す">
       <a href="/archive">過去ログ・記事一覧 →</a>
       <a href="/tags">タグ別に探す →</a>
       <a href="/archive#search">記事を検索 →</a>
     </nav>
   </section>
 </div>;
}
