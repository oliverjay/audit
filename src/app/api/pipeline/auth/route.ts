import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const TOKEN_NAME = "pipeline_token";
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getPassword(): string {
  const pw = process.env.PIPELINE_PASSWORD;
  if (!pw) throw new Error("PIPELINE_PASSWORD not set in .env");
  return pw;
}

function makeToken(password: string): string {
  return Buffer.from(`pipeline:${password}:${Date.now()}`).toString("base64");
}

function verifyToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const pw = decoded.split(":")[1];
    return pw === getPassword();
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (!password || password !== getPassword()) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const token = makeToken(password);
    const jar = await cookies();
    jar.set(TOKEN_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: TOKEN_MAX_AGE,
      path: "/",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Auth failed" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const jar = await cookies();
    const token = jar.get(TOKEN_NAME)?.value;
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    return NextResponse.json({ authenticated: true });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(TOKEN_NAME);
  return NextResponse.json({ ok: true });
}
