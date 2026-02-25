import { GoogleGenerativeAI, SchemaType, type ResponseSchema, type Part } from "@google/generative-ai";
import { config, type Persona, type AuditResult } from "./config";

const genAI = new GoogleGenerativeAI(config.env.google);

const personaPrompts: Record<Persona, string> = {
  ux: `You are an elite UX Consultant performing a professional website audit.
Speak in a calm, authoritative, empathetic tone. Focus on usability heuristics,
information architecture, accessibility, visual hierarchy, and user flow.
Reference Nielsen's heuristics where relevant. Be constructive but honest.`,

  cro: `You are an aggressive CRO (Conversion Rate Optimization) Specialist.
Speak with high energy and confidence. Focus on conversion funnels, CTAs,
social proof, trust signals, friction points, and revenue potential.
Back claims with industry benchmarks. Be data-driven and actionable.`,

  roast: `You are a brutally honest website Roaster with razor-sharp wit.
Be entertaining, sarcastic, and pull no punches. Think Gordon Ramsay meets
tech Twitter. Still provide actual insights beneath the humor. Point out
every cringe-worthy design choice, confusing element, and missed opportunity.`,
};

const auditSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    summary: { type: SchemaType.STRING, description: "2-3 sentence executive summary" },
    overallScore: { type: SchemaType.NUMBER, description: "Overall score 0-100" },
    script: { type: SchemaType.STRING, description: "Full voiceover script, 60-90 seconds when read aloud. Written in first person as the persona." },
    chapters: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          startTime: { type: SchemaType.NUMBER, description: "Estimated start time in seconds" },
          scrollY: { type: SchemaType.NUMBER, description: "Percentage (0-100) of page height to scroll to" },
          summary: { type: SchemaType.STRING },
        },
        required: ["title", "startTime", "scrollY", "summary"],
      },
    },
    hotspots: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          label: { type: SchemaType.STRING },
          x: { type: SchemaType.NUMBER, description: "X position as percentage (0-100)" },
          y: { type: SchemaType.NUMBER, description: "Y position as percentage (0-100)" },
          score: { type: SchemaType.NUMBER, description: "Element score 0-100" },
          chapter: { type: SchemaType.NUMBER, description: "Index of related chapter" },
        },
        required: ["label", "x", "y", "score", "chapter"],
      },
    },
    stats: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          label: { type: SchemaType.STRING },
          value: { type: SchemaType.STRING },
          chapter: { type: SchemaType.NUMBER },
        },
        required: ["label", "value", "chapter"],
      },
    },
    fixes: {
      type: SchemaType.ARRAY,
      description: "CSS-only visual fixes that demonstrate how the site could look better. Each fix targets a specific chapter.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          chapter: { type: SchemaType.NUMBER, description: "Index of related chapter" },
          description: { type: SchemaType.STRING, description: "Short human-readable description of what this fix does" },
          css: { type: SchemaType.STRING, description: "Valid CSS to inject into the page to demonstrate the improvement. Use broad selectors. Example: 'header { background: #1a1a2e; } .cta-button { font-size: 18px; padding: 16px 32px; background: #e94560; }'" },
        },
        required: ["chapter", "description", "css"],
      },
    },
  },
  required: ["summary", "overallScore", "script", "chapters", "hotspots", "stats", "fixes"],
};

function computeWordFractions(audit: AuditResult) {
  const raw = audit.scriptWithMarkers || audit.script;

  const parts = raw.split(/\[CHAPTER:\d+\]\s*/);
  const markerMatches = [...raw.matchAll(/\[CHAPTER:(\d+)\]/g)];

  if (markerMatches.length === 0) return;

  const cleanScript = raw.replace(/\[CHAPTER:\d+\]\s*/g, "");
  const totalWords = cleanScript.split(/\s+/).filter(Boolean).length;
  if (totalWords === 0) return;

  let wordsSoFar = 0;
  for (let i = 0; i < markerMatches.length; i++) {
    const chapterIdx = parseInt(markerMatches[i][1], 10);
    const textBefore = parts[i] || "";
    wordsSoFar += textBefore.split(/\s+/).filter(Boolean).length;

    const chapter = audit.chapters[chapterIdx];
    if (chapter) {
      chapter.wordFraction = totalWords > 0 ? wordsSoFar / totalWords : 0;
    }
  }

  if (audit.chapters[0]) {
    audit.chapters[0].wordFraction = 0;
  }
}

export async function analyzeWithGemini(
  markdown: string,
  screenshot: string | null,
  persona: Persona
): Promise<AuditResult> {
  const model = genAI.getGenerativeModel({
    model: config.model,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: auditSchema,
    },
    systemInstruction: personaPrompts[persona],
  });

  const parts: Part[] = [];

  if (screenshot) {
    let base64Data: string;

    if (screenshot.startsWith("http://") || screenshot.startsWith("https://")) {
      const imgResponse = await fetch(screenshot);
      const buffer = await imgResponse.arrayBuffer();
      base64Data = Buffer.from(buffer).toString("base64");
    } else if (screenshot.startsWith("data:")) {
      base64Data = screenshot.split(",")[1];
    } else {
      base64Data = screenshot;
    }

    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: base64Data,
      },
    });
  }

  parts.push({
    text: `Analyze this website and produce a structured audit.

Here is the page content as markdown:

${markdown.slice(0, 15000)}

Produce a detailed audit with:
- A summary and overall score (0-100)
- A voiceover script (60-90 seconds when read aloud, written as the persona). Write naturally as though speaking. CRITICAL: You MUST embed chapter markers in the script text. Insert [CHAPTER:0] at the very start of the script, [CHAPTER:1] where the second insight begins, [CHAPTER:2] where the third begins, etc. Example: "[CHAPTER:0] Alright, let's take a look at this site. First thing I notice is... [CHAPTER:1] Now scrolling down, the pricing section..."
- 4-6 insights/chapters. Each must have:
  - A short punchy title (e.g. "Hero That Doesn't Convert", "Navigation Overload")
  - startTime: set to 0 for all chapters (will be recalculated from markers automatically).
  - scrollY: the vertical scroll position as a percentage of the FULL page height (0 = very top, 100 = very bottom). Use the screenshot and markdown structure to estimate where elements appear on the page. The hero/header is 0-5%, content sections are typically 15-60%, footer is 85-100%.
  - summary: 1-2 sentence description of the insight

- 3-6 hotspots marking specific elements discussed. Each must have:
  - x: horizontal position as % of page WIDTH (0 = left edge, 100 = right edge). Be precise: a logo centered in a header is ~50%, a sidebar element is ~85%, a left-aligned heading is ~25%.
  - y: vertical position as % of FULL PAGE HEIGHT (same coordinate system as scrollY). This is NOT relative to the viewport — it's the absolute position on the full-length page. A header nav element would be ~2-4%, a hero CTA might be ~8-12%, content further down might be 30-60%.
  - score: element quality score 0-100
  - chapter: index of the related chapter/insight
  - label: short element name (e.g. "CTA Button", "Hero Image", "Nav Menu")

- 3-5 stat cards with label, value (short string like "2.3s" or "68%"), and linked chapter

- 2-4 CSS fixes (can be empty array if not applicable). Each with chapter, description, and CSS string.

CRITICAL for hotspot accuracy: The y coordinate for hotspots must match the scrollY of their linked chapter. If a chapter has scrollY: 5, its hotspots should have y values close to 5 (within ±10). If a chapter is about the header (scrollY: 0-5), do NOT put hotspots at y: 50.

CRITICAL about hidden/offscreen elements: The screenshot is a static snapshot — some elements may appear blank, have placeholder images, or seem invisible simply because they load dynamically (lazy-loaded images, carousels, animations triggered on scroll, etc.). Do NOT criticize elements that appear blank or empty in the screenshot if the markdown content indicates they exist and have real content. Assume images and dynamic content load correctly in the live site unless the markdown explicitly suggests they are broken or missing. Focus only on elements that are genuinely visible and structurally present. Do NOT reference elements that are hidden via CSS (display:none, visibility:hidden, aria-hidden) or exist only in the markup but aren't part of the visible page flow.`,
  });

  const result = await model.generateContent(parts);
  const text = result.response.text();

  let audit: AuditResult;
  try {
    audit = JSON.parse(text) as AuditResult;
  } catch {
    throw new Error("AI returned an invalid response — please retry");
  }

  audit.scriptWithMarkers = audit.script;
  computeWordFractions(audit);
  audit.script = audit.script.replace(/\[CHAPTER:\d+\]\s*/g, "");

  return audit;
}
