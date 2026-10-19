"use client";
import {useEffect, useState} from "react";
import {hatenaBookmarkAddUrl} from "../../lib/hatena-bookmark";

/** Use a regular link so browser popup blockers cannot prevent opening Hatena. */
export function HatenaBookmarkButton(){
 const [href,setHref]=useState<string|null>(null);
 useEffect(()=>{setHref(hatenaBookmarkAddUrl(window.location.href));},[]);
 if(!href)return null;
 return <a className="hatena-bookmark" href={href} target="_blank" rel="noopener noreferrer"
   aria-label="この記事をはてなブックマークに追加">B! はてブに追加 ↗</a>;
}
