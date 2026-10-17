import {notFound} from "next/navigation";
import {requireOwnerPage} from "../../../lib/owner-page";
import {database} from "../../../lib/store";
import {ownerArticleMedia} from "../../../lib/media-deletion";
import {MediaManager} from "../../components/media-manager";

export const dynamic="force-dynamic";
export const revalidate=0;
export const metadata={title:"メディア管理",robots:{index:false,follow:false}};
export default async function MediaPage({searchParams}:{searchParams:Promise<{entry_id?:string}>}){
 await requireOwnerPage();
 const {entry_id}=await searchParams;
 let result:Awaited<ReturnType<typeof ownerArticleMedia>>;
 try{result=await ownerArticleMedia(database(),entry_id??"");}catch{notFound();}
 return <section className="owner">
  <p className="eyebrow">OWNER / PRIVATE MEDIA</p>
  <h1>画像・動画の管理</h1>
  <nav className="owner-tabs">
   <a href={"/owner/archive/"+encodeURIComponent(result.entry.id)+"/edit"}>← 記事を編集</a>
   <a href="/owner/archive">アーカイブへ戻る</a>
  </nav>
  <MediaManager initial={result.assets}/>
 </section>;
}
