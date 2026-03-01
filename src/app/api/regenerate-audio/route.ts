import { NextRequest, NextResponse } from "next/server";
import { splitScriptByChapters, generateBuffer } from "@/lib/elevenlabs";
import { supabaseServer, supabaseEnabled } from "@/lib/supabase";
import { type Persona } from "@/lib/config";

export const maxDuration = 120;

function storagePublicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/audit-assets/${path}`;
}

/**
 * Regenerate TTS audio for specific missing chapters of an existing audit.
 * Accepts { auditId, persona, missingChapters: number[] }.
 * Streams back audio_chapter events (with base64 data) and uploads to Supabase.
 */
export async function POST(req: NextRequest) {
  try {
    const { auditId, persona, missingChapters } = (await req.json()) as {
      auditId: string;
      persona: Persona;
      missingChapters: number[];
    };

    if (!auditId || !persona || !missingChapters?.length) {
      return NextResponse.json(
        { error: "Missing auditId, persona, or missingChapters" },
        { status: 400 },
      );
    }

    if (!supabaseEnabled) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 },
      );
    }

    const { data: audit, error: dbErr } = await supabaseServer
      .from("audits")
      .select("*")
      .eq("id", auditId)
      .single();

    if (dbErr || !audit) {
      console.error(`[regenerate-audio] DB error for auditId=${auditId}:`, dbErr?.message ?? "no data");
      return NextResponse.json(
        { error: `Audit not found: ${dbErr?.message ?? "no data"}` },
        { status: 404 },
      );
    }

    const result = typeof audit.result === "string" ? JSON.parse(audit.result) : audit.result;
    if (!result) {
      console.error(`[regenerate-audio] No result in audit ${auditId}`);
      return NextResponse.json(
        { error: "Audit has no result data" },
        { status: 404 },
      );
    }

    const script = result.scriptWithMarkers || result.script;
    if (!script) {
      return NextResponse.json(
        { error: "No script in audit — cannot regenerate audio" },
        { status: 400 },
      );
    }

    const segments = splitScriptByChapters(script);
    const validMissing = missingChapters.filter(
      (i) => i >= 0 && i < segments.length && segments[i]?.length > 0,
    );

    if (validMissing.length === 0) {
      return NextResponse.json(
        { error: "No valid chapters to regenerate" },
        { status: 400 },
      );
    }

    console.log(
      `[regenerate-audio] Regenerating chapters [${validMissing.join(", ")}] for audit ${auditId} (${persona})`,
    );

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const CONCURRENCY = 3;

        for (let i = 0; i < validMissing.length; i += CONCURRENCY) {
          const batch = validMissing.slice(i, i + CONCURRENCY);
          const results = await Promise.all(
            batch.map(async (chIdx) => {
              const buffer = await generateBuffer(segments[chIdx], persona);
              return { chapter: chIdx, buffer };
            }),
          );

          for (const { chapter, buffer } of results) {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "audio_chapter",
                  chapter,
                  data: buffer.toString("base64"),
                }) + "\n",
              ),
            );

            console.log(
              `[regenerate-audio] ch${chapter} done (${buffer.length} bytes)`,
            );

            const path = `audio/${auditId}/ch${chapter}.mp3`;
            supabaseServer.storage
              .from("audit-assets")
              .upload(path, buffer, {
                contentType: "audio/mpeg",
                upsert: true,
              })
              .then(({ error: upErr }) => {
                if (upErr)
                  console.warn(
                    `[regenerate-audio] upload ch${chapter} error:`,
                    upErr.message,
                  );
                else
                  console.log(`[regenerate-audio] uploaded ch${chapter} to Supabase`);
              });
          }
        }

        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: "audio_done",
              regenerated: validMissing,
            }) + "\n",
          ),
        );
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[regenerate-audio] Error:", error);
    const message =
      error instanceof Error ? error.message : "Regeneration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
