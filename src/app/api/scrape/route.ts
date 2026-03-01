import { NextRequest, NextResponse } from "next/server";
import { scrapeUrl } from "@/lib/firecrawl";
import { readScrapeCache, writeScrapeCache } from "@/lib/scrape-cache";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body as { url: string };

    if (!url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL — please enter a valid web address" },
        { status: 400 }
      );
    }

    // Return from scrape cache if a recent scrape exists for this URL
    const cached = await readScrapeCache(url);
    if (cached) {
      console.log(`[scrape] Cache hit for ${url} (age ${Math.round((Date.now() - cached.ts) / 1000)}s)`);
      const { ts: _ts, url: _url, ...data } = cached;
      return NextResponse.json(data);
    }

    console.log(`[scrape] Scraping ${url}...`);
    const data = await scrapeUrl(url);
    console.log(`[scrape] Done. screenshot=${!!data.screenshot}, positions=${data.elementPositions.length}`);

    // Populate cache for subsequent persona switches (fire-and-forget)
    writeScrapeCache({ url, ts: Date.now(), ...data }).catch(() => {});

    return NextResponse.json(data);
  } catch (error) {
    console.error("[scrape] Error:", error);
    const message =
      error instanceof Error ? error.message : "Scrape failed";
    return NextResponse.json(
      { error: `Failed to load the site: ${message}` },
      { status: 502 }
    );
  }
}
