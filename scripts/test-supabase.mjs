import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const envFile = readFileSync(".env.local", "utf8");
const url = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
const key = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();

if (!url || !key) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

console.log(`Supabase URL: ${url}`);
console.log(`Anon key: ${key.slice(0, 20)}...${key.slice(-10)}`);
console.log();

const supabase = createClient(url, key);

// 1. Test basic connectivity
console.log("── 1. Testing connectivity ──");
try {
  const { data, error } = await supabase.from("waitlist").select("id", { count: "exact", head: true });
  if (error) {
    console.error("❌ Connection failed:", error.message);
    if (error.message.includes("relation") && error.message.includes("does not exist")) {
      console.log("\n⚠️  Tables don't exist yet. Run the schema SQL in the Supabase dashboard:");
      console.log("   Dashboard → SQL Editor → paste contents of supabase/schema.sql → Run");
      process.exit(1);
    }
    process.exit(1);
  }
  console.log("✅ Connected to Supabase successfully");
} catch (e) {
  console.error("❌ Connection error:", e.message);
  process.exit(1);
}

// 2. Test waitlist table
console.log("\n── 2. Testing waitlist table ──");
const testEmail = `test-${Date.now()}@example.com`;
const testCode = Buffer.from(testEmail).toString("base64").slice(0, 12);

const { data: insertData, error: insertErr } = await supabase
  .from("waitlist")
  .insert({
    email: testEmail,
    position: 1,
    referral_code: testCode,
    referrals: 0,
    audit_url: "https://example.com",
    hostname: "example.com",
  })
  .select()
  .single();

if (insertErr) {
  console.error("❌ Waitlist insert failed:", insertErr.message);
} else {
  console.log("✅ Waitlist insert:", insertData.email, "(id:", insertData.id + ")");
}

// Read it back
const { data: readData, error: readErr } = await supabase
  .from("waitlist")
  .select("*")
  .eq("email", testEmail)
  .single();

if (readErr) {
  console.error("❌ Waitlist read failed:", readErr.message);
} else {
  console.log("✅ Waitlist read:", readData.email, "position:", readData.position);
}

// Clean up
const { error: deleteErr } = await supabase.from("waitlist").delete().eq("email", testEmail);
if (deleteErr) {
  console.error("❌ Waitlist cleanup failed:", deleteErr.message);
} else {
  console.log("✅ Waitlist cleanup: deleted test row");
}

// 3. Test audits table
console.log("\n── 3. Testing audits table ──");
const { data: auditData, error: auditErr } = await supabase
  .from("audits")
  .insert({
    url: "https://example.com",
    hostname: "example.com",
    persona: "ux",
    score: 72,
    summary: "Test audit",
    result: { summary: "Test", overallScore: 72, script: "", chapters: [], hotspots: [], stats: [] },
  })
  .select()
  .single();

if (auditErr) {
  console.error("❌ Audit insert failed:", auditErr.message);
} else {
  console.log("✅ Audit insert:", auditData.id, "score:", auditData.score);
}

// Read back
if (auditData) {
  const { data: auditRead, error: auditReadErr } = await supabase
    .from("audits")
    .select("*")
    .eq("id", auditData.id)
    .single();

  if (auditReadErr) {
    console.error("❌ Audit read failed:", auditReadErr.message);
  } else {
    console.log("✅ Audit read:", auditRead.hostname, "persona:", auditRead.persona, "score:", auditRead.score);
  }

  // Clean up
  const { error: auditDeleteErr } = await supabase.from("audits").delete().eq("id", auditData.id);
  if (auditDeleteErr) {
    console.error("❌ Audit cleanup failed:", auditDeleteErr.message);
  } else {
    console.log("✅ Audit cleanup: deleted test row");
  }
}

// 4. Test storage bucket
console.log("\n── 4. Testing storage (audit-assets bucket) ──");
const testBlob = new Blob(["test"], { type: "text/plain" });
const storagePath = `test/connectivity-${Date.now()}.txt`;

const { data: uploadData, error: uploadErr } = await supabase.storage
  .from("audit-assets")
  .upload(storagePath, testBlob, { contentType: "text/plain" });

if (uploadErr) {
  if (uploadErr.message?.includes("not found") || uploadErr.message?.includes("Bucket")) {
    console.error("❌ Storage bucket 'audit-assets' not found. Create it in the Supabase dashboard:");
    console.log("   Dashboard → Storage → New bucket → Name: audit-assets, Public: true");
  } else {
    console.error("❌ Storage upload failed:", uploadErr.message);
  }
} else {
  console.log("✅ Storage upload:", uploadData.path);

  // Clean up
  const { error: storageDeleteErr } = await supabase.storage.from("audit-assets").remove([storagePath]);
  if (storageDeleteErr) {
    console.error("❌ Storage cleanup failed:", storageDeleteErr.message);
  } else {
    console.log("✅ Storage cleanup: deleted test file");
  }
}

// 5. Test RPC function
console.log("\n── 5. Testing increment_referrals RPC ──");
// Insert a temp row, increment, check
const rpcEmail = `rpc-test-${Date.now()}@example.com`;
const rpcCode = Buffer.from(rpcEmail).toString("base64").slice(0, 12);

await supabase.from("waitlist").insert({
  email: rpcEmail, position: 1, referral_code: rpcCode, referrals: 0,
});

const { error: rpcErr } = await supabase.rpc("increment_referrals", { code: rpcCode });
if (rpcErr) {
  console.error("❌ RPC increment_referrals failed:", rpcErr.message);
} else {
  const { data: rpcCheck } = await supabase.from("waitlist").select("referrals").eq("referral_code", rpcCode).single();
  if (rpcCheck?.referrals === 1) {
    console.log("✅ RPC increment_referrals: referrals = 1 (correct)");
  } else {
    console.error("❌ RPC returned unexpected value:", rpcCheck?.referrals);
  }
}

await supabase.from("waitlist").delete().eq("email", rpcEmail);
console.log("✅ RPC cleanup: deleted test row");

console.log("\n── Done ──");
