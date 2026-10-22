import { env } from "cloudflare:workers";
import { siteBranding } from "../../lib/public-discovery";
export const metadata={robots:{index:true,follow:true},title:"プライバシーポリシー"};
export default function PrivacyPage(){
 const site=siteBranding(env as {SITE_TITLE?:string;SITE_DESCRIPTION?:string;SITE_CONTACT_URL?:string});
 return <article className="static-page">
  <p className="eyebrow">PRIVACY POLICY</p><h1>プライバシーポリシー</h1>
  <p>{site.title} の運営者は、公開前にこのページをサイトの実際のデータ取扱いに合わせて設定してください。</p>
  <h2>ホスティングと通信情報</h2>
  <p>サイト配信に伴い、利用するサービスが IP アドレスやブラウザ情報などを処理する場合があります。具体的な保存・利用目的は運営者が確認し、記載してください。</p>
  <h2>外部コンテンツと解析</h2>
  <p>埋め込み、アクセス解析、Cookie、広告を利用する場合は、その利用状況と適用されるプライバシーポリシーを記載してください。</p>
  {site.contactUrl&&<p><a href={site.contactUrl} target="_blank" rel="noopener noreferrer">お問い合わせ</a></p>}
 </article>;
}
