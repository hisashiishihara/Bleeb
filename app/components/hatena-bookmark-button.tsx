"use client";

/** Opens Hatena Bookmark's add screen; no external scripts or account credentials. */
export function HatenaBookmarkButton(){
 function openBookmark(){
  const url="https://b.hatena.ne.jp/add?mode=confirm&url="+encodeURIComponent(window.location.href.split("#")[0]);
  window.open(url,"_blank","noopener,noreferrer");
 }
 return <button type="button" className="hatena-bookmark" onClick={openBookmark} aria-label="この記事をはてなブックマークに追加">B! はてブに追加 ↗</button>;
}
