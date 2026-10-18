import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { tools } from "../plugin/tool-definitions.ts";

test("obsolete Base64 MCP upload is not exposed",()=>{
 assert.equal(tools.length,12);
 assert.equal(tools.some(tool=>tool.name==="upload_media"),false);
 assert.equal(tools.some(tool=>tool.name==="upload_chatgpt_image"),true);
});

test("remaining upload paths share idempotent R2 cleanup",()=>{
 const source=readFileSync(new URL("../lib/store.ts",import.meta.url),"utf8");
 for(const [fn,operation] of [["importMediaFromUrl","import_media_from_url"],["uploadChatGPTImage","upload_chatgpt_image"]]){
  const section=source.split("export async function "+fn+"(")[1]?.split("\\n}\\n")[0];
  assert.ok(section,fn+" exists");
  assert.ok(section.includes('commitUploadedMedia(db,input,id,req,asset,"'+operation+'"'),fn+" uses shared cleanup");
 }
 const helper=source.split("async function commitUploadedMedia(")[1]?.split("\\n}\\n")[0];
 assert.ok(helper?.includes("if(result.media_id!==asset.id)await deleteMedia("));
 assert.ok(helper?.includes("}catch(error){\n  await deleteMedia("));
});
