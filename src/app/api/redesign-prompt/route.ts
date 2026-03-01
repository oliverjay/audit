import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AuditResult, Persona } from "@/lib/config";

// In-memory cache: survives across requests within the same server process.
// Key: hostname__persona__overallScore  →  generated prompt string
const promptCache = new Map<string, string>();

const personaFocus: Record<Persona, string> = {
  ux: "usability, visual hierarchy, accessibility, and frictionless flow",
  cro: "CTA prominence, trust signals, value proposition clarity, and conversion psychology",
  roast: "ruthless quality — every weak element gets a confident, opinionated fix",
};

export async function POST(req: NextRequest) {
  let body: { audit: AuditResult; persona: Persona; hostname: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { audit, persona, hostname } = body;
  if (!audit?.chapters?.length || !persona || !hostname) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const cacheKey = `${hostname}__${persona}__${audit.overallScore}`;
  const cached = promptCache.get(cacheKey);
  if (cached) {
    console.log("[redesign-prompt] Cache hit for", cacheKey);
    return NextResponse.json({ prompt: cached, source: "ai" });
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI API key not configured" }, { status: 500 });
  }

  const systemPrompt = `You translate UX/CRO audit findings into precise visual editing instructions for an AI image model (like Nano Banana or GPT-4o).

You are given Ada's full voiceover script — Ada is a senior UX/CRO analyst whose specific recommendations are authoritative. Your job is to faithfully preserve her exact insights and suggestions while stripping the reasoning, statistics, and explanation. You are a translator, not a summarizer.

Rules:
- Ada's voiceover is your SOURCE OF TRUTH. Where Ada suggests specific copy, extract it verbatim — do not paraphrase or shorten it.
- Where Ada describes a specific visual treatment (e.g. "solid button vs ghost button"), describe it precisely for an image artist.
- Where Ada implies a fix without specifying exact copy, infer the best specific outcome given what you know about the site, its audience, and its purpose — commit to a specific answer, never be vague.
- Strip ALL reasoning, statistics, percentages, and UX jargon. No "cognitive load", "affordance", "conversion lift". Only what to draw.
- Use the hotspot coordinates to anchor each change spatially: "the element at x:44%, y:7%".

Output format — write the final prompt directly, ready to paste. No preamble, no explanation:
Open with: "Redesign the attached screenshot. Apply all changes simultaneously:"
Then number each change. Each one: identify the element by label and coordinates, then state the exact visual change with any verbatim copy.
Close with: "Preserve: hex colors, logo, fonts, photos, section order. Output same dimensions as input."`;

  const hotspotList = audit.hotspots
    .map((h) => `  • "${h.label}" at x:${Math.round(h.x)}%, y:${Math.round(h.y)}% — score ${h.score}/100`)
    .join("\n");

  const chapterList = audit.chapters
    .map((ch, i) => `  ${i + 1}. ${ch.title} (scrollY: ${Math.round(ch.scrollY)}%) — ${ch.summary}`)
    .join("\n");

  const userMessage = `Site: ${hostname}
Design lens: ${personaFocus[persona]}
Overall score: ${audit.overallScore}/100

---
ADA'S FULL VOICEOVER (her specific copy suggestions and visual fix recommendations are verbatim — use them exactly):
${audit.scriptWithMarkers ?? audit.script ?? "(not available)"}

---
VISUAL HOTSPOTS — use these coordinates to anchor each change:
${hotspotList}

---
CHAPTER TITLES (for ordering reference):
${chapterList}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent(userMessage);
    const prompt = result.response.text().trim();

    promptCache.set(cacheKey, prompt);
    console.log("[redesign-prompt] Generated and cached for", cacheKey, "\n", prompt);
    return NextResponse.json({ prompt, source: "ai" });
  } catch (err) {
    console.error("[redesign-prompt] AI generation failed:", err);
    return NextResponse.json(
      { error: "Failed to generate prompt", detail: String(err) },
      { status: 500 },
    );
  }
}
