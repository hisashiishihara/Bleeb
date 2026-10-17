import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";

const migration=readFileSync(new URL("../drizzle/0000_initial.sql",import.meta.url),"utf8");
test("SQLite schema enforces immutable revision keys and publication constraints",()=>{
  const script=[
    "import sqlite3,sys",
    "db=sqlite3.connect(':memory:')",
    "db.executescript(sys.stdin.read())",
    "db.execute(\"INSERT INTO entries VALUES('e1','test','draft',1,NULL,'t','t',NULL)\")",
    "db.execute(\"INSERT INTO entry_revisions VALUES('e1',1,'test','# draft',NULL,'[]','t')\")",
    "try:",
    " db.execute(\"INSERT INTO entry_revisions VALUES('e1',1,'overwrite','# evil',NULL,'[]','t')\")",
    " raise AssertionError('revision overwrite allowed')",
    "except sqlite3.IntegrityError: pass",
    "try:",
    " db.execute(\"UPDATE entries SET status='published' WHERE id='e1'\")",
    " raise AssertionError('published without revision')",
    "except sqlite3.IntegrityError: pass",
    "db.execute(\"UPDATE entries SET status='published',published_revision=1 WHERE id='e1'\")",
    "db.execute(\"INSERT INTO entry_revisions VALUES('e1',2,'new','# private',NULL,'[]','t')\")",
    "assert db.execute(\"SELECT body_md FROM entries e JOIN entry_revisions r ON r.entry_id=e.id AND r.revision=e.published_revision WHERE e.status='published'\").fetchone()[0]=='# draft'",
    "db.execute(\"UPDATE entries SET status='draft',published_revision=NULL WHERE id='e1'\")",
    "assert db.execute(\"SELECT count(*) FROM entries WHERE status='published'\").fetchone()[0]==0"
  ].join("\n");
  const r=spawnSync("python3",["-c",script],{input:migration,encoding:"utf8"});
  assert.equal(r.status,0,r.stderr);
});
