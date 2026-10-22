/** Public-only catalog for RSS/sitemaps. No viewer, cookies, or owner identity. */
export type DiscoveryEntry={
 slug:string; title:string; summary:string|null;
 published_at:string; updated_at:string;
};
export const SITE_ORIGIN="https://example.com";
export const SITE_TITLE="My Blog";
export const SITE_DESCRIPTION="A blog powered by Bleeb.";
export function siteMetadata(config:{SITE_ORIGIN?:string;SITE_TITLE?:string;SITE_DESCRIPTION?:string}) {
 const raw=config.SITE_ORIGIN?.trim()||SITE_ORIGIN;
 let parsed:URL;
 try { parsed=new URL(raw); } catch { throw new Error("SITE_ORIGIN must be an HTTPS origin"); }
 if(parsed.protocol!=="https:"||parsed.username||parsed.password||parsed.pathname!=="/"||parsed.search||parsed.hash)
  throw new Error("SITE_ORIGIN must be a bare HTTPS origin");
 return {origin:parsed.origin,title:config.SITE_TITLE?.trim()||SITE_TITLE,description:config.SITE_DESCRIPTION?.trim()||SITE_DESCRIPTION};
}
/** Configure visible branding separately from reader access and RSS discovery. */
export function siteBranding(config:{SITE_TITLE?:string;SITE_DESCRIPTION?:string;SITE_EYEBROW?:string;SITE_CONTACT_URL?:string}) {
 const title=config.SITE_TITLE?.trim()||SITE_TITLE;
 const description=config.SITE_DESCRIPTION?.trim()||SITE_DESCRIPTION;
 const eyebrow=config.SITE_EYEBROW?.trim()||"BLEEB / BLOG";
 const contactRaw=config.SITE_CONTACT_URL?.trim();
 let contactUrl:string|null=null;
 if(contactRaw){
  let url:URL;
  try{url=new URL(contactRaw);}catch{throw new Error("SITE_CONTACT_URL must be HTTPS");}
  if(url.protocol!=="https:"||url.username||url.password)throw new Error("SITE_CONTACT_URL must be HTTPS");
  contactUrl=url.toString();
 }
 return {title,description,eyebrow,contactUrl};
}
export async function publicDiscoveryEntries(db:D1Database):Promise<DiscoveryEntry[]> {
 const rows=await db.prepare(
  "SELECT e.slug,e.published_at,e.updated_at,r.title,r.summary "+
  "FROM entries e JOIN entry_revisions r ON r.entry_id=e.id AND r.revision=e.latest_revision "+
  "WHERE e.status='published' AND e.visibility='public' AND e.published_revision IS NOT NULL "+
  "ORDER BY e.published_at DESC,e.id DESC LIMIT 5000"
 ).all<DiscoveryEntry>();
 return rows.results;
}
const xml=(text:string)=>text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,"")
 .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
 .replace(/"/g,"&quot;").replace(/'/g,"&apos;");
export function renderRss(entries:DiscoveryEntry[],origin=SITE_ORIGIN,title=SITE_TITLE,description=SITE_DESCRIPTION):string {
 const items=entries.slice(0,50).map(item=>{
  const url=origin+"/posts/"+encodeURIComponent(item.slug);
  return "<item><title>"+xml(item.title)+"</title><link>"+xml(url)+"</link>"+
   "<guid isPermaLink=\"true\">"+xml(url)+"</guid>"+
   "<description>"+xml(item.summary||"")+"</description>"+
   "<pubDate>"+new Date(item.published_at).toUTCString()+"</pubDate></item>";
 }).join("");
 const latest=entries.reduce((value,item)=>Math.max(value,Date.parse(item.updated_at)||0),0);
 return '<?xml version="1.0" encoding="UTF-8"?>'+
  '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>'+
  '<title>'+xml(title)+'</title><link>'+xml(origin)+'/</link>'+
  '<description>'+xml(description)+'</description><language>ja</language>'+
  '<atom:link href="'+xml(origin)+'/feed.xml" rel="self" type="application/rss+xml"/>'+
  (latest?'<lastBuildDate>'+new Date(latest).toUTCString()+'</lastBuildDate>':"")+
  items+"</channel></rss>";
}
export function renderSitemap(entries:DiscoveryEntry[],origin=SITE_ORIGIN):string {
 const urls=["/","/about","/privacy",...entries.map(item=>"/posts/"+encodeURIComponent(item.slug))];
 const unique=[...new Set(urls)];
 const bySlug=new Map(entries.map(item=>["/posts/"+encodeURIComponent(item.slug),item]));
 return '<?xml version="1.0" encoding="UTF-8"?>'+
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+
  unique.map(path=>{
   const item=bySlug.get(path);
   return "<url><loc>"+xml(origin+path)+"</loc>"+
    (item?"<lastmod>"+xml(new Date(item.updated_at).toISOString())+"</lastmod>":"")+
    "</url>";
  }).join("")+"</urlset>";
}
