import { notFound } from "next/navigation";
import { database } from "../../../../../lib/store";
import { getOwnerArchiveEntry } from "../../../../../lib/owner-archive";
import { requireOwnerPage } from "../../../../../lib/owner-page";
import { MarkdownEditor } from "../../../../components/markdown-editor";

export const dynamic="force-dynamic";
export const revalidate=0;
export const metadata={title:"記事を編集",robots:{index:false,follow:false}};
export default async function EditPost({params}:{params:Promise<{id:string}>}){
 await requireOwnerPage();
 const {id}=await params;
 let result:Awaited<ReturnType<typeof getOwnerArchiveEntry>>;
 try{result=await getOwnerArchiveEntry(database(),id);}catch{notFound();}
 const {entry,content}=result;
 let tags:string[]=[];
 try{const found:unknown=JSON.parse(content.tags_json);if(Array.isArray(found))tags=found.filter((x):x is string=>typeof x==="string");}catch{}
 return <MarkdownEditor initial={{
   id:entry.id,slug:entry.slug,title:content.title,summary:content.summary??"",
   body_md:content.body_md,tags,revision:entry.latest_revision,
   hero_media_id:content.hero_media_id,hero_alt_text:content.hero_alt_text,
   published_revision:entry.published_revision,visibility:entry.visibility==="public"?"public":"owner",
   status:entry.status
 }}/>;
}
