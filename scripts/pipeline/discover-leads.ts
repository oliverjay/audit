/**
 * Lead Discovery Script
 *
 * Finds web agencies using Instantly's SuperSearch / Lead Finder API
 * and stores them in the pipeline_leads table in Supabase.
 *
 * Run: npx tsx scripts/pipeline/discover-leads.ts [--limit=100] [--source=csv:path/to/file.csv]
 *
 * Sources:
 *   --source=instantly   (default) Use Instantly SuperSearch to find leads
 *   --source=csv:file    Import leads from a CSV file (columns: email, first_name, last_name, company_name, website)
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { DISCOVERY_FILTERS } from "./config";

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

interface LeadRow {
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  website: string | null;
  job_title: string | null;
  industry: string | null;
  company_size: string | null;
  location: string | null;
  phone: string | null;
  source: string;
  source_id: string | null;
}

function parseCsv(filePath: string): LeadRow[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const leads: LeadRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });

    if (!row.email) continue;

    leads.push({
      email: row.email,
      first_name: row.first_name || row.firstname || null,
      last_name: row.last_name || row.lastname || null,
      company_name: row.company_name || row.company || null,
      website: row.website || row.url || row.domain || null,
      job_title: row.job_title || row.title || null,
      industry: row.industry || null,
      company_size: row.company_size || null,
      location: row.location || row.country || null,
      phone: row.phone || null,
      source: `csv:${filePath}`,
      source_id: null,
    });
  }

  return leads;
}

async function discoverFromInstantly(limit: number): Promise<LeadRow[]> {
  const { enrichLeadsFromSuperSearch, createCampaign, defaultSchedule, listLeads } =
    await import("../../src/lib/instantly");

  // SuperSearch requires a campaign to attach leads to.
  // We create a temporary "discovery" campaign.
  console.log("[discover] Creating temporary discovery campaign...");
  const campaign = await createCampaign(
    `Discovery - ${new Date().toISOString().slice(0, 10)}`,
    defaultSchedule(),
  );
  console.log(`[discover] Campaign created: ${campaign.id}`);

  console.log("[discover] Searching Instantly SuperSearch...");
  console.log("[discover] Filters:", JSON.stringify(DISCOVERY_FILTERS, null, 2));

  await enrichLeadsFromSuperSearch(campaign.id, {
    job_titles: DISCOVERY_FILTERS.job_titles,
    industries: DISCOVERY_FILTERS.industries,
    company_sizes: DISCOVERY_FILTERS.company_sizes,
    locations: DISCOVERY_FILTERS.locations,
    limit: Math.min(limit, DISCOVERY_FILTERS.limit),
  });

  // Wait for enrichment to complete (async background job)
  console.log("[discover] Waiting for SuperSearch enrichment...");
  await new Promise((r) => setTimeout(r, 10000));

  // Fetch the leads that were added
  const result = await listLeads(campaign.id, limit);
  console.log(`[discover] Found ${result.items.length} leads`);

  return result.items.map((lead) => ({
    email: lead.email,
    first_name: lead.first_name || null,
    last_name: lead.last_name || null,
    company_name: lead.company_name || null,
    website: lead.website || null,
    job_title: null,
    industry: null,
    company_size: null,
    location: null,
    phone: lead.phone || null,
    source: "instantly_supersearch",
    source_id: campaign.id,
  }));
}

async function insertLeads(leads: LeadRow[]): Promise<{ inserted: number; skipped: number }> {
  const { getSupabaseServer } = await import("../../src/lib/supabase");
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("Supabase not configured");

  let inserted = 0;
  let skipped = 0;

  // Insert in batches, skipping duplicates
  const BATCH_SIZE = 50;
  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    const batch = leads.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from("pipeline_leads")
      .upsert(
        batch.map((l) => ({
          email: l.email,
          first_name: l.first_name,
          last_name: l.last_name,
          company_name: l.company_name,
          website: l.website,
          job_title: l.job_title,
          industry: l.industry,
          company_size: l.company_size,
          location: l.location,
          phone: l.phone,
          source: l.source,
          source_id: l.source_id,
          state: "discovered",
        })),
        { onConflict: "email", ignoreDuplicates: true },
      )
      .select("id");

    if (error) {
      console.error(`[discover] Batch insert error:`, error.message);
      skipped += batch.length;
    } else {
      inserted += data?.length ?? 0;
      skipped += batch.length - (data?.length ?? 0);
    }
  }

  return { inserted, skipped };
}

async function main() {
  const args = process.argv.slice(2);
  const limitFlag = args.find((a) => a.startsWith("--limit="));
  const sourceFlag = args.find((a) => a.startsWith("--source="));
  const limit = limitFlag ? parseInt(limitFlag.split("=")[1], 10) : 100;
  const source = sourceFlag ? sourceFlag.split("=").slice(1).join("=") : "instantly";

  console.log(`\n=== Lead Discovery ===`);
  console.log(`Source: ${source}`);
  console.log(`Limit: ${limit}\n`);

  let leads: LeadRow[];

  if (source.startsWith("csv:")) {
    const csvPath = source.slice(4);
    if (!existsSync(csvPath)) {
      console.error(`CSV file not found: ${csvPath}`);
      process.exit(1);
    }
    leads = parseCsv(csvPath);
    console.log(`[discover] Parsed ${leads.length} leads from CSV`);
  } else {
    leads = await discoverFromInstantly(limit);
  }

  if (leads.length === 0) {
    console.log("[discover] No leads found.");
    return;
  }

  // Normalize websites to include protocol
  for (const lead of leads) {
    if (lead.website && !lead.website.startsWith("http")) {
      lead.website = `https://${lead.website}`;
    }
  }

  // Deduplicate by email
  const seen = new Set<string>();
  const deduped = leads.filter((l) => {
    const key = l.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  console.log(`[discover] ${deduped.length} unique leads after dedup`);

  const { inserted, skipped } = await insertLeads(deduped);
  console.log(`\n=== Discovery Complete ===`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped (existing): ${skipped}\n`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
