import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer, supabaseEnabled } from "@/lib/supabase";

export const maxDuration = 120;

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

function getApolloKey(): string | null {
  return process.env.APOLLO_API_KEY ?? null;
}

export interface DiscoveredAgency {
  id?: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  website: string;
  email: string | null;
  company: string | null;
  location: string | null;
  country: string | null;
  employees: string | null;
  linkedin: string | null;
  selected?: boolean;
}

// ─── Apollo.io API ───

const APOLLO_BASE = "https://api.apollo.io/api/v1";

async function apolloSearch(params: {
  titles: string[];
  locations: string[];
  industries: string[];
  employeeRanges: string[];
  page: number;
  perPage: number;
}): Promise<{ people: DiscoveredAgency[]; totalResults: number; page: number }> {
  const apiKey = getApolloKey();
  if (!apiKey) throw new Error("APOLLO_API_KEY not configured");

  const body: Record<string, unknown> = {
    person_titles: params.titles,
    person_seniorities: ["owner", "founder", "c_suite", "director"],
    organization_locations: params.locations,
    q_organization_keyword_tags: params.industries,
    organization_num_employees_ranges: params.employeeRanges,
    page: params.page,
    per_page: params.perPage,
  };

  const res = await fetch(`${APOLLO_BASE}/mixed_people/api_search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apollo search failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const people: DiscoveredAgency[] = (data.people ?? []).map((p: Record<string, unknown>) => {
    const org = p.organization as Record<string, unknown> | null;
    return {
      id: p.id as string,
      name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
      first_name: (p.first_name as string) ?? null,
      last_name: (p.last_name as string) ?? null,
      title: (p.title as string) ?? null,
      email: (p.email as string) ?? null,
      website: (org?.website_url as string) ?? (org?.primary_domain as string) ?? "",
      company: (org?.name as string) ?? null,
      location: [p.city, p.state, p.country].filter(Boolean).join(", ") || null,
      country: (p.country as string) ?? null,
      employees: org
        ? `${(org.estimated_num_employees as number) ?? "?"}`
        : null,
      linkedin: (p.linkedin_url as string) ?? null,
    };
  });

  return {
    people,
    totalResults: (data.pagination?.total_entries as number) ?? 0,
    page: params.page,
  };
}

async function apolloEnrich(peopleIds: string[]): Promise<DiscoveredAgency[]> {
  const apiKey = getApolloKey();
  if (!apiKey) throw new Error("APOLLO_API_KEY not configured");

  const enriched: DiscoveredAgency[] = [];
  const BATCH = 10;

  for (let i = 0; i < peopleIds.length; i += BATCH) {
    const batch = peopleIds.slice(i, i + BATCH);

    // Apollo bulk enrichment by ID
    const results = await Promise.all(
      batch.map(async (id) => {
        const res = await fetch(`${APOLLO_BASE}/people/match`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Api-Key": apiKey,
          },
          body: JSON.stringify({
            id,
            reveal_personal_emails: true,
          }),
        });

        if (!res.ok) return null;
        const data = await res.json();
        const p = data.person;
        if (!p) return null;

        const org = p.organization;
        return {
          id: p.id,
          name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
          first_name: p.first_name ?? null,
          last_name: p.last_name ?? null,
          title: p.title ?? null,
          email: p.email ?? null,
          website: org?.website_url ?? org?.primary_domain ?? "",
          company: org?.name ?? null,
          location: [p.city, p.state, p.country].filter(Boolean).join(", ") || null,
          country: p.country ?? null,
          employees: org ? `${org.estimated_num_employees ?? "?"}` : null,
          linkedin: p.linkedin_url ?? null,
        } as DiscoveredAgency;
      }),
    );

    enriched.push(...results.filter((r): r is DiscoveredAgency => r !== null));
  }

  return enriched;
}

// ─── Route Handler ───

export async function POST(req: NextRequest) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action, ...params } = await req.json();

  if (action === "search") {
    return handleSearch(params);
  }
  if (action === "enrich") {
    return handleEnrich(params.ids);
  }
  if (action === "import") {
    return handleImport(params.agencies);
  }
  if (action === "check-config") {
    return NextResponse.json({
      apolloConfigured: !!getApolloKey(),
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

async function handleSearch(params: {
  titles: string[];
  locations: string[];
  industries: string[];
  employeeRanges: string[];
  page: number;
  perPage: number;
}) {
  try {
    const result = await apolloSearch({
      titles: params.titles ?? ["Founder", "CEO", "Owner", "Managing Director"],
      locations: params.locations ?? ["United Kingdom"],
      industries: params.industries ?? ["web design", "web development"],
      employeeRanges: params.employeeRanges ?? ["1,10", "11,50"],
      page: params.page ?? 1,
      perPage: params.perPage ?? 25,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Search failed" },
      { status: 500 },
    );
  }
}

async function handleEnrich(ids: string[]) {
  if (!ids?.length) {
    return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
  }
  try {
    const enriched = await apolloEnrich(ids);
    return NextResponse.json({ people: enriched });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Enrichment failed" },
      { status: 500 },
    );
  }
}

async function handleImport(agencies: DiscoveredAgency[]) {
  if (!agencies?.length) {
    return NextResponse.json({ error: "No agencies provided" }, { status: 400 });
  }
  if (!supabaseEnabled) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const withEmail = agencies.filter((a) => a.email);
  if (withEmail.length === 0) {
    return NextResponse.json(
      { error: "No agencies with verified emails to import. Enrich contacts first." },
      { status: 400 },
    );
  }

  const rows = withEmail.map((a) => {
    let website = a.website || null;
    // Derive website from email domain if Apollo didn't provide one
    if (!website && a.email) {
      const domain = a.email.split("@")[1];
      if (domain && !domain.match(/gmail|yahoo|hotmail|outlook|aol|icloud/i)) {
        website = `https://${domain}`;
      }
    }
    if (website && !website.startsWith("http")) {
      website = `https://${website}`;
    }
    return {
      email: a.email!,
      first_name: a.first_name,
      last_name: a.last_name,
      company_name: a.company,
      website,
      job_title: a.title,
      location: a.location,
      country: a.country,
      industry: "Web Agency",
      source: "apollo",
      source_id: a.id || null,
      state: "discovered",
    };
  });

  const { data, error } = await supabaseServer
    .from("pipeline_leads")
    .upsert(rows, { onConflict: "email", ignoreDuplicates: true })
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    imported: data?.length ?? 0,
    total: withEmail.length,
    skippedNoEmail: agencies.length - withEmail.length,
  });
}
