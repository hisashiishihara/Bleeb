import test from "node:test";
import assert from "node:assert/strict";
import { validateDraft, requestId, revisionNumber, slugFor } from "../lib/input.ts";
import {makeExport, validateExport} from "../lib/export.ts";

test("draft input is private by default and rejects oversized/malformed values", () => {
  assert.deepEqual(validateDraft({title:"  サンプル  ",body_md:"# 試験",tags:["test"]}), {
    title:"サンプル",body_md:"# 試験",summary:null,tags:["test"]
  });
  assert.throws(()=>validateDraft({title:"",body_md:"hello"}));
  assert.throws(()=>validateDraft({title:"title",body_md:"x".repeat(150001)}));
  assert.throws(()=>validateDraft({title:"title",body_md:"ok",tags:["x".repeat(50)]}));
});
test("revision and idempotency inputs fail closed",()=>{
  assert.equal(revisionNumber(2),2);
  for(const bad of [0,-1,1.5,"1",null]) assert.throws(()=>revisionNumber(bad));
  assert.equal(requestId("safe-key-0001"),"safe-key-0001");
  assert.throws(()=>requestId("bad"));
});
test("slug is safe and stable for Japanese content",()=>{
  assert.equal(slugFor("日本語です","abcdef12-xxxx"),"entry-abcdef12");
  assert.equal(slugFor("Hello, Vinext!","abcdef12-xxxx"),"hello-vinext-abcdef12");
});
test("export preserves multiple revisions and rejects tampered Markdown",()=>{
  const e={id:"abcde123-xx",slug:"entry-abcde123",status:"published",latest_revision:2,published_revision:1,created_at:"2026-01-01",updated_at:"2026-01-02",published_at:"2026-01-01"};
  const mk=(revision,body_md)=>({entry_id:e.id,revision,title:"Test",body_md,summary:null,tags_json:"[]",saved_at:"2026-01-01"});
  const bundle=makeExport([e],[mk(1,"# first"),mk(2,"# second")],"2026-01-02");
  validateExport(bundle);
  assert.equal(bundle.files["entries/abcde123-xx/rev-2.md"],"# second");
  bundle.files["entries/abcde123-xx/rev-1.md"]="tampered";
  assert.throws(()=>validateExport(bundle));
});
