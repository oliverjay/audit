import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, supabaseEnabled } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const auditId = req.nextUrl.searchParams.get("auditId");
  if (!auditId) return NextResponse.json({ error: "Missing auditId" }, { status: 400 });
  if (!supabaseEnabled) return NextResponse.json({ action_plan: null });

  try {
    const { data, error } = await supabaseServer
      .from("audits")
      .select("action_plan")
      .eq("id", auditId)
      .single();

    if (error) return NextResponse.json({ action_plan: null });
    return NextResponse.json({ action_plan: data?.action_plan ?? null });
  } catch {
    return NextResponse.json({ action_plan: null });
  }
}

export async function PATCH(req: NextRequest) {
  if (!supabaseEnabled) return NextResponse.json({ ok: false, reason: "supabase not configured" });

  try {
    const { auditId, plan } = await req.json();
    if (!auditId || !plan) return NextResponse.json({ error: "Missing auditId or plan" }, { status: 400 });

    const { error } = await supabaseServer
      .from("audits")
      .update({ action_plan: plan })
      .eq("id", auditId);

    if (error) {
      console.error("[action-plan] save error:", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
