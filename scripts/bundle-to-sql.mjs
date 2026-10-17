#!/usr/bin/env node
// Offline restore conversion. Run ONLY against an empty test D1 database.
import { readFileSync } from "node:fs";
import { validateExport } from "../lib/export.ts";

const path = process.argv[2];
if (!path) { console.error("Usage: node --experimental-strip-types scripts/bundle-to-sql.mjs <export.json>"); process.exit(2); }
const bundle = JSON.parse(readFileSync(path, "utf8"));
validateExport(bundle);
const sql = v => v == null ? "NULL" : typeof v === "number" ? String(v) : "'" + String(v).replaceAll("'", "''") + "'";
const row = (table, cols, object) => "INSERT INTO " + table + " (" + cols.join(",") + ") VALUES (" + cols.map(k=>sql(object[k])).join(",") + ");";
const entryCols = ["id","slug","status","latest_revision","published_revision","created_at","updated_at","published_at"];
const revisionCols = ["entry_id","revision","title","body_md","summary","tags_json","saved_at"];
const lines = ["PRAGMA foreign_keys=ON;", "BEGIN TRANSACTION;"];
for (const entry of bundle.entries) lines.push(row("entries",entryCols,entry));
for (const rev of bundle.revisions) lines.push(row("entry_revisions",revisionCols,rev));
lines.push("COMMIT;");
process.stdout.write(lines.join("\n") + "\n");
