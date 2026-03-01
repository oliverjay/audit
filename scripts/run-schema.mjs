import { readFileSync } from "fs";

const envFile = readFileSync(".env.local", "utf8");
const url = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
const serviceKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim();

// Also get the JWT service_role key (needed for SQL endpoint)
// The sb_secret key doesn't work for direct SQL; we need the JWT version
const projectRef = "eurelcvkfrihkczvuzbg";

const schema = readFileSync("supabase/schema.sql", "utf8");

// Split into individual top-level statements
const statements = [];
let current = "";
let inDollarQuote = false;

for (const line of schema.split("\n")) {
  const trimmed = line.trim();
  if (trimmed.startsWith("--") && !inDollarQuote) continue;
  
  if (trimmed.includes("$$")) {
    const count = (trimmed.match(/\$\$/g) || []).length;
    if (count === 1) inDollarQuote = !inDollarQuote;
  }
  
  current += line + "\n";
  
  if (!inDollarQuote && trimmed.endsWith(";")) {
    const stmt = current.trim();
    if (stmt && stmt !== ";") statements.push(stmt);
    current = "";
  }
}

console.log(`Found ${statements.length} SQL statements to execute`);
console.log(`Using service key: ${serviceKey.slice(0, 20)}...`);
console.log();

// Try the service_role JWT key from the API keys list
const jwtServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1cmVsY3ZrZnJpaGtjenZ1emJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjA4NDExMywiZXhwIjoyMDg3NjYwMTEzfQ.kUpoxvfXUNf438Rdn7iHSan6Sl_5Wdjb7uqMqjHvMxE";

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  const preview = stmt.replace(/\n/g, " ").replace(/\s+/g, " ").slice(0, 80);
  process.stdout.write(`[${i + 1}/${statements.length}] ${preview}... `);

  // Use the /pg endpoint with service role JWT
  const res = await fetch(`${url}/pg/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${jwtServiceKey}`,
      "apikey": jwtServiceKey,
    },
    body: JSON.stringify({ query: stmt }),
  });

  if (res.ok) {
    console.log("✅");
  } else {
    const text = await res.text();
    // Try the /sql endpoint as fallback
    const res2 = await fetch(`${url}/rest/v1/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jwtServiceKey}`,
        "apikey": jwtServiceKey,
        "Prefer": "tx=commit",
      },
      body: stmt,
    });
    
    if (res2.ok) {
      console.log("✅ (via rest)");
    } else {
      console.log(`❌ ${res.status}: ${text.slice(0, 150)}`);
    }
  }
}

console.log("\n── Testing connection with anon key ──");
const { createClient } = await import("@supabase/supabase-js");
const anonKey = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();
// Try with JWT anon key
const jwtAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1cmVsY3ZrZnJpaGtjenZ1emJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwODQxMTMsImV4cCI6MjA4NzY2MDExM30.lOhMtHrTJl1oO3FC7Jt0FuAOmSx_44kUl5wEzJej9D8";

for (const [label, key] of [["sb_publishable", anonKey], ["JWT anon", jwtAnonKey]]) {
  const sb = createClient(url, key);
  const { data, error } = await sb.from("waitlist").select("id", { count: "exact", head: true });
  if (error) {
    console.log(`  ${label}: ❌ ${error.message}`);
  } else {
    console.log(`  ${label}: ✅ connected`);
  }
}
