import test from "node:test";
import assert from "node:assert/strict";
import {unified} from "unified";
import remarkParse from "remark-parse";
import {imageWidthPercentage} from "../lib/image-width.ts";

test("Markdown image titles parse as width directives",()=>{
 const tree=unified().use(remarkParse).parse('![Screen](/media/363cabc5-e00a-4bed-94c4-e7aa9dbfe181 "width=75%")');
 const image=tree.children[0].children[0];
 assert.equal(image.type,"image");
 assert.equal(image.url,"/media/363cabc5-e00a-4bed-94c4-e7aa9dbfe181");
 assert.equal(image.title,"width=75%");
 assert.equal(imageWidthPercentage(image.title),75);
});

test("explicit widths accept only integers from 1 through 100 percent",()=>{
 for(const [title,width] of [["width=1%",1],["width=25%",25],["width=75%",75],["width=99%",99],["width=100%",100]])
  assert.equal(imageWidthPercentage(title),width);
 for(const title of [undefined,"","Screenshot","width=0%","width=101%","width=-1%","width=075%","width=75.5%","width=75px","width=75%;color:red","width= 75%","width=75% trailing","WIDTH=75%"])
  assert.equal(imageWidthPercentage(title),null);
});

test("ordinary image titles remain ordinary Markdown titles",()=>{
 const tree=unified().use(remarkParse).parse('![Screenshot](/media/image "a helpful tooltip")');
 const title=tree.children[0].children[0].title;
 assert.equal(title,"a helpful tooltip");
 assert.equal(imageWidthPercentage(title),null);
});
