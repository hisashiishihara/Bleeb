import {redirect} from "next/navigation";
import {currentViewer} from "../../lib/reader";

export const dynamic="force-dynamic";
export const metadata={title:"オーナーログイン",robots:{index:false,follow:false}};

/** Stable, unlinked sign-in entrance. All actual private routes enforce authorization. */
export default async function Login(){
 if((await currentViewer()).owner)redirect("/owner/archive");
 return <section className="static-page">
   <h1>オーナーログイン</h1>
   <p>管理者本人のみ利用できます。</p>
   <p><a href="/signin-with-chatgpt?return_to=%2Fowner%2Farchive" target="_top">ChatGPT でログインする →</a></p>
 </section>;
}
