import type { ReactNode } from "react";
import "./globals.css";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github.css";
import { currentViewer } from "../lib/reader";

// Header navigation must reflect the verified owner for each request.
export const dynamic = "force-dynamic";

export const metadata = {
  title: { default:"観測と思考", template:"%s | 観測と思考" },
  description:"見たこと、考えたこと、その記録。技術、社会、日々の出来事を綴る個人ブログ。",
  robots:{ index:false, follow:false }
};

export default async function RootLayout({children}:{children:ReactNode}) {
  const isOwner = (await currentViewer()).owner;
  return (
    <html lang="ja"><body>
      <div className="shell">
        <header className="site-header">
          <a className="brand" href="/" aria-label="観測と思考 ホーム">観測と思考</a>
          <nav aria-label="サイトメニュー"><a href="/">最新記事</a><a href="/archive">過去ログ</a><a href="/tags">タグ</a><a href="/archive#search">検索</a>{isOwner ?
            <a href="/owner/archive">オーナー画面</a> :
            <a href="/signin-with-chatgpt?return_to=%2Fowner%2Farchive" target="_top">オーナーログイン</a>}</nav>
        </header>
        <main>{children}</main>
        <footer className="footer">
          <div className="footer-meta">
            <span>観測と思考 <span className="engine-credit">／ Powered by aiDiary</span></span>
            <span>記事は明示的な公開操作によってのみ掲載されます。</span>
          </div>
          <nav className="footer-links" aria-label="フッターメニュー">
            <a href="/about">このサイトについて</a>
            <a href="/privacy">プライバシーポリシー</a>
            <a href="https://docs.google.com/forms/d/e/1FAIpQLSc81ok44WQWOAKxovF6IJB1IN4ErCRIYuruOvcl3wCILOa_Eg/viewform" target="_blank" rel="noopener noreferrer">お問い合わせ</a>
          </nav>
        </footer>
      </div>
    </body></html>
  );
}
