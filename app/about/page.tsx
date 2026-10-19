export const metadata = {
  title: "このサイトについて",
  description: "「観測と思考」の運営方針と記事の制作について。",
};

export default function AboutPage() {
  return (
    <article className="static-page">
      <p className="eyebrow">ABOUT THIS BLOG</p>
      <h1>このサイトについて</h1>
      <p>
        「観測と思考」は、技術や社会の出来事について、自分が気になったことを調べ、
        そこから考えたことを記録する個人ブログです。
      </p>

      <h2>書いている人</h2>
      <p>
        hisashiishihara は、踊り蟹の管理人。計算機、現代音楽に詳しい。
      </p>

      <h2>AI と記事制作</h2>
      <p>
        ChatGPT などの AI を調査の補助、論点の整理、文章の推敲に利用することがあります。
        ただし、AI の出力をそのまま事実とみなすものではありません。
        公開する内容と判断の責任はサイト運営者が負います。
      </p>

      <h2>運営について</h2>
      <p>
        このサイトは個人が運営しています。記事の訂正や追記は、必要に応じて行います。
        閲覧時のデータの取り扱いについては
        {" "}<a href="/privacy">プライバシーポリシー</a>をご覧ください。
      </p>
    </article>
  );
}
