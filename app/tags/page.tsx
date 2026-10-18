import { database } from "../../lib/store";
import { currentViewer } from "../../lib/reader";
import { readableTagCounts } from "../../lib/reader-archive";

export const dynamic="force-dynamic";
export const revalidate=0;
export const metadata={title:"タグ別の記事",robots:{index:false,follow:false}};

export default async function Tags(){
 const tags=await readableTagCounts(database(),await currentViewer());
 return <div className="reader-archive">
   <header className="reader-index-header">
     <p className="eyebrow">TOPICS / TAGS</p>
     <h1>タグから探す</h1>
     <p>技術、社会、思考など、記事に付けたタグごとに過去ログを辿れます。</p>
   </header>
   <div className="section-head"><h2>タグ一覧</h2><span>{tags.length} タグ</span></div>
   {tags.length===0?<p className="empty">閲覧できる記事のタグはまだありません。</p>:
     <div className="tag-index">{tags.map(item=><a key={item.tag}
       href={"/archive?tag="+encodeURIComponent(item.tag)} className="tag-index-link">
       <span>{item.tag}</span><span>{item.count} 記事 →</span>
     </a>)}</div>}
   <p><a className="back-link" href="/archive">← 過去ログ・記事一覧</a></p>
 </div>;
}
