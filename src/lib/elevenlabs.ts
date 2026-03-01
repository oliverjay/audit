import OpenAI from "openai";
import { config, type Persona } from "./config";

const openai = new OpenAI({ apiKey: config.env.openai });

const INWORLD_API_URL = "https://api.inworld.ai/tts/v1/voice";
const INWORLD_MODEL = "inworld-tts-1.5-max";

const inworldEnabled = !!config.env.inworld;

/**
 * Split a script containing [CHAPTER:N] markers into per-chapter text segments.
 * Returns an array where index i contains the text for chapter i.
 * Handles non-sequential markers (e.g. after chapter reordering by scrollY).
 */
export function splitScriptByChapters(scriptWithMarkers: string): string[] {
  const markerPattern = /\[CHAPTER:(\d+)\]\s*/g;
  const markers: { index: number; chapter: number; end: number }[] = [];

  let match;
  while ((match = markerPattern.exec(scriptWithMarkers)) !== null) {
    markers.push({
      index: match.index,
      chapter: parseInt(match[1], 10),
      end: match.index + match[0].length,
    });
  }

  if (markers.length === 0) {
    const trimmed = scriptWithMarkers.trim();
    return trimmed ? [trimmed] : [];
  }

  const maxChapter = Math.max(...markers.map((m) => m.chapter));
  const segments: string[] = new Array(maxChapter + 1).fill("");

  // Capture any spoken text before the first marker (e.g. intro preamble)
  const preamble = scriptWithMarkers.slice(0, markers[0].index).trim();

  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].end;
    const end = i + 1 < markers.length ? markers[i + 1].index : scriptWithMarkers.length;
    const text = scriptWithMarkers.slice(start, end).trim();
    segments[markers[i].chapter] = text;
  }

  // Prepend preamble to segment 0 (always the first chapter played),
  // NOT to markers[0].chapter which may differ after reordering remaps markers.
  if (preamble) {
    segments[0] = segments[0]
      ? `${preamble} ${segments[0]}`
      : preamble;
  }

  console.log("[splitScript] markers:", markers.map(m => `[CHAPTER:${m.chapter}] @${m.index}`).join(", "));
  console.log("[splitScript] segment lengths:", segments.map((s, i) => `ch${i}:${s.length}`).join(", "));
  if (preamble) console.log("[splitScript] preamble prepended to segment 0:", preamble.slice(0, 60));

  return segments;
}

// ─── Inworld TTS (primary) ───────────────────────────────────────────────

async function inworldGenerate(text: string, persona: Persona): Promise<Buffer> {
  const voiceId = config.inworldVoices[persona];

  const res = await fetch(INWORLD_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${config.env.inworld}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      voiceId,
      modelId: INWORLD_MODEL,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Inworld TTS ${res.status}: ${body}`);
  }

  const json = await res.json();
  if (!json.audioContent) throw new Error("Inworld TTS: missing audioContent in response");
  return Buffer.from(json.audioContent, "base64");
}

// ─── OpenAI TTS (fallback) ───────────────────────────────────────────────

async function openaiGenerate(text: string, persona: Persona): Promise<Buffer> {
  const voice = config.voices[persona];
  const instructions = config.voiceInstructions[persona];

  const response = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice,
    input: text,
    instructions,
    response_format: "mp3",
  });

  return Buffer.from(await response.arrayBuffer());
}

// ─── Unified generate with fallback ──────────────────────────────────────

export async function generateBuffer(text: string, persona: Persona): Promise<Buffer> {
  if (inworldEnabled) {
    try {
      return await inworldGenerate(text, persona);
    } catch (err) {
      console.warn("[tts] Inworld failed, falling back to OpenAI:", err);
    }
  }
  return openaiGenerate(text, persona);
}

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Stream voice audio (OpenAI only — used by the /api/voice fallback endpoint).
 * Inworld doesn't have a chunked streaming endpoint that returns raw audio
 * bytes in the same way, so this remains OpenAI-powered.
 */
export async function streamVoice(
  text: string,
  persona: Persona
): Promise<ReadableStream<Uint8Array>> {
  // Try Inworld first — wrap the buffer in a ReadableStream
  if (inworldEnabled) {
    try {
      const buf = await inworldGenerate(text, persona);
      return new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(buf));
          controller.close();
        },
      });
    } catch (err) {
      console.warn("[tts] Inworld stream fallback to OpenAI:", err);
    }
  }

  const voice = config.voices[persona];
  const instructions = config.voiceInstructions[persona];
  const response = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice,
    input: text,
    instructions,
    response_format: "mp3",
  });
  return response.body as unknown as ReadableStream<Uint8Array>;
}

export async function generateVoiceBuffer(
  text: string,
  persona: Persona
): Promise<Buffer> {
  return generateBuffer(text, persona);
}

/**
 * Generate TTS audio for each chapter segment independently.
 * Yields chapter 0 first (for fast first-step playback), then generates
 * remaining chapters in parallel batches of CONCURRENCY.
 *
 * Uses Inworld TTS-1.5 Max as primary, OpenAI gpt-4o-mini-tts as fallback.
 */
const CONCURRENCY = 3;

export async function* generateChapterAudios(
  scriptWithMarkers: string,
  persona: Persona,
): AsyncGenerator<{ chapter: number; buffer: Buffer }> {
  const segments = splitScriptByChapters(scriptWithMarkers);
  if (segments.length === 0 || !segments[0]) return;

  const provider = inworldEnabled ? "Inworld" : "OpenAI";
  console.log(`[tts] Generating ${segments.length} chapters via ${provider} (fallback: OpenAI)`);

  // Yield chapter 0 first for immediate playback
  const buf0 = await generateBuffer(segments[0], persona);
  yield { chapter: 0, buffer: buf0 };

  // Generate remaining chapters in parallel batches
  const remaining = segments
    .map((text, i) => ({ text, index: i }))
    .slice(1)
    .filter(({ text }) => text.length > 0);

  for (let i = 0; i < remaining.length; i += CONCURRENCY) {
    const batch = remaining.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async ({ text, index }) => ({
        chapter: index,
        buffer: await generateBuffer(text, persona),
      }))
    );
    for (const result of results) {
      yield result;
    }
  }
}
