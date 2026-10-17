import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("reader-facing title is 観測と思考; aiDiary is only the engine credit",()=>{
 const layout=read("app/layout.tsx");
 const home=read("app/page.tsx");
 assert.match(layout,/default:"観測と思考"/);
 assert.match(layout,/template:"%s \| 観測と思考"/);
 assert.match(layout,/aria-label="観測と思考 ホーム"/);
 assert.match(layout,/Powered by aiDiary/);
 assert.doesNotMatch(layout,/aria-label="aiDiary ホーム"/);
 assert.match(home,/<h1>観測と思考<\/h1>/);
 assert.doesNotMatch(home,/TECHNOLOGY \/ NOTES \/ IDEAS/);
});

test("site background is explicitly pure white and remains responsive",()=>{
 const css=read("app/globals.css");
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
 assert.match(layout,/オーナーログイン/);
});
