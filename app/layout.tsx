import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: { default:"観測と思考", template:"%s | 観測と思考" },
  description:"見たこと、考えたこと、その記録。技術、社会、日々の出来事を綴る個人ブログ。",
  robots:{ index:false, follow:false }
};

export default function RootLayout({children}:{children:ReactNode}) {
  return (
    <html lang="ja"><body>
      <div className="shell">
        <header className="site-header">
          <a className="brand" href="/" aria-label="観測と思考 ホーム">観測と思考</a>
          <nav aria-label="サイトメニュー"><a href="/">記事一覧</a><a href="/signin-with-chatgpt?return_to=%2Fowner%2Farchive" target="_top">オーナーログイン</a></nav>
        </header>
        <main>{children}</main>
        <footer className="footer">
          <span>観測と思考 <span className="engine-credit">／ Powered by aiDiary</span></span>
          <span>記事は明示的な公開操作によってのみ掲載されます。</span>
        </footer>
      </div>
    </body></html>
  );
}
