import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import nextConfig from "../next.config.ts";
import {publicDiscoveryEntries,renderRss,renderSitemap,siteMetadata} from "../lib/public-discovery.ts";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
function fixture(){
 const sqlite=new DatabaseSync(":memory:");
 sqlite.exec("CREATE TABLE entries(id TEXT PRIMARY KEY,slug TEXT,status TEXT,visibility TEXT,published_revision INTEGER,latest_revision INTEGER,published_at TEXT,updated_at TEXT);"+
  "CREATE TABLE entry_revisions(entry_id TEXT,revision INTEGER,title TEXT,summary TEXT);");
 const entries=[
  ["a","visible-a","published","public",1,2,"2026-10-18T00:00:00Z","2026-10-19T00:00:00Z"],
  ["b","private-b","published","owner",1,2,"2026-10-20T00:00:00Z","2026-10-20T00:00:00Z"],
  ["c","draft-c","draft","public",null,1,"2026-10-20T00:00:00Z","2026-10-20T00:00:00Z"],
  ["d","visible-d","published","public",1,2,"2026-10-17T00:00:00Z","2026-10-19T00:00:00Z"],
  ["e","unmarked-e","published","public",null,1,"2026-10-16T00:00:00Z","2026-10-16T00:00:00Z"]
 ];
 for(const e of entries){
  sqlite.prepare("INSERT INTO entries VALUES(?,?,?,?,?,?,?,?)").run(...e);
  sqlite.prepare("INSERT INTO entry_revisions VALUES(?,?,?,?)").run(e[0],e[5],e[0]==="a"?"AI & <XML>":"Secret "+e[0],e[0]==="a"?"RSS > discovery":null);
 }
 const db={prepare(sql){return {all:async()=>({results:sqlite.prepare(sql).all()})}}};
 return {sqlite,db};
}
test("RSS and sitemap include only currently public latest revisions",async()=>{
 const f=fixture();try{
  const entries=await publicDiscoveryEntries(f.db);
  assert.deepEqual(entries.map(e=>e.slug),["visible-a","visible-d"]);
  const rss=renderRss(entries),map=renderSitemap(entries);
  assert.match(rss,/AI &amp; &lt;XML&gt;/);
  assert.match(rss,/RSS &gt; discovery/);
  assert.match(rss,/application\/rss\+xml/);
  assert.match(map,/visible-a/);
  assert.match(map,/lastmod/);
  for(const secret of ["private-b","draft-c","unmarked-e","Secret b","Secret c","Secret e"]){
   assert.doesNotMatch(rss,new RegExp(secret));
   assert.doesNotMatch(map,new RegExp(secret));
  }
 }finally{f.sqlite.close();}
});
test("discovery endpoints do not use session-dependent viewer and prevent request-origin spoofing",()=>{
 const feed=read("app/feed.xml/route.ts"),site=read("app/sitemap.xml/route.ts");
 for(const source of [feed,site]){
  assert.match(source,/publicDiscoveryEntries\(database\(\)\)/);
  assert.doesNotMatch(source,/currentViewer|request\.url|new URL\(request\.url\)/);
 }
 const robots=read("app/robots.txt/route.ts");
 assert.match(robots,/Disallow: \/owner\//);
 assert.match(robots,/sitemap\.xml/);
});
test("only publicly indexable routes opt in, owner pages stay blocked",()=>{
 const root=read("app/layout.tsx");
 const home=read("app/page.tsx");
 const post=read("app/posts/[slug]/page.tsx");
 assert.match(root,/robots:\{\s*index:false,\s*follow:false\s*\}/);
 assert.match(root,/application\/rss\+xml/);
 assert.match(home,/robots:\{index:true,follow:true\}/);
 assert.match(post,/item\.visibility==="public"\?\{index:true,follow:true\}:\{index:false,follow:false\}/);
 for(const path of ["app/about/page.tsx","app/privacy/page.tsx"])assert.match(read(path),/index:true,follow:true/);
 for(const path of ["app/owner/archive/page.tsx","app/owner/archive/[id]/page.tsx","app/owner/new/page.tsx"])
  assert.match(read(path),/index:false,follow:false/);
});

test("global HTTP headers do not override public robots metadata",async()=>{
 const rules=await nextConfig.headers();
 const blocked=rules.filter(rule=>rule.headers.some(header=>header.key.toLowerCase()==="x-robots-tag"));
 assert.ok(blocked.length>0);
 for(const rule of blocked)assert.match(rule.source,/^\/(?:owner|api|mcp|account|media)(?:\/|$)|^\/login$/);
 for(const prefix of ["/owner/","/api/","/media/"])assert.ok(blocked.some(rule=>rule.source.startsWith(prefix)));
 assert.ok(blocked.some(rule=>rule.source==="/mcp"));
 assert.ok(blocked.some(rule=>rule.source==="/login"));
 assert.ok(rules.some(rule=>rule.headers.some(header=>header.key==="CDN-Cache-Control"&&header.value==="no-store")));
});

test("site metadata rejects non-origin URLs and escapes customized RSS branding",()=>{
 const s=siteMetadata({SITE_ORIGIN:"https://example.org",SITE_TITLE:"Demo & <Blog>",SITE_DESCRIPTION:"Articles & notes"});
 assert.equal(s.origin,"https://example.org");
 assert.match(renderRss([],s.origin,s.title,s.description),/Demo &amp; &lt;Blog&gt;/);
 for(const url of ["http://example.org","https://example.org/path","https://u@example.org","https://example.org/?q=1"])
  assert.throws(()=>siteMetadata({SITE_ORIGIN:url}),/SITE_ORIGIN/);
});
