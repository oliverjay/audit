"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { UrlInput } from "@/components/ui/url-input";
import { FadeIn } from "@/components/ui/fade-in";
import { SectionHeading } from "@/components/ui/section-heading";
import { SiteFooter } from "@/components/ui/site-footer";
import { personaMeta } from "@/lib/config";
import { getRecentAudits, type RecentAudit } from "@/lib/recent-audits";
import { scoreColor, timeAgo, hexToRgb } from "@/lib/utils";
import { ease } from "@/lib/animations";
import { track } from "@/lib/analytics";

const steps = [
  {
    num: "01",
    title: "Paste any URL",
    desc: "Drop in a live website. We screenshot it, scrape the content, and prepare everything for analysis.",
    color: "#ff6b35",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4.5" ry="9" />
        <path d="M3 12h18" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Pick your critic",
    desc: "Choose a UX consultant, a CRO specialist, or a brutally honest roaster. Each brings a different lens.",
    color: "#6366f1",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3" /><path d="M3 19c0-3.314 2.686-6 6-6s6 2.686 6 6" />
        <circle cx="17" cy="9" r="2.5" /><path d="M17 13c2.761 0 5 2.239 5 5" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Watch & listen",
    desc: "Your critic walks the site with a voiced critique, spotlighting what's wrong and how to fix it.",
    color: "#10b981",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="12" rx="2" /><path d="M9 10l4 2.5L9 15V10z" fill="currentColor" stroke="none" />
        <path d="M8 19h8" /><path d="M12 16v3" />
      </svg>
    ),
  },
];

const critics = [
  {
    id: "ux" as const,
    tagline: "Spots the friction your users feel but never mention.",
    sample:
      "Your hero headline is fighting for attention with three competing CTAs. Let\u2019s simplify \u2014 one clear action above the fold changes everything.",
  },
  {
    id: "cro" as const,
    tagline: "Finds the leaks that stop visitors becoming customers.",
    sample:
      "The value prop is buried below two stock photos. Industry data shows you\u2019re losing 40% of visitors before they even see what you offer.",
  },
  {
    id: "roast" as const,
    tagline: "Delivers the blunt, unfiltered truth about your site.",
    sample:
      "\u201cGet started today\u201d \u2014 really? I\u2019ve seen better CTAs on a 404 page. Your footer has more personality than your hero section.",
  },
];

const stats = [
  { value: "60s", label: "Average audit time" },
  { value: "5\u20137", label: "Insights per audit" },
  { value: "100%", label: "Free, no signup" },
];

function AuditPreviewMock() {
  const mockChapters = [
    { title: "Hero clarity & CTA", active: true },
    { title: "Navigation overload", active: false },
    { title: "Social proof placement", active: false },
    { title: "Value proposition", active: false },
    { title: "Mobile responsiveness", active: false },
    { title: "Trust signals", active: false },
  ];

  return (
    <div
      className="w-full max-w-4xl mx-auto rounded-2xl overflow-hidden select-none"
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        background: "#0a0a0a",
        boxShadow: "0 40px 100px rgba(0,0,0,0.6), 0 0 80px rgba(255,107,53,0.03)",
      }}
    >
      {/* ── Header bar ── */}
      <div
        className="flex items-center px-3 py-2 sm:px-4"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "linear-gradient(180deg, rgba(23,23,23,0.97) 0%, rgba(18,18,18,0.95) 100%)",
        }}
      >
        {/* Left: back + persona */}
        <div className="flex items-center gap-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full text-white/25">
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 4L6 9l5 5" /></svg>
          </div>
          <div className="flex items-center gap-2 rounded-full px-1.5 py-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/avatars/marcus.webp" alt="" className="h-6 w-6 rounded-full ring-[2px] ring-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.25)]" />
            <span className="hidden text-[12px] font-medium text-white/80 sm:block">Marcus</span>
            <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/25"><path d="M2.5 4L5 6.5L7.5 4" /></svg>
          </div>
        </div>

        {/* Center: hostname */}
        <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1">
            <div className="h-3 w-3 rounded-sm" style={{ background: "rgba(16,185,129,0.5)" }} />
            <span className="text-[12px] font-medium text-white/55">acme.com</span>
          </div>
        </div>

        {/* Right: actions */}
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-white/35" style={{ background: "rgba(255,255,255,0.04)" }}>
            <svg width="12" height="12" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5h12M3 9h12M3 13h12" /></svg>
            Tasks
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[8px] font-bold text-white">3</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-neutral-900">
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 5l-3-3-3 3" /><path d="M7 2v8" /><path d="M2 10v1.5A1.5 1.5 0 0 0 3.5 13h7a1.5 1.5 0 0 0 1.5-1.5V10" /></svg>
            Share
          </div>
        </div>
      </div>

      {/* ── Main area: screenshot + hotspots + bottom panel ── */}
      <div className="relative" style={{ height: "clamp(320px, 50vw, 480px)" }}>
        {/* Mock website screenshot background (dark mode) */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="h-full w-full p-6 sm:p-10 space-y-4 pointer-events-none" style={{ background: "linear-gradient(180deg, #111113 0%, #18181b 40%, #111113 100%)" }}>
            {/* Nav bar */}
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-20 rounded" style={{ background: "rgba(255,255,255,0.12)" }} />
              <div className="flex gap-4">
                {[1,2,3,4].map(n => <div key={n} className="h-2 w-12 rounded" style={{ background: "rgba(255,255,255,0.06)" }} />)}
                <div className="h-6 w-16 rounded-md" style={{ background: "rgba(255,255,255,0.08)" }} />
              </div>
            </div>
            {/* Hero */}
            <div className="mt-6 sm:mt-10 max-w-md">
              <div className="h-5 w-4/5 rounded" style={{ background: "rgba(255,255,255,0.15)" }} />
              <div className="mt-2 h-5 w-3/5 rounded" style={{ background: "rgba(255,255,255,0.10)" }} />
              <div className="mt-3 h-3 w-full rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
              <div className="mt-1.5 h-3 w-4/5 rounded" style={{ background: "rgba(255,255,255,0.04)" }} />
              <div className="mt-5 flex gap-3">
                <div className="h-9 w-28 rounded-lg" style={{ background: "rgba(99,102,241,0.6)" }} />
                <div className="h-9 w-24 rounded-lg" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>
            </div>
            {/* Cards row */}
            <div className="mt-8 sm:mt-12 grid grid-cols-3 gap-4">
              {[1,2,3].map(n => (
                <div key={n} className="rounded-xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="h-8 w-8 rounded-lg" style={{ background: "rgba(99,102,241,0.15)" }} />
                  <div className="h-2.5 w-3/4 rounded" style={{ background: "rgba(255,255,255,0.10)" }} />
                  <div className="h-2 w-full rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
                  <div className="h-2 w-4/5 rounded" style={{ background: "rgba(255,255,255,0.04)" }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hotspot markers */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Hotspot 1: hero CTA area */}
          <div className="absolute" style={{ left: "18%", top: "62%" }}>
            <span className="absolute -left-[10px] -top-[10px] h-7 w-7 animate-ping rounded-full bg-orange-500/20" />
            <span className="absolute -left-[6px] -top-[6px] h-5 w-5 rounded-full border-[1.5px] border-orange-500/30" />
            <span className="block h-2.5 w-2.5 rounded-full border-2 border-white bg-orange-500" style={{ boxShadow: "0 0 8px rgba(255,107,53,0.4), 0 0 20px rgba(255,107,53,0.15)" }} />
          </div>
          {/* Hotspot 2: nav area */}
          <div className="absolute" style={{ left: "72%", top: "10%" }}>
            <span className="absolute -left-[10px] -top-[10px] h-7 w-7 animate-ping rounded-full bg-orange-500/20" style={{ animationDelay: "0.4s" }} />
            <span className="absolute -left-[6px] -top-[6px] h-5 w-5 rounded-full border-[1.5px] border-orange-500/30" />
            <span className="block h-2.5 w-2.5 rounded-full border-2 border-white bg-orange-500" style={{ boxShadow: "0 0 8px rgba(255,107,53,0.4), 0 0 20px rgba(255,107,53,0.15)" }} />
          </div>
        </div>

        {/* Gradient scrim at bottom so panel reads well */}
        <div className="absolute inset-x-0 bottom-0 h-48 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.6) 50%, transparent 100%)" }} />

        {/* ── Floating bottom panel ── */}
        <div className="absolute inset-x-0 bottom-0 flex justify-center pb-4 px-3 sm:px-5">
          <div
            className="w-full max-w-[440px] rounded-2xl ring-1 ring-white/[0.08]"
            style={{
              background: "linear-gradient(135deg, rgba(20,20,20,0.92) 0%, rgba(10,10,10,0.95) 100%)",
              backdropFilter: "blur(40px) saturate(1.2)",
              boxShadow: "0 8px 50px rgba(0,0,0,0.5)",
            }}
          >
            {/* Content row */}
            <div className="flex items-start gap-3 px-4 pt-3.5 pb-2.5">
              {/* Voice orb mock */}
              <div className="relative shrink-0">
                <div className="relative flex items-center justify-center" style={{ width: 56, height: 56 }}>
                  {/* Orange waveform bars radiating outward */}
                  <svg className="absolute inset-0" viewBox="0 0 56 56" fill="none">
                    {Array.from({ length: 20 }).map((_, i) => {
                      const angle = (i / 20) * Math.PI * 2 - Math.PI / 2;
                      const lengths = [5, 7, 4, 8, 6, 9, 5, 7, 8, 4, 6, 8, 5, 7, 9, 6, 4, 8, 7, 5];
                      const innerR = 19;
                      const outerR = innerR + lengths[i];
                      const r = (v: number) => Math.round(v * 100) / 100;
                      const x1 = r(28 + Math.cos(angle) * innerR);
                      const y1 = r(28 + Math.sin(angle) * innerR);
                      const x2 = r(28 + Math.cos(angle) * outerR);
                      const y2 = r(28 + Math.sin(angle) * outerR);
                      const opacity = 0.35 + (lengths[i] / 9) * 0.45;
                      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={`rgba(255,107,53,${opacity.toFixed(2)})`} strokeWidth="2" strokeLinecap="round" />;
                    })}
                  </svg>
                  {/* Orange glow */}
                  <div className="absolute rounded-full animate-pulse" style={{ width: 42, height: 42, boxShadow: "0 0 18px rgba(255,107,53,0.3), 0 0 40px rgba(255,107,53,0.1)" }} />
                  {/* Avatar */}
                  <div className="relative overflow-hidden rounded-full ring-2 ring-orange-500/50" style={{ width: 36, height: 36 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/avatars/marcus.webp" alt="" className="h-full w-full object-cover" />
                  </div>
                </div>
              </div>

              {/* Insight text */}
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="mb-0.5 flex items-baseline gap-2">
                  <span className="text-[12px] sm:text-[13px] font-semibold text-white truncate">Hero clarity & CTA</span>
                  <span className="shrink-0 text-[9px] tabular-nums font-medium text-white/20">1/6</span>
                </div>
                <p className="text-[11px] sm:text-[12px] leading-relaxed text-white/50 line-clamp-2">
                  Your primary CTA is competing with three secondary actions above the fold. Let&apos;s simplify to one clear path.
                </p>
              </div>

              {/* Thumbs up */}
              <div className="flex shrink-0 items-center pt-1">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M5 14H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h2m0 7V7m0 7h6.6a2 2 0 0 0 2-1.7l.7-4.6a1 1 0 0 0-1-1.2H10V3.5A1.5 1.5 0 0 0 8.5 2L5 7" /></svg>
                </div>
              </div>
            </div>

            {/* Nav bar */}
            <div className="flex items-center gap-1.5 border-t border-white/[0.05] px-3 py-1.5">
              {/* Prev */}
              <div className="flex h-6 w-6 items-center justify-center rounded-full text-white/15">
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 3L5 7l4 4" /></svg>
              </div>
              {/* Progress pips */}
              <div className="flex flex-1 items-center justify-center gap-1">
                {mockChapters.map((ch, i) => (
                  <span
                    key={i}
                    className={`block rounded-full transition-all ${ch.active ? "w-5 h-[3px] bg-orange-500" : "w-1 h-[3px] bg-white/10"}`}
                  />
                ))}
              </div>
              {/* Next */}
              <div className="flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1 text-[10px] font-semibold text-white">
                Next
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3l4 4-4 4" /></svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CriticCard({ c, i }: { c: (typeof critics)[0]; i: number }) {
  const meta = personaMeta[c.id];
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const rgb = hexToRgb(meta.color);

  function handleClick() {
    track("Critic Card Clicked", { critic: meta.name, critic_id: c.id });
    setClicked(true);
    setTimeout(() => setClicked(false), 700);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      const input = document.querySelector('input[type="text"]') as HTMLInputElement | null;
      input?.focus();
    }, 750);
  }

  const active = clicked || hovered;

  return (
    <FadeIn delay={i * 0.12}>
      <div
        className="group relative flex h-full cursor-pointer flex-col items-center overflow-hidden rounded-2xl p-8 text-center"
        style={{
          border: clicked
            ? `1px solid rgba(${rgb},0.65)`
            : hovered
              ? `1px solid rgba(${rgb},0.35)`
              : "1px solid rgba(255,255,255,0.07)",
          background: active ? `rgba(${rgb},0.05)` : "rgba(255,255,255,0.02)",
          boxShadow: clicked
            ? `0 0 90px rgba(${rgb},0.18), inset 0 1px 0 rgba(255,255,255,0.06)`
            : hovered
              ? `0 0 60px rgba(${rgb},0.1), inset 0 1px 0 rgba(255,255,255,0.04)`
              : "inset 0 1px 0 rgba(255,255,255,0.02)",
          transition: "all 0.4s ease",
        }}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Radial ambient glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, rgba(${rgb},0.12) 0%, transparent 65%)`,
            opacity: active ? 1 : 0,
            transition: "opacity 0.5s ease",
          }}
        />

        {/* Avatar */}
        <div
          className="relative h-24 w-24 overflow-hidden rounded-full"
          style={{
            border: hovered ? `2px solid rgba(${rgb},0.55)` : "1px solid rgba(255,255,255,0.10)",
            boxShadow: hovered ? `0 0 28px rgba(${rgb},0.3)` : "none",
            transform: hovered ? "scale(1.06)" : "scale(1)",
            transition: "all 0.4s ease",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={meta.avatar} alt={meta.name} className="h-full w-full object-cover" />
        </div>

        <h3 className="mt-5 text-[19px] font-semibold tracking-[-0.01em] text-white">{meta.name}</h3>
        <p
          className="mt-1 text-[12px] font-semibold uppercase tracking-widest transition-colors duration-400"
          style={{ color: active ? `rgba(${rgb},0.85)` : "rgba(255,255,255,0.30)" }}
        >
          {meta.title}
        </p>
        <p className="mt-4 text-[14px] leading-[1.7] text-white/50">{c.tagline}</p>

        {/* Sample quote */}
        <div
          className="mt-5 w-full rounded-xl px-4 py-4 text-left"
          style={{
            background: active ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
            border: active ? `1px solid rgba(${rgb},0.18)` : "1px solid rgba(255,255,255,0.05)",
            transition: "all 0.4s ease",
          }}
        >
          <div className="mb-2 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color, opacity: 0.8 }} />
            <span className="text-[10px] font-medium uppercase tracking-widest text-white/25">Sample insight</span>
          </div>
          <p className="text-[13px] leading-[1.65] text-white/65 italic">&ldquo;{c.sample}&rdquo;</p>
        </div>

        {/* Hover CTA — slides up */}
        <div
          className="mt-4 w-full"
          style={{
            opacity: hovered ? 1 : 0,
            transform: hovered ? "translateY(0)" : "translateY(6px)",
            transition: "opacity 0.3s ease, transform 0.3s ease",
          }}
        >
          <div
            className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold"
            style={{
              background: `rgba(${rgb},0.18)`,
              border: `1px solid rgba(${rgb},0.30)`,
              color: `rgba(${rgb},1)`,
            }}
          >
            Audit with {meta.name}
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2.5 6.5h8M7 3l3.5 3.5L7 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}

export default function Home() {
  const router = useRouter();
  const [recents, setRecents] = useState<RecentAudit[]>([]);
  const [bgLoaded, setBgLoaded] = useState(false);
  const bgRef = useRef<HTMLImageElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const [ringSize, setRingSize] = useState(560);

  useEffect(() => {
    setRecents(getRecentAudits());
  }, []);

  useEffect(() => {
    if (bgRef.current?.complete) setBgLoaded(true);
  }, []);

  // Capture referral code from URL for waitlist attribution
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      sessionStorage.setItem("audit_ref", ref);
    }
  }, []);

  useEffect(() => {
    function measure() {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      const diagonal = Math.sqrt(rect.width * rect.width + rect.height * rect.height);
      setRingSize(Math.round(diagonal + 80));
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  function handleSubmit(rawUrl: string) {
    const normalized = rawUrl.match(/^https?:\/\//) ? rawUrl : `https://${rawUrl}`;
    let hn = "";
    try { hn = new URL(normalized).hostname; } catch { hn = normalized; }
    track("URL Submitted", { url: normalized, hostname: hn, source: "homepage" });
    // Fire the scrape immediately so it runs while the user picks a persona.
    // The choose page and use-audit hook read the result from sessionStorage.
    try {
      sessionStorage.setItem(
        "audit-scrape-cache",
        JSON.stringify({ url: normalized, data: null, ts: Date.now(), pending: true }),
      );
      fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error("Scrape failed");
          return res.json();
        })
        .then((data) => {
          sessionStorage.setItem(
            "audit-scrape-cache",
            JSON.stringify({ url: normalized, data, ts: Date.now() }),
          );
        })
        .catch(() => {
          sessionStorage.removeItem("audit-scrape-cache");
        });
    } catch {
      /* sessionStorage unavailable */
    }
    router.push(`/choose?url=${encodeURIComponent(normalized)}`);
  }

  const outerSize = Math.round(ringSize * 1.35);

  return (
    <div className="bg-[#0a0a0a]">
      {/* Film grain — covers entire page */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* ═══════════════════ NAV ═══════════════════ */}
      <nav
        className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-between px-6 h-[52px] mt-3"
      >
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
            href="/agencies"
            className="text-[13px] font-medium text-white/40 transition-colors hover:text-white/80"
          >
            For Agencies
          </a>
        </div>
      </nav>

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#0a0a0a]">
        {/* Circle motif — behind character image */}
        <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center">
          {/* Outer ring */}
          <div className="absolute animate-orbit-reverse" style={{ width: outerSize, height: outerSize }}>
            <div className="h-full w-full rounded-full" style={{ border: "1px solid rgba(255,255,255,0.08)" }} />
            <div
              className="absolute"
              style={{
                width: 5,
                height: 5,
                top: "50%",
                left: "50%",
                marginTop: -2.5,
                marginLeft: -2.5,
                transform: `translateY(${-outerSize / 2}px)`,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.6)",
                boxShadow: "0 0 10px rgba(255,255,255,0.35), 0 0 40px rgba(255,255,255,0.1)",
              }}
            />
          </div>
          {/* Inner ring */}
          <div className="absolute animate-orbit" style={{ width: ringSize, height: ringSize }}>
            <div className="h-full w-full rounded-full" style={{ border: "1px solid rgba(255,255,255,0.12)" }} />
            <div
              className="absolute"
              style={{
                width: 6,
                height: 6,
                top: "50%",
                left: "50%",
                marginTop: -3,
                marginLeft: -3,
                transform: `translateY(${-ringSize / 2}px)`,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.9)",
                boxShadow: "0 0 14px rgba(255,255,255,0.5), 0 0 50px rgba(255,255,255,0.15)",
              }}
            />
            <div
              className="absolute"
              style={{
                width: 4,
                height: 4,
                top: "50%",
                left: "50%",
                marginTop: -2,
                marginLeft: -2,
                transform: `translateY(${ringSize / 2}px)`,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.45)",
                boxShadow: "0 0 8px rgba(255,255,255,0.3), 0 0 30px rgba(255,255,255,0.08)",
              }}
            />
          </div>
        </div>

        {/* Character background — large screens only, above circles */}
        <div className="pointer-events-none absolute inset-0 z-[2] hidden xl:block" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={bgRef}
            src="/hp-large-bg.webp"
            alt=""
            className="absolute bottom-0 left-0 w-full object-cover transition-opacity duration-1000 ease-out"
            style={{ opacity: bgLoaded ? 1 : 0 }}
            onLoad={() => setBgLoaded(true)}
          />
        </div>

        {/* Hero content */}
        <div className="relative z-10 flex w-full flex-col items-center px-6">
          <div ref={heroRef} className="flex w-full max-w-2xl flex-col items-center py-20">
            <motion.h1
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease }}
              className="text-center text-[clamp(3rem,7.5vw,6rem)] leading-[1.05] tracking-[-0.04em] text-white"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              See Your Website
              <br />
              With <em>Fresh Eyes</em>.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.12, duration: 0.8 }}
              className="mt-6 text-center text-[clamp(1rem,2.4vw,1.15rem)] leading-[1.7] text-white/55 max-w-lg mx-auto"
            >
             Brutally honest website audits. Surprisingly useful.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.9, ease }}
              className="mt-10 w-full max-w-lg mx-auto"
            >
              <UrlInput onSubmit={handleSubmit} autoFocus />
            </motion.div>

            {/* Stats row — trust signals in the hero */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.7 }}
              className="mt-5 flex flex-wrap items-center justify-center gap-4"
            >
              {stats.map((s) => (
                <div key={s.label} className="flex items-baseline gap-1.5">
                  <span className="text-[13px] font-bold tracking-tight text-white/70">{s.value}</span>
                  <span className="text-[12px] text-white/30">{s.label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Recents — outside heroRef so they don't affect circle sizing */}
          {recents.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.6 }}
              className="flex w-full max-w-2xl flex-col items-center gap-2.5 -mt-4"
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/25">Recent</p>
              <div className="flex w-full flex-wrap justify-center gap-2">
                {recents.map((r, i) => {
                  const pMeta = personaMeta[r.persona];
                  return (
                    <a
                      key={`${r.url}-${r.persona}-${i}`}
                      href={`/audit?url=${encodeURIComponent(r.url)}&persona=${r.persona}`}
                      onClick={() => track("Recent Audit Clicked", { hostname: r.hostname, persona: r.persona, score: r.score })}
                      className="group flex items-center gap-2 rounded-full px-3.5 py-2 backdrop-blur-md transition-all duration-300 hover:bg-white/[0.09]"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      {r.favicon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.favicon} alt="" className="h-3.5 w-3.5 shrink-0 rounded-sm" />
                      ) : (
                        <span
                          className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded text-[7px] font-bold text-white/35"
                          style={{ background: "rgba(255,255,255,0.07)" }}
                        >
                          {r.hostname.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="text-[12px] text-white/55 group-hover:text-white/80 transition-colors">
                        {r.hostname}
                      </span>
                      <span className={`text-[11px] font-bold tabular-nums ${scoreColor(r.score)}`}>{r.score}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={pMeta.avatar}
                        alt={pMeta.name}
                        title={`${pMeta.name} — ${timeAgo(r.timestamp)}`}
                        className="h-3.5 w-3.5 rounded-full opacity-50 group-hover:opacity-80 transition-opacity"
                      />
                    </a>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>

        {/* Scroll hint — chevron */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-[9px] font-medium uppercase tracking-[0.25em] text-white/20">Scroll</span>
          <motion.svg
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            width="16"
            height="9"
            viewBox="0 0 16 9"
            fill="none"
            className="text-white/25"
          >
            <path d="M1 1l7 7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        </motion.div>
      </section>

      {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
      <section className="relative py-20 sm:py-40 px-6 bg-[#0a0a0a] overflow-hidden">
        {/* Ambient background glows */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute top-1/3 left-[15%] h-[600px] w-[600px] rounded-full animate-drift"
            style={{ background: "radial-gradient(circle, rgba(255,107,53,0.04) 0%, transparent 70%)" }}
          />
          <div
            className="absolute bottom-1/4 right-[15%] h-[500px] w-[500px] rounded-full animate-drift-delayed"
            style={{ background: "radial-gradient(circle, rgba(16,185,129,0.035) 0%, transparent 70%)" }}
          />
        </div>

        <div className="relative mx-auto max-w-5xl">
          <SectionHeading subtitle="How it works" title="Three steps. Zero effort." />

          <div className="mt-20 grid gap-6 sm:grid-cols-3 sm:gap-8 relative z-10">
            {steps.map((s, i) => {
              const rgb = hexToRgb(s.color);
              return (
                <FadeIn key={s.num} delay={i * 0.15}>
                  <div
                    className="group relative flex flex-col items-center text-center rounded-3xl p-8 pb-10 h-full overflow-hidden transition-all duration-500"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `rgba(${rgb},0.06)`;
                      e.currentTarget.style.borderColor = `rgba(${rgb},0.25)`;
                      e.currentTarget.style.boxShadow = `0 0 80px rgba(${rgb},0.1), 0 30px 60px rgba(0,0,0,0.4)`;
                      e.currentTarget.style.transform = "translateY(-6px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    {/* Watermark step number */}
                    <div
                      className="pointer-events-none absolute -top-5 -right-3 text-[150px] font-black leading-none select-none opacity-[0.025] transition-opacity duration-700 group-hover:opacity-[0.07]"
                      style={{ color: s.color, fontFamily: "var(--font-display), serif" }}
                    >
                      {s.num}
                    </div>

                    {/* Glow orb behind icon */}
                    <div
                      className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 h-28 w-28 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                      style={{ background: `radial-gradient(circle, rgba(${rgb},0.25) 0%, transparent 70%)` }}
                    />

                    {/* Timeline dot */}
                    <div
                      className="relative mb-6 flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-500 group-hover:scale-110"
                      style={{
                        background: `rgba(${rgb},0.08)`,
                        border: `1px solid rgba(${rgb},0.18)`,
                        color: s.color,
                      }}
                    >
                      <div className="scale-125">{s.icon}</div>
                      {/* Pulse ring on hover */}
                      <div
                        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 animate-pulse-ring"
                        style={{ border: `1px solid rgba(${rgb},0.3)` }}
                      />
                    </div>

                    {/* Step label */}
                    <span
                      className="text-[11px] font-bold uppercase tracking-[0.25em] transition-colors duration-500"
                      style={{ color: `rgba(${rgb},0.45)` }}
                    >
                      Step {s.num}
                    </span>

                    <h3
                      className="mt-3 text-[20px] font-semibold tracking-[-0.02em] text-white transition-colors duration-500"
                    >
                      {s.title}
                    </h3>

                    <p className="mt-3 text-[14px] leading-[1.75] text-white/45 max-w-[260px]">{s.desc}</p>

                    {/* Bottom accent line */}
                    <div
                      className="absolute bottom-0 left-[15%] right-[15%] h-px opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                      style={{ background: `linear-gradient(90deg, transparent, rgba(${rgb},0.4), transparent)` }}
                    />
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════ MEET YOUR CRITICS ═══════════════════ */}
      <section className="relative py-20 sm:py-36 px-6 bg-[#0a0a0a]">
        <div className="mx-auto max-w-5xl">
          <SectionHeading subtitle="Meet your critics" title="Choose your specialist." />

          <div className="mt-24 grid gap-6 sm:grid-cols-3">
            {critics.map((c, i) => (
              <CriticCard key={c.id} c={c} i={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ PRODUCT PREVIEW ═══════════════════ */}
      <section className="relative py-20 sm:py-36 px-6 bg-[#0a0a0a]">
        <div className="mx-auto max-w-5xl">
          <SectionHeading subtitle="See it in action" title="Here's what you get." description="Annotated hotspots, a spoken walkthrough, and a clear overall score — all in under a minute." />
          <FadeIn delay={0.15} className="mt-16">
            <AuditPreviewMock />
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════ TASK LIST FEATURE ═══════════════════ */}
      <section className="relative py-20 sm:py-36 px-6 bg-[#0a0a0a] overflow-hidden">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-16 items-center lg:grid-cols-[1fr_380px]">
            {/* Left — Copy */}
            <div>
              <FadeIn>
                <p className="text-[13px] font-medium uppercase tracking-[0.2em] text-emerald-400/60">After the audit</p>
                <h2
                  className="mt-5 text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.03em] text-white"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  Turn insights into a{" "}
                  <em>task list</em>.
                </h2>
                <p className="mt-5 text-[16px] leading-[1.8] text-white/50 max-w-md">
                  Thumbs-up the findings you care about. Add your own tasks. Export the whole plan as
                  markdown, email it to your developer, or download it — ready to act on.
                </p>
              </FadeIn>
              <FadeIn delay={0.15}>
                <div className="mt-10 flex flex-col gap-4 max-w-sm">
                  {[
                    { icon: "thumbsUp", text: "Approve insights during the walkthrough" },
                    { icon: "plus", text: "Add your own custom tasks" },
                    { icon: "export", text: "Copy, email, or download the full plan" },
                  ].map((item) => (
                    <div key={item.text} className="flex items-start gap-3.5">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                        {item.icon === "thumbsUp" && (
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="rgba(52,211,153,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 14H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h2m0 7V7m0 7h6.6a2 2 0 0 0 2-1.7l.7-4.6a1 1 0 0 0-1-1.2H10V3.5A1.5 1.5 0 0 0 8.5 2L5 7" />
                          </svg>
                        )}
                        {item.icon === "plus" && (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="rgba(52,211,153,0.8)" strokeWidth="1.8" strokeLinecap="round">
                            <path d="M7 2v10M2 7h10" />
                          </svg>
                        )}
                        {item.icon === "export" && (
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="rgba(52,211,153,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8 2v8m0 0L5 7m3 3 3-3" />
                            <path d="M2 12h12" />
                          </svg>
                        )}
                      </div>
                      <p className="text-[14px] leading-[1.6] text-white/55">{item.text}</p>
                    </div>
                  ))}
                </div>
              </FadeIn>
            </div>

            {/* Right — Mock task panel */}
            <FadeIn delay={0.2}>
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "rgba(10,10,10,0.95)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  boxShadow: "0 30px 80px rgba(0,0,0,0.5), 0 0 60px rgba(16,185,129,0.04)",
                }}
              >
                {/* Panel header */}
                <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[13px] font-semibold text-white/85">Tasks</span>
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500/20 px-1.5 text-[10px] font-bold text-emerald-400">4</span>
                  </div>
                  <span className="text-[10px] text-white/20">Auto-saved</span>
                </div>

                {/* Mock tasks */}
                <div className="flex flex-col gap-1.5 p-3">
                  {[
                    { letter: "A", title: "Simplify primary navigation", approved: true },
                    { letter: "B", title: "Move CTA above the fold", approved: true },
                    { letter: "C", title: "Add social proof near pricing", approved: true },
                    { letter: "D", title: "Compress hero images", approved: false },
                    { letter: "E", title: "Redesign mobile header", approved: false, isUser: true },
                  ].map((task) => (
                    <div
                      key={task.letter}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                      style={{
                        background: task.approved ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.02)",
                        border: task.approved ? "1px solid rgba(16,185,129,0.15)" : "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold"
                        style={{
                          background: task.approved ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.06)",
                          color: task.approved ? "rgb(52,211,153)" : "rgba(255,255,255,0.3)",
                        }}
                      >
                        {task.letter}
                      </span>
                      <span className={`flex-1 text-[12px] leading-snug ${task.approved ? "text-white/75" : "text-white/40"}`}>
                        {task.title}
                      </span>
                      <div
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                        style={{
                          background: task.approved ? "rgb(16,185,129)" : "rgba(255,255,255,0.06)",
                        }}
                      >
                        {task.approved ? (
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2">
                            <path d="M2 6.5l2.5 2.5L10 3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.8" strokeLinecap="round">
                            <path d="M6 2v8M2 6h8" />
                          </svg>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Export bar */}
                <div className="px-3 pb-3 flex gap-2">
                  <div className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white py-2 text-[11px] font-semibold text-neutral-900">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="5" y="5" width="8" height="8" rx="1.5" />
                      <path d="M3 11V3.5A1.5 1.5 0 0 1 4.5 2H11" />
                    </svg>
                    Copy tasks
                  </div>
                  <div className="flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.06] px-4 py-2 text-[11px] font-medium text-white/50">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 2v8m0 0L5 7m3 3 3-3" />
                      <path d="M2 12h12" />
                    </svg>
                    .txt
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══════════════════ WHO IT'S FOR ═══════════════════ */}
      <section className="relative py-20 sm:py-36 px-6 bg-[#0a0a0a]">
        <div className="mx-auto max-w-5xl">
          <SectionHeading subtitle="Who it's for" title="Built for people who ship." />

          <div className="mt-20 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                emoji: "🚀",
                role: "Founders & makers",
                pain: "You built the site yourself. You're too close to see what's broken.",
                benefit: "Get an outside eye in 60 seconds — before your next launch or fundraise.",
              },
              {
                emoji: "🎨",
                role: "Freelance designers",
                pain: "Clients push back on your designs but can't articulate why.",
                benefit: "Run an audit on their current site. Use the findings to justify every decision in your proposal.",
              },
              {
                emoji: "📈",
                role: "Marketers & growth leads",
                pain: "Traffic's up but conversions are flat. Something on the page isn't working.",
                benefit: "The CRO critic pinpoints exactly where visitors drop off — with data-backed fixes.",
              },
              {
                emoji: "🏢",
                role: "Agencies",
                pain: "You need a fast, impressive way to open conversations with prospects.",
                benefit: "Audit a prospect's site, share the link, and let the results start the conversation for you.",
              },
              {
                emoji: "💻",
                role: "Developers",
                pain: "You can build anything, but UX and copy aren't your strongest suit.",
                benefit: "Get specific, actionable UI and conversion feedback without hiring a consultant.",
              },
              {
                emoji: "📦",
                role: "Product managers",
                pain: "Stakeholders disagree on what to fix first. You need an objective tiebreaker.",
                benefit: "Export the task list, share the score, and let the data drive the sprint.",
              },
            ].map((persona, i) => (
              <FadeIn key={persona.role} delay={i * 0.06}>
                <div
                  className="group flex h-full flex-col rounded-2xl p-6 transition-all duration-400"
                  style={{
                    background: "rgba(255,255,255,0.015)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.015)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                  }}
                >
                  <span className="text-[28px] leading-none">{persona.emoji}</span>
                  <h3 className="mt-4 text-[16px] font-semibold tracking-[-0.01em] text-white">{persona.role}</h3>
                  <p className="mt-2 text-[13px] leading-[1.6] text-white/35">{persona.pain}</p>
                  <p className="mt-3 text-[13px] leading-[1.6] text-white/60">{persona.benefit}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ SOCIAL PROOF ═══════════════════ */}
      <section className="relative py-20 sm:py-36 px-6 bg-[#0a0a0a]">
        <div className="mx-auto max-w-4xl">
          <FadeIn>
            <div className="flex flex-col items-center text-center">
              {/* Stars */}
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <svg key={n} width="18" height="18" viewBox="0 0 18 18" fill="rgba(255,107,53,0.85)" stroke="none">
                    <path d="M9 1.5l2.47 5.01L17 7.28l-3.75 3.66.89 5.16L9 13.48l-5.14 2.62.89-5.16L1 7.28l5.53-.77L9 1.5z" />
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <blockquote
                className="mt-8 text-[clamp(1.15rem,2.5vw,1.5rem)] leading-[1.65] tracking-[-0.01em] text-white/80 max-w-2xl"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                &ldquo;I sent the audit link to a prospect instead of a cold pitch.
                They booked a call within the hour. This tool basically sells for you.&rdquo;
              </blockquote>

              {/* Attribution */}
              <div className="mt-8 flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/luke.jpg"
                  alt="Luke Bonnici"
                  className="h-12 w-12 rounded-full object-cover"
                  style={{ border: "1px solid rgba(255,255,255,0.10)" }}
                />
                <div className="text-left">
                  <p className="text-[14px] font-semibold text-white/80">Luke Bonnici</p>
                  <p className="text-[13px] text-white/35">Co-Founder @ Website in a Week</p>
                </div>
              </div>
            </div>
          </FadeIn>

          
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
              Ready to see your website
              <br />
              through a <em>new lens</em>?
            </h2>
            <p className="mt-5 text-[16px] leading-[1.7] text-white/55">It takes 60 seconds. No account needed.</p>
          </FadeIn>
          <FadeIn delay={0.1} className="mt-12">
            <UrlInput onSubmit={handleSubmit} />
          </FadeIn>
          <FadeIn delay={0.2} className="mt-8">
            <div className="flex items-center justify-center gap-5 flex-wrap">
              {stats.map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="text-[15px] font-bold tracking-tight text-white/80">{s.value}</span>
                  <span className="text-[13px] text-white/35">{s.label}</span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <SiteFooter />
    </div>
  );
}
