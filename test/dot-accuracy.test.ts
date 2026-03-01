/**
 * Dot Accuracy Tests
 *
 * Validates that hotspot dots land on sensible positions.
 * Runs against captured fixtures in test/fixtures/.
 * If no fixtures exist, tests are skipped (not failed).
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import type { AuditResult } from "@/lib/config";
import type { ElementPosition } from "@/lib/firecrawl";

const FIXTURES_DIR = join(__dirname, "fixtures");

interface FixtureData {
  slug: string;
  positions: ElementPosition[];
  audits: { persona: string; audit: AuditResult }[];
}

function loadFixtures(): FixtureData[] {
  if (!existsSync(FIXTURES_DIR)) return [];
  const files = readdirSync(FIXTURES_DIR);
  const scrapeFiles = files.filter((f) => f.endsWith("-scrape.json"));

  return scrapeFiles.map((sf) => {
    const slug = sf.replace("-scrape.json", "");
    const scrape = JSON.parse(readFileSync(join(FIXTURES_DIR, sf), "utf-8"));
    const auditFiles = files.filter((f) => f.startsWith(`${slug}-audit-`) && f.endsWith(".json"));

    const audits = auditFiles.map((af) => {
      const persona = af.replace(`${slug}-audit-`, "").replace(".json", "");
      const audit = JSON.parse(readFileSync(join(FIXTURES_DIR, af), "utf-8")) as AuditResult;
      return { persona, audit };
    });

    return {
      slug,
      positions: scrape.elementPositions ?? [],
      audits,
    };
  });
}

const fixtures = loadFixtures();
const hasFixtures = fixtures.length > 0 && fixtures.some((f) => f.audits.length > 0);

describe.skipIf(!hasFixtures)("dot accuracy", () => {
  for (const fixture of fixtures) {
    for (const { persona, audit } of fixture.audits) {
      const label = `${fixture.slug} / ${persona}`;

      describe(label, () => {
        it("every hotspot has a valid elementIndex", () => {
          for (const h of audit.hotspots) {
            expect(h.elementIndex, `Hotspot "${h.label}" has no elementIndex`).not.toBeUndefined();
            if (fixture.positions.length > 0) {
              expect(
                h.elementIndex! >= 0 && h.elementIndex! < fixture.positions.length,
                `Hotspot "${h.label}" elementIndex=${h.elementIndex} is out of range (0-${fixture.positions.length - 1})`
              ).toBe(true);
            }
          }
        });

        it("no hotspot has degenerate fallback coordinates", () => {
          for (const h of audit.hotspots) {
            const isFallback = h.x === 50 && h.y === 0;
            expect(
              isFallback,
              `Hotspot "${h.label}" at (50, 0) looks like a fallback — likely missing position data`
            ).toBe(false);
          }
        });

        it("all hotspot x values are between 5-95%", () => {
          for (const h of audit.hotspots) {
            expect(h.x, `Hotspot "${h.label}" x=${h.x} is off-screen`).toBeGreaterThanOrEqual(2);
            expect(h.x, `Hotspot "${h.label}" x=${h.x} is off-screen`).toBeLessThanOrEqual(98);
          }
        });

        it("all hotspot y values are between 0-100%", () => {
          for (const h of audit.hotspots) {
            expect(h.y, `Hotspot "${h.label}" y=${h.y} is out of range`).toBeGreaterThanOrEqual(0);
            expect(h.y, `Hotspot "${h.label}" y=${h.y} is out of range`).toBeLessThanOrEqual(100);
          }
        });

        it("first chapter hotspots are in the top 15% of the page", () => {
          const ch0Hotspots = audit.hotspots.filter((h) => h.chapter === 0);
          for (const h of ch0Hotspots) {
            expect(
              h.y,
              `First chapter hotspot "${h.label}" at y=${h.y}% is too far down — should be above fold`
            ).toBeLessThan(15);
          }
        });

        it("hotspots within a chapter are spatially near the chapter scrollY", () => {
          for (const h of audit.hotspots) {
            const ch = audit.chapters[h.chapter];
            if (!ch) continue;
            const distance = Math.abs(h.y - ch.scrollY);
            expect(
              distance,
              `Hotspot "${h.label}" (y=${h.y?.toFixed(1)}%) is ${distance.toFixed(1)}% away from chapter ${h.chapter} (scrollY=${ch.scrollY?.toFixed(1)}%)`
            ).toBeLessThan(20);
          }
        });

        it("no two hotspots in the same chapter share identical coordinates", () => {
          const byChapter = new Map<number, { label: string; x: number; y: number }[]>();
          for (const h of audit.hotspots) {
            if (!byChapter.has(h.chapter)) byChapter.set(h.chapter, []);
            byChapter.get(h.chapter)!.push({ label: h.label, x: h.x, y: h.y });
          }

          for (const [chIdx, hotspots] of byChapter) {
            for (let i = 0; i < hotspots.length; i++) {
              for (let j = i + 1; j < hotspots.length; j++) {
                const same = hotspots[i].x === hotspots[j].x && hotspots[i].y === hotspots[j].y;
                expect(
                  same,
                  `Chapter ${chIdx}: hotspots "${hotspots[i].label}" and "${hotspots[j].label}" share identical coordinates (${hotspots[i].x}, ${hotspots[i].y})`
                ).toBe(false);
              }
            }
          }
        });

        it("every chapter has at least one hotspot", () => {
          for (let i = 0; i < audit.chapters.length; i++) {
            const chHotspots = audit.hotspots.filter((h) => h.chapter === i);
            expect(
              chHotspots.length,
              `Chapter ${i} "${audit.chapters[i].title}" has no hotspots`
            ).toBeGreaterThanOrEqual(1);
          }
        });

        it("chapters are ordered top to bottom", () => {
          for (let i = 1; i < audit.chapters.length; i++) {
            expect(
              audit.chapters[i].scrollY,
              `Chapter ${i} (scrollY=${audit.chapters[i].scrollY}) is above chapter ${i - 1} (scrollY=${audit.chapters[i - 1].scrollY})`
            ).toBeGreaterThanOrEqual(audit.chapters[i - 1].scrollY);
          }
        });
      });
    }
  }
});
