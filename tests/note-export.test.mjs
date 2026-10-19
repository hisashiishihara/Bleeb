import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {noteExport,markdownToNoteHtml} from "../lib/note-export.ts";

const entry={id:"11111111-2222-3333-4444-555555555555",slug:"sample-story",
 status:"published",visibility:"public",published_revision:2,latest_revision:2};
const revision={
 revision:2,title:"日本語の記事",summary:"短い概要です。",
 body_md:"## 見出し\n\n本文は**重要**です。[参考資料](https://example.com/a?x=1&y=2)\n\n続きの本文です。",
 saved_at:"2026-10-17T13:30:00.000Z",tags_json:'["思想","AI"]'
};
const origin="https://diary.example.com";

test("MT export uses one UTF-8 article, safe headers, JST date and stable filename",()=>{
 const result=noteExport(entry,revision,"full",origin);
 assert.match(result.filename,/aiDiary-note-11111111-r2-full\.txt/);
 assert.ok(result.content.startsWith("TITLE: 日本語の記事\n"));
 assert.match(result.content,/DATE: 10\/17\/2026 22:30:00/);
 assert.match(result.content,/STATUS: Draft\nCONVERT BREAKS: 0/);
 assert.match(result.content,/\n-----\nBODY:\n<h3>見出し<\/h3>/);
 assert.match(result.content,/<strong>重要<\/strong>/);
 assert.match(result.content,/<a href="https:\/\/example\.com\/a\?x=1&amp;y=2">参考資料<\/a>/);
 assert.match(result.content,/<p>続きの本文です。<\/p>/);
 assert.ok(result.content.endsWith("\n-----\n--------\n"));
 assert.equal(result.sourceUrl,origin+"/posts/sample-story");
 assert.match(result.content,/>原文：/);
 assert.match(result.content,/TAGS: "思想","AI"/);
});

test("excerpt export uses summary and opening, omits later paragraphs",()=>{
 const r={...revision,body_md:"一つ目の段落。\n\n二つ目の段落。\n\n第三段落は全文のみ。"};
 const abbreviated=noteExport(entry,r,"excerpt",origin);
 const complete=noteExport(entry,r,"full",origin);
 assert.match(abbreviated.content,/短い概要です。/);
 assert.match(abbreviated.content,/一つ目の段落。/);
 assert.match(abbreviated.content,/二つ目の段落。/);
 assert.doesNotMatch(abbreviated.content,/第三段落は全文のみ/);
 assert.match(complete.content,/第三段落は全文のみ/);
});

test("owner-only, draft and unpublished latest revision never contain a dead source link",()=>{
 const options=[
  {...entry,visibility:"owner"},
  {...entry,status:"draft",published_revision:null},
  {...entry,latest_revision:1}
 ];
 for(const option of options){
  for(const mode of ["excerpt","full"]){
   const out=noteExport(option,revision,mode,origin);
   assert.equal(out.sourceUrl,null);
   assert.doesNotMatch(out.content,/diary\.example\.com\/posts\//);
   assert.match(out.content,/STATUS: Draft/);
  }
 }
});

test("legacy publication pointer does not hide a currently public latest article",()=>{
 const content=noteExport({...entry,published_revision:1},revision,"full",origin);
 assert.equal(content.sourceUrl,origin+"/posts/sample-story");
});

test("HTML payloads, unsafe schemes and media links cannot escape into note HTML",()=>{
 const s=markdownToNoteHtml(
  "悪意のある <img src=x onerror=alert(1)> と [危険](javascript:alert) と [安全](https://example.org/ok).\n\n"+
  "![私的画像](/media/11111111-2222-3333-4444-555555555555)\n\n"+
  "~~~\n<script>danger</script>\n~~~\n\n- **箇条書き**\n- 二項目"
 );
 assert.doesNotMatch(s,/<script>|onerror=alert\(1\)>/);
 assert.match(s,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.match(s,/危険/);
 assert.doesNotMatch(s,/href="javascript/);
 assert.match(s,/href="https:\/\/example\.org\/ok/);
 assert.doesNotMatch(s,/\/media\/11111111/);
 assert.match(s,/画像: 私的画像/);
 assert.match(s,/<pre><code>&lt;script&gt;danger&lt;\/script&gt;<\/code><\/pre>/);
 assert.match(s,/<ul><li><strong>箇条書き<\/strong><\/li><li>二項目<\/li><\/ul>/);
});

test("MT headers do not allow newline field injection",()=>{
 const poisoned={...revision,title:"通常の記事\nSTATUS: Publish\nAUTHOR: impostor"};
 const data=noteExport(entry,poisoned,"full",origin);
 assert.match(data.content,/TITLE: 通常の記事 STATUS: Publish AUTHOR: impostor\n/);
 assert.equal(data.content.match(/^STATUS:/gm)?.length,1);
 assert.doesNotMatch(data.content,/^STATUS: Publish$/m);
});

test("note mode is explicitly restricted",()=>{
 assert.throws(()=>noteExport(entry,revision,"unknown",origin),/Invalid note export mode/);
});

test("note editor opens note independently from clipboard and documents MT imports",()=>{
 const editor=readFileSync(new URL("../app/components/markdown-editor.tsx",import.meta.url),"utf8");
 assert.match(editor,/href="https:\/\/note\.com\/new" target="_blank" rel="noopener noreferrer"/);
 assert.match(editor,/本文をコピー（書式付き）/);
 assert.match(editor,/onClick=\{\(\)=>void copyToNote\(\)\}/);
 assert.match(editor,/manualNoteCopy&&noteCopy/);
 assert.doesNotMatch(editor,/window\.open\(/);
 assert.doesNotMatch(editor,/tab\?\.close\(/);
 assert.match(editor,/自分の記事 → インポート → MT 形式/);
});
