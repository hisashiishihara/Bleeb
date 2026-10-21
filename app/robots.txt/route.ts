import {env} from "cloudflare:workers";
import {siteMetadata} from "../../lib/public-discovery";

export function GET(){
 const {origin}=siteMetadata(env as {SITE_ORIGIN?:string});
 const content=["User-agent: *","Disallow: /owner/","Disallow: /api/","Disallow: /mcp/","Disallow: /account/","Sitemap: "+origin+"/sitemap.xml",""].join("\n");
 return new Response(content,{headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"public, max-age=3600"}});
}
