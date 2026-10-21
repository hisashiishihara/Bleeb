import { DiaryError } from "./input.ts";

export const VISIBILITIES = ["owner", "public"] as const;
export type Visibility = typeof VISIBILITIES[number];
export type Identity = { id: string; email: string | null };
export type Viewer = { owner: boolean };
export const anonymous: Viewer = {owner:false};

/** Only call at Sites ingress: Dispatch replaces client-supplied identity headers. */
export function requestIdentity(headers: Headers): Identity | null {
  const id = headers.get("oai-authenticated-user-id");
  return id ? {id, email:headers.get("oai-authenticated-user-email")} : null;
}
export function ownerIdentity(identity:Identity|null, email:string|undefined): boolean {
  return !!identity?.email && !!email && identity.email.trim().toLowerCase() === email.trim().toLowerCase();
}
export function visibility(value:unknown): Visibility {
  if (!VISIBILITIES.includes(value as Visibility)) throw new DiaryError("invalid_visibility","Choose owner or public",400);
  return value as Visibility;
}
export function resolveViewer(identity:Identity|null, owner:boolean): Viewer {
  return owner && identity ? {owner:true} : anonymous;
}
/** Constant SQL, never assembled from client-controlled identifiers or claims.
 * Shared published-reader condition. Keep the publication marker check even
 * when the displayed revision is latest_revision. */
export function publishedReaderScope(viewer:Viewer):string {
 return "e.status='published' AND e.published_revision IS NOT NULL AND ("+audienceSql(viewer)+")";
}
export function audienceSql(viewer:Viewer): string {
  if (viewer.owner) return "1=1";
  return "e.visibility='public'";
}
