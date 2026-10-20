export const metadata = {
  robots: {index:true,follow:true},
  title: "プライバシーポリシー",
  description: "「観測と思考」におけるアクセス情報、外部埋め込み、広告と Cookie の取り扱い。",
};

export default function PrivacyPage() {
  return (
    <article className="static-page">
      <p className="eyebrow">PRIVACY POLICY</p>
      <h1>プライバシーポリシー</h1>
      <p>
        「観測と思考」（blog.odorikani.net、以下「当サイト」）は個人運営のブログです。
        当サイトの閲覧に伴う情報の取り扱いについて、以下のとおり説明します。
      </p>

      <h2>アクセス情報と利用目的</h2>
      <p>
        当サイトの配信に利用するホスティング・セキュリティ関連サービスでは、
        ページへのアクセス時に IP アドレス、ブラウザ情報、アクセス日時などの通信情報が
        処理される場合があります。これらはサイトの配信、安定稼働、不正アクセス対策などに
        利用されます。各サービス側での情報の取り扱いには、その事業者の規約や
        プライバシーポリシーが適用されます。
      </p>
      <p>
        当サイトでは、一般公開の記事への外部サイトからの流入を把握するため、
        参照元のドメイン名を集計する機能を使用しています。この独自集計では、
        個々の訪問者を識別する ID、IP アドレス、Cookie、検索語や参照元 URL の
        パス・クエリ文字列を保存しません。なお、ホスティング事業者が扱う通信ログとは別の仕組みです。
      </p>

      <h2>外部サービスの埋め込み</h2>
      <p>
        記事によっては YouTube、X、TradingView などの外部サービスを使用します。
        YouTube と X の埋め込みは、読者が読み込みボタンを押した後に表示する方式です。
        TradingView のチャートは、掲載されている記事の表示時に読み込まれる場合があります。
        外部コンテンツの読み込み時には、各事業者が Cookie、IP アドレスなどの情報を
        取得・利用する可能性があります。詳しくは各事業者のプライバシーポリシーをご確認ください。
      </p>

      <h2>広告配信と Cookie</h2>
      <p>
        当サイトでは、将来的に Google AdSense などの第三者配信事業者による広告を
        掲載する場合があります。広告を掲載した場合、Google などの第三者配信事業者は、
        当サイトや他のウェブサイトへの過去のアクセス情報に基づいて広告を配信するため、
        Cookie、ウェブビーコン、IP アドレスその他の識別子を使用することがあります。
      </p>
      <p>
        Google の広告 Cookie を利用すると、Google とそのパートナーが、
        利用者の当サイトや他のサイトへのアクセス情報に基づいて広告を表示できる場合があります。
        パーソナライズド広告は
        {" "}<a href="https://myadcenter.google.com/" target="_blank" rel="noopener noreferrer">Google の広告設定</a>
        {" "}から無効にできます。また、
        {" "}<a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">AboutAds</a>
        {" "}から、一部の第三者配信事業者によるパーソナライズド広告を無効にできます。
      </p>
      <p>
        Google がパートナーサイトで取得した情報を利用する方法については、
        {" "}<a href="https://policies.google.com/technologies/partner-sites?hl=ja" target="_blank" rel="noopener noreferrer">Google の説明</a>
        {" "}をご覧ください。広告の配信や Cookie の使用は、利用者の地域と適用法令に応じた
        必要な通知・同意などの対応を行ったうえで実施します。
      </p>

      <h2>ポリシーの変更</h2>
      <p>
        利用するサービスや機能、適用法令の変更などに応じて、
        この内容を改定することがあります。変更後の内容は当ページで公開します。
      </p>
      <p className="policy-updated">制定日：2026年10月19日</p>
    </article>
  );
}
