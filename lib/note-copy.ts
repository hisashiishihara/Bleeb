/** Owner-only rich-text clipboard formatting for manual note paste.
 * No publishing, external requests, or private media transfer.
 */
export type NoteCopyEntry = {
 slug:string;status:string;visibility:string;latest_revision:number;
};
export type NoteCopyRevision = {revision:number;title:string;body_md:string};
const html = (s: string): string => s.replace(/&/g,"&amp;").replace(/</g,"&lt;")
 .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
function safeLink(candidate: string): string | null {
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch { return null; }
}
/** Limited safe Markdown subset: raw HTML is always escaped, unsafe links omitted.
 * Complex embeds and all images become readable placeholders for manual note upload.
 */
function inline(raw: string): string {
  const tokens = /(!?\[[^\]\n]{0,400}\]\([^\s)<>]{1,2048}\)|\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g;
  let output = "", last = 0;
  for (const match of raw.matchAll(tokens)) {
    const start = match.index ?? 0, value = match[0];
    output += html(raw.slice(last,start));
    if (value.startsWith("![")) {
      const caption = value.slice(2,value.indexOf("]("));
      output += "<span>[画像: "+html(caption || "説明なし")+" — noteで手動追加してください]</span>";
    } else if (value.startsWith("[")) {
      const pivot=value.indexOf("]("), label=value.slice(1,pivot), url=safeLink(value.slice(pivot+2,-1));
      output += url ? '<a href="'+html(url)+'">'+html(label)+"</a>" : html(label);
    } else if (value.startsWith("**")) {
      output += "<strong>"+html(value.slice(2,-2))+"</strong>";
    } else {
      output += "<em>"+html(value.slice(1,-1))+"</em>";
    }
    last=start+value.length;
  }
  return output+html(raw.slice(last));
}
export function markdownToNoteHtml(markdown: string): string {
  const lines=markdown.replace(/\r\n?/g,"\n").split("\n");
  const out:string[]=[];
  let paragraph:string[]=[], list:"ul"|"ol"|null=null, code:string[]|null=null;
  const flush=()=>{ if(paragraph.length){out.push("<p>"+paragraph.map(inline).join("<br>")+"</p>");paragraph=[];} };
  const closeList=()=>{if(list){out.push("</"+list+">");list=null;}};
  for (const line of lines) {
    if(code!==null){
      if (/^\s*(?:\x60{3,}|~{3,})\s*$/.test(line)) {
        out.push("<pre><code>"+html(code.join("\n"))+"</code></pre>");code=null;
      } else code.push(line);
      continue;
    }
    if (/^\s*(?:\x60{3,}|~{3,})/.test(line)) {flush();closeList();code=[];continue;}
    if (!line.trim()) {flush();closeList();continue;}
    const heading=line.match(/^ {0,3}(#{1,6})\s+(.+)$/);
    if(heading){flush();closeList();const level=Math.min(3,Math.max(2,heading[1].length+1));out.push("<h"+level+">"+inline(heading[2])+"</h"+level+">");continue;}
    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)){flush();closeList();out.push("<hr>");continue;}
    const bullet=line.match(/^\s*([-*+]|\d+\.)\s+(.+)$/);
    if(bullet){flush();const kind=/^\d/.test(bullet[1])?"ol":"ul";if(list!==kind){closeList();out.push("<"+kind+">");list=kind;}out.push("<li>"+inline(bullet[2])+"</li>");continue;}
    if (/^\s*>\s?/.test(line)){flush();closeList();out.push("<blockquote><p>"+inline(line.replace(/^\s*>\s?/,""))+"</p></blockquote>");continue;}
    closeList();paragraph.push(line.trim());
  }
  flush();closeList();
  if(code!==null)out.push("<pre><code>"+html(code.join("\n"))+"</code></pre>");
  // Keep safe block boundaries for rich-text clipboard paste.
  return out.join("");
}

export function noteClipboardPayload(
 entry:NoteCopyEntry,revision:NoteCopyRevision,origin:string
):{title:string;html:string;text:string;sourceUrl:string|null}{
 const visible=entry.status==="published"&&entry.visibility==="public"&&
   entry.latest_revision===revision.revision;
 const sourceUrl=visible?new URL("/posts/"+encodeURIComponent(entry.slug),origin).toString():null;
 let markup=markdownToNoteHtml(revision.body_md);
 if(sourceUrl)markup+='\n<p>原文：<a href="'+html(sourceUrl)+'">'+html(sourceUrl)+"</a></p>";
 return {title:revision.title,html:markup,
   text:revision.body_md+(sourceUrl?"\n\nOriginal: "+sourceUrl:""),
   sourceUrl};
}
