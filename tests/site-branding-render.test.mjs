import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import ts from "typescript";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import * as discovery from "../lib/public-discovery.ts";

const require=createRequire(import.meta.url);
// Execute the real page components with isolated env/data, never a hosted DB.
function component(path,env){
 const source=readFileSync(new URL("../"+path,import.meta.url),"utf8");
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const module={exports:{}};
 const localRequire=id=>{
  if(id==="cloudflare:workers")return {env};
  if(id.endsWith(".css"))return {};
  if(id.endsWith("lib/public-discovery"))return discovery;
  if(id.endsWith("lib/store"))return {database:()=>({})};
  if(id.endsWith("lib/reader-store"))return {readableRecentFull:async()=>[]};
  if(id.endsWith("lib/reader"))return {currentViewer:async()=>({owner:false})};
  if(id.endsWith("lib/home-excerpt"))return {homeExcerpt:body=>body};
  if(id.endsWith("components/media-markdown"))return {MediaMarkdown:({body})=>React.createElement("p",null,body)};
  return require(id);
 };
 new Function("require","exports","module",js)(localRequire,module.exports,module);
 return module.exports;
}
const origin="https://install.example.org";
const configured={SITE_TITLE:"Fixture & Blog",SITE_DESCRIPTION:"A configured description.",SITE_EYEBROW:"FIXTURE / BLOG",SITE_ORIGIN:origin};

test("configured and default branding reach the actual layout, home and metadata",async()=>{
 for(const env of [{},configured]){
  const site=discovery.siteBranding(env);
  const layout=component("app/layout.tsx",env);
  const home=component("app/page.tsx",env);
  const meta=await layout.generateMetadata();
  assert.equal(meta.title.default,site.title);
  assert.equal(meta.title.template,"%s | "+site.title);
  assert.equal(meta.description,site.description);
  const html=renderToStaticMarkup(await layout.default({children:await home.default()}));
  const escaped=site.title.replaceAll("&","&amp;");
  assert.ok(html.includes('class="brand" href="/" aria-label="'+escaped+' ホーム">'+escaped+'</a>'));
  assert.ok(html.includes('<h1>'+escaped+'</h1>'));
  assert.ok(html.includes('<p class="eyebrow">'+site.eyebrow+'</p>'));
  assert.ok(html.includes('<p class="intro-copy">'+site.description+'</p>'));
  assert.doesNotMatch(html,/お問い合わせ|観測と思考|踊り蟹|blog\.odorikani\.net/);
 }
});

test("contact links are optional, HTTPS-only and safely rendered",async()=>{
 assert.equal(discovery.siteBranding({SITE_CONTACT_URL:"  "}).contactUrl,null);
 for(const bad of ["javascript:alert(1)","data:text/html,x","http://example.org","//example.org","https://u:p@example.org","https://example.org/has space","https://exa\nmple.org","https:\\example.org"])
  assert.throws(()=>discovery.siteBranding({SITE_CONTACT_URL:bad}),/SITE_CONTACT_URL/);
 const layout=component("app/layout.tsx",{...configured,SITE_CONTACT_URL:"https://contact.example.org/form?a=1&b=2"});
 const html=renderToStaticMarkup(await layout.default({children:null}));
 assert.match(html,/href="https:\/\/contact\.example\.org\/form\?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">お問い合わせ/);
});

test("About and Privacy have generic defaults and accept independent deployment copy",()=>{
 for(const [path,key] of [["app/about/page.tsx","SITE_ABOUT_MD"],["app/privacy/page.tsx","SITE_PRIVACY_MD"]]){
  const generic=renderToStaticMarkup(component(path,{}).default());
  assert.match(generic,/My Blog|Bleeb/);
  assert.doesNotMatch(generic,/観測と思考|踊り蟹|hisashiishihara|blog\.odorikani\.net|<a[^>]*>お問い合わせ/);
  const body="## Deployment-specific copy\n\nExisting approved text <script> is plain Markdown input.";
  const html=renderToStaticMarkup(component(path,{...configured,[key]:body}).default());
  assert.match(html,/Existing approved text &lt;script&gt;/);
  assert.doesNotMatch(html,/<script>|公開前にこのページを|記事やサイトの運営に関する詳細は/);
 }
});

test("configured RSS, sitemap and robots share the actual origin instead of the example default",()=>{
 assert.equal(discovery.siteMetadata({}).origin,"https://example.com");
 const site=discovery.siteMetadata(configured);
 const posts=[{slug:"fixture",title:"Fixture",summary:null,published_at:"2026-10-22T00:00:00Z",updated_at:"2026-10-22T00:00:00Z"}];
 const rss=discovery.renderRss(posts,site.origin,site.title,site.description);
 const map=discovery.renderSitemap(posts,site.origin);
 assert.match(rss,/<title>Fixture &amp; Blog<\/title>/);
 assert.match(rss,/<description>A configured description\.<\/description>/);
 for(const doc of [rss,map]){
  assert.ok(doc.includes(origin+"/posts/fixture"));
  assert.doesNotMatch(doc,/example\.com|blog\.odorikani\.net/);
 }
 const robots=component("app/robots.txt/route.ts",configured).GET();
 return robots.text().then(text=>assert.ok(text.includes("Sitemap: "+origin+"/sitemap.xml")));
});
