import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: { default:"aiDiary｜技術と思考の記録", template:"%s | aiDiary" },
  description:"技術、実験、思考の記録。会話から育てる個人ブログ。",
  robots:{ index:false, follow:false }
};

export default function RootLayout({children}:{children:ReactNode}) {
  return (
    <html lang="ja"><body>
      <div className="shell">
        <header className="site-header">
          <a className="brand" href="/" aria-label="aiDiary ホーム">ai<span>Diary</span></a>
          <nav aria-label="サイトメニュー"><a href="/">記事一覧</a></nav>
        </header>
        <main>{children}</main>
        <footer className="footer">
          <span>aiDiary — 言葉と思考のアーカイブ</span>
          <span>記事は明示的な公開操作によってのみ掲載されます。</span>
        </footer>
      </div>
    </body></html>
  );
}
