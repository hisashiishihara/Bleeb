import { env } from "cloudflare:workers";
import { siteBranding } from "../../lib/public-discovery";
import { MediaMarkdown } from "../components/media-markdown";
export const dynamic="force-dynamic";
export const metadata={robots:{index:true,follow:true},title:"このサイトについて"};
export default function AboutPage(){
 const site=siteBranding(env as {SITE_TITLE?:string;SITE_DESCRIPTION?:string;SITE_CONTACT_URL?:string});
 const content=(env as {SITE_ABOUT_MD?:string}).SITE_ABOUT_MD?.trim();
 return <article className="static-page">
  <p className="eyebrow">ABOUT THIS BLOG</p><h1>このサイトについて</h1>
  {content?<div className="prose"><MediaMarkdown body={content}/></div>:<>
  <p>{site.title} — {site.description}</p>
  <p>このサイトは Bleeb を使用しています。記事の内容、著作権、運営方針はサイトの運営者が定めます。</p>
  <p>記事やサイトの運営に関する詳細は、サイト運営者にお問い合わせください。</p>
  {site.contactUrl&&<p><a href={site.contactUrl} target="_blank" rel="noopener noreferrer">お問い合わせ</a></p>}
  <p><a href="/privacy">プライバシーポリシー</a></p>
  </>}
 </article>;
}
