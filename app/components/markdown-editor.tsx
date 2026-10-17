"use client";
import {useEffect,useState} from "react";
import {MediaMarkdown} from "./media-markdown";
import {mediaMaxBytes,validMediaType} from "../../lib/media-rules";

type Initial={
 id?:string;
 title:string;summary:string;body_md:string;tags:string[];
 revision?:number;published_revision?:number|null;
 visibility?:"owner"|"public";status?:"draft"|"published";
};
type JsonResponse=Record<string,unknown>;
async function postJson(action:string,payload:Record<string,unknown>):Promise<JsonResponse>{
 const response=await fetch("/api/owner/"+action,{
   method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
   body:JSON.stringify(payload)
 });
 const result=await response.json() as JsonResponse;
 if(!response.ok)throw new Error(String(result.message||"操作に失敗しました"));
 return result;
}

export function MarkdownEditor({initial}:{initial:Initial}){
 const [title,setTitle]=useState(initial.title);
 const [summary,setSummary]=useState(initial.summary);
 const [body,setBody]=useState(initial.body_md);
 const [tagsText,setTagsText]=useState(initial.tags.join(", "));
 const [revision,setRevision]=useState<number|null>(initial.revision??null);
 const [publishedRev,setPublishedRev]=useState<number|null>(initial.published_revision??null);
 const [status,setStatus]=useState(initial.status??"draft");
 const [visibility,setVisibility]=useState<"owner"|"public">(initial.visibility??"owner");
 const [dirty,setDirty]=useState(false);
 const [busy,setBusy]=useState(false);
 const [uploading,setUploading]=useState(false);
 const [preview,setPreview]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");

 useEffect(()=>{
  if(!dirty)return;
  const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
  window.addEventListener("beforeunload",warn);
  return ()=>window.removeEventListener("beforeunload",warn);
 },[dirty]);
 const tags=()=>tagsText.split(",").map(s=>s.trim()).filter(Boolean);
 const update=(setter:(v:string)=>void)=>(value:string)=>{setter(value);setDirty(true);setMessage("");};
 async function save(){
  if(busy)return;
  setBusy(true);setError("");setMessage("");
  try{
    const data:Record<string,unknown>={title,summary:summary.trim()?summary:null,
      body_md:body,tags:tags(),request_id:crypto.randomUUID()};
    const action=initial.id?"update_entry":"save_draft";
    if(initial.id){data.entry_id=initial.id;data.expected_revision=revision;}
    const result=await postJson(action,data);
    setDirty(false);
    if(!initial.id){
      window.location.assign("/owner/archive/"+encodeURIComponent(String(result.entry_id))+"/edit");
      return;
    }
    setRevision(Number(result.revision));
    setMessage("リビジョン "+result.revision+" として非公開で保存しました。公開版は変更されていません。");
  }catch(e){setError(e instanceof Error?e.message:"保存に失敗しました。");}
  finally{setBusy(false);}
 }
 async function publish(){
  if(!initial.id||!revision||dirty||busy)return;
  if(!window.confirm("リビジョン "+revision+" を「"+(visibility==="public"?"一般公開":"オーナー限定")+"」で公開しますか？"))return;
  setBusy(true);setError("");setMessage("");
  try{
   const result=await postJson("publish_entry",{entry_id:initial.id,revision,
      visibility,request_id:crypto.randomUUID()});
   setPublishedRev(Number(result.revision));setStatus("published");
   setMessage(visibility==="public"?"選択したリビジョンを一般公開しました。":"オーナー限定で公開しました。");
  }catch(e){setError(e instanceof Error?e.message:"公開に失敗しました。");}
  finally{setBusy(false);}
 }
 async function unpublish(){
  if(!initial.id||busy||status!=="published")return;
  if(!window.confirm("この記事を非公開の下書きに戻しますか？"))return;
  setBusy(true);setError("");setMessage("");
  try{
   await postJson("unpublish_entry",{entry_id:initial.id,request_id:crypto.randomUUID()});
   setPublishedRev(null);setStatus("draft");setVisibility("owner");
   setMessage("非公開の下書きに戻しました。リビジョン履歴は残ります。");
  }catch(e){setError(e instanceof Error?e.message:"非公開化に失敗しました。");}
  finally{setBusy(false);}
 }
 async function upload(file:File|undefined){
  if(!file||!initial.id||uploading)return;
  setError("");setMessage("");
  if(!validMediaType(file.type)){setError("PNG / JPEG / GIF / WebP / MP4 / WebM のみ対応しています。");return;}
  if(!file.size||file.size>mediaMaxBytes(file.type)){
    setError(file.type.startsWith("image/")?"画像は10MiB以下にしてください。":"動画は24MiB以下にしてください。");return;
  }
  setUploading(true);
  try{
   const form=new FormData();form.append("entry_id",initial.id);form.append("file",file);
   const response=await fetch("/api/owner/media",{method:"POST",credentials:"same-origin",body:form});
   const result=await response.json() as JsonResponse;
   if(!response.ok)throw new Error(String(result.message||"アップロードに失敗しました"));
   setBody(previous=>previous+(previous.endsWith("\n")?"":"\n")+"\n"+String(result.markdown)+"\n");
   setDirty(true);
   setMessage("メディアを追加しました。記事本文を保存するまでは公開されません。");
  }catch(e){setError(e instanceof Error?e.message:"アップロードに失敗しました。");}
  finally{setUploading(false);}
 }
 return <section className="owner editor-screen">
   <p className="eyebrow">OWNER / MARKDOWN EDITOR</p>
   <h1>{initial.id?"記事を編集":"新しい記事を書く"}</h1>
   <p className="owner-lead">
     {revision?"最新版 r"+revision+" · "+(publishedRev===null?"公開版なし":"公開版 r"+publishedRev):"新しい非公開の下書き"}
     {" · "}{dirty?"未保存の変更あり":"保存済み"}
   </p>
   <div className="owner-tabs"><a href="/owner/archive">← アーカイブ</a>
     {initial.id&&<a href={"/owner/archive/"+encodeURIComponent(initial.id)}>履歴を表示</a>}
   </div>
   <form className="editor-form" onSubmit={e=>{e.preventDefault();void save();}}>
     <label>タイトル<input value={title} onChange={e=>update(setTitle)(e.target.value)} maxLength={200} required/></label>
     <label>概要<input value={summary} onChange={e=>update(setSummary)(e.target.value)} maxLength={500}/></label>
     <label>タグ（カンマ区切り・最大20件）<input value={tagsText} onChange={e=>update(setTagsText)(e.target.value)} placeholder="ChatGPT, 技術, 日記"/></label>
     <div className="editor-toolbar">
       <strong>本文（Markdown）</strong>
       <button type="button" className="ghost" onClick={()=>setPreview(v=>!v)}>{preview?"編集に戻る":"プレビュー"}</button>
     </div>
     {preview?<div className="prose editor-preview"><MediaMarkdown body={body}/></div>:
       <textarea className="editor-textarea" spellCheck={false} value={body} onChange={e=>update(setBody)(e.target.value)}
         placeholder={"## 見出し\n\nここにMarkdownで本文を入力"} maxLength={150000} required/>}
     <div className="editor-toolbar">
       <label className="file-upload">
         {uploading?"アップロード中…":"画像・動画をアップロード"}
         <input type="file" disabled={!initial.id||uploading||busy}
           accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm"
           onChange={e=>{void upload(e.target.files?.[0]);e.target.value="";}}/>
       </label>
       <span className="editor-hint">{initial.id?"画像10MiB・動画24MiBまで（本文にMarkdownを追記）":"先に下書きを保存するとアップロードできます。"}</span>
     </div>
     <div className="editor-actions">
       <button type="submit" disabled={busy||uploading||!dirty&&!initial.id} className="editor-primary">{busy?"処理中…":initial.id?"新しいリビジョンを保存":"非公開下書きを作成"}</button>
       {initial.id&&<span className="editor-hint">保存だけでは公開版は変わりません。</span>}
     </div>
   </form>
   {error&&<p className="editor-error" role="alert">{error}{error.includes("Expected")&&<button className="ghost" onClick={()=>location.reload()}>最新版を読み込み直す</button>}</p>}
   {message&&<p className="editor-notice" role="status">{message}</p>}
   {initial.id&&<section className="editor-publication">
      <h2>公開する</h2>
      <p>保存したリビジョンだけを、明示的な操作で公開します。未保存の編集は先に保存してください。</p>
      <label>閲覧範囲
        <select value={visibility} onChange={e=>setVisibility(e.target.value as "owner"|"public")}>
          <option value="owner">オーナー限定</option><option value="public">一般公開（匿名閲覧可）</option>
        </select>
      </label>
      <div className="editor-actions">
        <button type="button" disabled={busy||dirty||!revision} onClick={()=>void publish()} className="editor-primary">保存済み r{revision??"-"} を公開</button>
        {status==="published"&&<button type="button" disabled={busy} onClick={()=>void unpublish()} className="ghost">公開を取り消す</button>}
      </div>
   </section>}
 </section>;
}
