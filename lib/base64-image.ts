/** Decode a bounded image payload supplied by an authenticated MCP caller.
 * This is a transport adapter only: createMedia performs content-type, size,
 * signature, article existence and R2/D1 validation as for browser uploads.
 */
import { DiaryError } from "./input.ts";
import { IMAGE_MAX_BYTES, validMediaType } from "./media-rules.ts";

export const MAX_IMAGE_BASE64_CHARS = Math.ceil(IMAGE_MAX_BYTES / 3) * 4;
export const MAX_MCP_UPLOAD_BODY_CHARS = MAX_IMAGE_BASE64_CHARS + 8192;

export function decodeBase64Image(data: unknown, type: unknown, filename: unknown): File {
  if (typeof type !== "string" || !validMediaType(type) || !type.startsWith("image/"))
    throw new DiaryError("invalid_media", "Upload must be a supported image MIME type", 415);
  if (typeof filename !== "string" || !filename.trim() || filename.length > 180)
    throw new DiaryError("invalid_input", "file_name must be 1-180 characters", 400);
  if (typeof data !== "string" || !data.length)
    throw new DiaryError("invalid_input", "image_base64 must be nonempty Base64", 400);
  if (data.length > MAX_IMAGE_BASE64_CHARS)
    throw new DiaryError("media_too_large", "Image exceeds 10 MiB limit", 413);
  // No data URI, whitespace, URL-safe alphabet, invalid padding, or non-canonical encodings.
  if (data.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data))
    throw new DiaryError("invalid_media", "Invalid Base64 image encoding", 400);
  const padding = data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0;
  const decodedBytes = data.length / 4 * 3 - padding;
  if (decodedBytes <= 0) throw new DiaryError("invalid_media", "Empty image", 400);
  if (decodedBytes > IMAGE_MAX_BYTES)
    throw new DiaryError("media_too_large", "Image exceeds 10 MiB limit", 413);
  let decoded: string;
  try { decoded = atob(data); }
  catch { throw new DiaryError("invalid_media", "Invalid Base64 image encoding", 400); }
  if (decoded.length !== decodedBytes || btoa(decoded) !== data)
    throw new DiaryError("invalid_media", "Non-canonical Base64 image encoding", 400);
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
  return new File([bytes], filename, { type });
}
