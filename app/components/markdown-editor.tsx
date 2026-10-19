"use client";
import {useEffect,useRef,useState} from "react";
import {MediaMarkdown} from "./media-markdown";
import {mediaMaxBytes,validMediaType} from "../../lib/media-rules";
import {hatenaBookmarkAddUrl} from "../../lib/hatena-bookmark";

type Initial={
 id?:string;slug?:string;
 title:string;summary:string;body_md:string;tags:string[];
 revision?:number;published_revision?:number|null;
 hero_media_id?:string|null;hero_alt_text?:string|null;
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

function messageForError(error:unknown,fallback:string):string{
 return error instanceof Error?error.message:fallback;
}

export function MarkdownEditor({initial}:{initial:Initial}){
 const [title,setTitle]=useState(initial.title);
 const [summary,setSummary]=useState(initial.summary);
 const [body,setBody]=useState(initial.body_md);
 const [tagsText,setTagsText]=useState(initial.tags.join(", "));
 const [revision,setRevision]=useState<number|null>(initial.revision??null);
 const [heroId,setHeroId]=useState(initial.hero_media_id??null);
 const [heroAlt,setHeroAlt]=useState(initial.hero_alt_text??"");
 const [imageUrl,setImageUrl]=useState("");
 const [manualMediaId,setManualMediaId]=useState("");
 const [status,setStatus]=useState(initial.status??"draft");
 const [visibility,setVisibility]=useState<"owner"|"public">(initial.visibility??"owner");
 const [activeVisibility,setActiveVisibility]=useState<"owner"|"public">(initial.visibility??"owner");
 const [dirty,setDirty]=useState(false);
 const [busy,setBusy]=useState(false);
 const [uploading,setUploading]=useState(false);
 const [preview,setPreview]=useState(false);
 const [message,setMessage]=useState("");
 const [noteCopy,setNoteCopy]=useState<{html:string;text:string;title:string}|null>(null);
 const [noteCopyError,setNoteCopyError]=useState("");
 const [manualNoteCopy,setManualNoteCopy]=useState(false);
 const [hatenaHref,setHatenaHref]=useState<string|null>(null);
 const [error,setError]=useState("");
 const navigating=useRef(false);
 const mediaInput=useRef<HTMLInputElement>(null);

 useEffect(()=>{
  if(!initial.slug)return;
  const articleUrl=new URL("/posts/"+encodeURIComponent(initial.slug),window.location.origin);
  setHatenaHref(hatenaBookmarkAddUrl(articleUrl.toString()));
 },[initial.slug]);

 useEffect(()=>{
  if(!dirty)return;
  const warn=(event:BeforeUnloadEvent)=>{if(navigating.current)return;event.preventDefault();event.returnValue="";};
  window.addEventListener("beforeunload",warn);
  return ()=>window.removeEventListener("beforeunload",warn);
 },[dirty]);
 useEffect(()=>{
  setNoteCopy(null);
  setNoteCopyError("");
  setManualNoteCopy(false);
  if(!initial.id||!revision||dirty)return;
  const controller=new AbortController();
  void fetch("/owner/archive/"+encodeURIComponent(initial.id)+"/export-note?mode=full&format=clipboard&revision="+revision,{
   credentials:"same-origin",signal:controller.signal
  }).then(async response=>{
   if(!response.ok)throw new Error("note export unavailable");
   return response.json() as Promise<{html:string;text:string;title:string}>;
  }).then(data=>{if(!controller.signal.aborted)setNoteCopy(data);})
   .catch(()=>{if(!controller.signal.aborted)setNoteCopyError("note 用データの読み込みに失敗しました。ページを再読み込みしてください。");});
  return ()=>controller.abort();
 },[initial.id,revision,dirty]);
 async function copyToNote(){
  if(!noteCopy||dirty||busy||uploading)return;
  setError("");setMessage("");setManualNoteCopy(false);
  try{
   if(!navigator.clipboard?.write||typeof ClipboardItem==="undefined")
    throw new Error("このブラウザでは書式付きコピーを利用できません。");
   await navigator.clipboard.write([new ClipboardItem({
    "text/html":new Blob([noteCopy.html],{type:"text/html"}),
    "text/plain":new Blob([noteCopy.text],{type:"text/plain"})
   })]);
   setMessage("本文をコピーしました。「note の新規投稿を開く」から本文欄に貼り付け、タイトルを「"+noteCopy.title+"」に設定してください。");
  }catch{
   setManualNoteCopy(true);
   setError("書式付きコピーが利用できません。下の本文を手動でコピーして note に貼り付けてください（装飾は確認・再設定が必要です）。");
  }
 }
 const tags=()=>tagsText.split(",").map(s=>s.trim()).filter(Boolean);
 async function importMarkdown(file:File|undefined){
  if(!file)return;
  if(file.size>300000){setError("Markdown ファイルが大きすぎます。");return;}
  if(dirty&&!window.confirm("未保存の本文を読み込んだ Markdown で置き換えますか？"))return;
  const text=await file.text();
  if(text.length>150000){setError("本文は15万文字以内にしてください。");return;}
  setBody(text);setDirty(true);setPreview(false);setMessage("Markdown を読み込みました。保存してリビジョンに反映してください。");setError("");
 }
 function downloadMarkdown(){
  const blob=new Blob([body],{type:"text/markdown;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=(title.replace(/[^a-zA-Z0-9\u3040-\u30ff\u3400-\u9fff_-]+/g,"_").slice(0,70)||"aiDiary")+".md";
  a.click();URL.revokeObjectURL(url);
 }
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
      navigating.current=true;
      window.location.assign("/owner/archive/"+encodeURIComponent(String(result.entry_id))+"/edit");
      return;
    }
    setRevision(Number(result.revision));
    setMessage(status==="published"?"リビジョン "+result.revision+" を保存しました。公開中の記事にも反映されています。":"リビジョン "+result.revision+" を下書きに保存しました。公開はされていません。");
  }catch(e){setError(messageForError(e,"保存に失敗しました。"));}
  finally{setBusy(false);}
 }
 async function publish(){
  if(!initial.id||!revision||dirty||busy)return;
  if(!window.confirm("リビジョン "+revision+" を「"+(visibility==="public"?"一般公開":"オーナー限定")+"」で公開しますか？"))return;
  setBusy(true);setError("");setMessage("");
  try{
   const result=await postJson("publish_entry",{entry_id:initial.id,revision,
      visibility,request_id:crypto.randomUUID()});
   setStatus("published");setActiveVisibility(visibility);
   setMessage(visibility==="public"?"選択したリビジョンを一般公開しました。":"オーナー限定で公開しました。");
  }catch(e){setError(messageForError(e,"公開に失敗しました。"));}
  finally{setBusy(false);}
 }
 async function unpublish(){
  if(!initial.id||busy||status!=="published")return;
  if(!window.confirm("この記事を非公開の下書きに戻しますか？"))return;
  setBusy(true);setError("");setMessage("");
  try{
   await postJson("unpublish_entry",{entry_id:initial.id,request_id:crypto.randomUUID()});
   setStatus("draft");setVisibility("owner");setActiveVisibility("owner");
   setMessage("非公開の下書きに戻しました。リビジョン履歴は残ります。");
  }catch(e){setError(messageForError(e,"非公開化に失敗しました。"));}
  finally{setBusy(false);}
 }
 async function changeHero(nextId:string|null){
  if(!initial.id||!revision||busy||uploading||dirty)return;
  setBusy(true);setError("");setMessage("");
  try{
   const result=await postJson(nextId?"set_entry_hero_media":"clear_entry_hero_media",{
    entry_id:initial.id,expected_revision:revision,request_id:crypto.randomUUID(),
    ...(nextId?{hero_media_id:nextId,alt_text:heroAlt}:{})
   });
   setRevision(Number(result.revision));
   setHeroId(nextId);setManualMediaId("");
   if(!nextId)setHeroAlt("");
   setMessage(status==="published"?"アイキャッチを保存しました。公開中の記事にも反映されています。":"アイキャッチを保存しました。記事は引き続き非公開です。");
  }catch(e){setError(messageForError(e,"アイキャッチの変更に失敗しました。"));}
  finally{setBusy(false);}
 }
 async function importUrl(){
  if(!initial.id||!revision||busy||uploading||dirty||!imageUrl.trim())return;
  setBusy(true);setError("");setMessage("");
  try{
   const result=await postJson("import_media_from_url",{
    entry_id:initial.id,expected_revision:revision,usage:"hero",source_url:imageUrl.trim(),
    alt_text:heroAlt,request_id:crypto.randomUUID()
   });
   setRevision(Number(result.revision));
   setHeroId(String(result.media_id));
   setImageUrl("");
   setMessage(status==="published"?"画像を取り込み、公開中の記事にもアイキャッチを反映しました。":"画像を取り込みました。記事は引き続き非公開です。");
  }catch(e){setError(messageForError(e,"URLから画像を取り込めませんでした。"));}
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
  }catch(e){setError(messageForError(e,"アップロードに失敗しました。"));}
  finally{setUploading(false);}
 }
 return <section className="owner editor-screen">
   <p className="eyebrow">OWNER / MARKDOWN EDITOR</p>
   <h1>{initial.id?"記事を編集":"新しい記事を書く"}</h1>
   <p className="owner-lead">
     {revision?"最新版 r"+revision+" · "+(status==="published"?(activeVisibility==="public"?"一般公開中":"オーナー限定で表示中"):"非公開の下書き"):"新しい非公開の下書き"}
     {" · "}{dirty?"未保存の変更あり":"保存済み"}
   </p>
   <div className="owner-tabs"><a href="/owner/archive">← アーカイブ</a>
     {initial.id&&<a href={"/owner/archive/"+encodeURIComponent(initial.id)}>履歴を表示</a>}
     {initial.id&&<a href={"/owner/media?entry_id="+encodeURIComponent(initial.id)}>画像・動画を管理／削除</a>}
   </div>
   <form className="editor-form" onSubmit={e=>{e.preventDefault();void save();}}>
     <label>タイトル<input value={title} onChange={e=>update(setTitle)(e.target.value)} maxLength={200} required/></label>
     <label>概要<input value={summary} onChange={e=>update(setSummary)(e.target.value)} maxLength={500}/></label>
     <label>タグ（カンマ区切り・最大20件）<input value={tagsText} onChange={e=>update(setTagsText)(e.target.value)} placeholder="ChatGPT, 技術, 日記"/></label>
     <div className="editor-toolbar">
       <strong>本文（Markdown）</strong>
       <div className="editor-toolbar">
         <label className="file-upload">.md を読み込む
           <input type="file" accept=".md,text/markdown,text/plain"
             onChange={e=>{void importMarkdown(e.target.files?.[0]);e.target.value="";}}/>
         </label>
         <button type="button" className="ghost" onClick={downloadMarkdown}>.md を保存</button>
         <button type="button" className="ghost" onClick={()=>setPreview(v=>!v)}>{preview?"編集に戻る":"プレビュー"}</button>
       </div>
     </div>
     {preview?<div className="prose editor-preview"><MediaMarkdown body={body}/></div>:
       <textarea className="editor-textarea" spellCheck={false} value={body} onChange={e=>update(setBody)(e.target.value)}
         placeholder={"## 見出し\n\nここにMarkdownで本文を入力"} maxLength={150000} required/>}
     <div className="editor-toolbar">
       <button type="button" className="ghost" disabled={uploading||busy}
         onClick={()=>{
           if(!initial.id){
             setError("画像・動画を追加するには、先に「非公開下書きを作成」を押してください。保存後の編集画面でファイルを選択できます。");
             return;
           }
           mediaInput.current?.click();
         }}>
         {uploading?"アップロード中…":initial.id?"画像・動画を選択":"画像・動画を追加（先に下書きを保存）"}
       </button>
         <input ref={mediaInput} hidden type="file" disabled={uploading||busy}
           accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm"
           onChange={e=>{void upload(e.target.files?.[0]);e.target.value="";}}/>
       <span className="editor-hint">{initial.id?"画像10MiB・動画24MiBまで（本文にMarkdownを追記）":"先に下書きを保存するとアップロードできます。"}</span>
     </div>
     <div className="editor-actions">
       <button type="submit" disabled={busy||uploading||!dirty&&!initial.id} className="editor-primary">{busy?"処理中…":initial.id?"新しいリビジョンを保存":"非公開下書きを作成"}</button>
       {initial.id&&<span className="editor-hint">{status==="published"?"保存すると閲覧可能な最新版も更新されます。":"保存だけでは公開されません。"}</span>}
     </div>
   </form>
   {error&&<p className="editor-error" role="alert">{error}{error.includes("Expected")&&<button className="ghost" onClick={()=>location.reload()}>最新版を読み込み直す</button>}</p>}
   {message&&<p className="editor-notice" role="status">{message}</p>}
   {initial.id&&<section className="editor-hero">
      <h2>アイキャッチ画像</h2>
      <p className="owner-lead">アイキャッチは本文とは別に保存します。公開中の記事では保存後すぐに最新版へ反映されます。下書きは非公開のままです。</p>
      {heroId?<img src={"/media/"+heroId} alt={heroAlt||"アイキャッチ"} className="hero-image" loading="lazy"/>:
       <p className="editor-hint">現在のリビジョンにアイキャッチはありません。</p>}
      <label>代替テキスト<input maxLength={200} value={heroAlt} onChange={e=>setHeroAlt(e.target.value)} placeholder="画像の説明"/></label>
      <label>画像URL（許可済みホストからHTTPSで取得）
       <input type="url" value={imageUrl} onChange={e=>setImageUrl(e.target.value)}
        placeholder="https://example.com/generated-image.png"/>
      </label>
      <div className="editor-actions">
       <button type="button" className="ghost" disabled={!imageUrl.trim()||busy||uploading||dirty}
        onClick={()=>void importUrl()}>URLから取り込んでアイキャッチに設定</button>
      </div>
      <label>アップロード済み画像のID
       <input value={manualMediaId} onChange={e=>setManualMediaId(e.target.value)} placeholder="画像のメディア UUID"/>
      </label>
      <div className="editor-actions">
       <button type="button" className="ghost" disabled={!manualMediaId.trim()||busy||uploading||dirty}
        onClick={()=>void changeHero(manualMediaId.trim())}>既存画像をアイキャッチに設定</button>
       <button type="button" className="ghost" disabled={!heroId||busy||uploading||dirty}
        onClick={()=>void changeHero(null)}>アイキャッチを解除</button>
      </div>
      {dirty&&<p className="editor-hint">先に本文の変更を保存してください。</p>}
   </section>}
   {initial.id&&<section className="editor-publication">
      <h2>はてなブックマーク</h2>
      {status==="published"&&activeVisibility==="public"&&hatenaHref?
        <div className="editor-actions">
          <a className="editor-edit-link" href={hatenaHref} target="_blank" rel="noopener noreferrer">B! この公開記事をはてブに登録 ↗</a>
        </div>:
        <p className="editor-hint">はてなブックマークへ登録できるのは一般公開中の記事だけです。非公開の下書きやオーナー限定記事は登録対象にしません。</p>}
      <p className="editor-hint">はてな側の画面でログインし、必要に応じてコメントやタグを入力して登録してください。Bleeb から自動登録はしません。</p>
   </section>}
   {initial.id&&revision&&<section className="editor-publication">
      <h2>note に転載する</h2>
      <p>保存済みの本文をコピーして note の新規投稿画面に貼り付けます。コピーとページの移動は独立しているため、ブラウザのクリップボード権限に左右されず note を開けます。</p>
      <div className="editor-actions">
        <button type="button" className="editor-primary" disabled={!noteCopy||dirty||busy||uploading} onClick={()=>void copyToNote()}>
          {noteCopy?"本文をコピー（書式付き）":"note 用データを準備中…"}
        </button>
        <a className="editor-edit-link" href="https://note.com/new" target="_blank" rel="noopener noreferrer">
          note の新規投稿を開く ↗
        </a>
      </div>
      {noteCopyError&&<p className="editor-error" role="alert">{noteCopyError}</p>}
      {manualNoteCopy&&noteCopy&&
        <label className="editor-hint">手動コピー用の本文（Markdown。選択してコピーしてください）
          <textarea readOnly value={noteCopy.text} rows={8} onFocus={e=>e.currentTarget.select()}/>
        </label>}
      <p>貼り付け後のタイトル設定、画像の追加、書式の確認、公開は note 側で手動で行ってください。自動投稿は行いません。</p>
      <h3>note のインポート機能を使う（MT 形式）</h3>
      <p>下の .txt は、note の「自分の記事 → インポート → MT 形式」にアップロードする専用ファイルです。本文に HTML タグが含まれるのは MT 形式の仕様であり、投稿画面に直接貼り付けるものではありません。インポートされた記事は下書きになります。</p>
      <p><a href="https://www.help-note.com/hc/ja/articles/16143762469017" target="_blank" rel="noopener noreferrer">note 公式のインポート手順 ↗</a></p>
      <p>保存済みの最新版 r{revision} を書き出します。note への自動投稿・公開はしません。</p>
      {dirty?<p className="editor-hint">未保存の変更があります。先に保存してから書き出してください。</p>:
        <div className="editor-actions">
          <a className="editor-edit-link"
            href={"/owner/archive/"+encodeURIComponent(initial.id)+"/export-note?mode=excerpt&revision="+revision}>
            冒頭・要約版をダウンロード
          </a>
          <a className="editor-edit-link"
            href={"/owner/archive/"+encodeURIComponent(initial.id)+"/export-note?mode=full&revision="+revision}>
            全文版をダウンロード
          </a>
        </div>}
      {status!=="published"||activeVisibility!=="public"?
        <p className="editor-hint">この記事の最新版は一般公開されていないため、書き出すファイルに原文リンクは含めません。noteで公開する前に必ず確認してください。</p>:
        <p className="editor-hint">一般公開されている原文へのリンクを末尾に付けます。</p>}
      <p className="editor-hint">非公開メディアは自動転送されません。画像はnote上で別途アップロードしてください。インポート後はnoteの編集画面で表示を確認してください。</p>
   </section>}
   {initial.id&&<section className="editor-publication">
      <h2>公開設定</h2>
      <p>{status==="published"?"公開中の記事は常に最新版を表示します。閲覧範囲の変更には以下の操作が必要です。":"下書きは非公開のまま保存されます。公開する場合だけ以下の操作を行ってください。"}</p>
      <label>閲覧範囲
        <select value={visibility} onChange={e=>setVisibility(e.target.value as "owner"|"public")}>
          <option value="owner">オーナー限定</option><option value="public">一般公開（匿名閲覧可）</option>
        </select>
      </label>
      <div className="editor-actions">
        <button type="button" disabled={busy||uploading||dirty||!revision} onClick={()=>void publish()} className="editor-primary">{status==="published"?"閲覧範囲を適用":"最新版 r"+(revision??"-")+" を公開"}</button>
        {status==="published"&&<button type="button" disabled={busy||uploading} onClick={()=>void unpublish()} className="ghost">公開を取り消す</button>}
      </div>
   </section>}
 </section>;
}

