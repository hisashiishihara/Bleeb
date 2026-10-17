import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { makeExport } from "../lib/export.ts";

const migration=readFileSync(new URL("../drizzle/0000_initial.sql",import.meta.url),"utf8");
test("fake Markdown revisions round-trip through offline restore SQL",()=>{
 const t=mkdtempSync(join(tmpdir(),"ai-diary-"));
 try {
  const id="fake-01234567", timestamp="2026-01-01T00:00:00Z";
  const entry={id,slug:"fake-01234567",status:"published",latest_revision:2,published_revision:1,created_at:timestamp,updated_at:timestamp,published_at:timestamp};
  const revisions=[1,2].map(revision=>({entry_id:id,revision,title:"架空のテスト",body_md:revision===1?"# 公開例\nfoo's code":"# 非公開編集\n<fake>",summary:null,tags_json:"[]",saved_at:timestamp}));
  const bundle=makeExport([entry],revisions,timestamp);
  const bundlePath=join(t,"fake.json");
  writeFileSync(bundlePath,JSON.stringify(bundle));
  const result=spawnSync(process.execPath,["--experimental-strip-types","scripts/bundle-to-sql.mjs",bundlePath],{cwd:new URL("..",import.meta.url),encoding:"utf8"});
  assert.equal(result.status,0,result.stderr);
  const check=[
   "import sqlite3,sys",
   "db=sqlite3.connect(':memory:')",
   "db.executescript(sys.stdin.read())",
   "assert db.execute(\"SELECT count(*) FROM entries\").fetchone()[0] == 1",
   "assert db.execute(\"SELECT count(*) FROM entry_revisions\").fetchone()[0] == 2",
   "assert db.execute(\"SELECT body_md FROM entry_revisions WHERE revision=1\").fetchone()[0] == \"# 公開例\\nfoo's code\"",
   "assert db.execute(\"SELECT body_md FROM entries e JOIN entry_revisions r ON r.entry_id=e.id AND r.revision=e.published_revision\").fetchone()[0].startswith('# 公開例')"
  ].join("\n");
  const testSQL=spawnSync("python3",["-c",check],{input:migration+"\n"+result.stdout,encoding:"utf8"});
  assert.equal(testSQL.status,0,testSQL.stderr);
 } finally {rmSync(t,{recursive:true,force:true});}
});
