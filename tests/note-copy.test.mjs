import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {noteClipboardPayload,markdownToNoteHtml} from "../lib/note-copy.ts";

const entry={slug:"sample-story",status:"published",visibility:"public",latest_revision:2};
const revision={
 revision:2,title:"日本語の記事",
 body_md:"## 見出し\n\n本文は**重要**です。[参考資料](https://example.com/a?x=1&y=2)\n\n続きの本文です。"
};
const origin="https://diary.example.com";

test("rich copy contains rendered headings, links and text with public source URL",()=>{
 const data=noteClipboardPayload(entry,revision,origin);
 assert.equal(data.title,"日本語の記事");
 assert.match(data.html,/<h3>見出し<\/h3>/);
 assert.match(data.html,/<strong>重要<\/strong>/);
 assert.match(data.html,/<a href="https:\/\/example\.com\/a\?x=1&amp;y=2">参考資料<\/a>/);
 assert.match(data.html,/<p>続きの本文です。<\/p>/);
 assert.equal(data.sourceUrl,origin+"/posts/sample-story");
 assert.match(data.html,/>原文：/);
 assert.match(data.text,/Original: https:\/\/diary\.example\.com\/posts\/sample-story/);
});
test("private, draft and stale content never exposes an article link",()=>{
 const options=[
  {...entry,visibility:"owner"},
  {...entry,status:"draft"},
  {...entry,latest_revision:1}
 ];
 for(const option of options){
  const data=noteClipboardPayload(option,revision,origin);
  assert.equal(data.sourceUrl,null);
  assert.doesNotMatch(data.html,/diary\.example\.com\/posts\//);
  assert.doesNotMatch(data.text,/diary\.example\.com\/posts\//);
 }
});
test("rich copy renderer escapes raw HTML, invalid links and hides private media URLs",()=>{
 const data=markdownToNoteHtml(
  "悪意のある <img src=x onerror=alert(1)> と [危険](javascript:alert) と [安全](https://example.org/ok).\n\n"+
  "![私的画像](/media/11111111-2222-3333-4444-555555555555)\n\n"+
  "~~~\n<script>danger</script>\n~~~\n\n- **箇条書き**\n- 二項目"
 );
 assert.doesNotMatch(data,/<script>|onerror=alert\(1\)>/);
 assert.match(data,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.doesNotMatch(data,/href="javascript/);
 assert.match(data,/href="https:\/\/example\.org\/ok/);
 assert.doesNotMatch(data,/\/media\/11111111/);
 assert.match(data,/画像: 私的画像/);
 assert.match(data,/<pre><code>&lt;script&gt;danger&lt;\/script&gt;<\/code><\/pre>/);
 assert.match(data,/<ul><li><strong>箇条書き<\/strong><\/li><li>二項目<\/li><\/ul>/);
});
test("note clipboard route preserves owner auth, exact revision and disables MT",()=>{
 const route=readFileSync(new URL("../app/owner/archive/[id]/note-copy/route.ts",import.meta.url),"utf8");
 const editor=readFileSync(new URL("../app/components/markdown-editor.tsx",import.meta.url),"utf8");
 const docs=readFileSync(new URL("../docs/USAGE.md",import.meta.url),"utf8");
 assert.match(route,/authorizedOwner\(request\)/);
 assert.match(route,/record\.entry\.latest_revision!==expected/);
 assert.match(route,/Response\.json\(\{title:data\.title,html:data\.html,text:data\.text\}/);
 assert.match(editor,/\/note-copy\?revision=/);
 assert.match(editor,/本文をコピー（書式付き）/);
 assert.match(editor,/href="https:\/\/note\.com\/new" target="_blank" rel="noopener noreferrer"/);
 assert.match(editor,/manualNoteCopy&&noteCopy/);
 assert.doesNotMatch(editor,/export-note|MT 形式|冒頭・要約版をダウンロード|全文版をダウンロード/);
 assert.doesNotMatch(docs,/Movable Type \(MT\) format/);
});
