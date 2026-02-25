import { NextRequest, NextResponse } from "next/server";
import { scrapeUrl } from "@/lib/firecrawl";
import { analyzeWithGemini } from "@/lib/gemini";
import type { Persona } from "@/lib/config";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, persona } = body as { url: string; persona: Persona };

    if (!url || !persona) {
      return NextResponse.json(
        { error: "Missing url or persona" },
        { status: 400 }
      );
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL — please enter a valid web address" },
        { status: 400 }
      );
    }

    const validPersonas: Persona[] = ["ux", "cro", "roast"];
    if (!validPersonas.includes(persona)) {
      return NextResponse.json(
        { error: "Invalid persona" },
        { status: 400 }
      );
    }

    let markdown: string;
    let screenshot: string | null;
    let favicon: string | null;
    let ogImage: string | null;
    let siteName: string | null;

    try {
      console.log(`[analyze] Scraping ${url}...`);
      ({ markdown, screenshot, favicon, ogImage, siteName } = await scrapeUrl(url));
    } catch (scrapeErr) {
      console.error("[analyze] Scrape failed:", scrapeErr);
      return NextResponse.json(
        { error: "Failed to load the site — it may be unreachable or blocking scrapers" },
        { status: 502 }
      );
    }

    let audit;
    try {
      console.log(`[analyze] Analyzing with Gemini (${persona})...`);
      audit = await analyzeWithGemini(markdown, screenshot, persona);
    } catch (aiErr) {
      console.error("[analyze] Gemini failed:", aiErr);
      return NextResponse.json(
        { error: "AI analysis failed — please try again" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      audit,
      screenshot: screenshot ?? null,
      favicon,
      ogImage,
      siteName,
    });
  } catch (error) {
    console.error("[analyze] Error:", error);
    const message =
      error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
