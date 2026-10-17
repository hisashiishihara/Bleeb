export class DiaryError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "DiaryError";
    this.code = code;
    this.status = status;
  }
}
export type DraftInput = {
  title: string;
  body_md: string;
  summary?: string | null;
  tags?: string[];
};
export function requireString(value: unknown, name: string, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new DiaryError("invalid_input", name + " must be 1-" + max + " characters");
  }
  return value;
}
export function requestId(value: unknown): string {
  const id = requireString(value, "request_id", 128);
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(id)) throw new DiaryError("invalid_input", "invalid request_id");
  return id;
}
export function entryId(value: unknown): string {
  const id = requireString(value, "entry_id", 80);
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(id)) throw new DiaryError("invalid_input", "invalid entry_id");
  return id;
}
export function revisionNumber(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw new DiaryError("invalid_input", "revision must be a positive integer");
  }
  return value as number;
}
export function validateDraft(value: unknown): DraftInput {
  if (!value || typeof value !== "object") throw new DiaryError("invalid_input", "draft object required");
  const v = value as Record<string, unknown>;
  const title = requireString(v.title, "title", 200).trim();
  const body_md = requireString(v.body_md, "body_md", 150000);
  const summary = v.summary == null ? null : requireString(v.summary, "summary", 500).trim();
  if (v.tags !== undefined && (!Array.isArray(v.tags) || v.tags.length > 20 || !v.tags.every(x => typeof x === "string" && x.length > 0 && x.length <= 40))) {
    throw new DiaryError("invalid_input", "invalid tags");
  }
  return { title, body_md, summary, tags: (v.tags as string[] | undefined) ?? [] };
}
export function slugFor(title: string, id: string): string {
  const normalized = title.normalize("NFKD").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64).replace(/-$/g, "");
  return (normalized || "entry") + "-" + id.slice(0, 8);
}
