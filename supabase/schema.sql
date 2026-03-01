-- Waitlist table
create table if not exists waitlist (
  id bigint generated always as identity primary key,
  email text unique not null,
  position int not null,
  referral_code text unique not null,
  referrals int default 0,
  referred_by text,
  audit_url text,
  hostname text,
  created_at timestamptz default now()
);

create index if not exists idx_waitlist_email on waitlist (email);
create index if not exists idx_waitlist_referral_code on waitlist (referral_code);

-- RPC to atomically increment referral count
create or replace function increment_referrals(code text)
returns void as $$
  update waitlist set referrals = referrals + 1 where referral_code = code;
$$ language sql;

-- Audits table (stores the full result JSON, metadata, and references to storage files)
create table if not exists audits (
  id uuid default gen_random_uuid() primary key,
  url text not null,
  hostname text not null,
  persona text not null,
  score int,
  summary text,
  result jsonb not null,
  screenshot_path text,
  audio_path text,
  favicon text,
  site_name text,
  created_at timestamptz default now()
);

create index if not exists idx_audits_url_persona on audits (url, persona);
create index if not exists idx_audits_created on audits (created_at desc);

-- Storage bucket (run in Supabase dashboard > Storage > New bucket):
--   Name: audit-assets
--   Public: true
--   Allowed MIME types: image/png, image/webp, image/jpeg, audio/mpeg
--   Max file size: 25MB

-- Enable row level security but allow all operations via anon key for now
alter table waitlist enable row level security;
alter table audits enable row level security;

create policy "Allow all waitlist operations" on waitlist for all using (true) with check (true);
create policy "Allow all audit operations" on audits for all using (true) with check (true);

-- Pipeline leads table: tracks agency prospects through the outreach pipeline
create table if not exists pipeline_leads (
  id bigint generated always as identity primary key,
  email text not null,
  first_name text,
  last_name text,
  company_name text,
  website text,
  job_title text,
  industry text,
  company_size text,
  location text,
  country text,
  phone text,

  -- Pipeline state
  state text not null default 'discovered',
  audit_id uuid references audits(id),
  audit_score int,
  audit_summary text,
  audit_top_issue text,
  audit_link text,

  -- Instantly campaign tracking
  instantly_campaign_id text,
  instantly_lead_id text,

  -- Source tracking
  source text default 'instantly_supersearch',
  source_id text,

  error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint uq_pipeline_leads_email unique (email)
);

create index if not exists idx_pipeline_leads_state on pipeline_leads (state);
create index if not exists idx_pipeline_leads_website on pipeline_leads (website);
create index if not exists idx_pipeline_leads_email on pipeline_leads (email);
create index if not exists idx_pipeline_leads_campaign on pipeline_leads (instantly_campaign_id);
create index if not exists idx_pipeline_leads_country on pipeline_leads (country);

alter table pipeline_leads enable row level security;
create policy "Allow all pipeline_leads operations" on pipeline_leads for all using (true) with check (true);
