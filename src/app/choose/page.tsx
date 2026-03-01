"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Persona } from "@/lib/config";
import { personaMeta } from "@/lib/config";
import { ease } from "@/lib/animations";
import { track } from "@/lib/analytics";

const SCRAPE_CACHE_KEY = "audit-scrape-cache";

const personas: { id: Persona; tagline: string; pitch: string }[] = [
  {
    id: "ux",
    tagline: "Find friction. Fix flows.",
    pitch:
      "Navigation patterns, information hierarchy, cognitive load, and accessibility. I'll show you exactly where users hesitate or give up.",
  },
  {
    id: "cro",
    tagline: "Turn visitors into customers.",
    pitch:
      "CTAs, social proof, urgency signals, pricing layout, and funnel psychology. I'll tell you where you're leaving money on the table.",
  },
  {
    id: "roast",
    tagline: "The truth. Unfiltered.",
    pitch:
      "No sugar-coating. Brutal honesty and a side of humour. If your site has problems, you'll remember my feedback.",
  },
];

function ChooseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get("url");

  const [selected, setSelected] = useState<Persona | null>(null);
  const [hovered, setHovered] = useState<Persona | null>(null);
  const [scrapeReady, setScrapeReady] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const scrapeDataRef = useRef<Record<string, unknown> | null>(null);
  const scrapeFetchedRef = useRef(false);

  let hostname = "";
  try {
    hostname = new URL(url || "").hostname;
  } catch {
    hostname = url || "";
  }

  useEffect(() => {
    if (!url || scrapeFetchedRef.current) return;
    scrapeFetchedRef.current = true;

    // Check if the homepage already kicked off a scrape
    let homepageStarted = false;
    try {
      const raw = sessionStorage.getItem(SCRAPE_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached.url === url && Date.now() - (cached.ts || 0) < 60_000) {
          if (cached.data && !cached.pending) {
            console.log("[choose] Using completed homepage scrape");
            scrapeDataRef.current = cached.data;
            setScrapeReady(true);
            return;
          }
          if (cached.pending) {
            homepageStarted = true;
            console.log("[choose] Homepage scrape in flight, polling...");
          }
        }
      }
    } catch { /* ignore */ }

    if (homepageStarted) {
      // Poll sessionStorage for the homepage-initiated scrape to complete
      const poll = setInterval(() => {
        try {
          const raw = sessionStorage.getItem(SCRAPE_CACHE_KEY);
          if (!raw) { clearInterval(poll); startFresh(); return; }
          const cached = JSON.parse(raw);
          if (cached.url === url && cached.data && !cached.pending) {
            clearInterval(poll);
            console.log("[choose] Homepage scrape finished");
            scrapeDataRef.current = cached.data;
            setScrapeReady(true);
          }
        } catch { /* ignore */ }
      }, 300);
      const timeout = setTimeout(() => {
        clearInterval(poll);
        if (!scrapeDataRef.current) startFresh();
      }, 30_000);
      return () => { clearInterval(poll); clearTimeout(timeout); };
    }

    startFresh();

    function startFresh() {
      console.log("[choose] Starting background scrape for", url);
      fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: "Scrape failed" }));
            throw new Error(err.error || "Scrape failed");
          }
          return res.json();
        })
        .then((data) => {
          console.log("[choose] Scrape complete");
          scrapeDataRef.current = data;
          setScrapeReady(true);
          try {
            sessionStorage.setItem(SCRAPE_CACHE_KEY, JSON.stringify({ url, data, ts: Date.now() }));
          } catch { /* full */ }
        })
        .catch((err) => {
          console.error("[choose] Scrape failed:", err);
          setScrapeError(err.message);
        });
    }
  }, [url]);

  const handleSelect = useCallback(
    (persona: Persona) => {
      track("Persona Selected", { persona, hostname, scrape_ready: scrapeReady });
      setSelected(persona);
      setTimeout(() => {
        const params = new URLSearchParams({ url: url!, persona });
        if (scrapeDataRef.current) {
          try {
            sessionStorage.setItem(SCRAPE_CACHE_KEY, JSON.stringify({ url, data: scrapeDataRef.current, ts: Date.now() }));
          } catch { /* full */ }
        }
        router.push(`/audit?${params.toString()}`);
      }, 500);
    },
    [url, router]
  );

  useEffect(() => {
    if (!url) return;
    function handleKey(e: KeyboardEvent) {
      if (selected) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "1") handleSelect("ux");
      if (e.key === "2") handleSelect("cro");
      if (e.key === "3") handleSelect("roast");
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [url, selected, handleSelect]);

  if (!url) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-neutral-950">
        <p className="text-sm text-white/40">No URL provided. Please go back and enter one.</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-neutral-950 px-6 py-16">
      {/* Back */}
      <motion.a
        href="/"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="fixed top-6 left-6 z-10 flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] text-white/30 transition-all hover:text-white/60 hover:bg-white/[0.04]"
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 3L5 7l4 4" /></svg>
        Back
      </motion.a>

      {/* Site pill */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="mb-8 flex items-center gap-2.5 rounded-full px-4 py-2"
        style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`} alt="" className="h-4 w-4 rounded-sm" />
        <span className="text-[14px] text-white/60">{hostname}</span>
        <span className="flex items-center gap-1.5 text-[11px] text-white/25">
          {scrapeReady ? (
            <><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Ready</>
          ) : scrapeError ? (
            <><span className="h-1.5 w-1.5 rounded-full bg-red-400" />Error</>
          ) : (
            <>
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-50" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              Loading
            </>
          )}
        </span>
      </motion.div>

      {/* Heading — serif, matching homepage */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.7, ease }}
        className="mb-16 text-center"
      >
        <h1
          className="text-[clamp(2.2rem,6vw,4rem)] leading-[1] tracking-[-0.03em] text-white"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Choose your <em>critic</em>.
        </h1>
        <p className="mt-4 text-[15px] text-white/50">
          Each one sees your site through a different lens.
        </p>
        <p className="mt-2 text-[13px] text-white/30">
          Your audit includes a spoken walkthrough — turn up your volume.
        </p>
      </motion.div>

      {/* Persona cards */}
      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3 sm:gap-5">
        {personas.map((p, i) => {
          const meta = personaMeta[p.id];
          const isSelected = selected === p.id;
          const isHovered = hovered === p.id;
          const isOtherSelected = selected !== null && !isSelected;

          return (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{
                opacity: isOtherSelected ? 0.3 : 1,
                y: 0,
                scale: isSelected ? 1.03 : 1,
              }}
              transition={{
                delay: 0.1 + i * 0.08,
                duration: 0.7,
                type: "spring",
                stiffness: 220,
                damping: 25,
              }}
              onMouseEnter={() => !selected && setHovered(p.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => !selected && handleSelect(p.id)}
              disabled={!!selected}
              className={`group relative flex cursor-pointer flex-col items-center rounded-2xl p-8 text-center transition-all duration-500 ${
                selected && !isSelected ? "pointer-events-none" : ""
              }`}
              style={{
                background: isSelected || isHovered ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
                border: isSelected
                  ? "1px solid rgba(255,255,255,0.18)"
                  : isHovered
                    ? "1px solid rgba(255,255,255,0.12)"
                    : "1px solid rgba(255,255,255,0.08)",
                boxShadow: isSelected
                  ? "0 0 50px rgba(255,255,255,0.05)"
                  : "none",
              }}
            >
              {/* Avatar */}
              <motion.div
                animate={{ scale: isHovered || isSelected ? 1.06 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="mb-5 h-20 w-20 overflow-hidden rounded-full sm:h-24 sm:w-24"
                style={{ border: "1px solid rgba(255,255,255,0.06)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={meta.avatar} alt={meta.name} className="h-full w-full object-cover" />
              </motion.div>

              <h2 className="text-[17px] font-semibold text-white/90">{meta.name}</h2>
              <p className="mt-1 text-[12px] text-white/35">{meta.title}</p>

              <p className="mt-4 text-[14px] font-medium text-white/60 transition-colors duration-300 group-hover:text-white/80">
                {p.tagline}
              </p>

              <p className="mt-2 text-[13px] leading-relaxed text-white/35">
                {p.pitch}
              </p>

              {/* Hover CTA */}
              <motion.div
                animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 4 }}
                transition={{ duration: 0.15 }}
                className="mt-6 rounded-full bg-white px-5 py-1.5 text-[12px] font-semibold text-black"
              >
                Start audit &rarr;
              </motion.div>

              {/* Selected check */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-black shadow-lg"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2.5 7l3 3 6-6.5" /></svg>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {scrapeError && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-center text-[13px] text-white/40">
          Couldn&apos;t pre-load the site — your audit will still run, just may take a few extra seconds.
        </motion.p>
      )}

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-12 text-[12px] text-white/25"
      >
        Press{" "}
        <kbd className="rounded px-1.5 py-0.5 font-mono text-[10px] text-white/30" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>1</kbd>{" "}
        <kbd className="rounded px-1.5 py-0.5 font-mono text-[10px] text-white/30" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>2</kbd>{" "}
        <kbd className="rounded px-1.5 py-0.5 font-mono text-[10px] text-white/30" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>3</kbd>{" "}
        to choose
      </motion.p>
    </div>
  );
}

export default function ChoosePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-neutral-950">
          <p className="text-sm text-white/30">Loading...</p>
        </div>
      }
    >
      <ChooseContent />
    </Suspense>
  );
}
