/**
 * Gemini Replay Script
 *
 * Re-runs Gemini analysis on cached scrape fixtures (no Firecrawl credits needed).
 * Saves new results alongside old ones and prints a diff.
 *
 * Run: npx tsx scripts/replay-gemini.ts [--sites stripe-com] [--persona ux]
 */

import { writeFileSync, readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

// Load .env.local manually
const envPath = join(__dirname, "..", ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}

const FIXTURES_DIR = join(__dirname, "..", "test", "fixtures");

async function main() {
  const args = process.argv.slice(2);
  const sitesFilter = args.find((a) => a.startsWith("--sites="))?.split("=")[1]?.split(",");
  const persona = (args.find((a) => a.startsWith("--persona="))?.split("=")[1] || "ux") as "ux" | "cro" | "roast";

  const { analyzeWithGemini } = await import("../src/lib/gemini");

  if (!existsSync(FIXTURES_DIR)) {
    console.error("No fixtures directory. Run: npm run capture");
    process.exit(1);
  }

  const files = readdirSync(FIXTURES_DIR);
  const scrapeFiles = files.filter((f) => f.endsWith("-scrape.json"));

  const slugs = scrapeFiles
    .map((f) => f.replace("-scrape.json", ""))
    .filter((s) => !sitesFilter || sitesFilter.some((sf) => s.includes(sf)));

  if (slugs.length === 0) {
    console.error("No matching fixtures found.");
    process.exit(1);
  }

  console.log(`\n=== Gemini Replay ===`);
  console.log(`Slugs: ${slugs.join(", ")}`);
  console.log(`Persona: ${persona}\n`);

  for (const slug of slugs) {
    console.log(`\n--- ${slug} ---`);

    const scrapeFile = join(FIXTURES_DIR, `${slug}-scrape.json`);
    const scrape = JSON.parse(readFileSync(scrapeFile, "utf-8"));

    const oldAuditFile = join(FIXTURES_DIR, `${slug}-audit-${persona}.json`);
    const oldAudit = existsSync(oldAuditFile)
      ? JSON.parse(readFileSync(oldAuditFile, "utf-8"))
      : null;

    console.log(`  [replay] Calling Gemini with ${scrape.elementPositions?.length ?? 0} positions...`);

    try {
      const newAudit = await analyzeWithGemini(
        scrape.markdown,
        scrape.html,
        persona,
        scrape.screenshot,
        scrape.elementPositions,
      );

      // Save new result
      const newAuditFile = join(FIXTURES_DIR, `${slug}-audit-${persona}-replay.json`);
      writeFileSync(newAuditFile, JSON.stringify(newAudit, null, 2));
      console.log(`  [replay] Saved to ${slug}-audit-${persona}-replay.json`);

      // Diff
      console.log(`\n  Score: ${oldAudit?.overallScore ?? "?"} → ${newAudit.overallScore}`);
      console.log(`  Chapters: ${oldAudit?.chapters?.length ?? "?"} → ${newAudit.chapters.length}`);
      console.log(`  Hotspots: ${oldAudit?.hotspots?.length ?? "?"} → ${newAudit.hotspots.length}`);

      if (oldAudit) {
        console.log("\n  Hotspot position diff:");
        const maxLen = Math.max(oldAudit.hotspots?.length ?? 0, newAudit.hotspots.length);
        for (let i = 0; i < maxLen; i++) {
          const o = oldAudit.hotspots?.[i];
          const n = newAudit.hotspots[i];
          if (o && n) {
            const dx = Math.abs((n.x ?? 0) - (o.x ?? 0));
            const dy = Math.abs((n.y ?? 0) - (o.y ?? 0));
            const moved = dx > 1 || dy > 1;
            console.log(
              `    [${i}] "${o.label}" → "${n.label}" ` +
              `(${o.x?.toFixed(1)},${o.y?.toFixed(1)}) → (${n.x?.toFixed(1)},${n.y?.toFixed(1)}) ` +
              `${moved ? `MOVED Δ${dx.toFixed(1)},${dy.toFixed(1)}` : "~same"}`
            );
          } else if (n) {
            console.log(`    [${i}] NEW "${n.label}" at (${n.x?.toFixed(1)},${n.y?.toFixed(1)})`);
          } else if (o) {
            console.log(`    [${i}] REMOVED "${o.label}"`);
          }
        }

        // Run basic accuracy checks
        let issues = 0;
        for (const h of newAudit.hotspots) {
          if (h.x === 50 && h.y === 0) { console.log(`    ⚠ "${h.label}" has fallback coords (50, 0)`); issues++; }
          if (h.x < 2 || h.x > 98) { console.log(`    ⚠ "${h.label}" x=${h.x} is off-screen`); issues++; }
          const ch = newAudit.chapters[h.chapter];
          if (ch && Math.abs(h.y - ch.scrollY) > 20) {
            console.log(`    ⚠ "${h.label}" y=${h.y?.toFixed(1)} far from ch${h.chapter} scrollY=${ch.scrollY?.toFixed(1)}`);
            issues++;
          }
        }
        console.log(`\n  Issues: ${issues}`);
      }
    } catch (err) {
      console.error(`  [replay] FAILED: ${err}`);
    }
  }

  console.log("\n=== Done ===\n");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
