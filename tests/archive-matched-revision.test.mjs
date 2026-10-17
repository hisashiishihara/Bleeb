import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { searchOwnerArchive, getOwnerArchiveEntry } from "../lib/owner-archive.ts";

test("archive opens the newest matching revision, with matching title and tags", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec(readFileSync(new URL("../drizzle/0000_initial.sql", import.meta.url), "utf8"));
    sqlite.exec(`INSERT INTO entries VALUES ('fixture01','fixture','draft',2,NULL,'t','t',NULL);
      INSERT INTO entry_revisions VALUES ('fixture01',1,'旧版タイトル','瑠璃環701 共通語',NULL,'["historic"]','t');
      INSERT INTO entry_revisions VALUES ('fixture01',2,'最新版タイトル','銀河棚902 共通語',NULL,'["current"]','t');`);
    sqlite.exec(readFileSync(new URL("../drizzle/0002_article_access.sql", import.meta.url), "utf8"));
    const db = { prepare(sql) {
      const statement = sqlite.prepare(sql);
      const bound = values => ({
        async all() { return { results: statement.all(...values) }; },
        async first() { return statement.get(...values) ?? null; }
      });
      return { ...bound([]), bind(...values) { return bound(values); } };
    }};
    const old = await searchOwnerArchive(db, {q:"瑠璃環701"});
    assert.equal(old.entries.length, 1);
    assert.equal(old.entries[0].matched_revision, 1);
    assert.equal(old.entries[0].title, "旧版タイトル");
    assert.equal(old.entries[0].tags_json, '["historic"]');
    const opened = await getOwnerArchiveEntry(db, old.entries[0].id, old.entries[0].matched_revision);
    assert.equal(opened.content.body_md, "瑠璃環701 共通語");
    for (const input of [{}, {q:"共通語"}, {q:"銀河棚902"}]) {
      assert.equal((await searchOwnerArchive(db,input)).entries[0].matched_revision, 2);
    }
    assert.equal((await searchOwnerArchive(db,{tag:"historic",status:"draft"})).entries[0].matched_revision, 1);
    assert.equal((await searchOwnerArchive(db,{q:"瑠璃環701",tag:"current"})).entries.length, 0);
    assert.equal((await searchOwnerArchive(db,{q:"aaaa"})).entries.length, 0);
  } finally { sqlite.close(); }
});
