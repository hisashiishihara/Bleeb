/** Create a Hatena Bookmark add URL without sending article data from the server. */
export function hatenaBookmarkAddUrl(articleUrl: string): string {
  const url = new URL(articleUrl);
  if (!["https:", "http:"].includes(url.protocol) || !url.hostname || url.username || url.password) {
    throw new Error("Invalid article URL");
  }
  // Query parameters and fragments do not identify a separate article.
  url.search = "";
  url.hash = "";
  return "https://b.hatena.ne.jp/add?mode=confirm&url=" + encodeURIComponent(url.toString());
}
