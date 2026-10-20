import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("current docs describe two audiences, current revisions, 12 tools and public rollout",()=>{
 const docs=["docs/DESIGN.md","docs/ARTICLE_ACCESS.md","docs/PUBLIC_ROLLOUT.md"];
 for(const file of docs){
  const text=read(file);
  assert.match(text,/owner/);
  assert.match(text,/public/);
  assert.match(text,/latest_revision|latest saved revision|latest revision/i);
 }
 assert.match(read("docs/PUBLIC_ROLLOUT.md"),/12 MCP tools/);
 assert.match(read("docs/ARTICLE_ACCESS.md"),/disabled/i);
});

test("note docs describe existing clipboard route, not removed MT UI",()=>{
 const docs=read("docs/NOTE_EXPORT.md"),editor=read("app/components/markdown-editor.tsx");
 assert.match(docs,/note-copy\?revision=N/);
 assert.match(editor,/\/note-copy\?revision=/);
 assert.match(editor,/本文をコピー（書式付き）/);
 assert.doesNotMatch(editor,/export-note|MT 形式|全文版をダウンロード|冒頭・要約版をダウンロード/);
 assert.match(docs,/MT.*removed/);
});

test("public discovery docs match the implemented endpoints and private filtering",()=>{
 const docs=read("docs/DESIGN.md"),discovery=read("lib/public-discovery.ts");
 assert.match(docs,/\/feed\.xml/);
 assert.match(docs,/\/sitemap\.xml/);
 assert.match(discovery,/e\.visibility='public'/);
 assert.match(discovery,/e\.status='published'/);
});
