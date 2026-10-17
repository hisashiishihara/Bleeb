import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {archiveFilters} from "../lib/owner-archive.ts";

test("owner search trims and bounds inputs",()=>{
  assert.deepEqual(archiveFilters({q:"  日本語  ",tag:"  tech  ",status:"published",offset:60}),{
    q:"日本語",tag:"tech",status:"published",offset:60
  });
  assert.equal(archiveFilters({q:"x".repeat(200),status:"hidden",offset:-10}).q.length,100);
  assert.equal(archiveFilters({offset:-10}).offset,0);
  assert.equal(archiveFilters({status:"hidden"}).status,"all");
});
test("fake D1 contents preserve private history and aggregate referrers by hostname",()=>{
  const m0=readFileSync(new URL("../drizzle/0000_initial.sql",import.meta.url),"utf8");
  const m1=readFileSync(new URL("../drizzle/0001_referrers.sql",import.meta.url),"utf8");
  const script=[
    "import sqlite3,sys",
    "db=sqlite3.connect(':memory:')",
    "db.executescript(sys.stdin.read())",
    "db.execute(\"INSERT INTO entries VALUES('e1','example','published',2,1,'t','t','t')\")",
    "db.execute(\"INSERT INTO entry_revisions VALUES('e1',1,'Published title','# visible',NULL,'[\\\"one\\\"]','t')\")",
    "db.execute(\"INSERT INTO entry_revisions VALUES('e1',2,'Later private','# hidden',NULL,'[\\\"secret\\\"]','t')\")",
    "db.execute(\"INSERT INTO referrer_daily VALUES('2026-10-17','e1','www.google.com',1)\")",
    "db.execute(\"INSERT INTO referrer_daily(day,entry_id,source_host,hits) VALUES('2026-10-17','e1','www.google.com',1) ON CONFLICT(day,entry_id,source_host) DO UPDATE SET hits=hits+1\")",
    "assert db.execute(\"SELECT hits FROM referrer_daily\").fetchone()[0]==2",
    "assert db.execute(\"SELECT body_md FROM entries e JOIN entry_revisions r ON r.entry_id=e.id AND r.revision=e.published_revision\").fetchone()[0]=='# visible'",
    "assert db.execute(\"SELECT count(*) FROM entry_revisions r, json_each(r.tags_json) jt WHERE jt.value='secret'\").fetchone()[0]==1",
    "db.execute(\"UPDATE entries SET status='draft',published_revision=NULL,published_at=NULL WHERE id='e1'\")",
    "assert db.execute(\"SELECT count(*) FROM entries WHERE status='published'\").fetchone()[0]==0",
    "assert db.execute(\"SELECT count(*) FROM entry_revisions\").fetchone()[0]==2"
  ].join("\n");
  const r=spawnSync("python3",["-c",script],{input:m0+"\n"+m1,encoding:"utf8"});
  assert.equal(r.status,0,r.stderr);
});
