import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("reader-facing title is 観測と思考; Bleeb is the linked engine credit",()=>{
 const layout=read("app/layout.tsx");
 const home=read("app/page.tsx");
 assert.match(layout,/default:"観測と思考"/);
 assert.match(layout,/template:"%s \| 観測と思考"/);
 assert.match(layout,/aria-label="観測と思考 ホーム"/);
 assert.match(layout,/\(C\)2026 観測と思考/);
 assert.match(layout,/Powered by <a href="https:\/\/github\.com\/hisashiishihara\/Bleeb"[^>]*>Bleeb<\/a>/);
 assert.doesNotMatch(layout,/Powered by aiDiary|記事は明示的な公開操作/);
 assert.doesNotMatch(layout,/aria-label="aiDiary ホーム"/);
 assert.match(home,/<h1>観測と思考<\/h1>/);
 assert.doesNotMatch(home,/TECHNOLOGY \/ NOTES \/ IDEAS/);
 assert.ok(home.includes("技術の変化を読み、企業や市場の未来を予測する個人の blog"));
 assert.ok(layout.includes("技術の変化を読み、企業や市場の未来を予測する個人の blog"));
 const discovery=read("lib/public-discovery.ts");
 assert.ok(discovery.includes("技術の変化を読み、企業や市場の未来を予測する個人の blog"));

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
 assert.match(layout,/robots:\{\s*index:false,\s*follow:false\s*\}/);
 assert.match(post,/robots:\{index:false,follow:false\}/);
 assert.match(editor,/publish_entry/);
 assert.doesNotMatch(layout,/オーナーログイン|オーナー画面/);
 assert.match(read("app/login/page.tsx"),/オーナーログイン/);
});
