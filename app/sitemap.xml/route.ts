import {database} from "../../lib/store";
import {publicDiscoveryEntries,renderSitemap} from "../../lib/public-discovery";

export const dynamic="force-dynamic";
export async function GET(){
 const entries=await publicDiscoveryEntries(database());
 return new Response(renderSitemap(entries),{headers:{
  "Content-Type":"application/xml; charset=utf-8",
  "Cache-Control":"public, max-age=300",
  "X-Content-Type-Options":"nosniff"
 }});
}
