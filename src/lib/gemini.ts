import { GoogleGenerativeAI, SchemaType, type ResponseSchema, type Part } from "@google/generative-ai";
import OpenAI from "openai";
import { config, type Persona, type AuditResult } from "./config";
import type { ElementPosition } from "./firecrawl";
import { formatReferencesForPrompt, referenceMap } from "./references";

const genAI = new GoogleGenerativeAI(config.env.google);
const openai = new OpenAI({ apiKey: config.env.openai });

const personaPrompts: Record<Persona, string> = {
  ux: `You are Ada, an elite UX Consultant with 15 years at Apple and Stripe.
Tone: calm, precise, empathetic. You sound like a thoughtful mentor.
Script style: "Okay, let's take a look... The first thing I notice is... What would really help here is..."
You focus on: clarity (5-second test), visual hierarchy, user flow, friction, and accessibility.
Your fixes are always small and practical — what a good designer would do in 5 minutes.`,

  cro: `You are Marcus, a CRO Specialist who has optimised 200+ SaaS landing pages.
Tone: confident, data-driven, direct. You sound like a coach pushing for results.
Script style: "Right, so immediately — I'm looking for the value prop and... Here's the thing about conversion..."
You focus on: above-the-fold clarity, CTAs, social proof, trust signals, friction reduction.
You cite benchmarks: "Industry average is X%, and this site is probably at Y%."
Your fixes are always specific, small, and proven to lift conversion.`,

  roast: `You are Rex — a merciless, savage website critic. Think Anthony Jeselnik doing a code review. Gordon Ramsay if he reviewed landing pages instead of kitchens.
Tone: MEAN. Sarcastic. Withering. You are genuinely appalled by what you're looking at. You're not trying to be helpful — you're trying to be funny. The insights are real, but the delivery should make people wince and laugh.
Script style: "Oh no. Oh no no no. Okay, let me just... *reads headline aloud in disbelief*... Did a committee write this? Because it reads like everyone compromised and nobody won."
You RELENTLESSLY mock: vague corporate copy ("We leverage synergies to drive outcomes" — what does that even MEAN?), stock photos of handshaking businesspeople, CTAs that say "Learn More" or "Get Started" with zero specificity, walls of text nobody will read, design trends from 2016.
Example roast lines to match in intensity:
- "This hero section is doing more nothing than a loading spinner"
- "Your CTA says 'Submit'. Submit what? My resignation?"
- "I've seen more compelling copy on a terms of service page"
- "This looks like someone described a good website to an AI and then ignored half the output"
- "The fold called — it wants its content back"
You DO include a real fix with each roast, but frame it dismissively: "Look, it's not hard — just..." or "Even a small change like X would stop this from being embarrassing."
80% savage comedy, 20% grudging advice. Never be encouraging. Never say "great job" or "nice effort." If something is okay, say "I mean, it's not a war crime, but..."`,
};

export function extractHtmlStructure(html: string, maxLen: number): string {
  if (!html) return "(no HTML available)";

  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "<svg/>")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<[^>]+(?:display\s*:\s*none|visibility\s*:\s*hidden|aria-hidden="true")[^>]*>[\s\S]*?<\/[^>]+>/gi, "")
    .replace(/<[^>]+class="[^"]*(?:visually-hidden|sr-only|screen-reader|hidden)[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi, "")
    .replace(/<[^>]+class="[^"]*(?:splash-screen|splash-bg|cookie|consent|gdpr|browser-banner|browser-upgrade|ie-warning|outdated-browser)[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi, "")
    .replace(/\s+data-[a-z-]+="[^"]*"/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/>\s+</g, "><")
    .trim();

  if (cleaned.length > maxLen) {
    cleaned = cleaned.slice(0, maxLen) + "\n... (truncated)";
  }
  return cleaned;
}

const auditSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    summary: { type: SchemaType.STRING, description: "2-3 sentence executive summary" },
    overallScore: { type: SchemaType.NUMBER, description: "Overall score 0-100" },
    script: {
      type: SchemaType.STRING,
      description: "Full voiceover script (90-120 seconds). Uses [CHAPTER:N] markers.",
    },
    chapters: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          startTime: { type: SchemaType.NUMBER, description: "Set to 0 (calculated from markers)" },
          elementIndex: { type: SchemaType.NUMBER, description: "Index from the ELEMENT POSITIONS list — determines scroll position" },
          summary: { type: SchemaType.STRING },
          referenceId: { type: SchemaType.STRING, description: "ID from the REFERENCE LIBRARY that best matches this insight's topic" },
        },
        required: ["title", "startTime", "elementIndex", "summary", "referenceId"],
      },
    },
    hotspots: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          label: { type: SchemaType.STRING },
          elementIndex: { type: SchemaType.NUMBER, description: "Index from the ELEMENT POSITIONS list — determines dot position" },
          score: { type: SchemaType.NUMBER, description: "Element score 0-100" },
          chapter: { type: SchemaType.NUMBER, description: "Index of related chapter" },
        },
        required: ["label", "elementIndex", "score", "chapter"],
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
  },
  required: ["summary", "overallScore", "script", "chapters", "hotspots", "stats"],
};

function computeWordFractions(
  scriptWithMarkers: string,
  chapters: { wordFraction?: number }[],
) {
  const markerPattern = /\[CHAPTER:(\d+)\]\s*/g;
  const markers = [...scriptWithMarkers.matchAll(markerPattern)];
  if (markers.length === 0) return;

  const cleanScript = scriptWithMarkers.replace(/\[CHAPTER:\d+\]\s*/g, "");
  const totalWords = cleanScript.split(/\s+/).filter(Boolean).length;
  if (totalWords === 0) return;

  for (const match of markers) {
    const idx = parseInt(match[1], 10);
    const textBefore = scriptWithMarkers.slice(0, match.index!);
    const cleanBefore = textBefore.replace(/\[CHAPTER:\d+\]\s*/g, "");
    const wordsBefore = cleanBefore.split(/\s+/).filter(Boolean).length;

    const chapter = chapters[idx];
    if (chapter) {
      chapter.wordFraction = wordsBefore / totalWords;
    }
  }

  if (chapters[0]) {
    chapters[0].wordFraction = 0;
  }
}

/** Extract base64 + mimeType directly from a data URL (avoids a redundant HTTP fetch). */
function parseScreenshotData(url: string): { base64: string; mimeType: string } | null {
  if (!url.startsWith("data:")) return null;
  const commaIdx = url.indexOf(",");
  if (commaIdx === -1) return null;
  const header = url.slice(0, commaIdx);
  const mimeType = header.match(/data:(.*?)[;,]/)?.[1] || "image/png";
  const base64 = url.slice(commaIdx + 1);
  return { base64, mimeType };
}

async function fetchScreenshotBase64(screenshotUrl: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const res = await fetch(screenshotUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "image/png";
    const mimeType = contentType.split(";")[0].trim();
    return { base64: buffer.toString("base64"), mimeType };
  } catch (err) {
    console.warn("[gemini] failed to fetch screenshot for vision:", err);
    return null;
  }
}

function formatElementPositions(positions: ElementPosition[]): string {
  return positions
    .map((p, i) => `[${i}] ${p.tag} (x:${p.xPct}, y:${p.yPct}) — "${p.text}"`)
    .join("\n");
}

/**
 * Resolve elementIndex references to real x/y/scrollY from measured positions.
 */
function resolvePositions(
  audit: AuditResult,
  positions: ElementPosition[],
) {
  for (const ch of audit.chapters) {
    if (ch.elementIndex != null && positions[ch.elementIndex]) {
      ch.scrollY = positions[ch.elementIndex].yPct;
    } else {
      ch.scrollY = ch.scrollY ?? 0;
    }
  }

  for (const h of audit.hotspots) {
    if (h.elementIndex != null && positions[h.elementIndex]) {
      h.x = positions[h.elementIndex].xPct;
      h.y = positions[h.elementIndex].yPct;
    } else {
      const ch = audit.chapters[h.chapter];
      h.x = h.x ?? 50;
      h.y = h.y ?? ch?.scrollY ?? 0;
    }
  }
}

export async function analyzeWithGemini(
  markdown: string,
  html: string,
  persona: Persona,
  screenshotUrl?: string | null,
  elementPositions?: ElementPosition[],
): Promise<AuditResult> {
  const model = genAI.getGenerativeModel({
    model: config.model,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: auditSchema,
      // @ts-expect-error — thinkingConfig supported by Gemini 2.5 Flash but not yet in SDK types
      thinkingConfig: { thinkingBudget: 1024 },
    },
    systemInstruction: personaPrompts[persona],
  });

  const hasPositions = !!(elementPositions && elementPositions.length > 0);
  const screenshotData = screenshotUrl
    ? parseScreenshotData(screenshotUrl) ?? await fetchScreenshotBase64(screenshotUrl)
    : null;

  const parts: Part[] = [];

  if (screenshotData) {
    parts.push({
      inlineData: {
        mimeType: screenshotData.mimeType,
        data: screenshotData.base64,
      },
    });
  }

  parts.push({
    text: buildAuditPrompt(markdown, html, screenshotData, elementPositions, hasPositions),
  });

  const result = await model.generateContent(parts);
  const text = result.response.text();

  let audit: AuditResult;
  try {
    audit = JSON.parse(text) as AuditResult;
  } catch {
    throw new Error("AI returned an invalid response — please retry");
  }

  return postProcessAudit(audit, elementPositions, hasPositions);
}

function postProcessAudit(
  audit: AuditResult,
  elementPositions?: ElementPosition[],
  hasPositions?: boolean,
): AuditResult {
  for (const ch of audit.chapters) {
    const raw = ch as Record<string, unknown>;
    const refId = raw.referenceId as string | undefined;
    if (refId) {
      const ref = referenceMap.get(refId);
      if (ref) {
        ch.learnUrl = ref.url;
        ch.learnLabel = ref.label;
      }
      delete raw.referenceId;
    }
  }

  if (hasPositions && elementPositions) {
    resolvePositions(audit, elementPositions);
  }

  for (const ch of audit.chapters) {
    if (ch.scrollY == null) ch.scrollY = 0;
  }

  const originalOrder = audit.chapters.map((ch, i) => ({ ...ch, origIndex: i }));
  originalOrder.sort((a, b) => a.scrollY - b.scrollY);
  const indexMap = new Map<number, number>();
  originalOrder.forEach((ch, newIdx) => indexMap.set(ch.origIndex, newIdx));
  audit.chapters = originalOrder.map(({ origIndex: _o, ...rest }) => rest);

  audit.hotspots = audit.hotspots.map((h) => ({
    ...h,
    chapter: indexMap.get(h.chapter) ?? h.chapter,
  }));
  audit.stats = audit.stats.map((s) => ({
    ...s,
    chapter: indexMap.get(s.chapter) ?? s.chapter,
  }));

  const reordered = [...indexMap.entries()].some(([o, n]) => o !== n);
  if (reordered) {
    console.log("[analyze] Chapter reorder map:", [...indexMap.entries()].map(([o, n]) => `${o}→${n}`).join(", "));
  }

  let remappedScript = audit.script;
  for (const [oldIdx, newIdx] of indexMap.entries()) {
    if (oldIdx !== newIdx) {
      remappedScript = remappedScript.replace(
        new RegExp(`\\[CHAPTER:${oldIdx}\\]`, "g"),
        `[CHAPTER_REMAP:${newIdx}]`
      );
    }
  }
  remappedScript = remappedScript.replace(/\[CHAPTER_REMAP:(\d+)\]/g, "[CHAPTER:$1]");
  audit.script = remappedScript;

  if (audit.chapters.length > 0 && audit.chapters[0].scrollY > 5) {
    console.warn(`[analyze] Clamping chapter 0 scrollY from ${audit.chapters[0].scrollY} to 0`);
    audit.chapters[0].scrollY = 0;
  }
  if (audit.chapters.length > 1 && audit.chapters[1].scrollY > 10) {
    console.warn(`[analyze] Clamping chapter 1 scrollY from ${audit.chapters[1].scrollY} to 5`);
    audit.chapters[1].scrollY = 5;
  }

  console.log("[analyze] chapters:", audit.chapters.map((ch, i) => ({
    i, title: ch.title, scrollY: ch.scrollY,
  })));

  const chapterMarkers = [...audit.script.matchAll(/\[CHAPTER:(\d+)\]/g)];
  console.log("[analyze] script markers:", chapterMarkers.length);

  audit.scriptWithMarkers = audit.script;
  computeWordFractions(audit.script, audit.chapters);
  audit.script = audit.script.replace(/\[CHAPTER:\d+\]\s*/g, "");

  return audit;
}

// ─── Shared prompt builder ───

function buildAuditPrompt(
  markdown: string,
  html: string,
  screenshotData: { base64: string; mimeType: string } | null,
  elementPositions: ElementPosition[] | undefined,
  hasPositions: boolean,
): string {
  const condensedHtml = extractHtmlStructure(html, 12000);

  const positionsBlock = hasPositions
    ? `\n=== ELEMENT POSITIONS (measured from the real rendered page) ===
Each line below is a visible element with its EXACT position as % of the full page.
The coordinates were measured with getBoundingClientRect() in the same browser that took the screenshot — they are PIXEL-PERFECT.

When creating chapters and hotspots, set "elementIndex" to the [N] index of the element you are discussing.
The system will automatically resolve the exact x/y coordinates from this list. Do NOT guess coordinates — just reference the correct element index.

${formatElementPositions(elementPositions!)}\n`
    : "";

  return `Analyze this website and produce a structured audit.
${screenshotData ? "\nA FULL-PAGE SCREENSHOT is attached for visual context.\n" : ""}
=== PAGE CONTENT (Markdown) ===
${markdown.slice(0, 12000)}

=== PAGE HTML STRUCTURE ===
${condensedHtml}
${positionsBlock}
=== REFERENCE LIBRARY ===
Each line below is a verified reference. Use the [id] when setting referenceId for each chapter.
Pick the reference whose topic BEST matches the insight you are giving.

${formatReferencesForPrompt()}

=== INSTRUCTIONS ===

Produce a detailed audit with:
- A summary and overall score (0-100). BE GENUINELY VARIED AND OPINIONATED with scoring:
  * Terrible sites with major issues: 15-35
  * Below-average sites with clear problems: 36-55
  * Decent sites with room for improvement: 56-72
  * Good sites with minor issues: 73-85
  * Excellent, well-crafted sites: 86-95
  Do NOT default to 65-72 — actually evaluate quality and spread scores across the full range. A polished startup site should score higher than a broken local business page.

- A voiceover script (60-90 seconds when read aloud, approximately 400-550 words MAX). Be concise and punchy — cut filler. CRITICAL WRITING RULES:
  * Write 100% in character as the persona. Each persona sounds COMPLETELY different.
  * Quote ACTUAL text from the site.
  * Reference SPECIFIC elements: "that big hero image", "the three cards below", "your footer CTA"
  * Each insight must name the EXACT problem and suggest ONE concrete fix
  * Transitions should feel like scrolling: "Now let me scroll down...", "Moving past the fold...", "Down here at the bottom..."
  * NO generic advice. Everything must be about THIS specific site.
  * NEVER mention element indices, [N] numbers, percentages like "y: 45%", or any technical position data in the script. The script is spoken aloud to real users — describe elements only in natural language (e.g. "the hero headline", "that contact form at the bottom").

CRITICAL MARKERS: You MUST embed [CHAPTER:N] markers in the script. Insert [CHAPTER:0] at the very start.

- 5-7 chapters ordered TOP to BOTTOM. Each must have:
  - title: a short punchy title
  - startTime: set to 0 (calculated from markers)
  - elementIndex: the [N] index from the ELEMENT POSITIONS list above that represents the PRIMARY element this chapter discusses. ${hasPositions ? "Pick the element closest to what you're critiquing — the system resolves exact coordinates from this." : "Set to 0 if no positions available."}
  - summary: 1-2 sentence description of the problem and a concrete suggestion
  - referenceId: Pick the BEST matching ID from the REFERENCE LIBRARY below. Choose the reference whose topic is most relevant to this chapter's insight. You MUST use an exact ID from the list — do NOT invent IDs.

CRITICAL ABOVE-THE-FOLD RULE: Chapter 0 MUST reference an element near the top of the page (y% < 5). Chapter 1 MUST also be above the fold (y% < 10). At least TWO talking points must cover above-the-fold content. Non-negotiable.

CRITICAL ORDERING: Chapters MUST be ordered top-to-bottom by the y% of their referenced elements. The audit flows naturally from top of page downward.

- 5-7 hotspots (at least one per chapter). Each must have:
  - elementIndex: the [N] index from the ELEMENT POSITIONS list of the SPECIFIC element this hotspot targets
  - score: 0-100
  - chapter: index of the related chapter
  - label: short element name (e.g. "Hero CTA", "Navigation Menu")

- 3-5 stat cards with label, value (e.g. "2.3s", "68%"), and linked chapter

RULES:
1. EVERY chapter must have at least one hotspot — no exceptions
2. Use ONLY element indices from the ELEMENT POSITIONS list. Do NOT invent indices.
3. Chapters must be spread across the full page, not clustered at the top
4. ONLY audit what a NORMAL VISITOR sees — ignore hidden elements, cookie banners, splash screens`;
}

// ─── OpenAI GPT-5-mini analysis ───

const openaiAuditSchema = {
  type: "object" as const,
  properties: {
    summary: { type: "string" as const, description: "2-3 sentence executive summary" },
    overallScore: { type: "number" as const, description: "Overall score 0-100" },
    script: { type: "string" as const, description: "Full voiceover script with [CHAPTER:N] markers" },
    chapters: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          title: { type: "string" as const },
          startTime: { type: "number" as const },
          elementIndex: { type: "number" as const },
          summary: { type: "string" as const },
          referenceId: { type: "string" as const },
        },
        required: ["title", "startTime", "elementIndex", "summary", "referenceId"],
        additionalProperties: false,
      },
    },
    hotspots: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          label: { type: "string" as const },
          elementIndex: { type: "number" as const },
          score: { type: "number" as const },
          chapter: { type: "number" as const },
        },
        required: ["label", "elementIndex", "score", "chapter"],
        additionalProperties: false,
      },
    },
    stats: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          label: { type: "string" as const },
          value: { type: "string" as const },
          chapter: { type: "number" as const },
        },
        required: ["label", "value", "chapter"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "overallScore", "script", "chapters", "hotspots", "stats"],
  additionalProperties: false,
};

export async function analyzeWithOpenAI(
  markdown: string,
  html: string,
  persona: Persona,
  screenshotUrl?: string | null,
  elementPositions?: ElementPosition[],
): Promise<AuditResult> {
  const hasPositions = !!(elementPositions && elementPositions.length > 0);
  const screenshotData = screenshotUrl
    ? parseScreenshotData(screenshotUrl) ?? await fetchScreenshotBase64(screenshotUrl)
    : null;

  const userPrompt = buildAuditPrompt(markdown, html, screenshotData, elementPositions, hasPositions);

  type ContentPart = OpenAI.ChatCompletionContentPart;
  const content: ContentPart[] = [];

  if (screenshotData) {
    content.push({
      type: "image_url",
      image_url: {
        url: `data:${screenshotData.mimeType};base64,${screenshotData.base64}`,
        detail: "low",
      },
    });
  }
  content.push({ type: "text", text: userPrompt });

  console.log("[openai] Calling gpt-5-mini...");
  const t0 = Date.now();

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    reasoning_effort: "low",
    messages: [
      { role: "system", content: personaPrompts[persona] },
      { role: "user", content },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "audit_result",
        strict: true,
        schema: openaiAuditSchema,
      },
    },
  });

  const elapsed = Date.now() - t0;
  console.log(`[openai] gpt-5-mini responded in ${(elapsed / 1000).toFixed(1)}s`);

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("GPT-5-mini returned an empty response");

  let audit: AuditResult;
  try {
    audit = JSON.parse(text) as AuditResult;
  } catch {
    throw new Error("GPT-5-mini returned invalid JSON — please retry");
  }

  return postProcessAudit(audit, elementPositions, hasPositions);
}
