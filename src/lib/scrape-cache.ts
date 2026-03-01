import { supabaseServer, supabaseEnabled } from "@/lib/supabase";
import type { ElementPosition } from "@/lib/firecrawl";

const SCRAPE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function cacheKey(url: string): Promise<string> {
  const data = new TextEncoder().encode(url);
  const hash = await globalThis.crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `scrape-cache/${hex}.json`;
}

export interface ScrapePayload {
  url: string;
  ts: number;
  markdown: string;
  html: string;
  favicon: string | null;
  ogImage: string | null;
  siteName: string | null;
  screenshot: string | null;
  elementPositions: ElementPosition[];
}

export async function readScrapeCache(
  url: string,
): Promise<ScrapePayload | null> {
  if (!supabaseEnabled) return null;
  try {
    const path = await cacheKey(url);
    const { data, error } = await supabaseServer.storage
      .from("audit-assets")
      .download(path);
    if (error || !data) return null;
    const text = await data.text();
    const payload: ScrapePayload = JSON.parse(text);
    if (payload.url !== url) return null;
    if (Date.now() - payload.ts > SCRAPE_CACHE_TTL_MS) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function writeScrapeCache(
  payload: ScrapePayload,
): Promise<void> {
  if (!supabaseEnabled) return;
  try {
    const path = await cacheKey(payload.url);
    const json = JSON.stringify(payload);
    const buf = Buffer.from(json, "utf-8");
    console.log(
      `[scrape-cache] Writing ${(buf.length / 1024).toFixed(0)}KB for ${payload.url}`,
    );
    await supabaseServer.storage
      .from("audit-assets")
      .upload(path, buf, { contentType: "application/json", upsert: true });
  } catch (err) {
    console.warn("[scrape-cache] Write failed:", err);
  }
}
