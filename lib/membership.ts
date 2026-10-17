import { DiaryError } from "./input.ts";
import type { Identity, Member } from "./access.ts";
export async function registerMember(db:D1Database, identity:Identity|null) {
  if(!identity) throw new DiaryError("unauthenticated","Sign in with ChatGPT first",401);
  const now=new Date().toISOString();
  // Re-registration can never upgrade, reactivate or extend existing privileges.
  await db.prepare("INSERT INTO members(user_id,registered_at,tier,active,paid_active,paid_until,updated_at) VALUES(?,?,'registered',1,0,NULL,?) ON CONFLICT(user_id) DO NOTHING").bind(identity.id,now,now).run();
}
export async function setMembership(db:D1Database, input:Record<string,unknown>) {
  if(typeof input.user_id!=="string" || input.user_id.length>200) throw new DiaryError("invalid_input","Choose a registered member",400);
  if(input.tier!=="registered" && input.tier!=="paid") throw new DiaryError("invalid_input","Invalid membership tier",400);
  if(typeof input.active!=="boolean" || typeof input.paid_active!=="boolean") throw new DiaryError("invalid_input","Explicit active flags required",400);
  let until:string|null=null;
  if(input.paid_until!==null && input.paid_until!==undefined && input.paid_until!=="") {
    if(typeof input.paid_until!=="string" || !Number.isFinite(Date.parse(input.paid_until))) throw new DiaryError("invalid_input","Invalid paid expiry",400);
    until=new Date(input.paid_until).toISOString();
  }
  const existing=await db.prepare("SELECT user_id FROM members WHERE user_id=?").bind(input.user_id).first();
  if(!existing) throw new DiaryError("not_found","Member must first register with verified identity",404);
  await db.prepare("UPDATE members SET tier=?,active=?,paid_active=?,paid_until=?,updated_at=? WHERE user_id=?").bind(input.tier,input.active?1:0,input.tier==="paid"&&input.paid_active?1:0,until,new Date().toISOString(),input.user_id).run();
}
export async function listMembers(db:D1Database) {
  return (await db.prepare("SELECT * FROM members ORDER BY registered_at DESC LIMIT 100").all<Member>()).results;
}
