import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer, supabaseEnabled } from "@/lib/supabase";

async function checkAuth(): Promise<boolean> {
  try {
    const pw = process.env.PIPELINE_PASSWORD;
    if (!pw) return false;
    const jar = await cookies();
    const token = jar.get("pipeline_token")?.value;
    if (!token) return false;
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    return decoded.split(":")[1] === pw;
  } catch {
    return false;
  }
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// GET /api/pipeline?action=stats|leads|lead
export async function GET(req: NextRequest) {
  if (!(await checkAuth())) return unauthorized();
  if (!supabaseEnabled) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const action = req.nextUrl.searchParams.get("action") ?? "stats";

  if (action === "stats") {
    return getStats();
  }
  if (action === "leads") {
    return getLeads(req);
  }
  if (action === "lead") {
    return getLeadDetail(req);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

async function getStats() {
  const states = [
    "discovered", "scraping", "scraped", "auditing",
    "audited", "emailed", "replied", "bounced", "failed",
  ];

  const counts: Record<string, number> = {};
  let total = 0;

  for (const state of states) {
    const { count } = await supabaseServer
      .from("pipeline_leads")
      .select("id", { count: "exact", head: true })
      .eq("state", state);
    const n = count ?? 0;
    counts[state] = n;
    total += n;
  }

  // Recent activity
  const { data: recent } = await supabaseServer
    .from("pipeline_leads")
    .select("id, email, company_name, website, state, audit_score, updated_at")
    .order("updated_at", { ascending: false })
    .limit(10);

  // Campaign stats from pipeline_leads
  const { data: campaigns } = await supabaseServer
    .from("pipeline_leads")
    .select("instantly_campaign_id")
    .not("instantly_campaign_id", "is", null)
    .limit(1000);

  const uniqueCampaigns = new Set(
    (campaigns ?? []).map((c: { instantly_campaign_id: string }) => c.instantly_campaign_id),
  );

  return NextResponse.json({
    counts,
    total,
    activeCampaigns: uniqueCampaigns.size,
    recentActivity: recent ?? [],
  });
}

async function getLeads(req: NextRequest) {
  const state = req.nextUrl.searchParams.get("state");
  const country = req.nextUrl.searchParams.get("country");
  const search = req.nextUrl.searchParams.get("search");
  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10);
  const offset = (page - 1) * limit;

  let query = supabaseServer
    .from("pipeline_leads")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (state && state !== "all") {
    query = query.eq("state", state);
  }
  if (country && country !== "all") {
    query = query.eq("country", country);
  }
  if (search) {
    query = query.or(
      `email.ilike.%${search}%,company_name.ilike.%${search}%,website.ilike.%${search}%`,
    );
  }

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    leads: data ?? [],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  });
}

async function getLeadDetail(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { data, error } = await supabaseServer
    .from("pipeline_leads")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // If there's an audit, fetch it too
  let audit = null;
  if (data.audit_id) {
    const { data: auditData } = await supabaseServer
      .from("audits")
      .select("id, url, hostname, persona, score, summary, created_at, screenshot_path")
      .eq("id", data.audit_id)
      .single();
    audit = auditData;
  }

  return NextResponse.json({ lead: data, audit });
}

// POST /api/pipeline — run pipeline actions
export async function POST(req: NextRequest) {
  if (!(await checkAuth())) return unauthorized();
  if (!supabaseEnabled) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { action, ...params } = await req.json();

  if (action === "retry-failed") {
    return retryFailed();
  }
  if (action === "delete-lead") {
    return deleteLead(params.id);
  }
  if (action === "reset-lead") {
    return resetLead(params.id);
  }
  if (action === "import-csv") {
    return importCsv(params.leads);
  }
  if (action === "run-audits") {
    return runAudits(params.limit, params.country);
  }
  if (action === "backfill-websites") {
    return backfillWebsites();
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

async function retryFailed() {
  const { data, error } = await supabaseServer
    .from("pipeline_leads")
    .update({
      state: "discovered",
      error: null,
      audit_id: null,
      audit_score: null,
      audit_summary: null,
      audit_top_issue: null,
      audit_link: null,
      updated_at: new Date().toISOString(),
    })
    .eq("state", "failed")
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reset: data?.length ?? 0 });
}

async function deleteLead(id: number) {
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabaseServer
    .from("pipeline_leads")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

async function resetLead(id: number) {
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabaseServer
    .from("pipeline_leads")
    .update({
      state: "discovered",
      error: null,
      audit_id: null,
      audit_score: null,
      audit_summary: null,
      audit_top_issue: null,
      audit_link: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

async function importCsv(
  leads: { email: string; first_name?: string; last_name?: string; company_name?: string; website?: string }[],
) {
  if (!leads?.length) {
    return NextResponse.json({ error: "No leads provided" }, { status: 400 });
  }

  const rows = leads.map((l) => ({
    email: l.email,
    first_name: l.first_name || null,
    last_name: l.last_name || null,
    company_name: l.company_name || null,
    website: l.website && !l.website.startsWith("http") ? `https://${l.website}` : l.website || null,
    source: "csv_import",
    state: "discovered",
  }));

  const { data, error } = await supabaseServer
    .from("pipeline_leads")
    .upsert(rows, { onConflict: "email", ignoreDuplicates: true })
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ imported: data?.length ?? 0, total: leads.length });
}

async function backfillWebsites() {
  const { data: leads, error } = await supabaseServer
    .from("pipeline_leads")
    .select("id, email, website")
    .is("website", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!leads?.length) return NextResponse.json({ updated: 0, message: "All leads already have websites" });

  let updated = 0;
  for (const lead of leads) {
    const domain = lead.email.split("@")[1];
    if (domain && !domain.match(/gmail|yahoo|hotmail|outlook|aol|icloud/i)) {
      const { error: updateErr } = await supabaseServer
        .from("pipeline_leads")
        .update({ website: `https://${domain}`, updated_at: new Date().toISOString() })
        .eq("id", lead.id);
      if (!updateErr) updated++;
    }
  }

  return NextResponse.json({ updated, total: leads.length, message: `Backfilled ${updated} leads with website from email domain` });
}

async function runAudits(limit?: number, country?: string) {
  const max = limit ?? 10;

  let query = supabaseServer
    .from("pipeline_leads")
    .select("id, email, first_name, company_name, website, state, country")
    .eq("state", "discovered")
    .not("website", "is", null)
    .order("created_at", { ascending: true })
    .limit(max);

  if (country && country !== "all") {
    query = query.eq("country", country);
  }

  const { data: leads, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!leads?.length) {
    return NextResponse.json({ queued: 0, message: "No discovered leads with websites to audit" });
  }

  // Mark them as scraping so the UI updates immediately
  const ids = leads.map((l: { id: number }) => l.id);
  await supabaseServer
    .from("pipeline_leads")
    .update({ state: "scraping", updated_at: new Date().toISOString() })
    .in("id", ids);

  // Kick off audits in the background (non-blocking)
  // We import and run the audit logic inline for each lead
  processAuditsInBackground(leads as Array<{
    id: number;
    email: string;
    first_name: string | null;
    company_name: string | null;
    website: string | null;
  }>);

  return NextResponse.json({
    queued: leads.length,
    message: `${leads.length} leads queued for audit. Check the Leads tab for progress.`,
  });
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
): Promise<void> {
  const scriptSource = audit.scriptWithMarkers || audit.script;
  if (!scriptSource) return;

  const segments = splitScriptByChapters(scriptSource);
  if (segments.length === 0 || !segments[0]) return;

  console.log(`[tts] ${auditId} (${persona}): generating ${segments.length} chapters...`);
  const chapterBuffers: Buffer[] = [];

  // Chapter 0 first
  chapterBuffers[0] = await generateBuffer(segments[0], persona as "ux" | "cro" | "roast");

  // Remaining chapters in parallel batches
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

  // Upload all chapter MP3s
  const uploadResults = await Promise.all(
    chapterBuffers.map(async (buf, i) => {
      const path = `audio/${auditId}/ch${i}.mp3`;
      const { error } = await supabaseServer.storage
        .from("audit-assets")
        .upload(path, buf, { contentType: "audio/mpeg", upsert: true });
      if (error) console.warn(`[tts] ${auditId} ch${i} upload error:`, error.message);
      return !error;
    }),
  );

  if (uploadResults.every(Boolean)) {
    await supabaseServer
      .from("audits")
      .update({ audio_path: `audio/${auditId}`, audio_chapters: chapterBuffers.length })
      .eq("id", auditId);
    console.log(`[tts] ${auditId} (${persona}): ${chapterBuffers.length} chapters uploaded`);
  }
}

async function processAuditsInBackground(
  leads: Array<{
    id: number;
    email: string;
    first_name: string | null;
    company_name: string | null;
    website: string | null;
  }>,
) {
  try {
    const { scrapeUrl } = await import("@/lib/firecrawl");
    const { analyzeWithGemini } = await import("@/lib/gemini");
    const { splitScriptByChapters, generateBuffer } = await import("@/lib/elevenlabs");

    const SCRAPE_DELAY = 3000;
    const ANALYSIS_DELAY = 1500;
    const AUDIT_BASE_URL = "https://retake.site/audit";

    for (const lead of leads) {
      if (!lead.website) continue;
      const url = lead.website;
      let hostname = "";
      try { hostname = new URL(url).hostname; } catch { hostname = url; }

      try {
        // 1. Scrape once
        const scrapeData = await scrapeUrl(url);

        await supabaseServer
          .from("pipeline_leads")
          .update({ state: "scraped", updated_at: new Date().toISOString() })
          .eq("id", lead.id);

        await new Promise((r) => setTimeout(r, SCRAPE_DELAY));

        // 2. Upload screenshot once
        let screenshotPath: string | null = null;
        if (scrapeData.screenshot) {
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
            await supabaseServer.storage
              .from("audit-assets")
              .upload(screenshotPath, buf, { contentType: "image/png", upsert: true });
          } catch { /* non-critical */ }
        }

        // 3. Run Gemini + TTS for all 3 personas
        await supabaseServer
          .from("pipeline_leads")
          .update({ state: "auditing", updated_at: new Date().toISOString() })
          .eq("id", lead.id);

        let defaultAuditId: string | null = null;
        let defaultScore: number | null = null;
        let defaultSummary: string | null = null;
        let defaultTopIssue: string | null = null;

        for (const persona of ALL_PERSONAS) {
          console.log(`[audit] ${lead.id} — ${hostname} — ${persona}: analyzing...`);

          const audit = await analyzeWithGemini(
            scrapeData.markdown,
            scrapeData.html,
            persona,
            scrapeData.screenshot,
            scrapeData.elementPositions,
          );

          const auditId = crypto.randomUUID();
          await supabaseServer.from("audits").insert({
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

          // Generate full TTS audio for every chapter
          try {
            await generateAndUploadAudio(
              auditId,
              audit,
              persona,
              splitScriptByChapters,
              generateBuffer as (text: string, p: string) => Promise<Buffer>,
            );
          } catch (ttsErr) {
            console.warn(`[audit] ${lead.id} — ${persona} TTS failed (non-fatal):`, ttsErr);
          }

          if (persona === DEFAULT_PERSONA) {
            defaultAuditId = auditId;
            defaultScore = audit.overallScore;
            defaultSummary = audit.summary.split(".").slice(0, 2).join(".") + ".";
            defaultTopIssue = audit.hotspots
              .sort((a, b) => a.score - b.score)[0]?.label ?? "multiple areas for improvement";
          }

          console.log(`[audit] ${lead.id} — ${persona} done (score: ${audit.overallScore})`);
          await new Promise((r) => setTimeout(r, ANALYSIS_DELAY));
        }

        // 4. Build link with url + persona + id
        const auditLink = `${AUDIT_BASE_URL}?url=${encodeURIComponent(url)}&persona=${DEFAULT_PERSONA}&id=${defaultAuditId}`;

        await supabaseServer
          .from("pipeline_leads")
          .update({
            state: "audited",
            audit_id: defaultAuditId,
            audit_score: defaultScore,
            audit_summary: defaultSummary,
            audit_top_issue: defaultTopIssue,
            audit_link: auditLink,
            updated_at: new Date().toISOString(),
          })
          .eq("id", lead.id);

        console.log(`[audit] ${lead.id} — all 3 personas + audio done, link: ${auditLink}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[audit] ${lead.id} failed:`, msg);
        await supabaseServer
          .from("pipeline_leads")
          .update({
            state: "failed",
            error: msg.slice(0, 500),
            updated_at: new Date().toISOString(),
          })
          .eq("id", lead.id);
      }
    }
  } catch (err) {
    console.error("[background-audits] Fatal:", err);
  }
}
