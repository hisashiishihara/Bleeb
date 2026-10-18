/** Homepage teaser: end on a complete paragraph and never include section 2. */
export function homeExcerpt(body:string,maxChars=1000):string{
 const text=body.trim();
 const second=/^##\s+(?:2(?:[.\s]|$)|[^1\s])/m.exec(text);
 const scoped=second?text.slice(0,second.index).trim():text;
 const blocks=scoped.split(/\n\s*\n/);
 const result:string[]=[];
 let length=0;
 for(const block of blocks){
  // Excerpts must not partially render fenced code or embeds.
  if(/^```/m.test(block))break;
  if(result.length && length+block.length>maxChars && length>=maxChars/2)break;
  if(result.length && length>=maxChars)break;
  result.push(block);
  length+=block.length+2;
 }
 return result.join("\n\n").trim();
}
