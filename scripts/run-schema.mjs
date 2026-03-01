import { readFileSync } from "fs";

const envFile = readFileSync(".env.local", "utf8");
const url = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
const serviceKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim();
const anonKey = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const schema = readFileSync("supabase/schema.sql", "utf8");

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

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  const preview = stmt.replace(/\n/g, " ").replace(/\s+/g, " ").slice(0, 80);
  process.stdout.write(`[${i + 1}/${statements.length}] ${preview}... `);

  const res = await fetch(`${url}/pg/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceKey}`,
      "apikey": serviceKey,
    },
    body: JSON.stringify({ query: stmt }),
  });

  if (res.ok) {
    console.log("✅");
  } else {
    const text = await res.text();
    const res2 = await fetch(`${url}/rest/v1/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
        "apikey": serviceKey,
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
if (anonKey) {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(url, anonKey);
  const { data, error } = await sb.from("waitlist").select("id", { count: "exact", head: true });
  if (error) {
    console.log(`  anon key: ❌ ${error.message}`);
  } else {
    console.log(`  anon key: ✅ connected`);
  }
} else {
  console.log("  Skipped — no NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
}
