/**
 * Instantly.ai API v2 client for cold email campaign management.
 * Handles campaigns, leads, accounts, and analytics.
 *
 * API docs: https://developer.instantly.ai/api/v2
 */

const BASE_URL = "https://api.instantly.ai";

function getApiKey(): string {
  const key = process.env.INSTANTLY_API_KEY;
  if (!key) throw new Error("INSTANTLY_API_KEY not set");
  return key;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${getApiKey()}`,
    "Content-Type": "application/json",
  };

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Instantly API ${method} ${path} failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<T>;
}

// ─── Types ───

export interface InstantlyAccount {
  email: string;
  first_name?: string;
  last_name?: string;
  warmup_enabled?: boolean;
  status?: string;
  daily_limit?: number;
}

export interface InstantlyCampaign {
  id: string;
  name: string;
  status?: number;
  created_at?: string;
}

export interface InstantlyLead {
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  website?: string;
  phone?: string;
  custom_variables?: Record<string, string>;
  list_id?: string;
  campaign_id?: string;
}

export interface InstantlyLeadList {
  id: string;
  name: string;
}

export interface CampaignSchedule {
  schedules: {
    name: string;
    timing: { from: string; to: string };
    days: Record<string, boolean>;
    timezone: string;
  }[];
  start_date?: string;
  end_date?: string;
}

export interface CampaignSequenceStep {
  subject: string;
  body: string;
  type: "email";
  delay?: number;
  variants?: { subject: string; body: string }[];
}

export interface CampaignAnalytics {
  campaign_id: string;
  total_leads: number;
  emails_sent: number;
  emails_opened: number;
  emails_replied: number;
  bounced: number;
}

// ─── Account Management ───

export async function listAccounts(
  limit = 100,
  skip = 0,
): Promise<{ items: InstantlyAccount[]; total_count: number }> {
  return request("GET", "/api/v2/accounts", undefined, {
    limit: String(limit),
    skip: String(skip),
  });
}

export async function getAccount(email: string): Promise<InstantlyAccount> {
  return request("GET", `/api/v2/accounts/${encodeURIComponent(email)}`);
}

export async function enableWarmup(emails: string[]): Promise<void> {
  await request("POST", "/api/v2/accounts/warmup/enable", { emails });
}

export async function disableWarmup(emails: string[]): Promise<void> {
  await request("POST", "/api/v2/accounts/warmup/disable", { emails });
}

export async function getWarmupAnalytics(emails: string[]): Promise<unknown> {
  return request("POST", "/api/v2/accounts/warmup-analytics", { emails });
}

// ─── Campaign Management ───

export async function createCampaign(
  name: string,
  schedule: CampaignSchedule,
): Promise<InstantlyCampaign> {
  return request("POST", "/api/v2/campaigns", {
    name,
    campaign_schedule: schedule,
  });
}

export async function getCampaign(id: string): Promise<InstantlyCampaign> {
  return request("GET", `/api/v2/campaigns/${id}`);
}

export async function listCampaigns(
  limit = 100,
  skip = 0,
): Promise<{ items: InstantlyCampaign[]; total_count: number }> {
  return request("GET", "/api/v2/campaigns", undefined, {
    limit: String(limit),
    skip: String(skip),
  });
}

export async function updateCampaign(
  id: string,
  updates: Record<string, unknown>,
): Promise<InstantlyCampaign> {
  return request("PATCH", `/api/v2/campaigns/${id}`, updates);
}

export async function activateCampaign(id: string): Promise<void> {
  await request("POST", `/api/v2/campaigns/${id}/activate`);
}

export async function pauseCampaign(id: string): Promise<void> {
  await request("POST", `/api/v2/campaigns/${id}/pause`);
}

export async function deleteCampaign(id: string): Promise<void> {
  await request("DELETE", `/api/v2/campaigns/${id}`);
}

export async function getCampaignAnalytics(): Promise<CampaignAnalytics[]> {
  return request("GET", "/api/v2/campaigns/analytics");
}

// ─── Subsequences (email sequence steps) ───

export async function createSubsequence(
  campaignId: string,
  steps: CampaignSequenceStep[],
): Promise<unknown> {
  return request("POST", "/api/v2/subsequences", {
    campaign_id: campaignId,
    steps,
  });
}

export async function listSubsequences(
  campaignId: string,
): Promise<{ items: unknown[] }> {
  return request("GET", "/api/v2/subsequences", undefined, {
    campaign_id: campaignId,
  });
}

// ─── Lead Management ───

export async function addLeadsToCampaign(
  campaignId: string,
  leads: InstantlyLead[],
): Promise<unknown> {
  return request("POST", "/api/v2/leads", {
    campaign_id: campaignId,
    leads: leads.map((l) => ({
      email: l.email,
      first_name: l.first_name,
      last_name: l.last_name,
      company_name: l.company_name,
      website: l.website,
      phone: l.phone,
      custom_variables: l.custom_variables,
    })),
  });
}

export async function listLeads(
  campaignId: string,
  limit = 100,
  skip = 0,
): Promise<{ items: InstantlyLead[]; total_count: number }> {
  return request("POST", "/api/v2/leads/list", {
    campaign_id: campaignId,
    limit,
    skip,
  });
}

export async function getLead(id: string): Promise<InstantlyLead> {
  return request("GET", `/api/v2/leads/${id}`);
}

export async function updateLead(
  id: string,
  updates: Partial<InstantlyLead>,
): Promise<InstantlyLead> {
  return request("PATCH", `/api/v2/leads/${id}`, updates);
}

export async function deleteLeadsFromCampaign(
  campaignId: string,
  emails: string[],
): Promise<void> {
  await request("DELETE", "/api/v2/leads", {
    campaign_id: campaignId,
    delete_list: emails,
  });
}

// ─── Lead Lists ───

export async function createLeadList(name: string): Promise<InstantlyLeadList> {
  return request("POST", "/api/v2/lead-lists", { name });
}

export async function listLeadLists(
  limit = 100,
  skip = 0,
): Promise<{ items: InstantlyLeadList[]; total_count: number }> {
  return request("GET", "/api/v2/lead-lists", undefined, {
    limit: String(limit),
    skip: String(skip),
  });
}

// ─── Email Verification ───

export async function verifyEmail(
  email: string,
): Promise<{ email: string; status: string }> {
  return request("POST", "/api/v2/email-verification", { email });
}

// ─── SuperSearch (Lead Finder) ───

export async function enrichLeadsFromSuperSearch(
  campaignId: string,
  filters: {
    job_titles?: string[];
    locations?: string[];
    industries?: string[];
    company_sizes?: string[];
    keywords?: string[];
    limit?: number;
  },
): Promise<unknown> {
  return request("POST", "/api/v2/supersearch-enrichment/enrich-leads-from-supersearch", {
    campaign_id: campaignId,
    ...filters,
  });
}

// ─── Default schedule preset ───

export function defaultSchedule(): CampaignSchedule {
  return {
    schedules: [
      {
        name: "Weekdays 9-5",
        timing: { from: "09:00", to: "17:00" },
        days: {
          "0": false,
          "1": true,
          "2": true,
          "3": true,
          "4": true,
          "5": true,
          "6": false,
        },
        timezone: "America/New_York",
      },
    ],
  };
}
