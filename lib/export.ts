import { DiaryError } from "./input.ts";
export type ExportRevision = {
  entry_id: string; revision: number; title: string; body_md: string;
  summary: string | null; tags_json: string; saved_at: string;
};
export type ExportEntry = {
  id: string; slug: string; status: string; latest_revision: number;
  published_revision: number | null; created_at: string; updated_at: string;
  published_at: string | null;
};
export type ExportBundle = {
  schema_version: 1;
  exported_at: string;
  entries: ExportEntry[];
  revisions: ExportRevision[];
  files: Record<string, string>;
};
export function makeExport(entries: ExportEntry[], revisions: ExportRevision[], now: string): ExportBundle {
  const files: Record<string,string> = {};
  for (const revision of revisions) {
    const entry = entries.find(x => x.id === revision.entry_id);
    if (!entry) throw new DiaryError("integrity", "orphan revision", 500);
    const filename = "entries/" + entry.id + "/rev-" + revision.revision + ".md";
    files[filename] = revision.body_md;
  }
  return { schema_version: 1, exported_at: now, entries, revisions, files };
}
export function validateExport(bundle: ExportBundle): void {
  if (!bundle || bundle.schema_version !== 1 || !Array.isArray(bundle.entries) || !Array.isArray(bundle.revisions)) {
    throw new DiaryError("invalid_export", "invalid export bundle");
  }
  const ids = new Set(bundle.entries.map(x => x.id));
  for (const item of bundle.revisions) {
    if (!ids.has(item.entry_id)) throw new DiaryError("invalid_export", "missing entry");
    const path = "entries/" + item.entry_id + "/rev-" + item.revision + ".md";
    if (bundle.files?.[path] !== item.body_md) throw new DiaryError("invalid_export", "markdown does not match manifest");
  }
}
