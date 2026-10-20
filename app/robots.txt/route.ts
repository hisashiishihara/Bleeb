import {SITE_ORIGIN} from "../../lib/public-discovery";

export function GET(){
 const content=["User-agent: *","Disallow: /owner/","Disallow: /api/","Disallow: /mcp/","Disallow: /account/","Sitemap: "+SITE_ORIGIN+"/sitemap.xml",""].join("\n");
 return new Response(content,{headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"public, max-age=3600"}});
}
