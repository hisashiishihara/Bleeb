import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {hatenaBookmarkAddUrl} from "../lib/hatena-bookmark.ts";

test("Hatena add URL points to the canonical public article",()=>{
 const result=hatenaBookmarkAddUrl("https://blog.example.org/posts/hello?utm_source=abc#part");
 const parsed=new URL(result);
 assert.equal(parsed.origin,"https://b.hatena.ne.jp");
 assert.equal(parsed.pathname,"/add");
 assert.equal(parsed.searchParams.get("mode"),"confirm");
 assert.equal(parsed.searchParams.get("url"),"https://blog.example.org/posts/hello");
});

test("Hatena add URLs reject non-web protocols and credential-bearing URLs",()=>{
 assert.throws(()=>hatenaBookmarkAddUrl("javascript:alert(1)"),/Invalid article URL/);
 assert.throws(()=>hatenaBookmarkAddUrl("https://name:password@site.example/x"),/Invalid article URL/);
});

test("owner editor links only publicly visible published articles",()=>{
 const editor=readFileSync(new URL("../app/components/markdown-editor.tsx",import.meta.url),"utf8");
 const editPage=readFileSync(new URL("../app/owner/archive/[id]/edit/page.tsx",import.meta.url),"utf8");
 const post=readFileSync(new URL("../app/posts/[slug]/page.tsx",import.meta.url),"utf8");
 assert.match(editPage,/slug:entry\.slug/);
 assert.match(editor,/status==="published"&&activeVisibility==="public"&&hatenaHref/);
 assert.match(editor,/href=\{hatenaHref\} target="_blank" rel="noopener noreferrer"/);
 assert.match(editor,/encodeURIComponent\(initial\.slug\)/);
 assert.doesNotMatch(post,/HatenaBookmarkButton|article-share|はてブに追加/);
 assert.match(post,/item\.visibility==="public" && <ReferrerPing slug=\{slug\} \/>/);
});
