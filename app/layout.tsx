import type { ReactNode } from "react";
import { env } from "cloudflare:workers";
import { siteBranding } from "../lib/public-discovery";
import "./globals.css";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github.css";

// The public site has no owner navigation; access starts at a separately bookmarked login URL.
export const dynamic = "force-dynamic";

export async function generateMetadata(){
 const site=siteBranding(env as {SITE_TITLE?:string;SITE_DESCRIPTION?:string});
 return {
  title:{default:site.title,template:"%s | "+site.title},
  description:site.description,
  robots:{index:false,follow:false},
  alternates:{types:{"application/rss+xml":"/feed.xml"}}
 };
}

export default async function RootLayout({children}:{children:ReactNode}) {
  const site=siteBranding(env as {SITE_TITLE?:string;SITE_DESCRIPTION?:string;SITE_EYEBROW?:string;SITE_CONTACT_URL?:string});
  return (
    <html lang="ja"><body>
      <div className="shell">
        <header className="site-header">
          <a className="brand" href="/" aria-label={site.title+" ホーム"}>{site.title}</a>
          <nav aria-label="サイトメニュー"><a href="/">最新記事</a><a href="/archive">過去ログ</a><a href="/tags">タグ</a><a href="/archive#search">検索</a></nav>
        </header>
        <main>{children}</main>
        <footer className="footer">
          <div className="footer-meta">
            <span>(C)2026 {site.title}{"  "}<span className="engine-credit">Powered by <a href="https://github.com/hisashiishihara/Bleeb" target="_blank" rel="noopener noreferrer">Bleeb</a></span></span>
          </div>
          <nav className="footer-links" aria-label="フッターメニュー">
            <a href="/feed.xml">RSS</a>
            <a href="/about">このサイトについて</a>
            <a href="/privacy">プライバシーポリシー</a>
            {site.contactUrl&&<a href={site.contactUrl} target="_blank" rel="noopener noreferrer">お問い合わせ</a>}
          </nav>
        </footer>
      </div>
    </body></html>
  );
}
