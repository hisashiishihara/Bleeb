import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decodeBase64Image, MAX_IMAGE_BASE64_CHARS, MAX_MCP_UPLOAD_BODY_CHARS } from "../lib/base64-image.ts";
import { IMAGE_MAX_BYTES, matchesSignature } from "../lib/media-rules.ts";
import { tools } from "../plugin/tool-definitions.ts";

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
test("MCP Base64 image transport decodes byte-exact PNG", async () => {
  const f = decodeBase64Image(png.toString("base64"), "image/png", "cover.png");
  assert.equal(f.name, "cover.png");
  assert.equal(f.type, "image/png");
  assert.deepEqual(Buffer.from(await f.arrayBuffer()), png);
  assert.ok(matchesSignature("image/png", new Uint8Array(await f.arrayBuffer())));
});
test("reject unsupported types and invalid names", () => {
  for (const type of ["video/mp4", "text/html", "image/svg+xml", null])
    assert.throws(() => decodeBase64Image(png.toString("base64"), type, "cover.png"), { code: "invalid_media" });
  for (const name of ["", "x".repeat(181), null])
    assert.throws(() => decodeBase64Image(png.toString("base64"), "image/png", name), { code: "invalid_input" });
});
test("reject data URIs, whitespace, bad padding, noncanonical Base64", () => {
  for (const value of ["data:image/png;base64," + png.toString("base64"), "AA A=", "AA=", "A===", "_AAA", "AAAA\n", "Zh=="])
    assert.throws(() => decodeBase64Image(value, "image/png", "x.png"), { code: "invalid_media" });
});
test("enforce the 10 MiB decoded image limit before decode", () => {
  assert.ok(MAX_MCP_UPLOAD_BODY_CHARS > MAX_IMAGE_BASE64_CHARS);
  assert.throws(() => decodeBase64Image("A".repeat(MAX_IMAGE_BASE64_CHARS + 4), "image/png", "x.png"), { code: "media_too_large" });
  const encoded = Buffer.alloc(IMAGE_MAX_BYTES).toString("base64");
  assert.equal(decodeBase64Image(encoded, "image/png", "x.png").size, IMAGE_MAX_BYTES);
});

test("register owner-only upload_media with exact format, size and revision arguments", () => {
  const entry = tools.find(tool => tool.name === "upload_media");
  assert.ok(entry);
  assert.deepEqual(entry.inputSchema.required, [
    "entry_id", "expected_revision", "image_base64", "content_type", "file_name", "usage", "request_id"
  ]);
  assert.deepEqual(entry.inputSchema.properties.usage.enum, ["hero", "inline"]);
  assert.deepEqual(entry.inputSchema.properties.content_type.enum, ["image/jpeg", "image/png", "image/gif", "image/webp"]);
  assert.equal(entry.inputSchema.properties.image_base64.maxLength, MAX_IMAGE_BASE64_CHARS);
  assert.equal(entry.inputSchema.additionalProperties, false);
});

test("all three upload paths share idempotent R2 cleanup",()=>{
 const source=readFileSync(new URL("../lib/store.ts",import.meta.url),"utf8");
 for(const [fn,operation] of [["importMediaFromUrl","import_media_from_url"],["uploadMedia","upload_media"],["uploadChatGPTImage","upload_chatgpt_image"]]){
  const section=source.split("export async function "+fn+"(")[1]?.split("\n}\n")[0];
  assert.ok(section,fn+" exists");
  assert.ok(section.includes('commitUploadedMedia(db,input,id,req,asset,"'+operation+'"'),fn+" uses shared cleanup");
 }
 const helper=source.split("async function commitUploadedMedia(")[1]?.split("\n}\n")[0];
 assert.ok(helper?.includes("if(result.media_id!==asset.id)await deleteMedia("));
 assert.ok(helper?.includes("}catch(error){\n  await deleteMedia("));
});
