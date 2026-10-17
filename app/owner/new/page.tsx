import { requireOwnerPage } from "../../../lib/owner-page";
import { MarkdownEditor } from "../../components/markdown-editor";

export const dynamic="force-dynamic";
export const revalidate=0;
export const metadata={title:"新しい記事を書く",robots:{index:false,follow:false}};
export default async function NewPost(){
 await requireOwnerPage();
 return <MarkdownEditor initial={{title:"",summary:"",body_md:"",tags:[]}}/>;
}
