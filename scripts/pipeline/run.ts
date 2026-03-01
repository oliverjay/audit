/**
 * Pipeline Orchestrator
 *
 * Runs the full outreach pipeline: discover → audit → send.
 * Can be run as a daily/weekly cron or manually.
 *
 * Run: npx tsx scripts/pipeline/run.ts [options]
 *
 * Options:
 *   --discover-only      Only run lead discovery
 *   --audit-only         Only run audit generation
 *   --send-only          Only run campaign sending
 *   --dry-run            Print what would happen without making changes
 *   --limit=N            Max leads per step (default: 50)
 *   --source=instantly   Lead source (instantly | csv:path)
 *   --campaign-name=...  Name for the Instantly campaign
 *   --activate           Auto-activate the campaign after creation
 *   --status             Show pipeline status and exit
 *   --retry-failed       Reset failed leads back to discovered state
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

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

interface PipelineStats {
  discovered: number;
  scraping: number;
  scraped: number;
  auditing: number;
  audited: number;
  emailed: number;
  replied: number;
  bounced: number;
  failed: number;
  total: number;
}

async function getStats(): Promise<PipelineStats> {
  const { getSupabaseServer } = await import("../../src/lib/supabase");
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("Supabase not configured");

  const states = [
    "discovered", "scraping", "scraped", "auditing",
    "audited", "emailed", "replied", "bounced", "failed",
  ];

  const stats: Record<string, number> = {};
  let total = 0;

  for (const state of states) {
    const { count, error } = await supabase
      .from("pipeline_leads")
      .select("id", { count: "exact", head: true })
      .eq("state", state);

    const n = error ? 0 : (count ?? 0);
    stats[state] = n;
    total += n;
  }

  return { ...stats, total } as unknown as PipelineStats;
}

function printStats(stats: PipelineStats) {
  console.log("\n┌──────────────────────────────────┐");
  console.log("│       Pipeline Status            │");
  console.log("├──────────────────────────────────┤");
  console.log(`│  Discovered:  ${String(stats.discovered).padStart(6)}            │`);
  console.log(`│  Scraping:    ${String(stats.scraping).padStart(6)}            │`);
  console.log(`│  Scraped:     ${String(stats.scraped).padStart(6)}            │`);
  console.log(`│  Auditing:    ${String(stats.auditing).padStart(6)}            │`);
  console.log(`│  Audited:     ${String(stats.audited).padStart(6)}  ← ready   │`);
  console.log(`│  Emailed:     ${String(stats.emailed).padStart(6)}            │`);
  console.log(`│  Replied:     ${String(stats.replied).padStart(6)}            │`);
  console.log(`│  Bounced:     ${String(stats.bounced).padStart(6)}            │`);
  console.log(`│  Failed:      ${String(stats.failed).padStart(6)}            │`);
  console.log("├──────────────────────────────────┤");
  console.log(`│  Total:       ${String(stats.total).padStart(6)}            │`);
  console.log("└──────────────────────────────────┘\n");
}

async function retryFailed(): Promise<number> {
  const { getSupabaseServer } = await import("../../src/lib/supabase");
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
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
    console.error("Failed to reset leads:", error.message);
    return 0;
  }
  return data?.length ?? 0;
}

async function runStep(
  name: string,
  scriptPath: string,
  extraArgs: string[],
): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  STEP: ${name}`);
  console.log(`${"=".repeat(60)}`);

  const { execSync } = await import("child_process");
  const cmd = `npx tsx ${scriptPath} ${extraArgs.join(" ")}`;
  console.log(`  Running: ${cmd}\n`);

  try {
    execSync(cmd, {
      stdio: "inherit",
      cwd: join(__dirname, "..", ".."),
      env: { ...process.env },
    });
  } catch (err) {
    console.error(`\n  Step "${name}" failed:`, err instanceof Error ? err.message : err);
    throw err;
  }
}

async function main() {
  const args = process.argv.slice(2);

  const discoverOnly = args.includes("--discover-only");
  const auditOnly = args.includes("--audit-only");
  const sendOnly = args.includes("--send-only");
  const dryRun = args.includes("--dry-run");
  const showStatus = args.includes("--status");
  const shouldRetryFailed = args.includes("--retry-failed");

  const limitFlag = args.find((a) => a.startsWith("--limit=")) ?? "--limit=50";
  const sourceFlag = args.find((a) => a.startsWith("--source="));
  const campaignFlag = args.find((a) => a.startsWith("--campaign-name="));
  const activate = args.includes("--activate");

  const startTime = Date.now();

  console.log("\n╔══════════════════════════════════════╗");
  console.log("║   Agency Outreach Pipeline           ║");
  console.log("╚══════════════════════════════════════╝");
  console.log(`  Time: ${new Date().toISOString()}`);

  // Show status
  if (showStatus) {
    const stats = await getStats();
    printStats(stats);
    return;
  }

  // Retry failed leads
  if (shouldRetryFailed) {
    const count = await retryFailed();
    console.log(`\n  Reset ${count} failed leads back to "discovered" state.\n`);
    const stats = await getStats();
    printStats(stats);
    return;
  }

  const runAll = !discoverOnly && !auditOnly && !sendOnly;

  // Pre-flight check
  const stats = await getStats();
  printStats(stats);

  // Step 1: Discover leads
  if (runAll || discoverOnly) {
    const discoverArgs = [limitFlag];
    if (dryRun) discoverArgs.push("--dry-run");
    if (sourceFlag) discoverArgs.push(sourceFlag);

    await runStep(
      "Lead Discovery",
      "scripts/pipeline/discover-leads.ts",
      discoverArgs,
    );
  }

  // Step 2: Generate audits
  if (runAll || auditOnly) {
    const auditArgs = [limitFlag];
    if (dryRun) auditArgs.push("--dry-run");

    await runStep(
      "Audit Generation",
      "scripts/pipeline/generate-audits.ts",
      auditArgs,
    );
  }

  // Step 3: Send campaign
  if (runAll || sendOnly) {
    const sendArgs: string[] = [];
    if (dryRun) sendArgs.push("--dry-run");
    if (campaignFlag) sendArgs.push(campaignFlag);
    if (activate) sendArgs.push("--activate");

    await runStep(
      "Campaign Sending",
      "scripts/pipeline/send-campaign.ts",
      sendArgs,
    );
  }

  // Final stats
  const finalStats = await getStats();
  printStats(finalStats);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  Pipeline completed in ${elapsed}s\n`);
}

main().catch((err) => {
  console.error("\nPipeline failed:", err);
  process.exit(1);
});
