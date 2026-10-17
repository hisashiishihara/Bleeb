"use client";
import { useEffect } from "react";

/** Observes a real browser navigation, not build-time rendering or previews. */
export function ReferrerPing({ slug }: { slug: string }) {
  useEffect(() => {
    const source = document.referrer;
    if (!source) return;
    try {
      const origin = new URL(source);
      if (origin.hostname === window.location.hostname) return;
      void fetch("/api/referrer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        keepalive: true,
        body: JSON.stringify({ slug, referrer: source })
      }).catch(() => { /* analytics must never impact reading */ });
    } catch { /* invalid referrer is ignored */ }
  }, [slug]);
  return null;
}
