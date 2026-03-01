"use client";

import { motion } from "framer-motion";
import { ease } from "@/lib/animations";
import { FadeIn } from "@/components/ui/fade-in";
import { SectionHeading } from "@/components/ui/section-heading";
import { SiteFooter } from "@/components/ui/site-footer";
import { SiteNav } from "@/components/ui/site-nav";

/* ───────── Data ───────── */

const creditPacks = [
  {
    name: "Starter",
    credits: 10,
    price: 19,
    perAudit: "1.90",
    popular: false,
  },
  {
    name: "Builder",
    credits: 30,
    price: 39,
    perAudit: "1.30",
    popular: true,
  },
  {
    name: "Pro",
    credits: 100,
    price: 99,
    perAudit: "0.99",
    popular: false,
  },
];

const subscriptions = [
  {
    name: "Growth",
    credits: 100,
    price: 49,
    perAudit: "0.49",
    features: [
      "100 credits / month",
      "All personas & audio",
      "Shareable audit links",
      "Priority generation",
    ],
  },
  {
    name: "Scale",
    credits: 500,
    price: 149,
    perAudit: "0.30",
    features: [
      "500 credits / month",
      "Everything in Growth",
      "API access",
      "Bulk CSV upload",
      "Full-site crawl audits",
    ],
  },
  {
    name: "Unlimited",
    credits: -1,
    price: 349,
    perAudit: null,
    features: [
      "Unlimited audits",
      "Everything in Scale",
      "White-label reports",
      "Dedicated support",
      "Custom integrations",
    ],
  },
];

const faqs = [
  {
    q: "What is a credit?",
    a: "1 credit = 1 page audit. Every audit includes the full interactive walkthrough with AI narration, insights, score, and a shareable link.",
  },
  {
    q: "Do credits expire?",
    a: "Credit packs never expire. Subscription credits refresh monthly and don't roll over.",
  },
  {
    q: "What counts as a page audit?",
    a: "One URL = one audit. A full-site crawl that analyses 30 pages uses 30 credits.",
  },
  {
    q: "Can I try it for free?",
    a: "Yes — every account gets 3 free audits, no credit card required.",
  },
  {
    q: "What's the difference between packs and subscriptions?",
    a: "Packs are one-time purchases with no expiry — great for occasional use. Subscriptions auto-refill monthly at a lower per-audit cost — best for teams and agencies.",
  },
  {
    q: "Do you offer refunds?",
    a: "Credit packs are non-refundable once purchased. Subscriptions can be cancelled any time — you keep access until the end of the billing period.",
  },
  {
    q: "What about full-site audits and bulk prospecting?",
    a: "Both use the same credit system. Full-site crawls audit each discovered page (1 credit per page). Bulk CSV upload is available on Scale and above.",
  },
];

/* ───────── Page ───────── */

export default function PricingPage() {
  return (
    <div className="bg-neutral-950 min-h-dvh">
      <SiteNav />

      {/* ─── Hero ─── */}
      <section className="px-6 pt-20 pb-10 text-center sm:pt-28 sm:pb-14">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-[13px] font-medium uppercase tracking-[0.2em] text-white/40"
        >
          Pricing
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease }}
          className="mx-auto mt-5 max-w-xl text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.03em] text-white"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Simple, transparent pricing.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.7 }}
          className="mx-auto mt-5 max-w-md text-[16px] leading-[1.7] text-white/55"
        >
          Start free. Buy credits when you need them. Subscribe when it makes
          sense.
        </motion.p>
      </section>

      {/* ─── Free tier callout ─── */}
      <FadeIn className="mx-auto max-w-5xl px-6">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-8 py-7 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="text-[17px] font-semibold text-white">
              3 free audits
            </p>
            <p className="mt-1 text-[14px] text-white/45">
              No credit card. Full experience — audio, insights, shareable
              links.
            </p>
          </div>
          <a
            href="/"
            className="shrink-0 rounded-full bg-orange-500 px-6 py-2.5 text-[14px] font-semibold text-white transition-all hover:bg-orange-400 hover:scale-[1.02] active:scale-[0.98]"
          >
            Get started
          </a>
        </div>
      </FadeIn>

      {/* ─── Credit packs ─── */}
      <section className="px-6 pt-24 pb-8">
        <SectionHeading
          subtitle="Pay as you go"
          title="Credit packs"
          description="One-time purchase. Never expires. 1 credit = 1 page audit."
          descriptionClassName="mx-auto mt-4 max-w-sm text-[15px] leading-[1.7] text-white/50"
        />

        <div className="mx-auto mt-14 grid max-w-3xl gap-5 sm:grid-cols-3">
          {creditPacks.map((pack, i) => (
            <FadeIn key={pack.name} delay={i * 0.08}>
              <div
                className={`relative flex flex-col items-center rounded-2xl p-8 text-center transition-all duration-300 ${
                  pack.popular
                    ? "border border-orange-500/30 bg-orange-500/[0.04] ring-1 ring-orange-500/10"
                    : "border border-white/[0.06] hover:border-white/[0.1] hover:bg-white/[0.015]"
                }`}
              >
                {pack.popular && (
                  <span className="absolute -top-3 rounded-full bg-orange-500 px-3 py-0.5 text-[11px] font-semibold text-white">
                    Most popular
                  </span>
                )}
                <p className="text-[13px] font-medium uppercase tracking-widest text-white/40">
                  {pack.name}
                </p>
                <p className="mt-4 text-[42px] font-bold leading-none tracking-tight text-white">
                  ${pack.price}
                </p>
                <p className="mt-2 text-[14px] text-white/40">
                  {pack.credits} credits
                </p>
                <div className="mt-5 h-px w-full bg-white/[0.06]" />
                <p className="mt-5 text-[13px] text-white/50">
                  <span className="font-semibold text-white/80">
                    ${pack.perAudit}
                  </span>{" "}
                  per audit
                </p>
                <button className="mt-6 w-full cursor-pointer rounded-full bg-white/[0.07] py-2.5 text-[14px] font-semibold text-white transition-all hover:bg-white/[0.12] active:scale-[0.97]">
                  Buy credits
                </button>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ─── Subscription tiers ─── */}
      <section className="px-6 pt-24 pb-8">
        <SectionHeading
          subtitle="For teams & agencies"
          title="Monthly plans"
          description="Auto-refilling credits each month at a lower cost per audit. Cancel any time."
          descriptionClassName="mx-auto mt-4 max-w-md text-[15px] leading-[1.7] text-white/50"
        />

        <div className="mx-auto mt-14 grid max-w-4xl gap-5 sm:grid-cols-3">
          {subscriptions.map((plan, i) => (
            <FadeIn key={plan.name} delay={i * 0.08}>
              <div className="flex h-full flex-col rounded-2xl border border-white/[0.06] p-8 transition-all duration-300 hover:border-white/[0.1] hover:bg-white/[0.015]">
                <p className="text-[13px] font-medium uppercase tracking-widest text-white/40">
                  {plan.name}
                </p>
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-[42px] font-bold leading-none tracking-tight text-white">
                    ${plan.price}
                  </span>
                  <span className="text-[14px] text-white/35">/mo</span>
                </div>
                {plan.perAudit && (
                  <p className="mt-2 text-[13px] text-white/50">
                    <span className="font-semibold text-white/80">
                      ${plan.perAudit}
                    </span>{" "}
                    per audit
                  </p>
                )}
                <div className="mt-6 h-px w-full bg-white/[0.06]" />
                <ul className="mt-6 flex flex-1 flex-col gap-3">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-[14px] text-white/55"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="mt-0.5 shrink-0 text-orange-500/70"
                      >
                        <path
                          d="M3.5 8.5l3 3 6-6.5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button className="mt-8 w-full cursor-pointer rounded-full bg-white/[0.07] py-2.5 text-[14px] font-semibold text-white transition-all hover:bg-white/[0.12] active:scale-[0.97]">
                  Subscribe
                </button>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ─── How credits work ─── */}
      <section className="px-6 pt-28 pb-8">
        <SectionHeading title="How credits work" />

        <div className="mx-auto mt-14 grid max-w-3xl gap-5 sm:grid-cols-3">
          {[
            {
              icon: (
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="4" y="6" width="24" height="20" rx="3" />
                  <path d="M4 12h24" />
                  <path d="M10 18h4" />
                </svg>
              ),
              title: "1 credit = 1 page",
              desc: "Every URL you audit costs one credit. Same price regardless of persona or site size.",
            },
            {
              icon: (
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="16" cy="16" r="12" />
                  <path d="M16 10v6l4 3" />
                </svg>
              ),
              title: "Packs never expire",
              desc: "Buy once, use whenever. No monthly pressure, no wasted credits.",
            },
            {
              icon: (
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 8l16 16M24 8L8 24" />
                  <circle cx="16" cy="16" r="12" />
                </svg>
              ),
              title: "No feature gates",
              desc: "Everyone gets audio, sharing, all personas, and the full premium experience. We only meter volume.",
            },
          ].map((item, i) => (
            <FadeIn key={item.title} delay={i * 0.08}>
              <div className="flex flex-col items-center text-center">
                <div className="text-white/30">{item.icon}</div>
                <h3 className="mt-4 text-[16px] font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.7] text-white/50">
                  {item.desc}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ─── Coming soon ─── */}
      <section className="px-6 pt-28 pb-8">
        <SectionHeading subtitle="Coming soon" title="More ways to audit" />

        <div className="mx-auto mt-14 grid max-w-3xl gap-5 sm:grid-cols-2">
          {[
            {
              title: "Full-site crawl",
              desc: "Audit every page on a site automatically. 1 credit per page discovered. Get a rolled-up report with prioritised issues.",
              credits: "1 credit / page",
            },
            {
              title: "Visual mockups",
              desc: "AI-generated redesign suggestions for each insight. See how your site could look with the fixes applied.",
              credits: "2–3 credits / audit",
            },
            {
              title: "Bulk prospecting",
              desc: "Upload a CSV of URLs and generate personalised audit summaries for outreach. Perfect for agencies and sales teams.",
              credits: "1 credit / page",
            },
            {
              title: "API access",
              desc: "Integrate audits into your own workflows. Available on Scale plans and above.",
              credits: "Included",
            },
          ].map((item, i) => (
            <FadeIn key={item.title} delay={i * 0.06}>
              <div className="rounded-2xl border border-white/[0.06] p-6 transition-all duration-300 hover:border-white/[0.1] hover:bg-white/[0.015]">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-[16px] font-semibold text-white">
                    {item.title}
                  </h3>
                  <span className="shrink-0 rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-white/40">
                    {item.credits}
                  </span>
                </div>
                <p className="mt-2.5 text-[14px] leading-[1.7] text-white/45">
                  {item.desc}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="px-6 pt-28 pb-16">
        <SectionHeading title="Questions & answers" />

        <div className="mx-auto mt-14 max-w-2xl divide-y divide-white/[0.06]">
          {faqs.map((faq, i) => (
            <FadeIn key={faq.q} delay={i * 0.04}>
              <div className="py-6">
                <h3 className="text-[15px] font-semibold text-white/90">
                  {faq.q}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.7] text-white/45">
                  {faq.a}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ─── Bottom CTA ─── */}
      <section className="px-6 pt-12 pb-24">
        <FadeIn className="mx-auto max-w-lg text-center">
          <h2
            className="text-[clamp(1.8rem,4vw,2.8rem)] leading-[1.1] tracking-[-0.02em] text-white"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Start with 3 free audits.
          </h2>
          <p className="mt-4 text-[15px] text-white/50">
            No credit card. No commitment.
          </p>
          <a
            href="/"
            className="mt-8 inline-block rounded-full bg-orange-500 px-8 py-3 text-[15px] font-semibold text-white transition-all hover:bg-orange-400 hover:scale-[1.02] active:scale-[0.98]"
          >
            Try it free
          </a>
        </FadeIn>
      </section>

      <SiteFooter />
    </div>
  );
}
