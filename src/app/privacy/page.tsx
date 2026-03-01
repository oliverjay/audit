"use client";

import { SiteNav } from "@/components/ui/site-nav";
import { SiteFooter } from "@/components/ui/site-footer";

export default function PrivacyPage() {
  return (
    <div className="bg-neutral-950 min-h-dvh">
      <SiteNav />
      <div className="mx-auto max-w-xl px-6 py-20">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-muted">Last updated: February 2026</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted">
        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            1. Information We Collect
          </h2>
          <p>
            When you use Retake, we collect the URLs you submit for analysis.
            We do not require account creation or collect personal identification
            information. We may collect anonymous usage analytics data including
            page views and feature usage.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            2. How We Use Your Information
          </h2>
          <p>
            Submitted URLs are used solely to perform the requested audit analysis.
            URLs and scraped content are processed in real-time and are not stored
            permanently. Analytics data is used to improve the Service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            3. Third-Party Data Sharing
          </h2>
          <p>
            To provide the Service, submitted URLs and their content are shared with:
          </p>
          <ul className="mt-2 ml-4 list-disc space-y-1">
            <li>
              <strong>Firecrawl</strong> — for web scraping and screenshot capture
            </li>
            <li>
              <strong>Google (Gemini API)</strong> — for AI-powered analysis and
              content generation
            </li>
            <li>
              <strong>OpenAI</strong> — for text-to-speech voiceover generation
            </li>
          </ul>
          <p className="mt-2">
            Each provider has its own privacy policy governing how they process data.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            4. Cookies
          </h2>
          <p>
            We use minimal cookies to remember your cookie consent preference and
            for anonymous analytics. You can decline cookies when prompted. No
            third-party tracking cookies are used.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            5. Data Retention
          </h2>
          <p>
            Audit results are generated in real-time and are not stored on our servers
            after your session ends. Cookie consent preferences are stored locally in
            your browser.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            6. Your Rights (GDPR / CCPA)
          </h2>
          <p>
            As we do not store personal data, most data subject rights (access,
            deletion, portability) are inherently satisfied. If you have concerns
            about your data, please contact us. California residents have additional
            rights under the CCPA, including the right to know what data is collected
            and the right to opt out of data sales. We do not sell personal data.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            7. Children&apos;s Privacy
          </h2>
          <p>
            The Service is not intended for children under 13. We do not knowingly
            collect information from children.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            8. Changes to This Policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be
            posted on this page with an updated revision date.
          </p>
        </section>
      </div>
      </div>
      <SiteFooter showCredit={false} />
    </div>
  );
}
