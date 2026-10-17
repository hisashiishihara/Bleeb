import { requireOwnerPage } from "../../../lib/owner-page";
import { database } from "../../../lib/store";
import { listMembers } from "../../../lib/membership";
export const dynamic="force-dynamic";
export const revalidate=0;
export const metadata={title:"会員管理",robots:{index:false,follow:false}};
export default async function Members() {
  await requireOwnerPage();
  const members=await listMembers(database());
  return <section className="owner"><h1>会員管理</h1><p>登録済み会員だけを変更できます。資格の付与・失効は即時反映されます。実課金は発生しません。</p><a href="/owner/archive">自分のアーカイブ</a>
    {members.length===0?<p>登録された会員はいません。現在の Site はオーナー限定です。</p>:members.map(m=><article className="archive-result" key={m.user_id}>
      <h2>会員 {m.user_id}</h2><p>登録日時: {m.registered_at}</p>
      <form method="post" action="/api/owner/members" className="archive-search">
        <input type="hidden" name="user_id" value={m.user_id}/>
        <label>資格<select name="tier" defaultValue={m.tier}><option value="registered">登録会員</option><option value="paid">有料会員</option></select></label>
        <label>登録状態<select name="active" defaultValue={String(m.active===1)}><option value="true">有効</option><option value="false">無効</option></select></label>
        <label>有料資格<select name="paid_active" defaultValue={String(m.paid_active===1)}><option value="false">無効</option><option value="true">有効</option></select></label>
        <label>有料資格の期限（ISO 8601・空欄は期限なし）<input name="paid_until" defaultValue={m.paid_until??""} placeholder="2026-12-31T23:59:59+09:00"/></label>
        <button type="submit">会員資格を更新</button>
      </form>
    </article>)}
  </section>;
}
