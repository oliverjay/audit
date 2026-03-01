"use client";

import { FadeIn } from "@/components/ui/fade-in";
import { SectionHeading } from "@/components/ui/section-heading";
import { SiteFooter } from "@/components/ui/site-footer";
import { hexToRgb } from "@/lib/utils";

const problems = [
  {
    stat: "97%",
    title: "Visitors leave without contacting you",
    desc: "Your site gets traffic, but no inquiries. No form fill, no email, no call.",
    color: "#ef4444",
  },
  {
    stat: "0",
    title: "Compelling lead magnets on most agency sites",
    desc: "\"Contact us\" isn't a lead magnet. Visitors need a reason to engage.",
    color: "#f59e0b",
  },
  {
    stat: "2–3hrs",
    title: "Wasted on manual prospect audits",
    desc: "You audit sites for free in sales calls. That time isn't billable.",
    color: "#8b5cf6",
  },
  {
    stat: "83%",
    title: "Of agencies look identical to prospects",
    desc: "Same portfolio page, same services list, same \"Contact us\" CTA.",
    color: "#6366f1",
  },
];

const solutions = [
  {
    title: "Voice-narrated AI audit in 60 seconds",
    desc: "Not a static PDF. Prospects get an interactive, chapter-by-chapter walkthrough of their site — with AI voice narration, visual hotspot markers, and a score. It feels like a personal consultation.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" />
      </svg>
    ),
  },
  {
    title: "Email gate captures the lead",
    desc: "Prospects see a preview of their audit, then enter their email to unlock the full results. You get their name, email, URL, and every finding — before you ever pick up the phone.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
  },
  {
    title: "Full-site audits for closing deals",
    desc: "The widget audits a single page to capture the lead. Once they're in your pipeline, run a comprehensive multi-page site audit to seal the deal — or let them self-serve it after opt-in.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    title: "100% white-label — your brand everywhere",
    desc: "Your domain, your logo, your colours. Prospects never see Retake. The widget, the audit, and the follow-up emails all look like your proprietary tool.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 3v18" /><path d="M14 9h4" /><path d="M14 13h4" />
      </svg>
    ),
  },
  {
    title: "API access for bulk outbound",
    desc: "Pre-generate audits for a list of prospect URLs via API. Email 200 local businesses tonight with \"We found 5 issues on your site\" — each linking to their branded report.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    title: "CRM integration & webhooks",
    desc: "Push every lead to HubSpot, Salesforce, or any CRM the moment they opt in. Connect via native integrations, webhooks, or Zapier.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4" /><path d="M12 18v4" /><path d="m4.93 4.93 2.83 2.83" /><path d="m16.24 16.24 2.83 2.83" /><path d="M2 12h4" /><path d="M18 12h4" /><path d="m4.93 19.07 2.83-2.83" /><path d="m16.24 7.76 2.83-2.83" />
      </svg>
    ),
  },
];

const inboundSteps = [
  {
    num: "01",
    title: "Install the widget",
    desc: "Paste a simple embed code on your website. Takes under 2 minutes. It lives on your domain, styled to your brand.",
    color: "#ff6b35",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Visitors audit their own site",
    desc: "They enter their URL, get a voice-narrated AI critique, then enter their email to unlock the full report.",
    color: "#6366f1",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "You close a warm lead",
    desc: "You get their email, URL, audit score, and every finding. They already know they have problems — you just show up with the fix.",
    color: "#10b981",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

const outboundSteps = [
  {
    num: "01",
    title: "Upload a prospect list",
    desc: "CSV of URLs — local businesses, Clutch leads, LinkedIn prospects. Our API generates a branded audit for each one.",
    color: "#8b5cf6",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Send cold outreach that converts",
    desc: "\"We found 5 issues on your site\" — each email links to their own branded audit. Not a generic pitch. A personalized demo of your expertise.",
    color: "#ec4899",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Book calls from replies",
    desc: "Prospects open a report that looks like you built it. They see real issues on their real site. Reply rates go through the roof.",
    color: "#10b981",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
      </svg>
    ),
  },
];

const prebuiltCritics = [
  {
    name: "UX Critic",
    desc: "Layout, hierarchy, readability, mobile experience",
    color: "#6366f1",
    avatar: "/avatars/ada.webp",
  },
  {
    name: "CRO Critic",
    desc: "Conversions, CTAs, trust signals, friction points",
    color: "#10b981",
    avatar: "/avatars/marcus.webp",
  },
  {
    name: "SEO Critic",
    desc: "Metadata, headings, structure, page speed, crawlability",
    color: "#10b981",
    avatar: "/avatars/seo.webp",
  },
  {
    name: "Accessibility Critic",
    desc: "WCAG compliance, contrast, alt text, keyboard navigation",
    color: "#3b82f6",
    avatar: "/avatars/a11y.webp",
  },
  {
    name: "Performance Critic",
    desc: "Load time, Core Web Vitals, image optimization, bloat",
    color: "#f59e0b",
    avatar: "/avatars/perf.webp",
  },
  {
    name: "Content Critic",
    desc: "Copy clarity, tone, messaging, readability, persuasion",
    color: "#ec4899",
    avatar: "/avatars/rex.webp",
  },
];

const plans = [
  {
    name: "Starter",
    price: "$49",
    period: "/mo",
    features: ["50 audits/month", "White-label branding", "Pre-built critics (UX, CRO, SEO…)", "Single-page audits", "Email capture + lead dashboard"],
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "$149",
    period: "/mo",
    features: ["500 audits/month", "Custom domain", "Rename & restyle critics", "Full-site audits", "CRM integration", "API access & bulk outbound"],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Unlimited",
    price: "$349",
    period: "/mo",
    features: ["Unlimited audits", "Multiple domains", "Fully custom critics (name, voice, prompt)", "Full API access", "Bulk campaign tools", "Dedicated account manager"],
    cta: "Book Demo",
    highlighted: false,
  },
];

const faqs = [
  {
    q: "Is the widget a single-page audit or a full site audit?",
    a: "The widget runs a single-page audit — it's fast, impressive, and designed to hook the visitor into giving their email. Once they opt in, you can choose to unlock a full multi-page site audit for them, or save it for your sales call as a closing tool.",
  },
  {
    q: "Can I run full site audits for prospects?",
    a: "Yes. From your dashboard (or via API), you can run comprehensive multi-page audits on any prospect's site. Use them in proposals, pitch decks, or send them as a follow-up after the initial single-page teaser.",
  },
  {
    q: "How does the API work for bulk outbound?",
    a: "Upload a CSV of prospect URLs, and the API generates a branded audit for each one. You get back a unique link per prospect that you can drop into your outbound emails — \"We noticed 5 issues on your site\" with a link to their personalised report.",
  },
  {
    q: "Is it fully white-label?",
    a: "100%. Your visitors never see Retake. The widget, the audit experience, and any follow-up emails all use your logo, colours, and domain. It looks like a proprietary tool you built.",
  },
  {
    q: "Can I customize the AI critics?",
    a: "Yes. On Starter, you choose from our pre-built critic library (UX, CRO, SEO, Accessibility, Performance, Content). On Growth, you can rename critics, change their photo and voice. On Unlimited, you can build entirely custom critics from scratch — define the focus areas, personality, tone, and expertise to match your agency's services.",
  },
  {
    q: "Can I use a single unified audit instead of multiple critics?",
    a: "Absolutely. You can combine multiple focus areas into one critic that delivers a single comprehensive audit under one voice. Or offer multiple critics and let prospects choose. It's entirely up to you.",
  },
  {
    q: "Can I customize the branding?",
    a: "Yes. You control the logo, colour palette, fonts, and domain. The widget, the audit, and any follow-up emails all use your brand. Prospects never see Retake.",
  },
  {
    q: "Where do the leads go?",
    a: "Leads are delivered to your dashboard in real time with their email, URL, audit score, and every finding. You can also push them to HubSpot, Salesforce, or any CRM via native integrations, webhooks, or Zapier.",
  },
  {
    q: "Do you charge per lead or per audit?",
    a: "Neither. You pay a flat monthly subscription based on your plan. Run audits, capture leads, and use the API — all included in your monthly allowance with no per-lead or per-audit fees.",
  },
  {
    q: "What does the prospect actually experience?",
    a: "They enter their URL and within 60 seconds get an interactive, voice-narrated critique of their website — with visual hotspot markers on a screenshot, chapter-by-chapter findings, and a score. It's not a static PDF. It feels like a personal consultation.",
  },
];

const salesMailto = `mailto:sales@retake.site?subject=${encodeURIComponent("Interested in Retake for my agency")}&body=${encodeURIComponent("Hi,\n\nI'd like to learn more about using Retake's white-label AI audit tool for my agency.\n\nCould we set up a quick call to discuss?\n\nThanks")}`;

function BookDemoButton({ className = "", outline = false }: { className?: string; outline?: boolean }) {
  return (
    <a
      href={salesMailto}
      className={`inline-flex items-center justify-center gap-2 rounded-full text-[14px] font-semibold transition-all duration-300 ${
        outline
          ? "border border-white/15 bg-transparent text-white/80 hover:bg-white/[0.06] hover:border-white/25 px-7 py-3.5"
          : "bg-accent text-white hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] px-8 py-3.5"
      } ${className}`}
    >
      {outline ? "See Live Example" : "Get in Touch"}
      {!outline && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 7h8M8 3.5L11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </a>
  );
}

export default function AgenciesPage() {
  return (
    <div className="bg-[#0a0a0a]">
      {/* Film grain */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* ═══════════════════ NAV ═══════════════════ */}
      <nav className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-between px-6 h-[52px] mt-3">
        <div className="w-32" />
        <a
          href="/"
          className="text-[40px] text-white/85 mt-4 tracking-[-0.02em] transition-colors hover:text-white"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Retake
        </a>
        <div className="w-32 flex justify-end">
          <a
            href="/"
            className="text-[13px] font-medium text-white/40 transition-colors hover:text-white/80"
          >
            Site Owners
          </a>
        </div>
      </nav>

      {/* ═══════════════════ 1. HERO ═══════════════════ */}
      <section className="relative flex min-h-dvh items-center justify-center overflow-hidden px-6">
        {/* Ambient glows */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute top-1/4 left-[20%] h-[600px] w-[600px] rounded-full animate-drift"
            style={{ background: "radial-gradient(circle, rgba(255,107,53,0.06) 0%, transparent 70%)" }}
          />
          <div
            className="absolute bottom-1/4 right-[15%] h-[500px] w-[500px] rounded-full animate-drift-delayed"
            style={{ background: "radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)" }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <FadeIn>
            <p className="text-[13px] font-medium uppercase tracking-[0.2em] text-accent/70">For Agencies</p>
            <h1
              className="mt-6 text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.05] tracking-[-0.04em] text-white"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Book More Clients<br />
              <em>Without Cold Pitching</em>
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-[clamp(1rem,2.2vw,1.15rem)] leading-[1.7] text-white/50">
              Add a white-label AI audit to your website. Visitors find their own problems — then hand you their email to fix them.
            </p>
          </FadeIn>
          <FadeIn delay={0.15} className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <BookDemoButton />
            <BookDemoButton outline />
          </FadeIn>

          {/* Mini mockup */}
          <FadeIn delay={0.3} className="mt-16">
            <div
              className="mx-auto max-w-xl rounded-2xl overflow-hidden"
              style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.015)" }}
            >
              <div
                className="flex items-center gap-3 px-4 py-2.5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.025)" }}
              >
                <div className="flex gap-1.5 shrink-0">
                  <div className="h-2 w-2 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
                  <div className="h-2 w-2 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
                  <div className="h-2 w-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
                </div>
                <div
                  className="flex-1 mx-2 rounded px-3 py-1 text-[10px] text-white/30"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  youragency.com/free-audit
                </div>
              </div>
              <div className="p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg" style={{ background: "rgba(255,107,53,0.2)", border: "1px solid rgba(255,107,53,0.3)" }} />
                  <div>
                    <div className="h-3 w-28 rounded" style={{ background: "rgba(255,255,255,0.2)" }} />
                    <div className="mt-1.5 h-2 w-40 rounded" style={{ background: "rgba(255,255,255,0.08)" }} />
                  </div>
                </div>
                <div className="h-10 rounded-xl flex items-center px-4 text-[12px] text-white/25" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  Enter your website URL for a free audit...
                </div>
                <div className="h-10 rounded-xl flex items-center justify-center text-[13px] font-semibold text-white bg-accent/80">
                  Get Your Free Audit
                </div>
                <p className="text-center text-[10px] text-white/20">Powered by your brand</p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════ METRICS BAR ═══════════════════ */}
      <section className="relative py-12 px-6 bg-[#0a0a0a]">
        <FadeIn>
          <div
            className="mx-auto max-w-4xl rounded-2xl px-6 py-8 sm:py-6"
            style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-0 sm:divide-x sm:divide-white/[0.06]">
              {[
                { value: "38%", label: "avg. email capture rate" },
                { value: "61%", label: "audit completion rate" },
                { value: "< 60s", label: "time to full audit" },
                { value: "20x", label: "ROI on first closed deal" },
              ].map((m) => (
                <div key={m.label} className="text-center px-4">
                  <p className="text-[24px] sm:text-[28px] font-bold tracking-tight text-white">{m.value}</p>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.15em] text-white/30">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ═══════════════════ 2. PROBLEM ═══════════════════ */}
      <section className="relative py-20 sm:py-36 px-6 bg-[#0a0a0a] overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(239,68,68,0.03) 0%, transparent 60%)" }}
          />
        </div>
        <div className="relative mx-auto max-w-5xl">
          <SectionHeading
            subtitle="The problem"
            title="Most Agencies Are Leaving Leads on the Table."
          />
          <div className="mt-20 grid gap-5 sm:grid-cols-2">
            {problems.map((p, i) => {
              const rgb = hexToRgb(p.color);
              return (
                <FadeIn key={p.title} delay={i * 0.1}>
                  <div
                    className="group relative flex flex-col rounded-2xl p-7 h-full overflow-hidden transition-all duration-500"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `rgba(${rgb},0.25)`;
                      e.currentTarget.style.background = `rgba(${rgb},0.04)`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                      e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                    }}
                  >
                    <div
                      className="pointer-events-none absolute -top-4 -right-2 text-[90px] font-black leading-none select-none opacity-[0.04] transition-opacity duration-700 group-hover:opacity-[0.08]"
                      style={{ color: p.color, fontFamily: "var(--font-display), serif" }}
                    >
                      {p.stat}
                    </div>
                    <span
                      className="text-[28px] font-bold tracking-tight"
                      style={{ color: p.color }}
                    >
                      {p.stat}
                    </span>
                    <h3 className="mt-3 text-[16px] font-semibold text-white/85">{p.title}</h3>
                    <p className="mt-2 text-[13px] leading-[1.7] text-white/40">{p.desc}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════ ROI ═══════════════════ */}
      <section className="relative py-20 sm:py-36 px-6 bg-[#0a0a0a]">
        <div className="mx-auto max-w-3xl text-center">
          <SectionHeading
            subtitle="The math"
            title="Close Just One Extra Client Per Month."
          />
          <FadeIn delay={0.1}>
            <p className="mt-6 mx-auto max-w-lg text-[16px] leading-[1.8] text-white/50">
              If your average project is $3,000+, this system pays for itself with a single new client. Everything else is profit.
            </p>
          </FadeIn>
          <FadeIn delay={0.2} className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-6">
            <div
              className="flex-1 max-w-[220px] rounded-2xl p-8 text-center"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/30">Monthly cost</p>
              <p className="mt-3 text-[36px] font-bold tracking-tight text-white/80">$149</p>
            </div>
            <div className="flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-white/15">
                <path d="M10 16h12M18 12l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div
              className="flex-1 max-w-[220px] rounded-2xl p-8 text-center"
              style={{ background: "rgba(255,107,53,0.05)", border: "1px solid rgba(255,107,53,0.20)" }}
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-accent/60">1 new client</p>
              <p className="mt-3 text-[36px] font-bold tracking-tight text-accent">$3,000+</p>
            </div>
            <div className="flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-white/15">
                <path d="M16 8v16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M10 14l6-6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div
              className="flex-1 max-w-[220px] rounded-2xl p-8 text-center"
              style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.20)" }}
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-400/60">Return</p>
              <p className="mt-3 text-[36px] font-bold tracking-tight text-emerald-400">20x ROI</p>
            </div>
          </FadeIn>
          <FadeIn delay={0.3} className="mt-12">
            <BookDemoButton />
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════ PRODUCT DEMO ═══════════════════ */}
      <section className="relative py-20 sm:py-36 px-6 bg-[#0a0a0a]">
        <div className="mx-auto max-w-5xl">
          <SectionHeading
            subtitle="What your visitors see"
            title="An AI audit that sells for you."
            description="Your visitors enter their URL and get a detailed, voice-narrated website critique — branded to your agency. Here's what the experience looks like."
          />
          <FadeIn delay={0.15} className="mt-16">
            <div
              className="mx-auto max-w-4xl rounded-2xl overflow-hidden"
              style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.01)", boxShadow: "0 40px 120px rgba(0,0,0,0.5)" }}
            >
              {/* Browser chrome */}
              <div
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.025)" }}
              >
                <div className="flex gap-1.5 shrink-0">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
                </div>
                <div
                  className="flex-1 mx-2 rounded px-3 py-1 text-[11px] text-white/30"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  youragency.com/audit?url=prospect-site.com
                </div>
              </div>

              {/* Mock audit layout */}
              <div className="grid lg:grid-cols-[1fr_320px]">
                {/* Left: screenshot with hotspots */}
                <div className="relative min-h-[340px] overflow-hidden" style={{ background: "rgba(255,255,255,0.01)" }}>
                  {/* Mock page content */}
                  <div className="p-8 space-y-3 pointer-events-none select-none">
                    {/* Mock header */}
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-24 rounded" style={{ background: "rgba(255,255,255,0.18)" }} />
                      <div className="flex gap-3">
                        <div className="h-3 w-14 rounded" style={{ background: "rgba(255,255,255,0.08)" }} />
                        <div className="h-3 w-14 rounded" style={{ background: "rgba(255,255,255,0.08)" }} />
                        <div className="h-3 w-14 rounded" style={{ background: "rgba(255,255,255,0.08)" }} />
                      </div>
                    </div>
                    {/* Mock hero */}
                    <div className="mt-8 space-y-2">
                      <div className="h-6 w-4/5 rounded" style={{ background: "rgba(255,255,255,0.22)" }} />
                      <div className="h-4 w-3/5 rounded" style={{ background: "rgba(255,255,255,0.12)" }} />
                      <div className="h-3 w-2/5 rounded" style={{ background: "rgba(255,255,255,0.07)" }} />
                    </div>
                    <div className="mt-4 flex gap-3">
                      <div className="h-10 w-32 rounded-lg" style={{ background: "rgba(255,107,53,0.45)" }} />
                      <div className="h-10 w-28 rounded-lg" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
                    </div>
                    {/* Mock cards */}
                    <div className="mt-10 grid grid-cols-3 gap-3">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="rounded-xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                          <div className="h-12 rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }} />
                          <div className="h-2.5 w-3/4 rounded" style={{ background: "rgba(255,255,255,0.1)" }} />
                          <div className="h-2 w-1/2 rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hotspot overlays */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[52px] left-[36px]">
                      <span className="absolute -left-[8px] -top-[8px] h-7 w-7 rounded-full border-[1.5px] border-orange-500/25" />
                      <span className="absolute -left-[14px] -top-[14px] h-10 w-10 animate-ping rounded-full bg-orange-500/15" />
                      <span className="block h-3 w-3 rounded-full border-2 border-white bg-orange-500" style={{ boxShadow: "0 0 8px rgba(255,107,53,.35)" }} />
                    </div>
                    <div className="absolute top-[105px] left-[240px]">
                      <span className="absolute -left-[8px] -top-[8px] h-7 w-7 rounded-full border-[1.5px] border-orange-500/25" />
                      <span className="block h-3 w-3 rounded-full border-2 border-white bg-orange-500" style={{ boxShadow: "0 0 8px rgba(255,107,53,.35)" }} />
                    </div>
                    <div className="absolute top-[170px] left-[120px]">
                      <span className="absolute -left-[8px] -top-[8px] h-7 w-7 rounded-full border-[1.5px] border-orange-500/25" />
                      <span className="block h-3 w-3 rounded-full border-2 border-white bg-orange-500" style={{ boxShadow: "0 0 8px rgba(255,107,53,.35)" }} />
                    </div>
                  </div>

                  {/* Bottom player bar */}
                  <div
                    className="absolute bottom-0 left-0 right-0 flex items-center gap-3 px-5 py-3"
                    style={{ background: "linear-gradient(180deg, transparent 0%, rgba(10,10,10,0.95) 100%)" }}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-9 w-9 rounded-full overflow-hidden shrink-0" style={{ background: "rgba(255,255,255,0.1)" }}>
                        <div className="h-full w-full rounded-full" style={{ background: "linear-gradient(135deg, rgba(255,107,53,0.4), rgba(99,102,241,0.3))" }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold text-white/80 truncate">Hero Section — Missing CTA</p>
                        <p className="text-[10px] text-white/30 truncate">The headline is competing with too many elements...</p>
                      </div>
                    </div>
                    {/* Progress pips */}
                    <div className="flex items-center gap-1">
                      <span className="block w-6 h-1 rounded-full bg-orange-500" />
                      <span className="block w-1.5 h-1 rounded-full bg-white/10" />
                      <span className="block w-1.5 h-1 rounded-full bg-white/10" />
                      <span className="block w-1.5 h-1 rounded-full bg-white/10" />
                      <span className="block w-1.5 h-1 rounded-full bg-white/10" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 items-center gap-1.5 rounded-full bg-orange-500 px-4 text-[11px] font-semibold text-white">
                        Next
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3.5 2l4 3-4 3" /></svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: results panel */}
                <div
                  className="flex flex-col gap-5 p-6"
                  style={{ borderLeft: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}
                >
                  {/* Score */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium uppercase tracking-widest text-white/30">Overall Score</span>
                    <span className="text-[30px] font-bold tracking-tight text-amber-400/80">58</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full" style={{ width: "58%", background: "linear-gradient(90deg, #f59e0b, #ef4444)" }} />
                  </div>

                  <div className="h-px w-full" style={{ background: "rgba(255,255,255,0.06)" }} />

                  {/* Chapters */}
                  <div className="flex flex-col gap-3">
                    <span className="text-[10px] font-medium uppercase tracking-widest text-white/30">Audit Chapters</span>
                    {[
                      { title: "Hero Section", issue: "No clear primary CTA", color: "#ef4444" },
                      { title: "Navigation", issue: "7 items — decision paralysis", color: "#f59e0b" },
                      { title: "Social Proof", issue: "Buried below the fold", color: "#f59e0b" },
                      { title: "Pricing Layout", issue: "Missing comparison cues", color: "#ef4444" },
                      { title: "Footer CTA", issue: "Generic \"Contact us\"", color: "#8b5cf6" },
                    ].map((ch, idx) => (
                      <div key={ch.title} className="flex items-start gap-2.5">
                        <div
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: idx === 0 ? "#ff6b35" : ch.color, opacity: idx === 0 ? 1 : 0.5 }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className={`text-[12px] font-medium ${idx === 0 ? "text-white/80" : "text-white/45"}`}>{ch.title}</p>
                          <p className="text-[11px] leading-[1.5] text-white/25">{ch.issue}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="h-px w-full" style={{ background: "rgba(255,255,255,0.06)" }} />

                  {/* Voice narration indicator */}
                  <div className="flex items-center gap-2.5">
                    <div className="relative h-8 w-8 rounded-full overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
                      <div className="h-full w-full" style={{ background: "linear-gradient(135deg, rgba(255,107,53,0.5), rgba(99,102,241,0.3))" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-white/60">AI Voice Narration</p>
                      <p className="text-[10px] text-white/25">Walks through every finding</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[3, 5, 3, 7, 4, 6, 3, 5, 4].map((h, i) => (
                        <div
                          key={i}
                          className="w-[2px] rounded-full bg-orange-500/60"
                          style={{ height: h * 2, animation: `pulse ${0.8 + i * 0.1}s ease-in-out infinite alternate` }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Email gate preview */}
                  <div
                    className="rounded-xl p-4 text-center"
                    style={{ background: "rgba(255,107,53,0.06)", border: "1px solid rgba(255,107,53,0.15)" }}
                  >
                    <p className="text-[11px] font-semibold text-accent/80">Email Gate</p>
                    <p className="mt-1 text-[10px] text-white/30">Visitors enter their email to unlock the full report</p>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Callouts below mockup */}
          <div className="mt-12 grid gap-5 sm:grid-cols-3 max-w-3xl mx-auto">
            {[
              { label: "AI-powered analysis", value: "Under 60 seconds" },
              { label: "Voice narration", value: "Chapter-by-chapter walkthrough" },
              { label: "Branded to you", value: "Your logo, domain, colours" },
            ].map((item, i) => (
              <FadeIn key={item.label} delay={0.2 + i * 0.08}>
                <div className="text-center">
                  <p className="text-[14px] font-semibold text-white/80">{item.value}</p>
                  <p className="mt-1 text-[12px] text-white/30">{item.label}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ 3. SOLUTION ═══════════════════ */}
      <section className="relative py-20 sm:py-36 px-6 bg-[#0a0a0a] overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute top-1/3 right-[10%] h-[500px] w-[500px] rounded-full animate-drift"
            style={{ background: "radial-gradient(circle, rgba(255,107,53,0.04) 0%, transparent 70%)" }}
          />
        </div>
        <div className="relative mx-auto max-w-5xl">
          <SectionHeading
            subtitle="How it works"
            title="Your website becomes your best salesperson."
          />
          <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {solutions.map((s, i) => {
              const color = "#ff6b35";
              const rgb = hexToRgb(color);
              return (
                <FadeIn key={s.title} delay={i * 0.08}>
                  <div
                    className="group flex h-full flex-col rounded-2xl p-7 transition-all duration-500"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `rgba(${rgb},0.05)`;
                      e.currentTarget.style.borderColor = `rgba(${rgb},0.20)`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                    }}
                  >
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-500 group-hover:scale-110"
                      style={{ background: `rgba(${rgb},0.08)`, border: `1px solid rgba(${rgb},0.18)`, color }}
                    >
                      {s.icon}
                    </div>
                    <h3 className="mt-5 text-[16px] font-semibold tracking-[-0.01em] text-white">{s.title}</h3>
                    <p className="mt-2 text-[13px] leading-[1.7] text-white/45">{s.desc}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
          <FadeIn delay={0.3} className="mt-12 flex justify-center">
            <BookDemoButton />
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════ 4. AI CRITICS ═══════════════════ */}
      <section className="relative py-20 sm:py-36 px-6 bg-[#0a0a0a] overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute top-1/4 left-[20%] h-[600px] w-[600px] rounded-full animate-drift"
            style={{ background: "radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)" }}
          />
        </div>
        <div className="relative mx-auto max-w-5xl">
          <SectionHeading
            subtitle="AI critic library"
            title="Choose your critics. Or build your own."
            description="Pick from pre-built specialists, rename them, swap voices — or create entirely custom critics that match your agency's services."
          />

          <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {prebuiltCritics.map((c, i) => {
              const rgb = hexToRgb(c.color);
              return (
                <FadeIn key={c.name} delay={i * 0.06}>
                  <div
                    className="group flex items-center gap-4 rounded-2xl p-5 transition-all duration-500"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `rgba(${rgb},0.25)`;
                      e.currentTarget.style.background = `rgba(${rgb},0.04)`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                      e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                    }}
                  >
                    <div
                      className="relative h-12 w-12 shrink-0 rounded-full overflow-hidden transition-transform duration-500 group-hover:scale-110"
                      style={{ border: `2px solid rgba(${rgb},0.30)`, boxShadow: `0 0 20px rgba(${rgb},0.10)` }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={c.avatar}
                        alt={c.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[14px] font-semibold text-white/85">{c.name}</h3>
                      <p className="mt-1 text-[12px] leading-[1.6] text-white/40">{c.desc}</p>
                    </div>
                  </div>
                </FadeIn>
              );
            })}

            {/* Custom critic card */}
            <FadeIn delay={prebuiltCritics.length * 0.06}>
              <div
                className="group flex items-center gap-4 rounded-2xl p-5 transition-all duration-500 cursor-pointer"
                style={{ background: "transparent", border: "1px dashed rgba(255,255,255,0.12)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,107,53,0.35)";
                  e.currentTarget.style.background = "rgba(255,107,53,0.03)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-transform duration-500 group-hover:scale-110"
                  style={{ border: "2px dashed rgba(255,107,53,0.30)" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,107,53,0.6)" strokeWidth="1.5" strokeLinecap="round">
                    <line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-[14px] font-semibold text-white/85">Build Your Own</h3>
                  <p className="mt-1 text-[12px] leading-[1.6] text-white/40">Custom name, voice, photo, and focus areas</p>
                </div>
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={0.3} className="mt-12 flex justify-center">
            <BookDemoButton />
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════ 5. TWO WAYS TO USE IT ═══════════════════ */}
      <section className="relative py-20 sm:py-36 px-6 bg-[#0a0a0a] overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute top-1/3 left-[10%] h-[600px] w-[600px] rounded-full animate-drift"
            style={{ background: "radial-gradient(circle, rgba(255,107,53,0.03) 0%, transparent 70%)" }}
          />
          <div
            className="absolute bottom-1/4 right-[10%] h-[500px] w-[500px] rounded-full animate-drift-delayed"
            style={{ background: "radial-gradient(circle, rgba(139,92,246,0.03) 0%, transparent 70%)" }}
          />
        </div>
        <div className="relative mx-auto max-w-5xl">
          <SectionHeading
            subtitle="Two ways to generate leads"
            title="Inbound and outbound. Covered."
          />

          <div className="mt-20 grid gap-6 lg:grid-cols-2">
            {/* ── Inbound panel ── */}
            <FadeIn delay={0.05}>
              <div
                className="group relative rounded-2xl p-8 sm:p-10 h-full overflow-hidden transition-all duration-500"
                style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,107,53,0.20)";
                  e.currentTarget.style.background = "rgba(255,107,53,0.025)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.015)";
                }}
              >
                <div
                  className="pointer-events-none absolute -top-8 -right-4 text-[120px] font-black leading-none select-none opacity-[0.02] group-hover:opacity-[0.05] transition-opacity duration-700"
                  style={{ fontFamily: "var(--font-display), serif", color: "#ff6b35" }}
                >
                  IN
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: "rgba(255,107,53,0.10)", border: "1px solid rgba(255,107,53,0.20)", color: "#ff6b35" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-white">Inbound</h3>
                    <p className="text-[12px] text-white/35">Widget on your website</p>
                  </div>
                </div>
                <p className="mt-5 text-[14px] leading-[1.7] text-white/50">
                  The widget sits on your site and does the selling for you. Visitors get hooked by the audit, then hand over their email to see the full results.
                </p>
                <div className="mt-8 flex flex-col gap-5">
                  {inboundSteps.map((s, i) => {
                    const rgb = hexToRgb(s.color);
                    return (
                      <div key={s.num} className="flex items-start gap-4">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold"
                          style={{ background: `rgba(${rgb},0.10)`, color: s.color }}
                        >
                          {s.num}
                        </div>
                        <div>
                          <h4 className="text-[14px] font-semibold text-white/80">{s.title}</h4>
                          <p className="mt-1 text-[13px] leading-[1.6] text-white/35">{s.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </FadeIn>

            {/* ── Outbound panel ── */}
            <FadeIn delay={0.15}>
              <div
                className="group relative rounded-2xl p-8 sm:p-10 h-full overflow-hidden transition-all duration-500"
                style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(139,92,246,0.20)";
                  e.currentTarget.style.background = "rgba(139,92,246,0.025)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.015)";
                }}
              >
                <div
                  className="pointer-events-none absolute -top-8 -right-4 text-[120px] font-black leading-none select-none opacity-[0.02] group-hover:opacity-[0.05] transition-opacity duration-700"
                  style={{ fontFamily: "var(--font-display), serif", color: "#8b5cf6" }}
                >
                  OUT
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: "rgba(139,92,246,0.10)", border: "1px solid rgba(139,92,246,0.20)", color: "#8b5cf6" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-white">Outbound</h3>
                    <p className="text-[12px] text-white/35">API & bulk campaigns</p>
                  </div>
                </div>
                <p className="mt-5 text-[14px] leading-[1.7] text-white/50">
                  Use the API to pre-generate audits for any prospect list. Each one is branded to your agency and ready to drop into cold outreach.
                </p>
                <div className="mt-8 flex flex-col gap-5">
                  {outboundSteps.map((s, i) => {
                    const rgb = hexToRgb(s.color);
                    return (
                      <div key={s.num} className="flex items-start gap-4">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold"
                          style={{ background: `rgba(${rgb},0.10)`, color: s.color }}
                        >
                          {s.num}
                        </div>
                        <div>
                          <h4 className="text-[14px] font-semibold text-white/80">{s.title}</h4>
                          <p className="mt-1 text-[13px] leading-[1.6] text-white/35">{s.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={0.25} className="mt-12 flex justify-center">
            <BookDemoButton />
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════ NOT FOR EVERYONE ═══════════════════ */}
      <section className="relative py-16 sm:py-24 px-6 bg-[#0a0a0a]">
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <div
              className="rounded-2xl p-8 sm:p-10"
              style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 9v4" /><path d="M12 17h.01" /><circle cx="12" cy="12" r="10" />
                  </svg>
                </div>
                <h3
                  className="text-[20px] font-semibold tracking-[-0.02em] text-white"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  Retake isn&apos;t for everyone.
                </h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[12px] font-medium uppercase tracking-[0.15em] text-emerald-400/60 mb-3">Built for</p>
                  <div className="flex flex-col gap-2.5">
                    {[
                      "Agencies doing $10k+/mo in revenue",
                      "Teams with an existing website that gets traffic",
                      "Agencies selling web, SEO, or CRO services",
                    ].map((t) => (
                      <div key={t} className="flex items-start gap-2.5">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 shrink-0">
                          <path d="M3 7.5l2.5 2.5L11 4" stroke="rgba(16,185,129,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-[13px] leading-[1.5] text-white/55">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[12px] font-medium uppercase tracking-[0.15em] text-red-400/60 mb-3">Not a fit for</p>
                  <div className="flex flex-col gap-2.5">
                    {[
                      "Solo freelancers with no website traffic",
                      "Agencies without a service offering tied to websites",
                      "Teams looking for a generic chatbot or form builder",
                    ].map((t) => (
                      <div key={t} className="flex items-start gap-2.5">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 shrink-0">
                          <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="rgba(239,68,68,0.6)" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                        <span className="text-[13px] leading-[1.5] text-white/55">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════ PRICING ═══════════════════ */}
      <section className="relative py-20 sm:py-36 px-6 bg-[#0a0a0a]">
        <div className="mx-auto max-w-5xl">
          <SectionHeading subtitle="Agency plans" title="Simple, transparent pricing." />
          <div className="mt-20 grid gap-6 sm:grid-cols-3">
            {plans.map((plan, i) => {
              const accent = plan.highlighted ? "#ff6b35" : "#ffffff";
              const accentRgb = hexToRgb(accent);
              return (
                <FadeIn key={plan.name} delay={i * 0.1}>
                  <div
                    className="relative flex h-full flex-col rounded-2xl p-7 transition-all duration-500"
                    style={{
                      background: plan.highlighted ? "rgba(255,107,53,0.04)" : "rgba(255,255,255,0.02)",
                      border: plan.highlighted ? "1px solid rgba(255,107,53,0.25)" : "1px solid rgba(255,255,255,0.06)",
                      boxShadow: plan.highlighted ? "0 0 80px rgba(255,107,53,0.08)" : "none",
                    }}
                  >
                    {plan.highlighted && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-[11px] font-bold text-white">
                        Most Popular
                      </div>
                    )}
                    <h3 className="text-[18px] font-semibold text-white">{plan.name}</h3>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-[40px] font-bold tracking-tight text-white">{plan.price}</span>
                      <span className="text-[14px] text-white/35">{plan.period}</span>
                    </div>
                    <div className="mt-6 flex flex-col gap-3 flex-1">
                      {plan.features.map((f) => (
                        <div key={f} className="flex items-center gap-2.5">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M3 7.5l2.5 2.5L11 4" stroke={`rgba(${accentRgb},0.6)`} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span className="text-[13px] text-white/55">{f}</span>
                        </div>
                      ))}
                    </div>
                    <a
                      href={`mailto:sales@retake.site?subject=${encodeURIComponent(`Interested in Retake ${plan.name} plan`)}&body=${encodeURIComponent(`Hi,\n\nI'm interested in the ${plan.name} plan (${plan.price}${plan.period}) for my agency.\n\nCould we set up a quick call to discuss?\n\nThanks`)}`}
                      className={`mt-8 flex items-center justify-center rounded-xl py-3 text-[13px] font-semibold transition-all duration-300 ${
                        plan.highlighted
                          ? "bg-accent text-white hover:brightness-110"
                          : "bg-white/[0.06] text-white/70 hover:bg-white/[0.10]"
                      }`}
                    >
                      {plan.cta}
                    </a>
                  </div>
                </FadeIn>
              );
            })}
          </div>
          <FadeIn delay={0.3} className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <BookDemoButton />
            <BookDemoButton outline />
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════ 7. FAQ ═══════════════════ */}
      <section className="relative py-20 sm:py-36 px-6 bg-[#0a0a0a]">
        <div className="mx-auto max-w-2xl">
          <SectionHeading subtitle="FAQ" title="Common questions." />
          <div className="mt-16 flex flex-col gap-4">
            {faqs.map((faq, i) => (
              <FadeIn key={faq.q} delay={i * 0.06}>
                <div
                  className="rounded-2xl p-6 transition-all duration-400"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <h3 className="text-[15px] font-semibold text-white/85">{faq.q}</h3>
                  <p className="mt-3 text-[14px] leading-[1.7] text-white/45">{faq.a}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ FINAL CTA ═══════════════════ */}
      <section className="relative py-20 sm:py-36 px-6 bg-[#0a0a0a]">
        <div className="mx-auto max-w-lg text-center">
          <FadeIn>
            <h2
              className="text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.03em] text-white"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Ready to turn your site into a{" "}
              <em>lead machine</em>?
            </h2>
            <p className="mt-5 text-[16px] leading-[1.7] text-white/55">
              Book a 15-minute demo and we&apos;ll show you how it works with your brand.
            </p>
          </FadeIn>
          <FadeIn delay={0.1} className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <BookDemoButton />
            <BookDemoButton outline />
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <SiteFooter />
    </div>
  );
}
