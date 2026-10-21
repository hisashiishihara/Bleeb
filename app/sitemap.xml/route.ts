import {env} from "cloudflare:workers";
import {database} from "../../lib/store";
import {publicDiscoveryEntries,renderSitemap,siteMetadata} from "../../lib/public-discovery";

export const dynamic="force-dynamic";
export async function GET(){
 const entries=await publicDiscoveryEntries(database());
 const site=siteMetadata(env as {SITE_ORIGIN?:string;SITE_TITLE?:string;SITE_DESCRIPTION?:string});
 return new Response(renderSitemap(entries,site.origin),{headers:{
  "Content-Type":"application/xml; charset=utf-8",
  "Cache-Control":"public, max-age=300",
  "X-Content-Type-Options":"nosniff"
 }});
}
