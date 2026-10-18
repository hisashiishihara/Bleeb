import {unified} from "unified";
import remarkParse from "remark-parse";
import {toString} from "mdast-util-to-string";
import GithubSlugger from "github-slugger";
export function ArticleToc({body}:{body:string}){
 const root=unified().use(remarkParse).parse(body);
 const slugger=new GithubSlugger();
 const headings:{depth:number;text:string;id:string}[]=[];
 function walk(){
  for(const node of root.children){
   if(node.type==="heading"){
    const h=node;
    const title=toString(h);
    const id=slugger.slug(title);
    if(h.depth===2||h.depth===3)headings.push({depth:h.depth,text:title,id});
   }
  }
 }
 walk();
 if(headings.length<2)return null;
 return <nav className="article-toc" aria-label="目次"><details><summary>目次</summary><ol>{headings.map((h,i)=><li key={i} className={h.depth===3?"toc-subheading":""}><a href={"#"+h.id}>{h.text}</a></li>)}</ol></details></nav>;
}
