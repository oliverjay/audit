import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseEnabled } from "@/lib/supabase";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

const LAUNCH = new Date("2026-02-26T00:00:00Z").getTime();
const SEED_COUNT = 420;
const RAMP_DAYS = 30;
const START_RATE = 1 / 600;
const END_RATE = 1;

function phantomCount(): number {
  const elapsed = Math.max(0, (Date.now() - LAUNCH) / 1000);
  const T = RAMP_DAYS * 86400;
  const t = Math.min(elapsed, T);
  const k = Math.log(END_RATE / START_RATE) / T;
  const integral = (START_RATE / k) * (Math.exp(k * t) - 1);
  const extra = elapsed > T ? (elapsed - T) * END_RATE : 0;
  return SEED_COUNT + Math.floor(integral + extra);
}

function generateReferralCode(email: string): string {
  return Buffer.from(email.toLowerCase().trim())
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 8);
}

const useSupabase = supabaseEnabled;

// ─── Supabase implementation ───

async function supabasePost(body: {
  email: string;
  referralCode?: string;
  auditUrl?: string;
  hostname?: string;
}) {
  const email = body.email;
  const phantom = phantomCount();

  const { data: existing } = await supabase
    .from("waitlist")
    .select("*")
    .eq("email", email)
    .single();

  if (existing) {
    const displayPos = phantom + Math.max(1, existing.position - existing.referrals);
    return {
      position: displayPos,
      totalAhead: displayPos - 1,
      referralCode: existing.referral_code,
      alreadyJoined: true,
    };
  }

  if (body.referralCode) {
    try { await supabase.rpc("increment_referrals", { code: body.referralCode }); } catch {}
  }

  const { count } = await supabase
    .from("waitlist")
    .select("*", { count: "exact", head: true });

  const position = (count ?? 0) + 1;
  const referralCode = generateReferralCode(email);

  await supabase.from("waitlist").insert({
    email,
    position,
    referral_code: referralCode,
    referrals: 0,
    referred_by: body.referralCode || null,
    audit_url: body.auditUrl || null,
    hostname: body.hostname || null,
  });

  const displayPos = phantom + position;
  return {
    position: displayPos,
    totalAhead: displayPos - 1,
    referralCode,
    alreadyJoined: false,
  };
}

async function supabaseGet(email: string) {
  const { data } = await supabase
    .from("waitlist")
    .select("*")
    .eq("email", email)
    .single();

  if (!data) return { found: false };

  const displayPos = phantomCount() + Math.max(1, data.position - data.referrals);
  return {
    found: true,
    position: displayPos,
    referralCode: data.referral_code,
    referrals: data.referrals,
  };
}

// ─── Local JSON fallback ───

interface WaitlistEntry {
  email: string;
  position: number;
  referralCode: string;
  referrals: number;
  referredBy: string | null;
  auditUrl: string | null;
  hostname: string | null;
  createdAt: string;
}

const DATA_PATH = path.join(process.cwd(), "data", "waitlist.json");

async function readEntries(): Promise<WaitlistEntry[]> {
  try {
    const raw = await readFile(DATA_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeEntries(entries: WaitlistEntry[]): Promise<void> {
  await mkdir(path.dirname(DATA_PATH), { recursive: true });
  await writeFile(DATA_PATH, JSON.stringify(entries, null, 2), "utf-8");
}

async function localPost(body: {
  email: string;
  referralCode?: string;
  auditUrl?: string;
  hostname?: string;
}) {
  const email = body.email;
  const entries = await readEntries();
  const phantom = phantomCount();

  const existing = entries.find((e) => e.email === email);
  if (existing) {
    const displayPos = phantom + Math.max(1, existing.position - existing.referrals);
    return {
      position: displayPos,
      totalAhead: displayPos - 1,
      referralCode: existing.referralCode,
      alreadyJoined: true,
    };
  }

  if (body.referralCode) {
    const referrer = entries.find((e) => e.referralCode === body.referralCode);
    if (referrer) referrer.referrals += 1;
  }

  const entry: WaitlistEntry = {
    email,
    position: entries.length + 1,
    referralCode: generateReferralCode(email),
    referrals: 0,
    referredBy: body.referralCode || null,
    auditUrl: body.auditUrl || null,
    hostname: body.hostname || null,
    createdAt: new Date().toISOString(),
  };

  entries.push(entry);
  await writeEntries(entries);

  const displayPos = phantom + entry.position;
  return {
    position: displayPos,
    totalAhead: displayPos - 1,
    referralCode: entry.referralCode,
    alreadyJoined: false,
  };
}

async function localGet(email: string) {
  const entries = await readEntries();
  const entry = entries.find((e) => e.email === email);
  if (!entry) return { found: false };

  const displayPos = phantomCount() + Math.max(1, entry.position - entry.referrals);
  return {
    found: true,
    position: displayPos,
    referralCode: entry.referralCode,
    referrals: entry.referrals,
  };
}

// ─── Route handlers ───

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || "").toLowerCase().trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const result = useSupabase
      ? await supabasePost({ ...body, email })
      : await localPost({ ...body, email });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Waitlist error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.toLowerCase().trim();
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  try {
    const result = useSupabase
      ? await supabaseGet(email)
      : await localGet(email);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Waitlist GET error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
