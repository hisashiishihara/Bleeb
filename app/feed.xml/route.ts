import {database} from "../../lib/store";
import {publicDiscoveryEntries,renderRss} from "../../lib/public-discovery";

export const dynamic="force-dynamic";
export async function GET(){
 const entries=await publicDiscoveryEntries(database());
 return new Response(renderRss(entries),{headers:{
  "Content-Type":"application/rss+xml; charset=utf-8",
  "Cache-Control":"public, max-age=300",
  "X-Content-Type-Options":"nosniff"
 }});
}
