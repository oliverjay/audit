import FirecrawlApp from "@mendable/firecrawl-js";
import { config } from "./config";

const firecrawl = new FirecrawlApp({ apiKey: config.env.firecrawl });

export async function scrapeUrl(url: string) {
  const result = await firecrawl.scrape(url, {
    formats: ["markdown", "screenshot"],
  });

  const metadata = result.metadata ?? {};
  const ogImage = metadata.ogImage ?? metadata["og:image"] ?? null;
  const siteName = metadata.ogSiteName ?? metadata["og:site_name"] ?? metadata.title ?? null;

  let favicon: string | null = null;
  try {
    const urlObj = new URL(url);
    favicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
  } catch {
    // ignore invalid URLs
  }

  return {
    markdown: result.markdown ?? "",
    screenshot: result.screenshot ?? null,
    favicon,
    ogImage: typeof ogImage === "string" ? ogImage : null,
    siteName: typeof siteName === "string" ? siteName : null,
  };
}
