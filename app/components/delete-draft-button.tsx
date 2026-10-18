"use client";

import { useState } from "react";

type Props={entryId:string;revision:number;title:string};

/** Intentionally available only for draft rows in the owner archive. */
export function DeleteDraftButton({entryId,revision,title}:Props){
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 async function remove(){
  if(busy)return;
  if(!window.confirm("下書き「"+title+"」を完全に削除しますか？\n\nすべてのリビジョンと添付画像・動画も削除され、元には戻せません。"))return;
  setBusy(true);setError("");
  try{
   const response=await fetch("/api/owner/delete_draft",{
    method:"POST",credentials:"same-origin",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({entry_id:entryId,expected_revision:revision,request_id:crypto.randomUUID()})
   });
   const payload=await response.json() as {deleted?:boolean;message?:string};
   if(!response.ok||!payload.deleted)throw new Error(payload.message||"下書きの削除に失敗しました。");
   window.location.reload();
  }catch(e){setError(e instanceof Error?e.message:"下書きの削除に失敗しました。");setBusy(false);}
 }
 return <span className="draft-delete-control">
   <button type="button" onClick={()=>void remove()} disabled={busy}
    className="draft-delete-button" aria-label={"下書き「"+title+"」を削除"}>
    {busy?"削除中…":"下書きを削除"}
   </button>
   {error&&<span role="alert" className="draft-delete-error">{error}</span>}
 </span>;
}
