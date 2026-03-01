import { NextResponse } from "next/server";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const FIXTURES_DIR = join(process.cwd(), "test", "fixtures");

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Debug endpoints are disabled in production" }, { status: 403 });
  }

  if (!existsSync(FIXTURES_DIR)) {
    return NextResponse.json({ error: "No fixtures directory. Run: npm run capture" }, { status: 404 });
  }

  const files = readdirSync(FIXTURES_DIR);
  const scrapeFiles = files.filter((f) => f.endsWith("-scrape.json"));

  const fixtures = scrapeFiles.map((scrapeFile) => {
    const slug = scrapeFile.replace("-scrape.json", "");
    const scrape = JSON.parse(readFileSync(join(FIXTURES_DIR, scrapeFile), "utf-8"));

    // Find all audit files for this slug
    const auditFiles = files.filter((f) => f.startsWith(`${slug}-audit-`) && f.endsWith(".json"));
    const audits: Record<string, unknown> = {};
    for (const af of auditFiles) {
      const persona = af.replace(`${slug}-audit-`, "").replace(".json", "");
      audits[persona] = JSON.parse(readFileSync(join(FIXTURES_DIR, af), "utf-8"));
    }

    // Check for local screenshot
    const screenshotFile = files.find((f) => f.startsWith(`${slug}-screenshot.`));
    const hasLocalScreenshot = !!screenshotFile;

    return {
      slug,
      screenshot: scrape.screenshot,
      hasLocalScreenshot,
      elementPositions: scrape.elementPositions ?? [],
      audits,
    };
  });

  return NextResponse.json(fixtures);
}
