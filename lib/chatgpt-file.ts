/** ChatGPT fileParams receives a host-resolved, temporary download URL.
 * This module never treats a sandbox path, caller-controlled string, or file ID
 * alone as file bytes. URLs are validated and fetched through remote-image.
 */
import { DiaryError } from "./input.ts";
import { configuredImageHosts, downloadImage } from "./remote-image.ts";
import { validMediaType } from "./media-rules.ts";

export type ChatGPTFile = {
  download_url: string;
  file_id: string;
  mime_type?: string;
  file_name?: string;
};
const DEFAULT_HOSTS = "files.oaiusercontent.com,*.oaiusercontent.com,oaisdmntprkoreacentral.blob.core.windows.net";
export function chatGPTFileHosts(configured?: string): string[] {
  return configuredImageHosts(configured === undefined ? DEFAULT_HOSTS : configured);
}
export function parseChatGPTFile(value: unknown): ChatGPTFile {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new DiaryError("invalid_file", "ChatGPT file reference required", 400);
  const file = value as Record<string,unknown>;
  if (typeof file.file_id !== "string" || !file.file_id.trim() || file.file_id.length > 512 ||
      typeof file.download_url !== "string" || !file.download_url.trim() || file.download_url.length > 8192)
    throw new DiaryError("invalid_file", "ChatGPT file reference must include file_id and download_url", 400);
  if (file.mime_type !== undefined &&
      (typeof file.mime_type !== "string" || (file.mime_type !== "application/octet-stream" && (!validMediaType(file.mime_type) || !file.mime_type.startsWith("image/")))))
    throw new DiaryError("invalid_media", "Only PNG, JPEG, GIF and WebP are supported", 415);
  if (file.file_name !== undefined &&
      (typeof file.file_name !== "string" || !file.file_name.trim() || file.file_name.length > 180))
    throw new DiaryError("invalid_file", "Invalid file name", 400);
  return file as ChatGPTFile;
}
/** Signed URLs remain in process memory only. No credentials are forwarded. */
export async function downloadChatGPTImage(
  value: unknown, configured?: string, fetcher: typeof fetch = fetch
): Promise<File> {
  const file = parseChatGPTFile(value);
  const {image} = await downloadImage(file.download_url, chatGPTFileHosts(configured), fetcher, {
    maxUrlLength: 8192,
    expectedType: file.mime_type === "application/octet-stream" ? undefined : file.mime_type,
    allowUnknownMIME: true,
    diagnosticHost: true
  });
  const name = (file.file_name ?? image.name).replace(/[\\/\u0000-\u001f\u007f]/g, "_");
  return new File([image], name, { type: image.type });
}
