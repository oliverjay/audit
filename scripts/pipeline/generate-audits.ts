/**
 * Batch Audit Generation Script
 *
 * Takes leads from pipeline_leads in "discovered" state, scrapes their websites,
 * runs Gemini analysis (no TTS), and stores shareable audit links.
 *
 * Run: npx tsx scripts/pipeline/generate-audits.ts [--limit=50] [--dry-run]
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { PIPELINE_CONFIG } from "./config";

// Load .env.local
const envPath = join(__dirname, "..", "..", ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface PipelineLead {
  id: number;
  email: string;
  first_name: string | null;
  company_name: string | null;
  website: string | null;
  state: string;
}

async function getLeadsToAudit(limit: number): Promise<PipelineLead[]> {
  const { getSupabaseServer } = await import("../../src/lib/supabase");
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("pipeline_leads")
    .select("id, email, first_name, company_name, website, state")
    .eq("state", "discovered")
    .not("website", "is", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch leads: ${error.message}`);
  return (data ?? []) as PipelineLead[];
}

async function updateLeadState(
  leadId: number,
  state: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  const { getSupabaseServer } = await import("../../src/lib/supabase");
  const supabase = getSupabaseServer();
  if (!supabase) return;

  const { error } = await supabase
    .from("pipeline_leads")
    .update({ state, updated_at: new Date().toISOString(), ...extra })
    .eq("id", leadId);

  if (error) console.warn(`[audit] Failed to update lead ${leadId}:`, error.message);
}

const ALL_PERSONAS = ["ux", "cro", "roast"] as const;
const DEFAULT_PERSONA = "ux"; // Ada — used for the shareable link
const TTS_CONCURRENCY = 3;

async function generateAndUploadAudio(
  auditId: string,
  audit: { script: string; scriptWithMarkers?: string; chapters: unknown[] },
  persona: string,
  splitScriptByChapters: (s: string) => string[],
  generateBuffer: (text: string, p: string) => Promise<Buffer>,
  supabase: ReturnType<typeof import("../../src/lib/supabase").getSupabaseServer>,
): Promise<void> {
  const scriptSource = audit.scriptWithMarkers || audit.script;
  if (!scriptSource || !supabase) return;

  const segments = splitScriptByChapters(scriptSource);
  if (segments.length === 0 || !segments[0]) return;

  console.log(`  [tts] ${auditId} (${persona}): generating ${segments.length} chapters...`);
  const chapterBuffers: Buffer[] = [];

  chapterBuffers[0] = await generateBuffer(segments[0], persona as "ux" | "cro" | "roast");

  const remaining = segments
    .map((text, i) => ({ text, index: i }))
    .slice(1)
    .filter(({ text }) => text.length > 0);

  for (let i = 0; i < remaining.length; i += TTS_CONCURRENCY) {
    const batch = remaining.slice(i, i + TTS_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async ({ text, index }) => ({
        index,
        buffer: await generateBuffer(text, persona as "ux" | "cro" | "roast"),
      })),
    );
    for (const { index, buffer } of results) {
      chapterBuffers[index] = buffer;
    }
  }

  const uploadResults = await Promise.all(
    chapterBuffers.map(async (buf, i) => {
      const path = `audio/${auditId}/ch${i}.mp3`;
      const { error } = await supabase.storage
        .from("audit-assets")
        .upload(path, buf, { contentType: "audio/mpeg", upsert: true });
      if (error) console.warn(`  [tts] ${auditId} ch${i} upload error:`, error.message);
      return !error;
    }),
  );

  if (uploadResults.every(Boolean)) {
    await supabase
      .from("audits")
      .update({ audio_path: `audio/${auditId}`, audio_chapters: chapterBuffers.length })
      .eq("id", auditId);
    console.log(`  [tts] ${auditId} (${persona}): ${chapterBuffers.length} chapters uploaded`);
  }
}

async function generateAuditForLead(
  lead: PipelineLead,
  scrapeUrl: typeof import("../../src/lib/firecrawl").scrapeUrl,
  analyzeWithGemini: typeof import("../../src/lib/gemini").analyzeWithGemini,
  supabase: ReturnType<typeof import("../../src/lib/supabase").getSupabaseServer>,
): Promise<void> {
  if (!lead.website) {
    await updateLeadState(lead.id, "failed", { error: "No website URL" });
    return;
  }

  const url = lead.website;
  let hostname = "";
  try { hostname = new URL(url).hostname; } catch { hostname = url; }
  console.log(`\n  [${lead.id}] ${lead.company_name || lead.email} — ${url}`);

  // Mark as scraping
  await updateLeadState(lead.id, "scraping");

  // 1. Scrape once
  let scrapeData: Awaited<ReturnType<typeof scrapeUrl>>;
  try {
    console.log(`  [${lead.id}] Scraping...`);
    scrapeData = await scrapeUrl(url);
    console.log(`  [${lead.id}] Scraped: ${scrapeData.elementPositions.length} elements, screenshot=${!!scrapeData.screenshot}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  [${lead.id}] Scrape failed: ${msg}`);
    await updateLeadState(lead.id, "failed", { error: `Scrape failed: ${msg}` });
    return;
  }

  await updateLeadState(lead.id, "scraped");
  await sleep(PIPELINE_CONFIG.scrapeDelayMs);

  // 2. Upload screenshot once
  let screenshotPath: string | null = null;
  if (scrapeData.screenshot && supabase) {
    try {
      const screenshotId = crypto.randomUUID();
      let buf: Buffer;
      if (scrapeData.screenshot.startsWith("data:")) {
        const commaIdx = scrapeData.screenshot.indexOf(",");
        buf = Buffer.from(scrapeData.screenshot.slice(commaIdx + 1), "base64");
      } else if (scrapeData.screenshot.startsWith("http")) {
        const resp = await fetch(scrapeData.screenshot);
        buf = Buffer.from(await resp.arrayBuffer());
      } else {
        buf = Buffer.from(scrapeData.screenshot, "base64");
      }
      screenshotPath = `screenshots/${screenshotId}.png`;
      await supabase.storage
        .from("audit-assets")
        .upload(screenshotPath, buf, { contentType: "image/png", upsert: true });
    } catch (screenshotErr) {
      console.warn(`  [${lead.id}] Screenshot upload failed:`, screenshotErr);
    }
  }

  // 3. Analyze with all 3 personas
  await updateLeadState(lead.id, "auditing");

  let defaultAuditId: string | null = null;
  let defaultScore: number | null = null;
  let defaultSummary: string | null = null;
  let defaultTopIssue: string | null = null;

  try {
    for (const persona of ALL_PERSONAS) {
      console.log(`  [${lead.id}] Analyzing with Gemini (${persona})...`);

      const audit = await analyzeWithGemini(
        scrapeData.markdown,
        scrapeData.html,
        persona,
        scrapeData.screenshot,
        scrapeData.elementPositions,
      );
      console.log(`  [${lead.id}] ${persona} done: score=${audit.overallScore}`);

      const auditId = crypto.randomUUID();
      if (supabase) {
        const { error: insertErr } = await supabase.from("audits").insert({
          id: auditId,
          url,
          hostname,
          persona,
          score: audit.overallScore,
          summary: audit.summary,
          result: audit,
          favicon: scrapeData.favicon,
          site_name: scrapeData.siteName,
          screenshot_path: screenshotPath,
        });
        if (insertErr) console.warn(`  [${lead.id}] ${persona} insert error:`, insertErr.message);
      }

      // Generate full TTS audio for every chapter
      try {
        const { splitScriptByChapters, generateBuffer } = await import("../../src/lib/elevenlabs");
        await generateAndUploadAudio(
          auditId,
          audit,
          persona,
          splitScriptByChapters,
          generateBuffer as (text: string, p: string) => Promise<Buffer>,
          supabase,
        );
      } catch (ttsErr) {
        console.warn(`  [${lead.id}] ${persona} TTS failed (non-fatal):`, ttsErr);
      }

      if (persona === DEFAULT_PERSONA) {
        defaultAuditId = auditId;
        defaultScore = audit.overallScore;
        defaultSummary = audit.summary.split(".").slice(0, 2).join(".") + ".";
        defaultTopIssue = audit.hotspots
          .sort((a, b) => a.score - b.score)[0]?.label ?? "multiple areas for improvement";
      }

      await sleep(PIPELINE_CONFIG.analysisDelayMs);
    }

    const auditLink = `${PIPELINE_CONFIG.auditBaseUrl}?url=${encodeURIComponent(url)}&persona=${DEFAULT_PERSONA}&id=${defaultAuditId}`;

    await updateLeadState(lead.id, "audited", {
      audit_id: defaultAuditId,
      audit_score: defaultScore,
      audit_summary: defaultSummary,
      audit_top_issue: defaultTopIssue,
      audit_link: auditLink,
    });

    console.log(`  [${lead.id}] All 3 personas stored. Link: ${auditLink}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  [${lead.id}] Analysis failed: ${msg}`);
    await updateLeadState(lead.id, "failed", { error: `Analysis failed: ${msg}` });
  }
}

async function main() {
  const args = process.argv.slice(2);
  const limitFlag = args.find((a) => a.startsWith("--limit="));
  const dryRun = args.includes("--dry-run");
  const limit = limitFlag ? parseInt(limitFlag.split("=")[1], 10) : PIPELINE_CONFIG.auditsPerRun;

  console.log(`\n=== Batch Audit Generation ===`);
  console.log(`Limit: ${limit}`);
  console.log(`Persona: ${PIPELINE_CONFIG.persona}`);
  console.log(`Dry run: ${dryRun}\n`);

  const leads = await getLeadsToAudit(limit);
  console.log(`Found ${leads.length} leads to audit`);

  if (leads.length === 0) {
    console.log("No leads in 'discovered' state with a website URL.");
    return;
  }

  if (dryRun) {
    console.log("\n--- DRY RUN: Would process these leads ---");
    for (const lead of leads) {
      console.log(`  [${lead.id}] ${lead.company_name || lead.email} — ${lead.website}`);
    }
    return;
  }

  // Dynamic imports after env is loaded
  const { scrapeUrl } = await import("../../src/lib/firecrawl");
  const { analyzeWithGemini } = await import("../../src/lib/gemini");
  const { getSupabaseServer } = await import("../../src/lib/supabase");
  const supabase = getSupabaseServer();

  let success = 0;
  let failed = 0;

  for (const lead of leads) {
    try {
      await generateAuditForLead(lead, scrapeUrl, analyzeWithGemini, supabase);
      success++;
    } catch (err) {
      console.error(`  [${lead.id}] Unexpected error:`, err);
      await updateLeadState(lead.id, "failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      failed++;
    }
  }

  console.log(`\n=== Audit Generation Complete ===`);
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}\n`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
