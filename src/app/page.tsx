"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { UrlInput } from "@/components/ui/url-input";
import type { Persona } from "@/lib/config";
import { personaMeta } from "@/lib/config";
import { getRecentAudits, type RecentAudit } from "@/lib/recent-audits";

const personaIds: Persona[] = ["ux", "cro", "roast"];

const personaTeaser: Record<Persona, string> = {
  ux: "I'll trace every user journey and find where people get lost.",
  cro: "I'll find exactly where you're leaving money on the table.",
  roast: "I'll be brutally honest. You've been warned.",
};

function scoreColor(score: number): string {
  if (score >= 70) return "text-emerald-600";
  if (score >= 40) return "text-amber-500";
  return "text-red-500";
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Home() {
  const router = useRouter();
  const [persona, setPersona] = useState<Persona>("roast");
  const [recents, setRecents] = useState<RecentAudit[]>([]);

  useEffect(() => {
    setRecents(getRecentAudits());
  }, []);

  function handleSubmit(url: string) {
    router.push(
      `/audit?url=${encodeURIComponent(url)}&persona=${persona}`
    );
  }

  const meta = personaMeta[persona];

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      {/* Ambient background shapes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 -right-32 h-96 w-96 rounded-full opacity-30"
          style={{ background: `radial-gradient(circle, ${personaMeta.ux.color}18, transparent 70%)` }}
        />
        <motion.div
          animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full opacity-30"
          style={{ background: `radial-gradient(circle, ${personaMeta.cro.color}18, transparent 70%)` }}
        />
        <motion.div
          animate={{ x: [0, 15, 0], y: [0, 15, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/3 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, var(--accent)12, transparent 70%)` }}
        />
      </div>

      <div className="relative flex w-full max-w-xl flex-col items-center gap-10 py-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-[3.5rem] md:leading-[1.1]">
            Get your site
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(135deg, ${meta.color}, var(--accent))`,
              }}
            >
              roasted by AI.
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xs text-[15px] leading-relaxed text-muted">
            Pick a critic. Drop your URL.
            <br />
            Watch the live audit unfold.
          </p>
        </motion.div>

        {/* Persona selector */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="flex w-full flex-col items-center gap-4"
        >
          <div className="flex justify-center gap-3 sm:gap-4">
            {personaIds.map((id) => {
              const m = personaMeta[id];
              const isSelected = persona === id;
              return (
                <motion.button
                  key={id}
                  type="button"
                  onClick={() => setPersona(id)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className={`relative flex cursor-pointer flex-col items-center gap-2 rounded-2xl px-4 py-3 transition-all duration-200 sm:px-5 sm:py-4 ${
                    isSelected
                      ? "bg-surface shadow-lg"
                      : "hover:bg-surface/60"
                  }`}
                  style={
                    isSelected
                      ? { boxShadow: `0 4px 24px ${m.color}15, 0 0 0 1px ${m.color}25` }
                      : undefined
                  }
                >
                  <motion.div
                    animate={isSelected ? { scale: 1 } : { scale: 0.85 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={`h-14 w-14 overflow-hidden rounded-full border-2 transition-colors duration-200 sm:h-16 sm:w-16 ${
                      isSelected ? "" : "border-border opacity-60"
                    }`}
                    style={isSelected ? { borderColor: m.color } : undefined}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.avatar} alt={m.name} className="h-full w-full object-cover" />
                  </motion.div>
                  <div className="text-center">
                    <p className={`text-xs font-semibold transition-colors ${isSelected ? "text-foreground" : "text-muted"}`}>
                      {m.name}
                    </p>
                    <p className="text-[10px] text-muted">{m.title}</p>
                  </div>
                  {isSelected && (
                    <motion.span
                      layoutId="persona-indicator"
                      className="absolute -bottom-0.5 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full"
                      style={{ backgroundColor: m.color }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={persona}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl bg-surface/80 px-4 py-2.5 text-center text-sm text-muted shadow-sm backdrop-blur-sm"
            >
              &ldquo;{personaTeaser[persona]}&rdquo;
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* URL Input */}
        <UrlInput onSubmit={handleSubmit} />

        {/* Recent audits */}
        {recents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex w-full flex-col items-center gap-3"
          >
            <p className="text-xs font-medium text-muted/60">Recent audits</p>
            <div className="flex w-full flex-wrap justify-center gap-2">
              {recents.map((r, i) => {
                const pMeta = personaMeta[r.persona];
                return (
                  <motion.a
                    key={`${r.url}-${r.persona}-${i}`}
                    href={`/audit?url=${encodeURIComponent(r.url)}&persona=${r.persona}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.55 + i * 0.04 }}
                    className="group flex items-center gap-2.5 rounded-xl border border-border bg-surface/70 px-3 py-2 transition-all hover:border-border hover:bg-surface hover:shadow-sm"
                  >
                    {r.favicon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.favicon} alt="" className="h-4 w-4 shrink-0 rounded" />
                    ) : (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-border text-[8px] text-muted">
                        {r.hostname.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="text-xs text-foreground/80 group-hover:text-foreground">
                      {r.hostname}
                    </span>
                    <span className={`text-xs font-bold ${scoreColor(r.score)}`}>
                      {r.score}
                    </span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pMeta.avatar}
                      alt={pMeta.name}
                      title={`${pMeta.name} — ${timeAgo(r.timestamp)}`}
                      className="h-4 w-4 rounded-full opacity-50 group-hover:opacity-80"
                    />
                  </motion.a>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Social proof line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center text-xs text-muted/50"
        >
          Free &middot; No signup &middot; Results in 30 seconds
        </motion.p>

        {/* Footer links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex items-center gap-4 text-xs text-muted/40"
        >
          <a href="/terms" className="transition-colors hover:text-muted">Terms</a>
          <span>&middot;</span>
          <a href="/privacy" className="transition-colors hover:text-muted">Privacy</a>
        </motion.div>
      </div>
    </div>
  );
}
