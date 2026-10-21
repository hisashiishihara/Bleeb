import { headers } from "next/headers";
import { env } from "cloudflare:workers";
import { requestIdentity, ownerIdentity, resolveViewer } from "./access";
export async function currentViewer() {
  const identity=requestIdentity(new Headers(await headers()));
  const config=env as unknown as {AI_DIARY_OWNER_EMAIL?:string;AI_DIARY_OWNER_API_ENABLED?:string};
  return resolveViewer(identity,config.AI_DIARY_OWNER_API_ENABLED==="true" && ownerIdentity(identity,config.AI_DIARY_OWNER_EMAIL));
}
