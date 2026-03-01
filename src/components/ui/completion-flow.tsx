"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useShareChannels } from "./share-menu";
import { CloseButton } from "@/components/ui/close-button";
import { ArrowRightIcon, CheckIcon } from "@/components/ui/icons";
import type { UseActionPlanReturn } from "@/hooks/use-action-plan";
import type { AuditResult } from "@/lib/config";
import { track } from "@/lib/analytics";

export type CompletionView = "hub" | "waitlist" | "share";
type View = CompletionView;

interface CompletionFlowProps {
  open: boolean;
  initialView?: View;
  url: string;
  hostname: string;
  score: number;
  summary: string;
  personaName: string;
  personaAvatar: string;
  personaColor: string;
  onClose: () => void;
  onOpenTasks: () => void;
  actionPlan?: UseActionPlanReturn;
  chapters?: AuditResult["chapters"];
}

/* ─── Animated counter ─── */
function CountUp({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return <>{value}</>;
}

/* ─── Hub: the main completion screen ─── */
function HubView({
  score,
  personaName,
  personaAvatar,
  hostname,
  url,
  onClose,
  onGoWaitlist,
  onGoShare,
  onOpenTasks,
  shareChannels,
  actionPlan,
  chapters,
}: {
  score: number;
  personaName: string;
  personaAvatar: string;
  hostname: string;
  url: string;
  onClose: () => void;
  onGoWaitlist: () => void;
  onGoShare: () => void;
  onOpenTasks: () => void;
  shareChannels: ReturnType<typeof useShareChannels>;
  actionPlan?: UseActionPlanReturn;
  chapters?: AuditResult["chapters"];
}) {
  const [copiedTasks, setCopiedTasks] = useState(false);

  const approvedInsights = actionPlan && chapters
    ? chapters.filter((_, i) => actionPlan.plan.ratings[i]?.status === "approved").length
    : 0;
  const userTaskCount = actionPlan?.plan.userTasks.length ?? 0;
  const totalTasks = approvedInsights + userTaskCount;

  async function handleCopyTasks() {
    if (!actionPlan || !chapters) return;
    track("Tasks Copied", { hostname, total_tasks: totalTasks });
    await actionPlan.copyMarkdown(chapters, hostname, url);
    setCopiedTasks(true);
    setTimeout(() => setCopiedTasks(false), 2000);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Score + persona */}
      <div className="flex flex-col items-center gap-4 pt-2">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={personaAvatar} alt="" className="h-10 w-10 shrink-0 rounded-full ring-1 ring-white/10" />
          <p className="text-xs text-white/40">{personaName}&apos;s audit of {hostname}</p>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold tracking-tighter text-white">
            <CountUp target={score} />
          </span>
          <span className="text-lg text-white/25">/100</span>
        </div>
      </div>

      {/* Compact task bar */}
      {totalTasks > 0 ? (
        <div className="flex items-center justify-between rounded-2xl bg-emerald-500/[0.05] px-4 py-3 ring-1 ring-emerald-500/[0.12]">
          <div className="flex items-center gap-2">
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-500/20 px-1.5 text-[11px] font-bold text-emerald-400">
              {totalTasks}
            </span>
            <p className="text-[13px] font-medium text-white/70">
              task{totalTasks !== 1 ? "s" : ""} in your plan
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyTasks}
              className="cursor-pointer rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-medium text-emerald-400 transition-all hover:bg-emerald-500/25 active:scale-95"
            >
              {copiedTasks ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={onOpenTasks}
              className="cursor-pointer rounded-full bg-white/[0.06] px-3 py-1 text-[11px] font-medium text-white/50 transition-all hover:bg-white/[0.1] hover:text-white/80 active:scale-95"
            >
              Edit
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={onOpenTasks}
          className="cursor-pointer rounded-2xl bg-white/[0.02] px-4 py-3 ring-1 ring-white/[0.05] text-center transition-all hover:bg-white/[0.04]"
        >
          <p className="text-xs text-white/30">Tap <strong className="text-white/50">+</strong> on each insight to build your task list</p>
        </button>
      )}

      {/* ── What next? ── */}
      <div className="flex flex-col gap-2.5 pt-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/20 px-1">What&apos;s next?</p>

        {/* Scan full site → waitlist (primary) */}
        <button
          onClick={() => { track("Full Site CTA Clicked", { hostname, score }); onGoWaitlist(); }}
          className="group flex cursor-pointer items-center gap-4 rounded-2xl bg-gradient-to-r from-orange-500/[0.12] to-orange-500/[0.04] px-5 py-4 ring-1 ring-orange-500/20 transition-all hover:ring-orange-500/40 hover:from-orange-500/[0.18]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5Z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 17l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-white">Scan my full site</p>
            <p className="mt-0.5 text-[11px] text-white/40">Audit every page automatically</p>
          </div>
          <span className="text-orange-400/50 transition-colors group-hover:text-orange-400">
            <ArrowRightIcon />
          </span>
        </button>

        {/* Get these fixed → share/developer screen (secondary) */}
        <button
          onClick={() => { track("Get Fixed CTA Clicked", { hostname, score }); onGoShare(); }}
          className="group flex cursor-pointer items-center gap-4 rounded-2xl bg-white/[0.03] px-5 py-4 ring-1 ring-white/[0.06] transition-all hover:ring-white/[0.12] hover:bg-white/[0.05]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/50">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-white">Get these fixed</p>
            <p className="mt-0.5 text-[11px] text-white/40">Send to a developer or hire us</p>
          </div>
          <span className="text-white/20 transition-colors group-hover:text-white/50">
            <ArrowRightIcon />
          </span>
        </button>
      </div>

      {/* Inline social share */}
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/20 px-1">Share on social</p>
        <div className="flex gap-2">
          {shareChannels.map((ch) => {
            const inner = (
              <div className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl bg-white/[0.04] px-3 py-3 transition-all hover:bg-white/[0.08] min-w-0 flex-1">
                <span className="text-white/50">{ch.icon}</span>
                <span className="text-[9px] font-medium text-white/25 truncate w-full text-center">{ch.label}</span>
              </div>
            );
            if ("href" in ch && ch.href) {
              return <a key={ch.name} href={ch.href} target="_blank" rel="noopener noreferrer" className="flex-1" onClick={() => track("Share Clicked", { channel: ch.name, hostname })}>{inner}</a>;
            }
            return <button key={ch.name} onClick={() => { track("Share Clicked", { channel: ch.name, hostname }); ch.action?.(); }} className="flex-1">{inner}</button>;
          })}
        </div>
      </div>

      {/* Audit another site — proper button */}
      <a
        href="/"
        onClick={() => track("Audit Another Site", { hostname, score })}
        className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-white/[0.05] px-4 py-3 text-sm font-medium text-white/50 ring-1 ring-white/[0.06] transition-all hover:bg-white/[0.09] hover:text-white/80"
      >
        Audit another site
      </a>
    </div>
  );
}

/* ─── Share & developer view ─── */
function ShareView({
  hostname,
  url,
  score,
  shareChannels,
  fromHub,
  onBack,
  onClose,
}: {
  hostname: string;
  url: string;
  score: number;
  shareChannels: ReturnType<typeof useShareChannels>;
  fromHub: boolean;
  onBack: () => void;
  onClose: () => void;
}) {
  const hireMailto = `mailto:developers@retake.site?subject=${encodeURIComponent(
    `Website improvements for ${hostname}`
  )}&body=${encodeURIComponent(
    `Hi,\n\nI just ran an AI audit on ${hostname} and scored ${score}/100.\n\nHere are the results: ${url}\n\nI'd love to discuss getting the recommended improvements implemented. What are the next steps?`
  )}`;

  const devMailto = `mailto:?subject=${encodeURIComponent(
    `Website audit for ${hostname} (${score}/100)`
  )}&body=${encodeURIComponent(
    `Hi,\n\nI ran an AI audit on ${hostname} — it scored ${score}/100.\n\nFull walkthrough with recommendations:\n${url}\n\nCan we prioritise fixing the top issues?`
  )}`;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <h2 className="text-xl font-semibold text-white">Share your audit</h2>
        <p className="text-sm text-white/45 text-center max-w-xs">
          Share the link, or send it straight to a developer
        </p>
      </div>

      {/* Social / link sharing */}
      <div className="w-full max-w-sm">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/20 px-1">Share link</p>
        <div className="grid grid-cols-5 gap-2">
          {shareChannels.map((ch) => {
            const inner = (
              <div className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl bg-white/[0.04] px-3 py-4 transition-all hover:bg-white/[0.08]">
                <span className="text-white/60">{ch.icon}</span>
                <span className="text-[10px] font-medium text-white/35">{ch.label}</span>
              </div>
            );
            if ("href" in ch && ch.href) {
              return <a key={ch.name} href={ch.href} target="_blank" rel="noopener noreferrer" onClick={() => track("Share Clicked", { channel: ch.name, hostname })}>{inner}</a>;
            }
            return <button key={ch.name} onClick={() => { track("Share Clicked", { channel: ch.name, hostname }); ch.action?.(); }} className="text-left">{inner}</button>;
          })}
        </div>
      </div>

      {/* Developer actions */}
      <div className="w-full max-w-sm flex flex-col gap-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/20 px-1">Get it fixed</p>
        <a
          href={hireMailto}
          onClick={() => track("Get Team Clicked", { hostname, score })}
          className="group flex items-center gap-4 rounded-2xl bg-gradient-to-r from-orange-500/[0.12] to-orange-500/[0.04] px-5 py-4 ring-1 ring-orange-500/20 transition-all hover:ring-orange-500/40 hover:from-orange-500/[0.18]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Get us to implement</p>
            <p className="mt-0.5 text-[11px] text-white/40">We&apos;ll scope, design &amp; ship the fixes</p>
          </div>
          <span className="text-orange-400/50 group-hover:text-orange-400 transition-colors"><ArrowRightIcon /></span>
        </a>
        <a
          href={devMailto}
          onClick={() => track("Email Developer Clicked", { hostname, source: "share_view" })}
          className="group flex items-center gap-4 rounded-2xl bg-white/[0.03] px-5 py-4 ring-1 ring-white/[0.06] transition-all hover:ring-white/[0.12] hover:bg-white/[0.05]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/50" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="3" />
              <path d="M2 7l10 6 10-6" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Email to your developer</p>
            <p className="mt-0.5 text-[11px] text-white/40">Send the audit to your existing team</p>
          </div>
          <span className="text-white/20 group-hover:text-white/50 transition-colors"><ArrowRightIcon /></span>
        </a>
      </div>

      {/* Bottom nav */}
      {fromHub && (
        <button
          onClick={onBack}
          className="flex cursor-pointer items-center gap-2 text-xs text-white/30 transition-colors hover:text-white/60"
        >
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 3L5 7l4 4" />
          </svg>
          Back to results
        </button>
      )}
    </div>
  );
}

/* ─── Waitlist view ─── */
function WaitlistView({
  hostname,
  url,
  fromHub,
  onBack,
  onClose,
}: {
  hostname: string;
  url: string;
  fromHub: boolean;
  onBack: () => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    position: number;
    referralCode: string;
    alreadyJoined: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.includes("@") || submitting) return;
      setSubmitting(true);

      try {
        const storedRef =
          typeof sessionStorage !== "undefined"
            ? sessionStorage.getItem("audit_ref")
            : null;

        const res = await fetch("/api/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            referralCode: storedRef,
            auditUrl: url,
            hostname,
          }),
        });

        const data = await res.json();
        track("Waitlist Joined", { position: data.position, already_joined: data.alreadyJoined, hostname });
        setResult({
          position: data.position,
          referralCode: data.referralCode,
          alreadyJoined: data.alreadyJoined,
        });
      } catch {
        // Silently fail for MVP
      } finally {
        setSubmitting(false);
      }
    },
    [email, submitting, url, hostname]
  );

  const referralUrl =
    result?.referralCode && typeof window !== "undefined"
      ? `${window.location.origin}/?ref=${result.referralCode}`
      : "";

  const referralShareText = `I just got my website roasted by AI. See how yours stacks up:`;
  const encodedRefText = encodeURIComponent(referralShareText);
  const encodedRefUrl = encodeURIComponent(referralUrl);

  async function copyReferralLink() {
    track("Referral Copied", { hostname });
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div
            key="capture"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex w-full max-w-sm flex-col items-center gap-6"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-500/5 ring-1 ring-orange-500/20">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5Z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 17l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex flex-col items-center gap-2">
              <h2 className="text-2xl font-semibold text-white">Full Site Audit</h2>
              <p className="max-w-xs text-center text-[15px] leading-relaxed text-white/50">
                Audit every page on {hostname} — enter your email to get started.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
              <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-4 py-3 ring-1 ring-white/[0.08] transition-all focus-within:ring-orange-500/40">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" className="shrink-0 text-white/30">
                  <rect x="2" y="3.5" width="12" height="9" rx="2" />
                  <path d="M2 5.5l6 3.5 6-3.5" />
                </svg>
                <input
                  ref={inputRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full bg-transparent text-sm text-white placeholder-white/25 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!email.includes("@") || submitting}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    Continue
                    <ArrowRightIcon />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full max-w-sm flex-col items-center gap-6"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckIcon />
                <span className="text-sm font-semibold">You&apos;re on the list</span>
              </div>
              <p className="max-w-xs text-center text-sm leading-relaxed text-white/50">
                Full site audits are coming soon. We&apos;ll email you as soon as it&apos;s ready{result.alreadyJoined ? " — you were already signed up!" : ""}.
              </p>
            </div>

            <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/[0.03] px-8 py-5 ring-1 ring-white/[0.06]">
              <p className="text-[11px] font-medium uppercase tracking-widest text-white/30">
                Your position
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold tracking-tight text-white">
                  <CountUp target={result.position} duration={800} />
                </span>
                <span className="text-lg text-white/25">in queue</span>
              </div>
            </div>

            {/* Skip the line */}
            <div className="w-full">
              <div className="mb-3 flex flex-col items-center gap-1">
                <p className="text-sm font-semibold text-white">Skip the line</p>
                <p className="text-xs text-white/40">
                  Every friend who signs up moves you closer to the front
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={copyReferralLink}
                  className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl bg-white/[0.04] p-3 transition-all hover:bg-white/[0.08]"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/60">
                    <rect x="5" y="5" width="8" height="8" rx="1.5" />
                    <path d="M3 11V3.5A1.5 1.5 0 0 1 4.5 2H11" />
                  </svg>
                  <span className="text-[9px] font-medium text-white/40">
                    {copied ? "Copied!" : "Copy"}
                  </span>
                </button>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodedRefText}&url=${encodedRefUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track("Referral Shared", { channel: "x", hostname })}
                  className="flex flex-col items-center gap-1.5 rounded-xl bg-white/[0.04] p-3 transition-all hover:bg-white/[0.08]"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-white/60">
                    <path d="M9.47 6.77 14.37 1H13.1l-4.26 4.99L5.35 1H1l5.14 7.55L1 15h1.28l4.49-5.27L10.65 15H15L9.47 6.77Zm-1.59 1.87-.52-.75L2.84 2.01h1.78l3.34 4.84.52.75 4.34 6.28h-1.78L7.88 8.64Z" />
                  </svg>
                  <span className="text-[9px] font-medium text-white/40">X</span>
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedRefUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track("Referral Shared", { channel: "linkedin", hostname })}
                  className="flex flex-col items-center gap-1.5 rounded-xl bg-white/[0.04] p-3 transition-all hover:bg-white/[0.08]"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-white/60">
                    <path d="M13.6 1H2.4C1.63 1 1 1.63 1 2.4v11.2c0 .77.63 1.4 1.4 1.4h11.2c.77 0 1.4-.63 1.4-1.4V2.4c0-.77-.63-1.4-1.4-1.4ZM5.34 13H3.17V6.34h2.17V13ZM4.25 5.41a1.26 1.26 0 1 1 0-2.52 1.26 1.26 0 0 1 0 2.52ZM13 13h-2.17V9.75c0-.77-.01-1.76-1.07-1.76-1.07 0-1.24.84-1.24 1.71V13H6.35V6.34h2.08v.91h.03c.29-.55 1-1.13 2.05-1.13 2.19 0 2.6 1.44 2.6 3.32V13Z" />
                  </svg>
                  <span className="text-[9px] font-medium text-white/40">LinkedIn</span>
                </a>
                <a
                  href={`https://wa.me/?text=${encodedRefText}%20${encodedRefUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track("Referral Shared", { channel: "whatsapp", hostname })}
                  className="flex flex-col items-center gap-1.5 rounded-xl bg-white/[0.04] p-3 transition-all hover:bg-white/[0.08]"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-white/60">
                    <path d="M8.02 1C4.15 1 1 4.13 1 7.98c0 1.23.33 2.44.95 3.49L1 15l3.63-.95A7 7 0 0 0 8.02 15C11.87 15 15 11.87 15 8c0-3.87-3.13-7-6.98-7Zm3.44 9.73c-.15.42-.86.8-1.2.85-.32.05-.72.07-1.16-.07a10.6 10.6 0 0 1-1.05-.39c-1.85-.8-3.06-2.66-3.15-2.78-.1-.13-.77-1.02-.77-1.95 0-.93.49-1.38.66-1.57.17-.19.37-.23.5-.23h.36c.12 0 .28-.04.43.33.16.38.53 1.3.58 1.4.05.1.08.2.02.33-.07.12-.1.2-.2.3-.09.11-.2.25-.28.33-.1.1-.2.2-.08.39.11.19.5.83 1.08 1.34.75.66 1.37.86 1.57.96.19.1.31.08.42-.05.12-.13.5-.58.64-.78.13-.2.26-.17.44-.1.19.07 1.17.55 1.37.65.2.1.33.15.38.23.05.08.05.47-.1.9Z" />
                  </svg>
                  <span className="text-[9px] font-medium text-white/40">WhatsApp</span>
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom nav */}
      {result ? (
        <a
          href="/"
          onClick={() => track("Audit Another Site", { hostname })}
          className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-white/[0.05] px-6 py-3 text-sm font-medium text-white/50 ring-1 ring-white/[0.06] transition-all hover:bg-white/[0.09] hover:text-white/80"
        >
          Audit another site
        </a>
      ) : fromHub ? (
        <button
          onClick={onBack}
          className="flex cursor-pointer items-center gap-2 text-xs text-white/30 transition-colors hover:text-white/60"
        >
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 3L5 7l4 4" />
          </svg>
          Back to results
        </button>
      ) : null}
    </div>
  );
}

/* ─── Main flow ─── */
export function CompletionFlow({
  open,
  initialView: initialViewProp,
  url,
  hostname,
  score,
  summary,
  personaName,
  personaAvatar,
  personaColor,
  onClose,
  onOpenTasks,
  actionPlan,
  chapters,
}: CompletionFlowProps) {
  const [view, setView] = useState<View>("hub");
  const [cameFromHub, setCameFromHub] = useState(false);
  const shareChannels = useShareChannels(url, `AI audit of ${hostname}`, score);

  useEffect(() => {
    if (open) {
      const v = initialViewProp ?? "hub";
      setView(v);
      setCameFromHub(v === "hub");
      track("Completion Viewed", { hostname, initial_view: v });
    }
  }, [open, hostname, initialViewProp]);

  function navigateTo(target: View) {
    track("Completion Navigate", { to: target, hostname });
    setCameFromHub(view === "hub");
    setView(target);
  }

  function goBack() {
    setCameFromHub(false);
    setView("hub");
  }

  const slideVariants = {
    enter: { opacity: 0, x: 40 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex overflow-y-auto bg-neutral-950/98 backdrop-blur-sm"
        >
          <CloseButton onClick={onClose} className="absolute right-4 top-4 z-10 cursor-pointer rounded-full p-2 text-white/20 transition-colors hover:text-white/60" />

          <div className="m-auto w-full max-w-md px-6 py-12">
            <AnimatePresence mode="wait">
              {view === "hub" && (
                <motion.div
                  key="hub"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                >
                  <HubView
                    score={score}
                    personaName={personaName}
                    personaAvatar={personaAvatar}
                    hostname={hostname}
                    url={url}
                    onClose={onClose}
                    onGoWaitlist={() => navigateTo("waitlist")}
                    onGoShare={() => navigateTo("share")}
                    onOpenTasks={() => { onClose(); onOpenTasks(); }}
                    shareChannels={shareChannels}
                    actionPlan={actionPlan}
                    chapters={chapters}
                  />
                </motion.div>
              )}
              {view === "waitlist" && (
                <motion.div
                  key="waitlist"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                >
                  <WaitlistView
                    hostname={hostname}
                    url={url}
                    fromHub={cameFromHub}
                    onBack={goBack}
                    onClose={onClose}
                  />
                </motion.div>
              )}
              {view === "share" && (
                <motion.div
                  key="share"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                >
                  <ShareView
                    hostname={hostname}
                    url={url}
                    score={score}
                    shareChannels={shareChannels}
                    fromHub={cameFromHub}
                    onBack={goBack}
                    onClose={onClose}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div
            className="pointer-events-none absolute bottom-0 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full opacity-20 blur-3xl"
            style={{ background: personaColor }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
