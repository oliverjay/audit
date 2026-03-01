import FirecrawlApp from "@mendable/firecrawl-js";
import { config } from "./config";

const firecrawl = new FirecrawlApp({ apiKey: config.env.firecrawl });

export interface ElementPosition {
  tag: string;
  text: string;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
}

// Scroll to bottom first to trigger all lazy-loaded content, then measure.
// This ensures totalH matches the final page height captured by fullPage screenshot.
const SCROLL_TO_BOTTOM_SCRIPT = `(async () => {
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const step = window.innerHeight;
  let prev = -1, curr = 0;
  while (curr !== prev) {
    prev = curr;
    window.scrollBy(0, step);
    await delay(150);
    curr = document.documentElement.scrollHeight;
  }
  window.scrollTo(0, 0);
  await delay(300);
  return 'done';
})()`;

const MEASURE_SCRIPT = `(() => {
  window.scrollTo(0, 0);
  const tags = ['H1','H2','H3','H4','H5','H6','NAV','HEADER','FOOTER',
    'SECTION','ARTICLE','MAIN','FORM','BUTTON','A','IMG','FIGURE','VIDEO',
    'P','UL','OL','TABLE','BLOCKQUOTE','INPUT','SELECT','TEXTAREA','LABEL'];
  const totalH = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, 1);
  const totalW = Math.max(document.documentElement.scrollWidth, document.documentElement.clientWidth, 1);
  const results = [];
  const seen = new Set();
  for (const tag of tags) {
    for (const el of document.querySelectorAll(tag)) {
      if (seen.has(el)) continue;
      seen.add(el);
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
      const r = el.getBoundingClientRect();
      const absTop = r.top + window.scrollY;
      const absLeft = r.left + window.scrollX;
      if (r.width < 2 || r.height < 2) continue;
      const text = (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 100);
      if (!text && !['IMG','FIGURE','VIDEO'].includes(tag)) continue;
      results.push({
        tag: tag.toLowerCase(),
        text: text || '[' + tag.toLowerCase() + ']',
        xPct: Math.round(((absLeft + r.width / 2) / totalW) * 1000) / 10,
        yPct: Math.round(((absTop + r.height / 2) / totalH) * 1000) / 10,
        widthPct: Math.round((r.width / totalW) * 1000) / 10,
        heightPct: Math.round((r.height / totalH) * 1000) / 10,
      });
    }
  }
  return JSON.stringify({ totalH, totalW, elements: results });
})()`;

export async function scrapeUrl(url: string) {
  const result = await firecrawl.scrape(url, {
    formats: ["markdown", "html"],
    actions: [
      { type: "wait", milliseconds: 3000 },
      { type: "executeJavascript", script: SCROLL_TO_BOTTOM_SCRIPT },
      { type: "wait", milliseconds: 1500 },
      { type: "screenshot", fullPage: true },
      { type: "executeJavascript", script: MEASURE_SCRIPT },
    ],
  } as Record<string, unknown>);

  const metadata = result.metadata ?? {};
  const ogImage = metadata.ogImage ?? metadata["og:image"] ?? null;
  const siteName = metadata.ogSiteName ?? metadata["og:site_name"] ?? metadata.title ?? null;

  let favicon: string | null = null;
  try {
    const urlObj = new URL(url);
    favicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
  } catch {
    // ignore
  }

  // When using actions, screenshot and JS results come from result.actions
  const resultAny = result as Record<string, unknown>;
  const actionsData = resultAny.actions as {
    screenshots?: string[];
    javascriptReturns?: Array<{ type?: string; value?: unknown }>;
  } | undefined;

  // Log the full structure to debug response shape
  console.log("[firecrawl] top-level keys:", Object.keys(resultAny));
  if (actionsData) {
    console.log("[firecrawl] actions keys:", Object.keys(actionsData));
    console.log("[firecrawl] screenshots count:", actionsData.screenshots?.length ?? 0);
    console.log("[firecrawl] jsReturns count:", actionsData.javascriptReturns?.length ?? 0);
  }

  const screenshot = actionsData?.screenshots?.[0]
    ?? resultAny.screenshot
    ?? null;

  console.log("[firecrawl] screenshot found:", !!screenshot, typeof screenshot === "string" ? screenshot.slice(0, 80) : "");

  let elementPositions: ElementPosition[] = [];
  try {
    // Index 1 = MEASURE_SCRIPT (index 0 = SCROLL_TO_BOTTOM_SCRIPT)
    const jsReturn = actionsData?.javascriptReturns?.[1];
    const jsValue = jsReturn?.value;
    const raw = typeof jsValue === "string" ? jsValue : JSON.stringify(jsValue);
    if (raw && raw !== "undefined" && raw !== "null") {
      const parsed = JSON.parse(raw);
      if (parsed.elements) {
        elementPositions = parsed.elements as ElementPosition[];
        console.log(`[firecrawl] Measured ${elementPositions.length} elements, page: ${parsed.totalW}x${parsed.totalH}px`);
      } else {
        elementPositions = parsed as ElementPosition[];
        console.log(`[firecrawl] Measured ${elementPositions.length} element positions (legacy format)`);
      }
    } else {
      console.warn("[firecrawl] No JS return value found. jsReturn:", JSON.stringify(jsReturn));
    }
  } catch (err) {
    console.warn("[firecrawl] Failed to parse element positions:", err);
  }

  return {
    markdown: result.markdown ?? "",
    html: result.html ?? "",
    favicon,
    ogImage: typeof ogImage === "string" ? ogImage : null,
    siteName: typeof siteName === "string" ? siteName : null,
    screenshot: typeof screenshot === "string" ? screenshot : null,
    elementPositions,
  };
}
