import { NextRequest } from "next/server";
import { streamVoice } from "@/lib/elevenlabs";
import type { Persona } from "@/lib/config";

export const maxDuration = 30;

const MAX_TEXT_LENGTH = 10000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, persona } = body as { text: string; persona: Persona };

    if (!text || !persona) {
      return new Response(JSON.stringify({ error: "Missing text or persona" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const trimmedText = text.slice(0, MAX_TEXT_LENGTH);

    console.log(`[voice] Streaming TTS for persona: ${persona} (${trimmedText.length} chars)`);
    const audioStream = await streamVoice(trimmedText, persona);

    return new Response(audioStream, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[voice] Error:", error);
    const message =
      error instanceof Error ? error.message : "Voice generation failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
