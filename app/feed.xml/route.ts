import {env} from "cloudflare:workers";
import {database} from "../../lib/store";
import {publicDiscoveryEntries,renderRss,siteMetadata} from "../../lib/public-discovery";

export const dynamic="force-dynamic";
export async function GET(){
 const entries=await publicDiscoveryEntries(database());
 const site=siteMetadata(env as {SITE_ORIGIN?:string;SITE_TITLE?:string;SITE_DESCRIPTION?:string});
 return new Response(renderRss(entries,site.origin,site.title,site.description),{headers:{
  "Content-Type":"application/rss+xml; charset=utf-8",
  "Cache-Control":"public, max-age=300",
  "X-Content-Type-Options":"nosniff"
 }});
}
