import type { ReactNode } from "react";
import "./globals.css";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github.css";

// The public site has no owner navigation; access starts at a separately bookmarked login URL.
export const dynamic = "force-dynamic";

export const metadata = {
  title: { default:"観測と思考", template:"%s | 観測と思考" },
  description:"技術の変化を読み、企業や市場の未来を予測する個人の blog",
  robots:{ index:false, follow:false },
  alternates:{types:{"application/rss+xml":"/feed.xml"}}
};

export default async function RootLayout({children}:{children:ReactNode}) {
  return (
    <html lang="ja"><body>
      <div className="shell">
        <header className="site-header">
          <a className="brand" href="/" aria-label="観測と思考 ホーム">観測と思考</a>
          <nav aria-label="サイトメニュー"><a href="/">最新記事</a><a href="/archive">過去ログ</a><a href="/tags">タグ</a><a href="/archive#search">検索</a></nav>
        </header>
        <main>{children}</main>
        <footer className="footer">
          <div className="footer-meta">
            <span>(C)2026 観測と思考{"  "}<span className="engine-credit">Powered by <a href="https://github.com/hisashiishihara/Bleeb" target="_blank" rel="noopener noreferrer">Bleeb</a></span></span>
          </div>
          <nav className="footer-links" aria-label="フッターメニュー">
            <a href="/feed.xml">RSS</a>
            <a href="/about">このサイトについて</a>
            <a href="/privacy">プライバシーポリシー</a>
            <a href="https://docs.google.com/forms/d/e/1FAIpQLSc81ok44WQWOAKxovF6IJB1IN4ErCRIYuruOvcl3wCILOa_Eg/viewform" target="_blank" rel="noopener noreferrer">お問い合わせ</a>
          </nav>
        </footer>
      </div>
    </body></html>
  );
}
