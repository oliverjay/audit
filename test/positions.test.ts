import { describe, it, expect } from "vitest";
import {
  resolvePositions,
  sortAndRemapChapters,
  clampAboveFold,
  computeWordFractions,
  formatElementPositions,
  extractHtmlStructure,
} from "@/lib/gemini";
import type { AuditResult } from "@/lib/config";
import type { ElementPosition } from "@/lib/firecrawl";

function makePositions(count: number): ElementPosition[] {
  return Array.from({ length: count }, (_, i) => ({
    tag: i === 0 ? "h1" : i < 3 ? "section" : "p",
    text: `Element ${i}`,
    xPct: 50,
    yPct: (i / count) * 100,
    widthPct: 80,
    heightPct: 5,
  }));
}

function makeAudit(overrides?: Partial<AuditResult>): AuditResult {
  return {
    summary: "Test",
    overallScore: 70,
    script: "[CHAPTER:0] Intro. [CHAPTER:1] Middle. [CHAPTER:2] End.",
    chapters: [
      { title: "Hero", startTime: 0, scrollY: 0, elementIndex: 0, summary: "s" },
      { title: "Middle", startTime: 0, scrollY: 50, elementIndex: 5, summary: "s" },
      { title: "Footer", startTime: 0, scrollY: 90, elementIndex: 9, summary: "s" },
    ],
    hotspots: [
      { label: "H1", x: 0, y: 0, elementIndex: 0, score: 60, chapter: 0 },
      { label: "CTA", x: 0, y: 0, elementIndex: 5, score: 40, chapter: 1 },
      { label: "Footer", x: 0, y: 0, elementIndex: 9, score: 30, chapter: 2 },
    ],
    stats: [
      { label: "Score", value: "70", chapter: 0 },
      { label: "CTAs", value: "3", chapter: 1 },
    ],
    ...overrides,
  };
}

// ─── resolvePositions ───

describe("resolvePositions", () => {
  it("maps elementIndex to correct x/y from positions array", () => {
    const positions = makePositions(10);
    const audit = makeAudit();

    resolvePositions(audit, positions);

    expect(audit.chapters[0].scrollY).toBe(positions[0].yPct);
    expect(audit.chapters[1].scrollY).toBe(positions[5].yPct);
    expect(audit.chapters[2].scrollY).toBe(positions[9].yPct);

    expect(audit.hotspots[0].x).toBe(positions[0].xPct);
    expect(audit.hotspots[0].y).toBe(positions[0].yPct);
    expect(audit.hotspots[1].x).toBe(positions[5].xPct);
    expect(audit.hotspots[1].y).toBe(positions[5].yPct);
  });

  it("keeps existing values when elementIndex is missing", () => {
    const positions = makePositions(10);
    const audit = makeAudit({
      chapters: [
        { title: "No index", startTime: 0, scrollY: 25, summary: "s" },
      ],
      hotspots: [
        { label: "No index", x: 33, y: 44, score: 50, chapter: 0 },
      ],
    });

    resolvePositions(audit, positions);

    expect(audit.chapters[0].scrollY).toBe(25);
    // Without elementIndex, x/y fall back to existing values or defaults
    expect(audit.hotspots[0].x).toBe(33);
    expect(audit.hotspots[0].y).toBe(44);
  });

  it("uses fallback defaults via ?? when elementIndex is out of range", () => {
    const positions = makePositions(3);
    const audit = makeAudit({
      chapters: [
        { title: "OOB", startTime: 0, scrollY: 10, elementIndex: 999, summary: "s" },
      ],
      hotspots: [
        // x/y set to null-like values to trigger ?? fallback
        { label: "OOB", x: undefined as unknown as number, y: undefined as unknown as number, elementIndex: 999, score: 50, chapter: 0 },
      ],
    });

    resolvePositions(audit, positions);

    expect(audit.chapters[0].scrollY).toBe(10);
    expect(audit.hotspots[0].x).toBe(50); // ?? 50 fallback
    expect(audit.hotspots[0].y).toBe(10); // ?? ch.scrollY fallback
  });

  it("handles empty positions array gracefully", () => {
    const audit = makeAudit({
      chapters: [
        { title: "A", startTime: 0, scrollY: 0, elementIndex: 0, summary: "s" },
      ],
      hotspots: [
        { label: "A", x: undefined as unknown as number, y: undefined as unknown as number, elementIndex: 0, score: 50, chapter: 0 },
      ],
    });
    resolvePositions(audit, []);

    expect(audit.chapters[0].scrollY).toBe(0);
    expect(audit.hotspots[0].x).toBe(50); // fallback
  });
});

// ─── sortAndRemapChapters ───

describe("sortAndRemapChapters", () => {
  it("sorts chapters by scrollY ascending", () => {
    const audit = makeAudit({
      chapters: [
        { title: "Bottom", startTime: 0, scrollY: 90, summary: "s" },
        { title: "Top", startTime: 0, scrollY: 5, summary: "s" },
        { title: "Middle", startTime: 0, scrollY: 50, summary: "s" },
      ],
      hotspots: [
        { label: "A", x: 10, y: 90, score: 50, chapter: 0 },
        { label: "B", x: 10, y: 5, score: 50, chapter: 1 },
        { label: "C", x: 10, y: 50, score: 50, chapter: 2 },
      ],
      stats: [{ label: "X", value: "1", chapter: 0 }],
      script: "[CHAPTER:0] Bottom. [CHAPTER:1] Top. [CHAPTER:2] Middle.",
    });

    sortAndRemapChapters(audit);

    expect(audit.chapters[0].title).toBe("Top");
    expect(audit.chapters[1].title).toBe("Middle");
    expect(audit.chapters[2].title).toBe("Bottom");
  });

  it("remaps hotspot chapter references after sorting", () => {
    const audit = makeAudit({
      chapters: [
        { title: "Bottom", startTime: 0, scrollY: 90, summary: "s" },
        { title: "Top", startTime: 0, scrollY: 5, summary: "s" },
      ],
      hotspots: [
        { label: "A", x: 10, y: 90, score: 50, chapter: 0 },
        { label: "B", x: 10, y: 5, score: 50, chapter: 1 },
      ],
      stats: [{ label: "X", value: "1", chapter: 0 }],
      script: "[CHAPTER:0] Bottom. [CHAPTER:1] Top.",
    });

    sortAndRemapChapters(audit);

    // "Bottom" was ch0, now ch1; "Top" was ch1, now ch0
    expect(audit.hotspots[0].chapter).toBe(1); // was 0 → now 1
    expect(audit.hotspots[1].chapter).toBe(0); // was 1 → now 0
    expect(audit.stats[0].chapter).toBe(1);
  });

  it("remaps [CHAPTER:N] markers in script", () => {
    const audit = makeAudit({
      chapters: [
        { title: "Bottom", startTime: 0, scrollY: 90, summary: "s" },
        { title: "Top", startTime: 0, scrollY: 5, summary: "s" },
      ],
      hotspots: [],
      stats: [],
      script: "[CHAPTER:0] Bottom stuff. [CHAPTER:1] Top stuff.",
    });

    sortAndRemapChapters(audit);

    expect(audit.script).toContain("[CHAPTER:0]");
    expect(audit.script).toContain("[CHAPTER:1]");
    expect(audit.script).toContain("[CHAPTER:0] Top stuff");
    expect(audit.script).toContain("[CHAPTER:1] Bottom stuff");
  });

  it("is a no-op when chapters are already sorted", () => {
    const audit = makeAudit();
    const originalTitles = audit.chapters.map((c) => c.title);

    sortAndRemapChapters(audit);

    expect(audit.chapters.map((c) => c.title)).toEqual(originalTitles);
  });
});

// ─── clampAboveFold ───

describe("clampAboveFold", () => {
  it("clamps chapter 0 to 0 if above 5%", () => {
    const audit = makeAudit({
      chapters: [
        { title: "A", startTime: 0, scrollY: 15, summary: "s" },
        { title: "B", startTime: 0, scrollY: 3, summary: "s" },
      ],
    });

    clampAboveFold(audit);

    expect(audit.chapters[0].scrollY).toBe(0);
  });

  it("clamps chapter 1 to 5 if above 10%", () => {
    const audit = makeAudit({
      chapters: [
        { title: "A", startTime: 0, scrollY: 2, summary: "s" },
        { title: "B", startTime: 0, scrollY: 25, summary: "s" },
      ],
    });

    clampAboveFold(audit);

    expect(audit.chapters[1].scrollY).toBe(5);
  });

  it("does not clamp chapters already in range", () => {
    const audit = makeAudit({
      chapters: [
        { title: "A", startTime: 0, scrollY: 2, summary: "s" },
        { title: "B", startTime: 0, scrollY: 8, summary: "s" },
      ],
    });

    clampAboveFold(audit);

    expect(audit.chapters[0].scrollY).toBe(2);
    expect(audit.chapters[1].scrollY).toBe(8);
  });
});

// ─── computeWordFractions ───

describe("computeWordFractions", () => {
  it("computes word fractions from script markers", () => {
    const chapters = [
      { wordFraction: undefined as number | undefined },
      { wordFraction: undefined as number | undefined },
    ];
    const script = "[CHAPTER:0] Hello world this is chapter zero. [CHAPTER:1] And this is chapter one.";

    computeWordFractions(script, chapters);

    expect(chapters[0].wordFraction).toBe(0);
    expect(chapters[1].wordFraction).toBeGreaterThan(0);
    expect(chapters[1].wordFraction).toBeLessThan(1);
  });

  it("sets chapter 0 wordFraction to 0 always", () => {
    const chapters = [{ wordFraction: undefined as number | undefined }];
    computeWordFractions("[CHAPTER:0] Some words here.", chapters);
    expect(chapters[0].wordFraction).toBe(0);
  });

  it("does nothing with no markers", () => {
    const chapters = [{ wordFraction: undefined as number | undefined }];
    computeWordFractions("No markers at all.", chapters);
    expect(chapters[0].wordFraction).toBeUndefined();
  });
});

// ─── formatElementPositions ───

describe("formatElementPositions", () => {
  it("formats positions as indexed lines", () => {
    const positions: ElementPosition[] = [
      { tag: "h1", text: "Hello", xPct: 50, yPct: 3.2, widthPct: 80, heightPct: 5 },
      { tag: "p", text: "World", xPct: 50, yPct: 10, widthPct: 60, heightPct: 3 },
    ];

    const result = formatElementPositions(positions);

    expect(result).toContain('[0] h1 (x:50, y:3.2) — "Hello"');
    expect(result).toContain('[1] p (x:50, y:10) — "World"');
  });
});

// ─── extractHtmlStructure ───

describe("extractHtmlStructure", () => {
  it("strips script tags", () => {
    const html = '<div>Hello</div><script>alert("x")</script><p>World</p>';
    const result = extractHtmlStructure(html, 10000);
    expect(result).not.toContain("alert");
    expect(result).toContain("Hello");
    expect(result).toContain("World");
  });

  it("truncates to maxLen", () => {
    const html = "<div>" + "a".repeat(200) + "</div>";
    const result = extractHtmlStructure(html, 50);
    expect(result.length).toBeLessThanOrEqual(70); // 50 + truncation message
    expect(result).toContain("(truncated)");
  });

  it("returns placeholder for empty html", () => {
    expect(extractHtmlStructure("", 1000)).toBe("(no HTML available)");
  });
});
