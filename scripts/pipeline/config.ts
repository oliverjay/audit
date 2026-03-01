/**
 * Pipeline configuration: batch sizes, rate limits, email templates, and infra setup guide.
 */

// ─── Rate Limits ───

export const PIPELINE_CONFIG = {
  /** Max audits to generate per pipeline run */
  auditsPerRun: 50,
  /** Delay between Firecrawl scrapes (ms) to stay within rate limits */
  scrapeDelayMs: 3000,
  /** Delay between Gemini analysis calls (ms) */
  analysisDelayMs: 2000,
  /** Max concurrent scrapes */
  scrapeConcurrency: 2,
  /** Max concurrent Gemini analyses */
  analysisConcurrency: 3,
  /** Max leads to add per Instantly API call */
  leadsPerBatch: 100,
  /** Persona to use for outbound audits */
  persona: "ux" as const,
  /** Base URL for shareable audit links */
  auditBaseUrl: "https://retake.site/audit",
} as const;

// ─── Lead Discovery Filters ───

export const DISCOVERY_FILTERS = {
  job_titles: [
    "Founder",
    "CEO",
    "Owner",
    "Managing Director",
    "Creative Director",
    "Head of Digital",
  ],
  industries: [
    "Web Design",
    "Web Development",
    "Digital Marketing",
    "Digital Agency",
    "Creative Agency",
    "Marketing Agency",
    "Design Agency",
    "Software Development",
    "IT Services",
  ],
  company_sizes: ["1-10", "11-50"],
  locations: [
    "United States",
    "United Kingdom",
    "Canada",
    "Australia",
  ],
  limit: 100,
};

// ─── Email Templates ───

export interface EmailTemplate {
  subject: string;
  body: string;
  delayDays: number;
  variants?: { subject: string; body: string }[];
}

// Templates use {{greeting}} and {{signoff}} which are injected per-country
// from COUNTRY_CONFIGS. Other vars: {{first_name}}, {{company_name}},
// {{website}}, {{score}}, {{summary}}, {{top_issue}}, {{audit_link}}, {{issue_count}}

export const EMAIL_SEQUENCE: EmailTemplate[] = [
  {
    subject: "I audited {{company_name}}'s website — scored {{score}}/100",
    body: `{{greeting}} {{first_name}},

I ran an AI audit on {{website}} and found some interesting things — {{summary}}.

The biggest issue: {{top_issue}}.

Here's the full interactive audit with a voice walkthrough: {{audit_link}}

Would love to hear your thoughts on the findings.

{{signoff}}`,
    delayDays: 0,
    variants: [
      {
        subject: "Quick audit of {{website}} — {{score}}/100",
        body: `{{greeting}} {{first_name}},

I put {{website}} through an AI website audit and it scored {{score}}/100.

A few things stood out — {{top_issue}} being the most impactful.

Here's the full breakdown with a voice walkthrough: {{audit_link}}

Curious what you think.

{{signoff}}`,
      },
    ],
  },
  {
    subject: "Re: I audited {{company_name}}'s website",
    body: `Quick follow-up — did you get a chance to check the audit?

The voice walkthrough takes about 2 minutes and highlights the most impactful fixes for {{website}}.

{{audit_link}}

{{signoff}}`,
    delayDays: 3,
  },
  {
    subject: "Last one — the audit for {{website}}",
    body: `Final nudge on this. The audit I generated for {{website}} flags {{issue_count}} areas for improvement.

The top fix alone could meaningfully improve conversions.

Happy to walk through it if useful: {{audit_link}}

{{signoff}}`,
    delayDays: 7,
  },
];

// ─── Per-Country Settings ───
// Timezone for scheduling sends at appropriate local times,
// plus tone adjustments for cultural fit.

export interface CountryConfig {
  timezone: string;
  sendWindowStart: number; // hour in local time (24h)
  sendWindowEnd: number;
  greeting: string;
  signoff: string;
  toneNotes: string;
}

export const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  "United Kingdom": {
    timezone: "Europe/London",
    sendWindowStart: 8,
    sendWindowEnd: 17,
    greeting: "Hi",
    signoff: "Best,\nAlex",
    toneNotes: "Professional but warm. Avoid overly casual American idioms. Use 'website' not 'site'.",
  },
  "Australia": {
    timezone: "Australia/Sydney",
    sendWindowStart: 8,
    sendWindowEnd: 17,
    greeting: "Hey",
    signoff: "Cheers,\nAlex",
    toneNotes: "Relaxed and direct. Casual tone works well. Brevity appreciated.",
  },
  "United States": {
    timezone: "America/New_York",
    sendWindowStart: 8,
    sendWindowEnd: 17,
    greeting: "Hi",
    signoff: "Best,\nAlex",
    toneNotes: "Friendly and direct. Value proposition up front.",
  },
  "Canada": {
    timezone: "America/Toronto",
    sendWindowStart: 8,
    sendWindowEnd: 17,
    greeting: "Hi",
    signoff: "Best,\nAlex",
    toneNotes: "Polite and professional, similar to US but slightly more formal.",
  },
  "Germany": {
    timezone: "Europe/Berlin",
    sendWindowStart: 8,
    sendWindowEnd: 17,
    greeting: "Hi",
    signoff: "Best regards,\nAlex",
    toneNotes: "More formal and data-driven. Lead with specific numbers and findings.",
  },
};

export function getCountryConfig(country: string | null): CountryConfig {
  if (country && COUNTRY_CONFIGS[country]) return COUNTRY_CONFIGS[country];
  return COUNTRY_CONFIGS["United Kingdom"];
}

// ─── Lead States ───

export type LeadState =
  | "discovered"
  | "scraping"
  | "scraped"
  | "auditing"
  | "audited"
  | "emailed"
  | "replied"
  | "bounced"
  | "failed";

// ─── Infrastructure Setup Guide ───
// This is documented here for reference. These are manual steps.
//
// 1. MAILFORGE (https://mailforge.ai)
//    - Buy 8-10 .com domains (~$14/yr each):
//      retakesite.com, tryretake.com, getretake.com, retakehq.com,
//      retakedev.com, siteretake.com, retakeagency.com, goretake.com
//    - Create 2-3 mailboxes per domain (alex@, team@, hello@)
//    - Mailforge handles SPF/DKIM/DMARC automatically
//    - Cost: ~$60-75/mo for 20-25 mailboxes
//
// 2. INSTANTLY (https://instantly.ai)
//    - Sign up for Hypergrowth plan ($97/mo)
//    - Add Lead Finder add-on ($47/mo)
//    - Connect all Mailforge mailboxes via SMTP
//    - Enable warmup on every account immediately
//    - Wait 2-3 weeks before sending any cold emails
//    - Get API key from Settings > Integrations
//    - Set INSTANTLY_API_KEY in .env.local
//
// 3. DOMAIN AGING
//    - Register domains 30+ days before warmup for best results
//    - Aged domains reach full capacity 3-5 days faster
//    - Total timeline: domain purchase → 30d age → 21d warmup → sending
