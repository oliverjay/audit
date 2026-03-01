import { NextRequest, NextResponse } from "next/server";
import { scrapeUrl } from "@/lib/firecrawl";
import { analyzeWithGemini, analyzeWithOpenAI } from "@/lib/gemini";
import { splitScriptByChapters, generateBuffer } from "@/lib/elevenlabs";
import { supabaseServer, supabaseEnabled } from "@/lib/supabase";
import { readScrapeCache, writeScrapeCache, type ScrapePayload } from "@/lib/scrape-cache";
import { config, type Persona } from "@/lib/config";
import type { AuditResult } from "@/lib/config";
import type { ElementPosition } from "@/lib/firecrawl";
export const maxDuration = 120;

/** Insert the audit row immediately (no assets yet) so shared links work right away */
async function insertAuditRow(
  auditId: string,
  url: string,
  persona: Persona,
  audit: AuditResult,
  favicon: string | null,
  siteName: string | null,
) {
  try {
    let hostname = "";
    try { hostname = new URL(url).hostname; } catch { hostname = url; }

    const { error } = await supabaseServer.from("audits").insert({
      id: auditId,
      url,
      hostname,
      persona,
      score: audit.overallScore,
      summary: audit.summary,
      result: audit,
      favicon,
      site_name: siteName,
    });
    if (error) console.error("[supabase] audit insert error:", error.message);
    else console.log(`[supabase] Inserted audit row ${auditId} for ${hostname} (${persona})`);
  } catch (err) {
    console.warn("[supabase] Failed to insert audit row:", err);
  }
}

/** Upload heavy assets (screenshot, per-chapter audio) and update the audit row */
async function uploadAuditAssets(
  auditId: string,
  screenshot: string | null,
  chapterBuffers: Buffer[],
) {
  try {
    let screenshotPath: string | null = null;
    if (screenshot) {
      try {
        let buf: Buffer;
        if (screenshot.startsWith("http://") || screenshot.startsWith("https://")) {
          const resp = await fetch(screenshot);
          if (!resp.ok) throw new Error(`Screenshot fetch failed: ${resp.status}`);
          buf = Buffer.from(await resp.arrayBuffer());
        } else if (screenshot.startsWith("data:")) {
            const commaIdx = screenshot.indexOf(",");
            if (commaIdx === -1) throw new Error("Invalid data URL for screenshot");
            const b64 = screenshot.slice(commaIdx + 1);
            buf = Buffer.from(b64, "base64");
        } else {
          buf = Buffer.from(screenshot, "base64");
        }

        console.log(`[supabase] screenshot buffer size: ${buf.length} bytes`);
        const { error: sErr } = await supabaseServer.storage
          .from("audit-assets")
          .upload(`screenshots/${auditId}.png`, buf, {
            contentType: "image/png",
            upsert: true,
          });
        if (sErr) console.warn("[supabase] screenshot upload error:", sErr.message);
        else screenshotPath = `screenshots/${auditId}.png`;
      } catch (dlErr) {
        console.warn("[supabase] screenshot download/upload failed:", dlErr);
      }
    }

    let audioPath: string | null = null;
    if (chapterBuffers.length > 0) {
      const uploadResults = await Promise.all(
        chapterBuffers.map(async (buf, i) => {
          const path = `audio/${auditId}/ch${i}.mp3`;
          const { error: aErr } = await supabaseServer.storage
            .from("audit-assets")
            .upload(path, buf, {
              contentType: "audio/mpeg",
              upsert: true,
            });
          if (aErr) {
            console.warn(`[supabase] audio ch${i} upload error:`, aErr.message);
            return null;
          }
          return path;
        })
      );
      if (uploadResults.every((r) => r !== null)) {
        audioPath = `audio/${auditId}`;
      }
    }

    const updates: Record<string, string | number> = {};
    if (screenshotPath) updates.screenshot_path = screenshotPath;
    if (audioPath) {
      updates.audio_path = audioPath;
      updates.audio_chapters = chapterBuffers.length;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateErr } = await supabaseServer
        .from("audits")
        .update(updates)
        .eq("id", auditId);
      if (updateErr) console.warn("[supabase] asset path update error:", updateErr.message);
      else console.log(`[supabase] Updated assets for ${auditId} (${chapterBuffers.length} chapters)`);
    }
  } catch (err) {
    console.warn("[supabase] Failed to upload assets:", err);
  }
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function storagePublicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/audit-assets/${path}`;
}

async function findAuditById(id: string) {
  if (!supabaseEnabled) return null;
  try {
    const { data, error } = await supabaseServer
      .from("audits")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    if (!data.result?.chapters?.length || !data.result?.script) return null;
    return data;
  } catch {
    return null;
  }
}

async function findCachedAudit(url: string, persona: Persona) {
  if (!supabaseEnabled) return null;
  try {
    const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();
    const { data, error } = await supabaseServer
      .from("audits")
      .select("*")
      .eq("url", url)
      .eq("persona", persona)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (error || !data) return null;
    if (!data.result?.chapters?.length || !data.result?.script) return null;
    return data;
  } catch {
    return null;
  }
}



/**
 * If the audit row has no screenshot_path yet (uploadAuditAssets hasn't finished),
 * fall back to the screenshot stored in the URL-keyed scrape cache.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function screenshotFallback(audit: any, url: string): Promise<string | null> {
  if (audit.screenshot_path) return null;
  const scrape = await readScrapeCache(url);
  return scrape?.screenshot ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serveCachedAudit(cached: any, scrapeScreenshotFallback: string | null = null) {
  const encoder = new TextEncoder();
  const cachedStream = new ReadableStream({
    async start(controller) {
      const screenshotUrl = cached.screenshot_path
        ? storagePublicUrl(cached.screenshot_path)
        : scrapeScreenshotFallback;
      controller.enqueue(encoder.encode(
        JSON.stringify({
          type: "scrape",
          favicon: cached.favicon,
          ogImage: null,
          siteName: cached.site_name,
          screenshot: screenshotUrl,
        }) + "\n"
      ));

      controller.enqueue(encoder.encode(
        JSON.stringify({ type: "audit", audit: cached.result, auditId: cached.id }) + "\n"
      ));

      // Per-chapter audio URLs.
      // Use the DB's audio_chapters if set. Otherwise, if the audit result
      // has chapters, the audio files should exist at the conventional path
      // (audio/{id}/ch{n}.mp3) — serve those URLs and let the client handle
      // any that haven't finished uploading yet.
      const chapterCount = cached.audio_chapters
        || cached.result?.chapters?.length
        || 0;
      const audioDir = cached.audio_path || `audio/${cached.id}`;

      if (chapterCount > 0) {
        for (let i = 0; i < chapterCount; i++) {
          const chUrl = storagePublicUrl(`${audioDir}/ch${i}.mp3`);
          controller.enqueue(encoder.encode(
            JSON.stringify({ type: "audio_chapter", chapter: i, url: chUrl }) + "\n"
          ));
        }
        controller.enqueue(encoder.encode(
          JSON.stringify({ type: "audio_done", totalChapters: chapterCount }) + "\n"
        ));
      } else if (cached.audio_path) {
        const audioUrl = storagePublicUrl(cached.audio_path);
        controller.enqueue(encoder.encode(
          JSON.stringify({ type: "audio_url", url: audioUrl }) + "\n"
        ));
      }

      controller.close();
    },
  });

  return new Response(cachedStream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, persona, scrapeData, force, auditId: requestedAuditId } = body as {
      url: string;
      persona: Persona;
      force?: boolean;
      auditId?: string;
      scrapeData?: {
        markdown: string;
        html: string;
        favicon: string | null;
        ogImage: string | null;
        siteName: string | null;
        screenshot: string | null;
        elementPositions?: ElementPosition[];
      };
    };

    if (!url || !persona) {
      return NextResponse.json(
        { error: "Missing url or persona" },
        { status: 400 }
      );
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL — please enter a valid web address" },
        { status: 400 }
      );
    }

    const validPersonas: Persona[] = ["ux", "cro", "roast"];
    if (!validPersonas.includes(persona)) {
      return NextResponse.json(
        { error: "Invalid persona" },
        { status: 400 }
      );
    }

    // ─── Serve exact audit by ID (shared links — no TTL) ───
    if (requestedAuditId && !force) {
      const exact = await findAuditById(requestedAuditId);
      if (exact) {
        console.log(`[analyze] Serving shared audit ${requestedAuditId}`);
        return serveCachedAudit(exact, await screenshotFallback(exact, url));
      }
      console.log(`[analyze] Shared audit ${requestedAuditId} not found in DB, falling through`);
    }

    // ─── Serve from Supabase cache if a recent audit exists (1hr TTL) ───
    if (!force) {
      const cached = await findCachedAudit(url, persona);
      if (cached) {
        console.log(`[analyze] Cache hit for ${url} (${persona}), age ${Math.round((Date.now() - new Date(cached.created_at).getTime()) / 1000)}s`);
        return serveCachedAudit(cached, await screenshotFallback(cached, url));
      }
    }

    // ─── Fresh analysis pipeline ───
    // Resolve scrape data: client pre-scrape → server-side scrape cache → Firecrawl
    let scrape: ScrapePayload | null = null;
    let scrapeSource: "client" | "cache" | "firecrawl" = "firecrawl";

    if (scrapeData?.markdown && scrapeData?.html) {
      scrape = {
        url,
        ts: Date.now(),
        markdown: scrapeData.markdown,
        html: scrapeData.html,
        favicon: scrapeData.favicon ?? null,
        ogImage: scrapeData.ogImage ?? null,
        siteName: scrapeData.siteName ?? null,
        screenshot: scrapeData.screenshot ?? null,
        elementPositions: scrapeData.elementPositions ?? [],
      };
      scrapeSource = "client";
      console.log(`[analyze] Using client pre-scraped data for ${url}`);
    } else if (!force) {
      const cached = await readScrapeCache(url);
      if (cached) {
        scrape = cached;
        scrapeSource = "cache";
        console.log(`[analyze] Scrape cache hit for ${url} (age ${Math.round((Date.now() - cached.ts) / 1000)}s)`);
      }
    }

    const newAuditId = crypto.randomUUID();

    let completedAudit: AuditResult | null = null;
    let completedScreenshot: string | null = null;
    const chapterAudioBuffers: Buffer[] = [];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // ── Scrape phase ──
        if (!scrape) {
          try {
            console.log(`[analyze] Scraping ${url} via Firecrawl...`);
            const raw = await scrapeUrl(url);
            scrape = { url, ts: Date.now(), ...raw };
            scrapeSource = "firecrawl";
          } catch (scrapeErr) {
            console.error("[analyze] Scrape failed:", scrapeErr);
            controller.enqueue(encoder.encode(
              JSON.stringify({ type: "error", error: "Failed to load the site — it may be unreachable or blocking scrapers" }) + "\n"
            ));
            controller.close();
            return;
          }
        }

        const { markdown, html, favicon, ogImage, siteName, screenshot, elementPositions } = scrape;

        controller.enqueue(encoder.encode(
          JSON.stringify({ type: "scrape", favicon, ogImage, siteName, screenshot }) + "\n"
        ));

        // Populate the scrape cache in the background so subsequent
        // persona switches for this URL skip Firecrawl entirely.
        if (scrapeSource !== "cache") {
          writeScrapeCache(scrape).catch(() => {});
        }

        console.log(`[analyze] Element positions available: ${elementPositions.length}`);

        let audit;
        try {
          const useOpenAI = config.model.startsWith("gpt-");
          console.log(`[analyze] Analyzing with ${useOpenAI ? config.model : "Gemini"} (${persona})...`);
          audit = useOpenAI
            ? await analyzeWithOpenAI(markdown, html, persona, screenshot, elementPositions)
            : await analyzeWithGemini(markdown, html, persona, screenshot, elementPositions);

          // Fire TTS for chapter 0 immediately — runs in parallel with
          // audit event serialisation, Supabase insert, and network flush.
          const scriptSource = audit.scriptWithMarkers || audit.script;
          const ch0Segments = scriptSource ? splitScriptByChapters(scriptSource) : [];
          console.log(`[analyze] Script segments: ${ch0Segments.length} chapters, lengths: [${ch0Segments.map(s => s.length).join(", ")}]`);
          const ch0Promise = ch0Segments[0]
            ? generateBuffer(ch0Segments[0], persona)
            : null;

          controller.enqueue(encoder.encode(
            JSON.stringify({ type: "audit", audit, auditId: newAuditId }) + "\n"
          ));
          completedAudit = audit;
          completedScreenshot = screenshot;

          if (supabaseEnabled) {
            insertAuditRow(newAuditId, url, persona, audit, favicon, siteName).catch(() => {});
          }

          // Await ch0, then generate remaining chapters
          if (scriptSource && ch0Segments.length > 0) {
            try {
              console.log(`[analyze] Generating per-chapter TTS for ${persona}...`);
              let chapterCount = 0;

              if (ch0Promise) {
                const buf0 = await ch0Promise;
                chapterAudioBuffers[0] = buf0;
                controller.enqueue(encoder.encode(
                  JSON.stringify({ type: "audio_chapter", chapter: 0, data: buf0.toString("base64") }) + "\n"
                ));
                chapterCount++;
                console.log(`[analyze] TTS chapter 0 complete (${buf0.length} bytes)`);
              }

              // Remaining chapters via the generator (skipping ch0)
              const remaining = ch0Segments.slice(1)
                .map((text, i) => ({ text, chapter: i + 1 }))
                .filter(({ text }) => text.length > 0);
              const CONCURRENCY = 3;
              for (let i = 0; i < remaining.length; i += CONCURRENCY) {
                const batch = remaining.slice(i, i + CONCURRENCY);
                const results = await Promise.all(
                  batch.map(async ({ text, chapter }) => ({
                    chapter,
                    buffer: await generateBuffer(text, persona),
                  }))
                );
                for (const { chapter, buffer } of results) {
                  chapterAudioBuffers[chapter] = buffer;
                  controller.enqueue(encoder.encode(
                    JSON.stringify({ type: "audio_chapter", chapter, data: buffer.toString("base64") }) + "\n"
                  ));
                  chapterCount++;
                  console.log(`[analyze] TTS chapter ${chapter} complete (${buffer.length} bytes)`);
                }
              }

              console.log(`[analyze] All ${chapterCount} chapter audios generated`);
              controller.enqueue(encoder.encode(
                JSON.stringify({ type: "audio_done", totalChapters: chapterCount }) + "\n"
              ));
            } catch (ttsErr) {
              console.warn("[analyze] TTS failed, client will retry:", ttsErr);
            }
          }
        } catch (aiErr) {
          console.error("[analyze] AI analysis failed:", aiErr);
          controller.enqueue(encoder.encode(
            JSON.stringify({ type: "error", error: "AI analysis failed — please try again" }) + "\n"
          ));
          controller.close();
          return;
        }

        // Upload assets to Supabase before closing so shared links
        // always have screenshot + audio available immediately.
        if (supabaseEnabled && completedAudit) {
          try {
            await uploadAuditAssets(newAuditId, completedScreenshot, chapterAudioBuffers);
          } catch (uploadErr) {
            console.warn("[analyze] Asset upload failed:", uploadErr);
          }
        }

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
    console.error("[analyze] Error:", error);
    const message =
      error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
