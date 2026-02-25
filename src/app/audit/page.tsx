"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TheatrePlayer } from "@/components/ui/theatre-player";
import { ChapterNav } from "@/components/ui/chapter-nav";
import { AudioPlayer } from "@/components/ui/audio-player";
import { ShareButton, ShareModal } from "@/components/ui/share-menu";
import { useAudit } from "@/hooks/use-audit";
import type { Persona } from "@/lib/config";
import { personaMeta } from "@/lib/config";

const stepLabels = {
  scraping: "Visiting the site",
  analyzing: "Forming my opinion",
  "generating-voice": "Preparing my delivery",
  finalizing: "Almost ready...",
} as const;

const personaIds: Persona[] = ["ux", "cro", "roast"];

function PersonaSwitcher({
  current,
  onSwitch,
}: {
  current: Persona;
  onSwitch: (p: Persona) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const meta = personaMeta[current];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex cursor-pointer items-center gap-1.5 rounded-full px-1 py-1 transition-colors hover:bg-surface"
        title="Switch persona"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={meta.avatar} alt="" className="h-6 w-6 rounded-full" />
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M2.5 4L5 6.5L7.5 4" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
            >
              <div className="px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Switch critic
                </p>
              </div>
              {personaIds.map((id) => {
                const m = personaMeta[id];
                const isActive = id === current;
                return (
                  <button
                    key={id}
                    onClick={() => {
                      onSwitch(id);
                      setOpen(false);
                    }}
                    className={`flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      isActive ? "bg-accent-soft" : "hover:bg-warm-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.avatar} alt="" className="h-8 w-8 rounded-full" />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${isActive ? "text-foreground" : "text-foreground/80"}`}>
                        {m.name}
                      </p>
                      <p className="text-[11px] text-muted">{m.title}</p>
                    </div>
                    {isActive && (
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: m.color }}
                      />
                    )}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function AuditContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get("url");
  const initialPersona = searchParams.get("persona") as Persona | null;

  const {
    phase,
    loadingStep,
    loadingQuote,
    audit,
    screenshot,
    favicon,
    siteName,
    activeChapter,
    scrollY,
    audioSrc,
    audioRef,
    error,
    voiceFailed,
    persona,
    play,
    pause,
    seekToChapter,
    nextChapter,
    prevChapter,
    handleTimeUpdate,
    handleEnded,
    changePersona,
    retry,
  } = useAudit(url, initialPersona);

  const [urlInput, setUrlInput] = useState(url || "");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // Auto-open share modal when audit ends
  useEffect(() => {
    if (phase === "done") {
      setShareOpen(true);
    }
  }, [phase]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "Escape") {
        if (shareOpen) { setShareOpen(false); e.preventDefault(); }
        if (drawerOpen) { setDrawerOpen(false); e.preventDefault(); }
        return;
      }

      if (shareOpen) return;

      if (e.key === " " && audit) {
        e.preventDefault();
        if (phase === "playing") pause();
        else if (audioSrc) play();
      }

      if (e.key === "ArrowLeft" && audit) {
        e.preventDefault();
        prevChapter();
      }

      if (e.key === "ArrowRight" && audit) {
        e.preventDefault();
        nextChapter();
      }
    },
    [shareOpen, drawerOpen, audit, phase, audioSrc, play, pause, prevChapter, nextChapter]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!url || !persona) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted">Missing URL or persona. Please go back and try again.</p>
      </div>
    );
  }

  const meta = personaMeta[persona];
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = audit
    ? `I just got my website audited by AI — scored ${audit.overallScore}/100! Try it yourself:`
    : "Get your website audited by AI — live voiceover included!";

  let hostname = "";
  try { hostname = new URL(url).hostname; } catch { hostname = url; }

  function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    const normalized = trimmed.match(/^https?:\/\//) ? trimmed : `https://${trimmed}`;
    router.push(`/audit?url=${encodeURIComponent(normalized)}&persona=${persona}`);
  }

  // Loading state
  if (phase === "loading" && !audit) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-2xl bg-surface px-5 py-3"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
            alt=""
            className="h-5 w-5 rounded"
          />
          <span className="text-sm font-medium text-foreground">{hostname}</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 25 }}
          className="relative"
        >
          <div className="animate-float">
            <div
              className="h-28 w-28 overflow-hidden rounded-full border-4 sm:h-32 sm:w-32"
              style={{ borderColor: meta.color + "40" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={meta.avatar} alt={meta.name} className="h-full w-full object-cover" />
            </div>
          </div>
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ border: `2px solid ${meta.color}30` }}
            animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ border: `2px solid ${meta.color}20` }}
            animate={{ scale: [1, 2], opacity: [0.3, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
          />
        </motion.div>

        <div className="flex flex-col items-center gap-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={loadingQuote}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="max-w-sm rounded-2xl bg-surface px-6 py-4 text-center shadow-sm"
            >
              <p className="text-sm leading-relaxed text-foreground">
                &ldquo;{loadingQuote}&rdquo;
              </p>
            </motion.div>
          </AnimatePresence>
          <p className="text-xs font-medium text-muted">
            {meta.name}, {meta.title}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="flex gap-1.5">
            {(["scraping", "analyzing", "generating-voice", "finalizing"] as const).map(
              (step, i) => (
                <motion.div
                  key={step}
                  className="h-1 w-8 rounded-full"
                  animate={{
                    backgroundColor:
                      (["scraping", "analyzing", "generating-voice", "finalizing"] as const).indexOf(loadingStep) >= i
                        ? meta.color
                        : "var(--border)",
                  }}
                  transition={{ duration: 0.3 }}
                />
              )
            )}
          </div>
          <p className="text-xs text-muted">{stepLabels[loadingStep]}</p>
        </motion.div>
      </div>
    );
  }

  // Error state — with retry
  if (error && !audit) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
        <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-red-200 dark:border-red-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={meta.avatar} alt={meta.name} className="h-full w-full object-cover" />
        </div>
        <div className="max-w-sm rounded-2xl bg-surface px-6 py-4 text-center">
          <p className="text-sm text-foreground">&ldquo;Well, that didn&apos;t go as planned...&rdquo;</p>
          <p className="mt-2 text-xs text-red-500">{error}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={retry}
            className="cursor-pointer rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-secondary"
          >
            Retry
          </button>
          <a
            href="/"
            className="rounded-xl bg-surface px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-warm-200"
          >
            &larr; Home
          </a>
        </div>
      </div>
    );
  }

  if (!audit) return null;

  const currentChapter = audit.chapters[activeChapter];
  const totalChapters = audit.chapters.length;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Unified top bar */}
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2 sm:px-4">
        <a href="/" className="shrink-0 text-sm text-muted hover:text-foreground transition-colors">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M11 4L6 9l5 5" />
          </svg>
        </a>

        <form onSubmit={handleUrlSubmit} className="flex min-w-0 items-center">
          <div className="flex min-w-0 items-center gap-2 rounded-lg bg-surface px-3 py-1.5">
            {favicon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={favicon} alt="" className="h-4 w-4 shrink-0 rounded" />
            )}
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleUrlSubmit(e); }}
              className="min-w-0 w-40 bg-transparent text-xs text-muted outline-none placeholder:text-muted/40 sm:w-56"
              placeholder="Enter a URL..."
            />
          </div>
        </form>
        <div className="flex-1" />

        <div className="flex shrink-0 items-center gap-2">
          {/* Score — visible on all screen sizes */}
          <div className="flex items-center gap-1">
            <span className="text-lg font-bold text-foreground sm:text-lg">{audit.overallScore}</span>
            <span className="text-[10px] text-muted">/100</span>
          </div>
          <PersonaSwitcher current={persona} onSwitch={changePersona} />
          <ShareButton onClick={() => setShareOpen(true)} />
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden p-3 sm:p-4">
            <TheatrePlayer
              screenshot={screenshot}
              url={url}
              audit={audit}
              activeChapter={activeChapter}
              scrollY={scrollY}
            />
          </div>

          {/* Bottom control bar */}
          <div className="shrink-0 border-t border-border px-4 py-3 sm:px-6">
            <div className="mx-auto max-w-3xl">
              <div className="mb-3 flex items-center justify-between gap-4">
                <button
                  onClick={prevChapter}
                  disabled={activeChapter === 0}
                  className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 3L5 7l4 4" />
                  </svg>
                  Prev
                </button>

                <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
                  <span className="text-xs font-bold text-accent">{activeChapter + 1}/{totalChapters}</span>
                  <span className="truncate text-xs font-medium text-foreground">{currentChapter?.title}</span>
                </div>

                <button
                  onClick={nextChapter}
                  disabled={activeChapter === totalChapters - 1}
                  className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 3l4 4-4 4" />
                  </svg>
                </button>
              </div>

              <div className="relative">
                <div className={audioSrc ? "opacity-100" : "opacity-30 pointer-events-none"}>
                  <AudioPlayer
                    ref={audioRef}
                    src={audioSrc}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleEnded}
                  />
                </div>

                {phase === "ready" && audioSrc && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm"
                  >
                    <button
                      onClick={play}
                      className="cursor-pointer rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-secondary"
                    >
                      Play Voiceover
                    </button>
                  </motion.div>
                )}

                {voiceFailed && !audioSrc && phase === "ready" && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center">
                    <p className="text-xs text-muted">
                      Voice unavailable. Use the controls above to navigate insights.
                    </p>
                  </div>
                )}
              </div>

              {phase === "done" && !shareOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 flex items-center justify-center"
                >
                  <button
                    onClick={() => setShareOpen(true)}
                    className="cursor-pointer rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-secondary"
                  >
                    Share results
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar — desktop */}
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-border p-4 md:block lg:w-80">
          <div className="mb-6">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
              Summary
            </h3>
            <p className="text-sm leading-relaxed text-foreground">{audit.summary}</p>
          </div>
          <ChapterNav
            chapters={audit.chapters}
            activeChapter={activeChapter}
            onSeek={(i) => {
              seekToChapter(i);
              if (audioSrc && phase !== "playing") play();
            }}
          />
        </aside>
      </div>

      {/* Mobile bottom drawer */}
      <div className="md:hidden">
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          aria-label="Toggle insights panel"
          className="fixed bottom-20 right-4 z-40 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-foreground text-background shadow-lg"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h12M3 12h12" />
          </svg>
        </button>

        <AnimatePresence>
          {drawerOpen && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="glass fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-2xl px-4 py-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Audit Insights</h3>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="cursor-pointer text-muted hover:text-foreground"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l8 8M14 6l-8 8" />
                  </svg>
                </button>
              </div>
              <div className="mb-6">
                <p className="text-sm leading-relaxed text-foreground">{audit.summary}</p>
              </div>
              <ChapterNav
                chapters={audit.chapters}
                activeChapter={activeChapter}
                onSeek={(i) => {
                  seekToChapter(i);
                  if (audioSrc && phase !== "playing") play();
                  setDrawerOpen(false);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Share modal */}
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={shareUrl}
        text={shareText}
        score={audit.overallScore}
        hostname={hostname}
        personaName={meta.name}
        personaAvatar={meta.avatar}
        personaColor={meta.color}
        onBackToAudit={() => setShareOpen(false)}
      />
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted">Loading...</p>
        </div>
      }
    >
      <AuditContent />
    </Suspense>
  );
}
