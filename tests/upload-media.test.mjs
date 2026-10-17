import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeBase64Image, MAX_IMAGE_BASE64_CHARS, MAX_MCP_UPLOAD_BODY_CHARS } from "../lib/base64-image.ts";
import { IMAGE_MAX_BYTES, matchesSignature } from "../lib/media-rules.ts";

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
