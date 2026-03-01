import type { AuditResult, Persona } from "./config";

const personaFocus: Record<Persona, string> = {
  ux: "Your lens is usability and user experience — prioritise clarity, visual hierarchy, accessibility, and frictionless flow.",
  cro: "Your lens is conversion rate optimisation — prioritise CTA prominence, trust signals, value proposition clarity, and funnel psychology.",
  roast: "Your lens is ruthless quality — every weak element gets a confident, opinionated fix. No half-measures.",
};

/**
 * Split scriptWithMarkers into per-chapter text segments.
 * Format: "[CHAPTER:0]text...[CHAPTER:1]text..."
 * Returns an array indexed by chapter number.
 */
function parseScriptByChapter(scriptWithMarkers: string): string[] {
  const segments = scriptWithMarkers.split(/\[CHAPTER:(\d+)\]/);
  const result: string[] = [];
  for (let i = 1; i < segments.length; i += 2) {
    const idx = parseInt(segments[i], 10);
    const text = (segments[i + 1] ?? "").replace(/\s+/g, " ").trim();
    if (!isNaN(idx) && text) result[idx] = text;
  }
  return result;
}

/**
 * Extract only the actionable sentences from a script chunk —
 * concrete suggestions, quoted copy, and specific fix directives.
 * Discards setup/reasoning/statistics which bloat the image prompt.
 */
function extractActionable(scriptText: string): string {
  const actions: string[] = [];

  // "For example, '...'" or "For example, ..." sentences
  const examples = scriptText.match(/For example[^.!?]+[.!?]/gi) ?? [];
  actions.push(...examples);

  // "Instead of X, consider/use Y" sentences
  const instead = scriptText.match(/Instead of[^.!?]+[.!?]/gi) ?? [];
  actions.push(...instead);

  // "Consider ..." sentences
  const consider = scriptText.match(/Consider[^.!?]+[.!?]/gi) ?? [];
  actions.push(...consider);

  // "Replace X with Y" / "Change X to Y" sentences
  const replace = scriptText.match(/(?:Replace|Change|Rename|Rewrite|Add|Introduce)[^.!?]+[.!?]/gi) ?? [];
  actions.push(...replace);

  // Quoted copy suggestions (single-quoted, 10+ chars)
  const quoted = (scriptText.match(/'([^']{10,})'/g) ?? []).map((q) => `Suggested copy: ${q}`);
  actions.push(...quoted);

  const result = [...new Set(actions)].join(" ").trim();
  // Fall back to summary-length tail of script if nothing was extracted
  return result || scriptText.split(" ").slice(-40).join(" ").trim();
}

export function generateRedesignPrompt({
  audit,
  persona,
}: {
  audit: AuditResult;
  persona: Persona;
}): string {
  // Use the richer per-chapter script text — it contains specific copy suggestions,
  // element names, and concrete examples the image model can apply literally.
  const scriptByChapter = audit.scriptWithMarkers
    ? parseScriptByChapter(audit.scriptWithMarkers)
    : [];

  const improvements = audit.chapters
    .map((chapter, i) => {
      const chapterHotspots = audit.hotspots.filter((h) => h.chapter === i);
      const hotspot = chapterHotspots[0];

      const locationLine = hotspot
        ? `Find the element labelled "${hotspot.label}" at coordinates (x: ${Math.round(hotspot.x)}%, y: ${Math.round(hotspot.y)}% from top of page)`
        : `Approximately ${Math.round(chapter.scrollY)}% from the top of the page`;

      const score = hotspot ? hotspot.score : null;
      const intensity =
        score !== null && score < 50
          ? "This is a critical issue — the change must be bold and unmistakably visible."
          : score !== null && score < 70
            ? "This needs clear improvement — the change should be obvious at a glance."
            : "Polish this — the change should feel refined and intentional.";

      // Extract only actionable fix sentences — discard reasoning, stats, and setup
      const rawScript = scriptByChapter[i];
      const fix = rawScript ? extractActionable(rawScript) : chapter.summary;

      return `${i + 1}. [${locationLine}] ${fix} ${intensity}`;
    })
    .join("\n");

  return `Senior Product Designer task: high-fidelity redesign of the attached screenshot. ${personaFocus[persona]} Stripe/Linear polish — sharp edges, 8px grid, no blur.

Apply these changes simultaneously:
${improvements}

Do not alter: hex colors, logo, font families, photos, or section order. Same dimensions. Changes must look native.`;
}
