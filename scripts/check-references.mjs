#!/usr/bin/env node
/**
 * Validates every URL in src/lib/references.ts
 * - Checks HTTP status (follows redirects)
 * - Detects soft-404s ("page not found", "article moved", etc.)
 * - Outputs a clear report with actionable status per reference
 *
 * Usage:  node scripts/check-references.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const refPath = resolve(__dirname, "../src/lib/references.ts");
const source = readFileSync(refPath, "utf-8");

// Extract references from the TS source
const refRegex =
  /\{\s*id:\s*"([^"]+)",\s*topic:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*url:\s*"([^"]+)"\s*\}/g;

const references = [];
let m;
while ((m = refRegex.exec(source))) {
  references.push({ id: m[1], topic: m[2], label: m[3], url: m[4] });
}

console.log(`\n🔍  Checking ${references.length} references…\n`);

const SOFT_404_PATTERNS = [
  /page\s*not\s*found/i,
  /404\s*(error|page|not found)/i,
  /article\s*(has\s*been\s*)?(moved|removed|deleted|archived)/i,
  /this\s*(page|article|post|content)\s*(has\s*been\s*)?(moved|removed|deleted|archived|no longer)/i,
  /no\s*longer\s*(available|exists)/i,
  /content\s*(has\s*been\s*)?(moved|removed|deleted|retired)/i,
  /we\s*couldn.?t\s*find/i,
  /sorry.*?can.?t\s*find/i,
  /the\s*requested\s*(page|url|resource)\s*(was\s*not|could\s*not|cannot)/i,
  /this\s*url\s*has\s*(changed|moved)/i,
  /looking\s*for\s*something/i,
  /doesn.?t\s*exist/i,
];

// URLs whose content legitimately discusses 404/error topics (not actual 404s)
const SOFT_404_ALLOWLIST = new Set([
  "https://www.nngroup.com/articles/improving-dreaded-404-error-message/",
]);

// Sites that use Cloudflare bot protection (403) but are known-live
const CLOUDFLARE_ALLOWLIST = new Set([
  "https://cxl.com/blog/is-social-proof-really-that-important/",
]);

const TIMEOUT_MS = 15000;
const CONCURRENCY = 5;

async function checkUrl(ref) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(ref.url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,*/*",
      },
    });

    clearTimeout(timer);

    const finalUrl = res.url;
    const status = res.status;
    const body = await res.text();

    // Check for soft-404 in <title> and first portion of body
    const titleMatch = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";
    const inspectZone = (title + " " + body.slice(0, 8000)).toLowerCase();

    let soft404 = false;
    let matchedPattern = null;
    if (!SOFT_404_ALLOWLIST.has(ref.url)) {
      for (const pat of SOFT_404_PATTERNS) {
        if (pat.test(inspectZone)) {
          soft404 = true;
          matchedPattern = pat.source;
          break;
        }
      }
    }

    // web.dev adds ?hl=xx locale params — treat as same URL
    const cleanFinal = finalUrl.replace(/[?&]hl=[a-z-]+$/i, "");
    const cleanOrig = ref.url.replace(/[?&]hl=[a-z-]+$/i, "");
    const redirected = cleanFinal !== cleanOrig;
    const cfAllowed = CLOUDFLARE_ALLOWLIST.has(ref.url) && status === 403;

    return {
      ...ref,
      status: cfAllowed ? 200 : status,
      finalUrl: redirected ? finalUrl : null,
      title,
      soft404,
      matchedPattern,
      error: null,
      cfAllowed,
    };
  } catch (err) {
    clearTimeout(timer);
    return {
      ...ref,
      status: null,
      finalUrl: null,
      title: null,
      soft404: false,
      matchedPattern: null,
      error: err.name === "AbortError" ? "TIMEOUT" : err.message,
    };
  }
}

// Concurrency-limited runner
async function runAll(refs) {
  const results = [];
  let idx = 0;

  async function worker() {
    while (idx < refs.length) {
      const i = idx++;
      const ref = refs[i];
      process.stdout.write(`  [${i + 1}/${refs.length}] ${ref.id}…`);
      const result = await checkUrl(ref);

      if (result.error) {
        process.stdout.write(` ❌ ${result.error}\n`);
      } else if (result.cfAllowed) {
        process.stdout.write(` ✅ (Cloudflare-protected, known live)\n`);
      } else if (result.status >= 400) {
        process.stdout.write(` ❌ HTTP ${result.status}\n`);
      } else if (result.soft404) {
        process.stdout.write(` ⚠️  Soft-404 (${result.matchedPattern})\n`);
      } else if (result.finalUrl) {
        process.stdout.write(` ↪ Redirected → OK\n`);
      } else {
        process.stdout.write(` ✅\n`);
      }

      results[i] = result;
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);
  return results;
}

const results = await runAll(references);

// Categorise
const broken = results.filter(
  (r) => r.error || (r.status && r.status >= 400) || r.soft404
);
const redirected = results.filter(
  (r) => r.finalUrl && !r.error && r.status < 400 && !r.soft404
);
const ok = results.filter(
  (r) => !r.error && r.status < 400 && !r.soft404 && !r.finalUrl
);

console.log(`\n${"═".repeat(60)}`);
console.log(`  RESULTS SUMMARY`);
console.log(`${"═".repeat(60)}`);
console.log(`  ✅ OK:          ${ok.length}`);
console.log(`  ↪  Redirected:  ${redirected.length}`);
console.log(`  ❌ Broken:      ${broken.length}`);
console.log(`  Total:          ${results.length}`);
console.log(`${"═".repeat(60)}\n`);

if (redirected.length) {
  console.log("── Redirected (consider updating URL) ──");
  for (const r of redirected) {
    console.log(`  ${r.id}`);
    console.log(`    FROM: ${r.url}`);
    console.log(`    TO:   ${r.finalUrl}`);
    console.log(`    Title: ${r.title}`);
    console.log();
  }
}

if (broken.length) {
  console.log("── Broken / Soft-404 ──");
  for (const r of broken) {
    console.log(`  ${r.id}`);
    console.log(`    URL:    ${r.url}`);
    if (r.error) console.log(`    Error:  ${r.error}`);
    if (r.status) console.log(`    Status: ${r.status}`);
    if (r.soft404) console.log(`    Reason: Soft-404 matched "${r.matchedPattern}"`);
    if (r.title) console.log(`    Title:  ${r.title}`);
    console.log();
  }
}

if (!broken.length && !redirected.length) {
  console.log("🎉 All references are live and up-to-date!");
}

process.exit(broken.length > 0 ? 1 : 0);
