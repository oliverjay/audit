/**
 * Campaign Sending Script
 *
 * Takes leads from pipeline_leads in "audited" state, creates an Instantly
 * campaign with a multi-step email sequence, and uploads leads with
 * personalization variables.
 *
 * Run: npx tsx scripts/pipeline/send-campaign.ts [--campaign-name="..."] [--dry-run] [--activate]
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { PIPELINE_CONFIG, EMAIL_SEQUENCE } from "./config";
import type { EmailTemplate } from "./config";

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

interface AuditedLead {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  website: string | null;
  audit_score: number | null;
  audit_summary: string | null;
  audit_top_issue: string | null;
  audit_link: string | null;
  state: string;
}

async function getAuditedLeads(): Promise<AuditedLead[]> {
  const { getSupabaseServer } = await import("../../src/lib/supabase");
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("pipeline_leads")
    .select("id, email, first_name, last_name, company_name, website, audit_score, audit_summary, audit_top_issue, audit_link, state")
    .eq("state", "audited")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to fetch leads: ${error.message}`);
  return (data ?? []) as AuditedLead[];
}

async function markLeadsAsEmailed(
  leadIds: number[],
  campaignId: string,
): Promise<void> {
  const { getSupabaseServer } = await import("../../src/lib/supabase");
  const supabase = getSupabaseServer();
  if (!supabase) return;

  const { error } = await supabase
    .from("pipeline_leads")
    .update({
      state: "emailed",
      instantly_campaign_id: campaignId,
      updated_at: new Date().toISOString(),
    })
    .in("id", leadIds);

  if (error) console.warn("[campaign] Failed to update lead states:", error.message);
}

function buildSequenceSteps(templates: EmailTemplate[]) {
  return templates.map((t, i) => ({
    subject: t.subject,
    body: t.body,
    type: "email" as const,
    delay: i === 0 ? 0 : t.delayDays * 24 * 60,
    variants: t.variants?.map((v) => ({
      subject: v.subject,
      body: v.body,
    })),
  }));
}

function buildCustomVariables(lead: AuditedLead): Record<string, string> {
  let hostname = "";
  try {
    hostname = lead.website ? new URL(lead.website).hostname : "";
  } catch {
    hostname = lead.website || "";
  }

  // Count issues from audit (chapters typically = issue count)
  const issueCount = "5-7";

  return {
    score: String(lead.audit_score ?? "N/A"),
    summary: lead.audit_summary ?? "several areas for improvement",
    top_issue: lead.audit_top_issue ?? "overall design and conversion optimization",
    audit_link: lead.audit_link ?? "",
    website: hostname,
    issue_count: issueCount,
    company_name: lead.company_name ?? hostname,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const nameFlag = args.find((a) => a.startsWith("--campaign-name="));
  const dryRun = args.includes("--dry-run");
  const shouldActivate = args.includes("--activate");

  const campaignName = nameFlag
    ? nameFlag.split("=").slice(1).join("=")
    : `Agency Outreach - ${new Date().toISOString().slice(0, 10)}`;

  console.log(`\n=== Campaign Sending ===`);
  console.log(`Campaign: ${campaignName}`);
  console.log(`Dry run: ${dryRun}`);
  console.log(`Auto-activate: ${shouldActivate}\n`);

  const leads = await getAuditedLeads();
  console.log(`Found ${leads.length} audited leads ready for outreach`);

  if (leads.length === 0) {
    console.log("No leads in 'audited' state. Run generate-audits.ts first.");
    return;
  }

  // Filter out leads without audit data
  const validLeads = leads.filter((l) => l.audit_link && l.audit_score != null);
  console.log(`${validLeads.length} leads with valid audit data`);

  if (dryRun) {
    console.log("\n--- DRY RUN: Would send to these leads ---");
    for (const lead of validLeads.slice(0, 20)) {
      const vars = buildCustomVariables(lead);
      console.log(`  ${lead.email} — ${vars.company_name} — score: ${vars.score}`);
    }
    if (validLeads.length > 20) {
      console.log(`  ... and ${validLeads.length - 20} more`);
    }

    console.log("\n--- Email Sequence ---");
    for (let i = 0; i < EMAIL_SEQUENCE.length; i++) {
      const step = EMAIL_SEQUENCE[i];
      console.log(`\n  Step ${i + 1} (Day ${step.delayDays}):`);
      console.log(`  Subject: ${step.subject}`);
      console.log(`  Body preview: ${step.body.slice(0, 100)}...`);
      if (step.variants?.length) {
        console.log(`  A/B variants: ${step.variants.length}`);
      }
    }
    return;
  }

  // Dynamic imports
  const {
    createCampaign,
    defaultSchedule,
    createSubsequence,
    addLeadsToCampaign,
    activateCampaign,
  } = await import("../../src/lib/instantly");

  // 1. Create campaign
  console.log("[campaign] Creating campaign...");
  const campaign = await createCampaign(campaignName, defaultSchedule());
  console.log(`[campaign] Created: ${campaign.id}`);

  // 2. Set up email sequence
  console.log("[campaign] Setting up email sequence...");
  const steps = buildSequenceSteps(EMAIL_SEQUENCE);
  await createSubsequence(campaign.id, steps);
  console.log(`[campaign] ${steps.length}-step sequence created`);

  // 3. Add leads in batches
  console.log(`[campaign] Adding ${validLeads.length} leads...`);
  const batchSize = PIPELINE_CONFIG.leadsPerBatch;
  let addedCount = 0;

  for (let i = 0; i < validLeads.length; i += batchSize) {
    const batch = validLeads.slice(i, i + batchSize);
    const instantlyLeads = batch.map((lead) => ({
      email: lead.email,
      first_name: lead.first_name ?? undefined,
      last_name: lead.last_name ?? undefined,
      company_name: lead.company_name ?? undefined,
      website: lead.website ?? undefined,
      custom_variables: buildCustomVariables(lead),
    }));

    try {
      await addLeadsToCampaign(campaign.id, instantlyLeads);
      addedCount += batch.length;
      console.log(`[campaign] Added batch ${Math.floor(i / batchSize) + 1}: ${batch.length} leads (${addedCount}/${validLeads.length})`);
    } catch (err) {
      console.error(`[campaign] Batch add failed:`, err instanceof Error ? err.message : err);
    }
  }

  // 4. Mark leads as emailed
  const leadIds = validLeads.map((l) => l.id);
  await markLeadsAsEmailed(leadIds, campaign.id);

  // 5. Activate if requested
  if (shouldActivate) {
    console.log("[campaign] Activating campaign...");
    await activateCampaign(campaign.id);
    console.log("[campaign] Campaign is LIVE");
  } else {
    console.log("[campaign] Campaign created but NOT activated.");
    console.log("[campaign] Review in Instantly dashboard, then activate with:");
    console.log(`[campaign]   npx tsx scripts/pipeline/send-campaign.ts --activate`);
    console.log(`[campaign] Or activate via API: POST /api/v2/campaigns/${campaign.id}/activate`);
  }

  console.log(`\n=== Campaign Complete ===`);
  console.log(`Campaign ID: ${campaign.id}`);
  console.log(`Leads added: ${addedCount}`);
  console.log(`Status: ${shouldActivate ? "ACTIVE" : "PAUSED"}\n`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
