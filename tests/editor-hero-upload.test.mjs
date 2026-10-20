import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import ts from "typescript";

const require=createRequire(import.meta.url);
const code=ts.transpileModule(readFileSync(new URL("../app/components/markdown-editor.tsx",import.meta.url),"utf8"),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}
}).outputText;
const asset="22222222-2222-4222-8222-222222222222";
const initial={id:"11111111-1111-4111-8111-111111111111",slug:"fictional",title:"架空記事",summary:"",body_md:"保存済み本文",tags:[],revision:3,status:"draft",visibility:"owner"};
const image=()=>new File([new Uint8Array([137,80,78,71,13,10,26,10])],"pasted.png",{type:"image/png"});
const nodes=e=>!e||typeof e!=="object"?[]:[e,...[e.props?.children].flat(Infinity).flatMap(nodes)];
const text=e=>typeof e==="string"?e:Array.isArray(e)?e.map(text).join(""):e&&typeof e==="object"?text(e.props?.children):"";
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function mount(t,{uploadOk=true,heroOk=true}={}){
 let state=[],cursor=0;const calls=[];
 const hooks={useState:value=>{const i=cursor++;if(!(i in state))state[i]=value;return [state[i],value=>state[i]=typeof value==="function"?value(state[i]):value];},useRef:()=>({current:null}),useEffect:()=>{}};
 const previous=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{
  calls.push({url,...options});
  assert.equal(options.credentials,"same-origin");
  if(url==="/api/owner/media")return {ok:uploadOk,json:async()=>uploadOk?{id:asset,markdown:"![pasted](/media/"+asset+")"}:{message:"Upload rejected"}};
  assert.equal(url,"/api/owner/set_entry_hero_media");
  return {ok:heroOk,json:async()=>heroOk?{revision:4}:{message:"Expected current revision"}};
 };
 t.after(()=>globalThis.fetch=previous);
 const m={exports:{}};
 new Function("require","module","exports",code)(name=>name==="react"?hooks:name==="./media-markdown"?{MediaMarkdown:()=>null}:name==="../../lib/media-rules"?require("../lib/media-rules.ts"):name==="../../lib/hatena-bookmark"?require("../lib/hatena-bookmark.ts"):require(name),m,m.exports);
 const render=()=>{cursor=0;return m.exports.MarkdownEditor({initial});};
 const paste=files=>{const area=nodes(render()).find(n=>n.props?.["aria-label"]==="アイキャッチ画像を貼り付け");let prevented=false;area.props.onPaste({clipboardData:{files},preventDefault:()=>prevented=true});assert(prevented);};
 return {calls,render,paste};
}
test("pasted hero image uses existing authenticated upload and revision-locked hero API without editing body",async t=>{
 const app=mount(t);app.paste([image()]);await settle();
 assert.equal(app.calls.length,2);
 assert.equal(app.calls[0].body.get("entry_id"),initial.id);
 assert.equal(app.calls[0].body.get("file").type,"image/png");
 const payload=JSON.parse(app.calls[1].body);
 assert.equal(payload.expected_revision,3);assert.equal(payload.hero_media_id,asset);
 assert.equal(payload.entry_id,initial.id);assert.equal(payload.body_md,undefined);
 const tree=app.render();assert(nodes(tree).some(n=>n.type==="img"&&n.props.src==="/media/"+asset));
 assert(nodes(tree).some(n=>n.type==="textarea"&&n.props.value===initial.body_md));
 assert(text(tree).includes("記事は引き続き非公開"));
});
test("dedicated hero file input uploads images and refuses videos",async t=>{
 const app=mount(t);const input=nodes(app.render()).find(n=>n.type==="input"&&n.props.type==="file"&&n.props.accept==="image/png,image/jpeg,image/gif,image/webp");
 input.props.onChange({target:{files:[new File(["video"],"clip.mp4",{type:"video/mp4"})],value:"clip.mp4"}});await settle();assert.equal(app.calls.length,0);
 assert(text(app.render()).includes("アイキャッチには PNG"));
 input.props.onChange({target:{files:[image()],value:"pasted.png"}});await settle();assert.equal(app.calls.length,2);
});
test("dirty article blocks hero paste until saved",async t=>{
 const app=mount(t);nodes(app.render()).find(n=>n.type==="input"&&n.props.value===initial.title).props.onChange({target:{value:"未保存タイトル"}});
 app.paste([image()]);await settle();assert.equal(app.calls.length,0);
 assert(text(app.render()).includes("先に本文の変更を保存"));
 assert(nodes(app.render()).find(n=>n.type==="button"&&text(n).includes("画像をアップロードしてアイキャッチに設定")).props.disabled);
});
test("pasting a URL does not fetch external content",async t=>{
 const app=mount(t);app.paste([]);await settle();assert.equal(app.calls.length,0);assert(text(app.render()).includes("画像をコピー"));
});
test("failed hero assignment preserves uploaded ID for recovery and never deletes media",async t=>{
 const app=mount(t,{heroOk:false});app.paste([image()]);await settle();
 assert.equal(app.calls.length,2);assert(nodes(app.render()).some(n=>n.type==="input"&&n.props.value===asset));
 assert(text(app.render()).includes("画像のアップロードは完了"));
 assert(!nodes(app.render()).some(n=>n.type==="img"&&n.props.src==="/media/"+asset));
});
test("upload rejection never changes hero or invokes revision mutation",async t=>{
 const app=mount(t,{uploadOk:false});app.paste([image()]);await settle();assert.equal(app.calls.length,1);assert(text(app.render()).includes("Upload rejected"));
});
test("existing inline uploads still insert Markdown without setting hero",async t=>{
 const app=mount(t);const input=nodes(app.render()).find(n=>n.type==="input"&&n.props.type==="file"&&n.props.accept?.includes("video/mp4"));
 input.props.onChange({target:{files:[image()],value:"pasted.png"}});await settle();assert.equal(app.calls.length,1);
 assert(nodes(app.render()).some(n=>n.type==="textarea"&&String(n.props.value).includes("![pasted](/media/"+asset+")")));
});
