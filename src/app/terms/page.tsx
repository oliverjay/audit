"use client";

import { SiteNav } from "@/components/ui/site-nav";
import { SiteFooter } from "@/components/ui/site-footer";

export default function TermsPage() {
  return (
    <div className="bg-neutral-950 min-h-dvh">
      <SiteNav />
      <div className="mx-auto max-w-xl px-6 py-20">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-muted">Last updated: February 2026</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted">
        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing or using Retake (&ldquo;the Service&rdquo;), you agree to be bound by
            these Terms of Service. If you do not agree, please do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            2. Service Description
          </h2>
          <p>
            Retake provides automated website analysis using artificial intelligence.
            The Service scrapes publicly accessible web pages, generates visual and
            textual analysis, and produces AI-generated voiceover commentary. Results
            are for informational purposes only and do not constitute professional advice.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            3. Acceptable Use
          </h2>
          <p>
            You agree to only submit URLs of publicly accessible websites that you
            own or have permission to analyze. You may not use the Service to scrape,
            analyze, or reverse-engineer protected or private content.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            4. Third-Party Services
          </h2>
          <p>
            The Service relies on third-party APIs including Google Gemini, OpenAI,
            and Firecrawl. We are not responsible for the availability, accuracy, or
            policies of these third-party services. Your use of the Service is also
            subject to their respective terms and policies.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            5. Intellectual Property
          </h2>
          <p>
            AI-generated audit content is provided as-is. You may use the audit
            results for your own purposes. The Service itself, including its design,
            code, and branding, remains our intellectual property.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            6. Disclaimer of Warranties
          </h2>
          <p>
            The Service is provided &ldquo;as is&rdquo; without warranties of any kind. We do
            not guarantee the accuracy, completeness, or usefulness of any audit
            results. AI-generated content may contain errors or inaccuracies.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            7. Limitation of Liability
          </h2>
          <p>
            In no event shall Retake be liable for any indirect, incidental,
            special, or consequential damages arising from your use of the Service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            8. Changes to Terms
          </h2>
          <p>
            We reserve the right to modify these terms at any time. Continued use
            of the Service after changes constitutes acceptance of the revised terms.
          </p>
        </section>
      </div>
      </div>
      <SiteFooter showCredit={false} />
    </div>
  );
}
