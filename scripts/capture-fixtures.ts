/**
 * Fixture Capture Script
 *
 * Scrapes test sites and saves full intermediate data as JSON fixtures.
 * Run: npx tsx scripts/capture-fixtures.ts [--dry-run] [--sites stripe.com,linear.app]
 *
 * --dry-run   Print the Gemini prompt without calling the API
 * --sites     Comma-separated hostnames to filter from test/sites.json
 * --persona   Single persona to use (default: runs "ux" only to save credits)
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";

// Load .env.local manually (avoids dotenv dependency)
const envPath = join(__dirname, "..", ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}

// Set env vars before importing modules that read them at import time
const FIXTURES_DIR = join(__dirname, "..", "test", "fixtures");
mkdirSync(FIXTURES_DIR, { recursive: true });

function slugify(url: string): string {
  try {
    return new URL(url).hostname.replace(/\./g, "-").replace(/^www-/, "");
  } catch {
    return url.replace(/[^a-z0-9]/gi, "-").slice(0, 40);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const sitesFlag = args.find((a) => a.startsWith("--sites="))?.split("=")[1];
  const personaFlag = args.find((a) => a.startsWith("--persona="))?.split("=")[1] || "ux";

  // Dynamic imports so env vars are set first
  const { scrapeUrl } = await import("../src/lib/firecrawl");
  const { analyzeWithGemini, extractHtmlStructure, formatElementPositions } = await import("../src/lib/gemini");

  const allSites: string[] = (await import("../test/sites.json", { with: { type: "json" } })).default;
  const filterHosts = sitesFlag?.split(",").map((s) => s.trim().toLowerCase());

  const sites = filterHosts
    ? allSites.filter((u) => {
        const h = new URL(u).hostname.toLowerCase();
        return filterHosts.some((f) => h.includes(f));
      })
    : allSites;

  if (sites.length === 0) {
    console.error("No sites matched. Available:", allSites.map((u) => new URL(u).hostname).join(", "));
    process.exit(1);
  }

  const persona = personaFlag as "ux" | "cro" | "roast";
  console.log(`\n=== Capture Fixtures ===`);
  console.log(`Sites: ${sites.length}`);
  console.log(`Persona: ${persona}`);
  console.log(`Dry run: ${dryRun}`);
  console.log(`Output: ${FIXTURES_DIR}\n`);

  for (const url of sites) {
    const slug = slugify(url);
    console.log(`\n--- ${url} (${slug}) ---`);

    // Check for existing scrape fixture
    const scrapeFile = join(FIXTURES_DIR, `${slug}-scrape.json`);
    let scrapeData: Awaited<ReturnType<typeof scrapeUrl>>;

    if (existsSync(scrapeFile)) {
      console.log("  [scrape] Loading cached fixture...");
      scrapeData = JSON.parse(require("fs").readFileSync(scrapeFile, "utf-8"));
    } else {
      console.log("  [scrape] Fetching from Firecrawl...");
      try {
        scrapeData = await scrapeUrl(url);
      } catch (err) {
        console.error(`  [scrape] FAILED: ${err}`);
        continue;
      }
      writeFileSync(scrapeFile, JSON.stringify(scrapeData, null, 2));
      console.log(`  [scrape] Saved. ${scrapeData.elementPositions.length} elements, screenshot=${!!scrapeData.screenshot}`);
    }

    // Download screenshot
    if (scrapeData.screenshot) {
      const screenshotFile = join(FIXTURES_DIR, `${slug}-screenshot.png`);
      if (!existsSync(screenshotFile)) {
        console.log("  [screenshot] Downloading...");
        try {
          const res = await fetch(scrapeData.screenshot);
          if (res.ok) {
            const buf = Buffer.from(await res.arrayBuffer());
            writeFileSync(screenshotFile, buf);
            console.log(`  [screenshot] Saved (${Math.round(buf.length / 1024)}KB)`);
          }
        } catch (err) {
          console.warn(`  [screenshot] Download failed: ${err}`);
        }
      }
    }

    // Dry run: print prompt and skip Gemini
    if (dryRun) {
      const condensedHtml = extractHtmlStructure(scrapeData.html, 12000);
      const positionsBlock = scrapeData.elementPositions.length > 0
        ? formatElementPositions(scrapeData.elementPositions)
        : "(no positions)";
      console.log("\n  === DRY RUN: Gemini Prompt ===");
      console.log(`  Markdown: ${scrapeData.markdown.length} chars`);
      console.log(`  HTML: ${condensedHtml.length} chars`);
      console.log(`  Positions: ${scrapeData.elementPositions.length} elements`);
      console.log(`  First 10 positions:\n${positionsBlock.split("\n").slice(0, 10).map((l) => "    " + l).join("\n")}`);
      continue;
    }

    // Run Gemini
    const auditFile = join(FIXTURES_DIR, `${slug}-audit-${persona}.json`);
    if (existsSync(auditFile)) {
      console.log(`  [gemini] Audit fixture already exists for ${persona}, skipping.`);
      continue;
    }

    console.log(`  [gemini] Analyzing with ${persona}...`);
    try {
      const audit = await analyzeWithGemini(
        scrapeData.markdown,
        scrapeData.html,
        persona,
        scrapeData.screenshot,
        scrapeData.elementPositions,
      );

      writeFileSync(auditFile, JSON.stringify(audit, null, 2));
      console.log(`  [gemini] Saved. ${audit.chapters.length} chapters, ${audit.hotspots.length} hotspots, score=${audit.overallScore}`);

      // Print position summary
      for (const h of audit.hotspots) {
        const elem = h.elementIndex != null ? scrapeData.elementPositions[h.elementIndex] : null;
        console.log(`    Hotspot "${h.label}": x=${h.x?.toFixed(1)}% y=${h.y?.toFixed(1)}% → elem[${h.elementIndex}] "${elem?.text?.slice(0, 40) ?? "?"}" (ch${h.chapter})`);
      }
    } catch (err) {
      console.error(`  [gemini] FAILED: ${err}`);
    }
  }

  console.log("\n=== Done ===\n");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
