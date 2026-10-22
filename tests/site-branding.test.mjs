import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("branding is configured rather than hardcoded to one owner's blog",()=>{
 const layout=read("app/layout.tsx"),home=read("app/page.tsx");
 for(const code of [layout,home]){
  assert.match(code,/siteBranding\(/);
  assert.doesNotMatch(code,/観測と思考|技術の変化を読み/);
 }
 assert.match(layout,/Powered by <a href="https:\/\/github\.com\/hisashiishihara\/Bleeb"/);
 assert.match(home,/<h1>\{site.title\}<\/h1>/);
 for(const path of ["app/about/page.tsx","app/privacy/page.tsx"]){
  const src=read(path);
  assert.match(src,/siteBranding\(/);
  assert.doesNotMatch(src,/観測と思考|hisashiishihara|blog\.odorikani\.net/);
 }
 const discovery=read("lib/public-discovery.ts");
 assert.match(discovery,/SITE_TITLE="My Blog"/);
 assert.doesNotMatch(discovery,/観測と思考|blog\.odorikani\.net/);
});

test("public navigation has no private links while owner sign-in remains available",()=>{
 const layout=read("app/layout.tsx");
 const login=read("app/login/page.tsx");
 const reader=read("lib/reader.ts");
 assert.match(layout,/export const dynamic = "force-dynamic"/);
 for(const label of ["最新記事","過去ログ","タグ","検索"])assert.ok(layout.includes(label));
 assert.doesNotMatch(layout,/オーナー画面|オーナーログイン|signin-with-chatgpt|<a href="\/owner\/archive"/);
 assert.doesNotMatch(layout,/currentViewer\(\)/);
 assert.match(login,/robots:\{index:false,follow:false\}/);
 assert.match(login,/if\(\(await currentViewer\(\)\)\.owner\)redirect\("\/owner\/archive"\)/);
 assert.match(login,/href="\/signin-with-chatgpt\?return_to=%2Fowner%2Farchive" target="_top"/);
 assert.match(reader,/requestIdentity\(new Headers\(await headers\(\)\)\)/);
 assert.match(reader,/ownerIdentity\(identity,config\.AI_DIARY_OWNER_EMAIL\)/);
 assert.match(reader,/AI_DIARY_OWNER_API_ENABLED==="true"/);
});

test("site background is explicitly pure white and remains responsive",()=>{
 const css=read("app/styles/theme.css");
 const layout=read("app/globals.css");
 assert.match(layout,/@import "\.\/styles\/theme\.css"/);
 assert.match(css,/html,\s*body\s*\{\s*background:\s*#ffffff\s*;/);
 assert.match(css,/\.site-header\s*\{/);
 assert.match(css,/@media\(max-width:650px\)/);
});

test("branding changes do not turn on public indexing or alter owner-only access",()=>{
 const layout=read("app/layout.tsx");
 const post=read("app/posts/[slug]/page.tsx");
 const editor=read("app/components/markdown-editor.tsx");
 assert.match(layout,/robots:\{index:false,follow:false\}/);
 assert.match(post,/robots:\{index:false,follow:false\}/);
 assert.match(editor,/publish_entry/);
 assert.doesNotMatch(layout,/オーナーログイン|オーナー画面/);
 assert.match(read("app/login/page.tsx"),/オーナーログイン/);
});
