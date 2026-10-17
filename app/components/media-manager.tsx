"use client";
import {useState} from "react";

type Item={id:string;content_type:string;byte_size:number;original_name:string;created_at:string;in_published_revision:boolean};
export function MediaManager({initial}:{initial:Item[]}){
 const [assets,setAssets]=useState(initial);
 const [busy,setBusy]=useState<string|null>(null);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 async function remove(file:Item){
  if(file.in_published_revision)return;
  if(!window.confirm("「"+file.original_name+"」をR2ストレージから完全削除しますか？この操作は元に戻せません。過去のリビジョンの埋め込みリンクは残ります。"))return;
  setBusy(file.id);setMessage("");setError("");
  try{
   const response=await fetch("/api/owner/media/"+encodeURIComponent(file.id),{
    method:"DELETE",credentials:"same-origin"
   });
   const result=await response.json() as {deleted?:boolean;message?:string};
   if(!response.ok)throw new Error(result.message||"削除に失敗しました");
   setAssets(rows=>rows.filter(item=>item.id!==file.id));
   setMessage(result.deleted?"「"+file.original_name+"」のR2ファイルとD1登録を削除しました。":"ファイルは登録されていません。");
  }catch(e){setError(e instanceof Error?e.message:"削除に失敗しました");}
  finally{setBusy(null);}
 }
 return <section className="media-management">
  <p className="owner-lead">記事に紐づくアップロード済みファイル。ファイルはR2から完全削除されます。過去のMarkdownリビジョンは書き換えません。</p>
  {message&&<p role="status" className="editor-notice">{message}</p>}
  {error&&<p role="alert" className="editor-error">{error}</p>}
  {assets.length===0?<p>この投稿のファイルはありません。</p>:
   <ul className="media-file-list">{assets.map(file=><li key={file.id} className="media-file-item">
      <div className="media-file-meta">
       <strong>{file.original_name}</strong>
       <span>{(file.byte_size/1024/1024).toFixed(2)} MiB · {file.content_type}</span>
       <code>{file.id}</code>
       <a href={"/media/"+file.id} target="_blank" rel="noreferrer">ファイルを見る</a>
      </div>
      <button type="button" className="ghost" disabled={!!busy||file.in_published_revision}
       onClick={()=>void remove(file)}>
       {busy===file.id?"削除中…":file.in_published_revision?"公開版で使用中":"ファイルを完全削除"}
      </button>
   </li>)}</ul>}
  <p className="editor-hint">「公開版で使用中」の場合は、先にエディタで画像のMarkdownを削除して保存し、そのリビジョンを公開してください。</p>
 </section>;
}
