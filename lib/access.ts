import { DiaryError } from "./input.ts";

export const VISIBILITIES = ["owner", "paid", "registered", "public"] as const;
export type Visibility = typeof VISIBILITIES[number];
export type Identity = { id: string; email: string | null };
export type Viewer = { owner: boolean; registered: boolean; paid: boolean };
export type Member = { user_id:string; registered_at:string; tier:"registered"|"paid"; active:number; paid_active:number; paid_until:string|null; updated_at:string };
export const anonymous: Viewer = {owner:false,registered:false,paid:false};

/** Only call at Sites ingress: Dispatch replaces client-supplied identity headers. */
export function requestIdentity(headers: Headers): Identity | null {
  const id = headers.get("oai-authenticated-user-id");
  return id ? {id, email:headers.get("oai-authenticated-user-email")} : null;
}
export function ownerIdentity(identity:Identity|null, email:string|undefined): boolean {
  return !!identity?.email && !!email && identity.email.trim().toLowerCase() === email.trim().toLowerCase();
}
export function visibility(value:unknown): Visibility {
  if (!VISIBILITIES.includes(value as Visibility)) throw new DiaryError("invalid_visibility","Choose owner, paid, registered or public",400);
  return value as Visibility;
}
export async function resolveViewer(db:D1Database, identity:Identity|null, owner:boolean, now=Date.now()): Promise<Viewer> {
  if (owner && identity) return {owner:true,registered:true,paid:true};
  if (!identity) return anonymous;
  const member=await db.prepare("SELECT * FROM members WHERE user_id=?").bind(identity.id).first<Member>();
  const registered=member?.active===1;
  const paid=registered && member?.tier==="paid" && member.paid_active===1 &&
    (member.paid_until===null || (Number.isFinite(Date.parse(member.paid_until)) && Date.parse(member.paid_until)>now));
  return {owner:false,registered,paid};
}
/** Constant SQL, never assembled from client-controlled identifiers or claims. */
export function audienceSql(viewer:Viewer): string {
  if (viewer.owner) return "1=1";
  if (viewer.registered && viewer.paid) return "e.visibility IN ('paid','registered','public')";
  if (viewer.registered) return "e.visibility IN ('registered','public')";
  return "e.visibility='public'";
}
