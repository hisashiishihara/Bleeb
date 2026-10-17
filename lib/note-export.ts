/** Owner-only note export formatter. Produces a single UTF-8 Movable Type record.
 * Never publishes to note, queries note, or mutates an aiDiary entry.
 * Media is intentionally not copied: private R2 URLs must not leak to third parties.
 */
export type NoteMode = "excerpt" | "full";
export type NoteExportEntry = {
  id: string; slug: string; status: string; visibility: string;
  published_revision: number | null;
};
export type NoteExportRevision = {
  revision: number; title: string; summary: string | null;
  body_md: string; saved_at: string; tags_json: string;
};
const cleanHeader = (s: string): string => s.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
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
  return out.join("\n");
}
function excerpt(revision: NoteExportRevision): string {
  const paras=revision.body_md.replace(/\r\n?/g,"\n").split(/\n\s*\n/)
    .map(s=>s.trim())
    .filter(s=>s && !/^(?:#{1,6}\s|!\[|\x60{3}|~{3})/.test(s));
  const first=paras.slice(0,2).join("\n\n");
  const snippet=Array.from(first).slice(0,420).join("");
  const opening=first.length>snippet.length ? snippet+"…" : snippet;
  const summary=revision.summary?.trim()??"";
  if(!summary)return opening;
  if(!opening || opening.startsWith(summary))return summary;
  return summary+"\n\n"+opening;
}
function jpDate(value: string): string {
  const d=new Date(value);
  if(!Number.isFinite(d.getTime()))throw new Error("Invalid article date");
  const parts=new Intl.DateTimeFormat("en-US",{
    timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit",
    hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"
  }).formatToParts(d);
  const p=(kind:string)=>parts.find(part=>part.type===kind)?.value??"";
  return p("month")+"/"+p("day")+"/"+p("year")+" "+p("hour")+":"+p("minute")+":"+p("second");
}
export function noteExport(
  entry: NoteExportEntry, revision: NoteExportRevision, mode: NoteMode, origin: string
): {filename:string;content:string;sourceUrl:string|null} {
  if(mode!=="excerpt"&&mode!=="full")throw new Error("Invalid note export mode");
  const visible=entry.status==="published" && entry.visibility==="public" &&
    entry.published_revision===revision.revision;
  // Do not construct a link to inaccessible or out-of-date articles.
  const sourceUrl=visible ? new URL("/posts/"+encodeURIComponent(entry.slug),origin).toString() : null;
  const body=mode==="full" ? revision.body_md : excerpt(revision);
  let markup=markdownToNoteHtml(body);
  if(sourceUrl)markup += '\n<p>原文：<a href="'+html(sourceUrl)+'">'+html(sourceUrl)+"</a></p>";
  const tags:unknown=(()=>{try{return JSON.parse(revision.tags_json);}catch{return [];}})();
  const tagList=Array.isArray(tags)?tags.filter((tag):tag is string=>typeof tag==="string").slice(0,20):[];
  const header=[
    "TITLE: "+cleanHeader(revision.title),
    "BASENAME: ai-diary-"+entry.id.slice(0,8)+"-r"+revision.revision+"-"+mode,
    "STATUS: Draft", "CONVERT BREAKS: 0",
    "DATE: "+jpDate(revision.saved_at),
    ...(tagList.length ? ["TAGS: "+tagList.map(tag=>'"'+cleanHeader(tag).replace(/"/g,'""')+'"').join(",")] : [])
  ];
  const content=header.join("\n")+"\n-----\nBODY:\n"+markup+"\n-----\n--------\n";
  return {filename:"aiDiary-note-"+entry.id.slice(0,8)+"-r"+revision.revision+"-"+mode+".txt",content,sourceUrl};
}
