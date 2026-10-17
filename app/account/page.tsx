import { headers } from "next/headers";
import { database } from "../../lib/store";
import { requestIdentity, type Member } from "../../lib/access";
import { currentViewer } from "../../lib/reader";
export const dynamic="force-dynamic";
export const revalidate=0;
export const metadata={title:"会員登録・資格",robots:{index:false,follow:false}};
export default async function Account() {
  const identity=requestIdentity(new Headers(await headers()));
  if(!identity) return <section className="owner"><h1>会員登録</h1><p>ChatGPT でログイン後、aiDiary の無料会員として登録できます。</p><a href="/signin-with-chatgpt?return_to=%2Faccount" target="_top">ChatGPT でログイン</a></section>;
  const viewer=await currentViewer();
  const member=await database().prepare("SELECT * FROM members WHERE user_id=?").bind(identity.id).first<Member>();
  return <section className="owner"><h1>会員登録・資格</h1>
    <p>aiDiary の会員資格は ChatGPT Plus / Pro の契約とは別です。決済機能は接続していません。</p>
    {viewer.owner?<p>オーナーとしてすべての記事を閲覧できます。<a href="/owner/archive">自分のアーカイブ</a> · <a href="/owner/members">会員管理</a></p>:
      member?<><p>登録状態: {viewer.registered?"有効":"無効"}</p><p>有料資格: {viewer.paid?"有効":"なし・無効・期限切れ"}</p><p>有効期限: {member.paid_until??"期限指定なし"}</p></>:
      <form method="post" action="/api/membership"><input type="hidden" name="action" value="register"/><p>登録すると登録会員向け記事を閲覧できます。有料会員には変更されません。</p><button type="submit">無料会員として登録</button></form>}
    <p><a href="/">記事一覧へ</a></p>
  </section>;
}
