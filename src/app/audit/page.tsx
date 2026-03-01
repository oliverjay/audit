"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { TheatrePlayer } from "@/components/ui/theatre-player";
import { VoiceOrb } from "@/components/ui/voice-orb";
import { CompletionFlow, type CompletionView } from "@/components/ui/completion-flow";
import { RedesignModal } from "@/components/ui/redesign-modal";
import { useAudit, hasCachedAudit, hasCachedAuditWithFullAudio } from "@/hooks/use-audit";
import { ThumbsUp, Share2 } from "lucide-react";
import { useActionPlan } from "@/hooks/use-action-plan";
import { ActionPlan } from "@/components/ui/action-plan";
import type { Persona } from "@/lib/config";
import { personaMeta } from "@/lib/config";
import { track } from "@/lib/analytics";

const personaIds: Persona[] = ["ux", "cro", "roast"];

const MUTE_STORAGE_KEY = "audit-muted";

function loadMutePref(): boolean {
  try { return localStorage.getItem(MUTE_STORAGE_KEY) === "1"; } catch { return false; }
}
function saveMutePref(muted: boolean) {
  try { localStorage.setItem(MUTE_STORAGE_KEY, muted ? "1" : "0"); } catch {}
}

type Stage = "loading" | "scanning" | "active";

/* ───────── Persona switcher ───────── */

function PersonaSwitcher({
  current,
  onSwitch,
  isSpeaking,
  cachedPersonas,
  instantPersonas,
}: {
  current: Persona;
  onSwitch: (p: Persona) => void;
  isSpeaking?: boolean;
  cachedPersonas?: Set<Persona>;
  instantPersonas?: Set<Persona>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const meta = personaMeta[current];
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    function handleOutside(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    if (open) document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, [open]);

  useEffect(() => {
    if (open && ref.current) setRect(ref.current.getBoundingClientRect());
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex cursor-pointer items-center gap-2.5 rounded-full px-2 py-1.5 transition-all hover:bg-white/8"
        title="Switch persona"
      >
        <span className="relative flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={meta.avatar}
            alt=""
            className={`h-7 w-7 rounded-full transition-all duration-500 ${isSpeaking ? "ring-[2.5px] ring-orange-500/70 shadow-[0_0_12px_rgba(255,107,53,0.3)]" : "ring-1 ring-white/10"}`}
          />
          {isSpeaking && (
            <motion.span
              className="absolute inset-0 rounded-full ring-2 ring-orange-500/30"
              animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
            />
          )}
        </span>
        <span className="hidden text-[13px] font-medium text-white/90 sm:block">
          {meta.name}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={`text-neutral-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M2.5 4L5 6.5L7.5 4" />
        </svg>
      </button>

      <AnimatePresence>
        {open && rect && (
          <>
            <div
              className="fixed inset-0 z-[9998] bg-black/20"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="fixed z-[9999] w-60 overflow-hidden rounded-2xl bg-neutral-800/95 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl"
              style={{ top: rect.bottom + 8, left: Math.max(8, rect.left) }}
            >
              <div className="px-3 pt-3 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                  Switch critic
                </p>
              </div>
              {personaIds.map((id) => {
                const m = personaMeta[id];
                const isActive = id === current;
                const hasCached = cachedPersonas?.has(id) ?? false;
                const hasFullAudio = instantPersonas?.has(id) ?? false;
                return (
                  <button
                    key={id}
                    onClick={() => {
                      onSwitch(id);
                      setOpen(false);
                    }}
                    className={`flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-all ${isActive ? "bg-white/5" : "hover:bg-white/5"}`}
                  >
                    <span className="relative shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.avatar}
                        alt=""
                        className="h-8 w-8 rounded-full"
                      />
                      {hasCached && (
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-neutral-800 ${hasFullAudio ? "bg-emerald-400" : "bg-amber-400"}`}
                          title={hasFullAudio ? "Voiceover ready" : "Cached (audio loading)"}
                        />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium ${isActive ? "text-white" : "text-white/80"}`}
                      >
                        {m.name}
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        {m.title}
                        {hasFullAudio && !isActive && (
                          <span className="ml-1.5 text-emerald-400/70">· instant</span>
                        )}
                      </p>
                    </div>
                  </button>
                );
              })}
              <div className="px-3 py-2">
                <p className="text-[10px] text-neutral-500">
                  Re-runs the audit with a new perspective
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────── Favicon / Globe icon ───────── */

function SiteIcon({ favicon, size = 14 }: { favicon: string | null; size?: number }) {
  return favicon ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={favicon} alt="" className="shrink-0 rounded-sm" style={{ width: size, height: size }} />
  ) : (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className="shrink-0 text-neutral-500">
      <circle cx="9" cy="9" r="7.25" stroke="currentColor" strokeWidth="1.2"/>
      <ellipse cx="9" cy="9" rx="3.5" ry="7.25" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M2 9h14" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  );
}

/* ───────── Inline URL editing form ───────── */

function UrlEditForm({
  favicon,
  urlInput,
  onUrlInputChange,
  onSubmit,
  onCancel,
  url,
  autoFocus,
}: {
  favicon: string | null;
  urlInput: string;
  onUrlInputChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  url: string;
  autoFocus?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isModified = urlInput.trim() !== url;

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [autoFocus]);

  return (
    <form onSubmit={onSubmit} className="flex-1 min-w-0">
      <div className="flex items-center gap-2.5 rounded-full bg-white/[0.1] px-4 py-2 ring-1 ring-white/[0.16] transition-all">
        <SiteIcon favicon={favicon} size={14} />
        <input
          ref={inputRef}
          type="text"
          value={urlInput}
          onChange={(e) => onUrlInputChange(e.target.value)}
          onBlur={() => setTimeout(onCancel, 150)}
          onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }}
          className="min-w-0 flex-1 bg-transparent text-[16px] sm:text-[13px] text-white/90 outline-none placeholder:text-neutral-500"
          placeholder="Enter a URL..."
        />
        {isModified && urlInput.trim().length > 0 && (
          <button
            type="submit"
            className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent text-white transition-transform hover:scale-110 active:scale-95"
          >
            <svg width="11" height="11" viewBox="0 0 15 15" fill="none">
              <path d="M3 7.5h9m0 0L8.5 4M12 7.5 8.5 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
    </form>
  );
}

/* ───────── Header URL bar (desktop) ───────── */

function HeaderUrlBar({
  url,
  hostname,
  favicon,
  urlInput,
  onUrlInputChange,
  onSubmit,
}: {
  url: string;
  hostname: string;
  favicon: string | null;
  urlInput: string;
  onUrlInputChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="pointer-events-auto w-full max-w-md">
      {!editing ? (
        <button
          onClick={() => setEditing(true)}
          className="group flex w-full cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-1.5 transition-all hover:bg-white/[0.07]"
        >
          <SiteIcon favicon={favicon} size={14} />
          <span className="text-[13px] font-medium text-white/70 group-hover:text-white/90 transition-colors truncate">
            {hostname}
          </span>
        </button>
      ) : (
        <UrlEditForm
          favicon={favicon}
          urlInput={urlInput}
          onUrlInputChange={onUrlInputChange}
          onSubmit={onSubmit}
          onCancel={() => setEditing(false)}
          url={url}
          autoFocus
        />
      )}
    </div>
  );
}

/* ───────── Main audit content ───────── */

function AuditContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get("url");
  const rawPersona = searchParams.get("persona");
  const validPersonas: Persona[] = ["ux", "cro", "roast"];
  const initialPersona: Persona | null = rawPersona && validPersonas.includes(rawPersona as Persona)
    ? (rawPersona as Persona)
    : null;
  const initialAuditId = searchParams.get("id");

  const {
    phase,
    fetchingQuote,
    loadingQuote,
    audit,
    auditId,
    favicon,
    screenshot,
    activeChapter,
    scrollY,
    chapterAudioSrcs,
    audioRef,
    error,
    voiceFailed,
    voiceReady,
    audioRestoreDone,
    persona,
    play,
    pause,
    seekToChapter,
    nextChapter,
    handleTimeUpdate,
    handleEnded,
    changePersona,
    retry,
  } = useAudit(url, initialPersona, initialAuditId);

  const [urlInput, setUrlInput] = useState(url || "");
  const [mobileUrlEditing, setMobileUrlEditing] = useState(false);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [completionView, setCompletionView] = useState<CompletionView>("hub");
  const [actionPlanOpen, setActionPlanOpen] = useState(false);
  const [redesignOpen, setRedesignOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("loading");

  const actionPlan = useActionPlan(url, persona, audit?.chapters, auditId);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const hasScreenshot = !!screenshot;
  const hasAudit = !!audit;
  const isPlaying = phase === "playing";

  const cachedPersonas = useMemo(() => {
    const set = new Set<Persona>();
    if (!url) return set;
    for (const p of personaIds) {
      if (hasCachedAudit(url, p)) set.add(p);
    }
    if (persona && voiceReady) set.add(persona);
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, persona, voiceReady, audit]);
  const instantPersonas = useMemo(() => {
    const set = new Set<Persona>();
    if (!url) return set;
    for (const p of personaIds) {
      if (hasCachedAuditWithFullAudio(url, p)) set.add(p);
    }
    if (persona && voiceReady) set.add(persona);
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, persona, voiceReady, audit, chapterAudioSrcs]);
  const [userHasPlayed, setUserHasPlayed] = useState(false);
  const showPlayPrompt = voiceReady && !isPlaying && (phase === "ready" || phase === "paused") && !userHasPlayed;
  console.log("[play-prompt]", { showPlayPrompt, voiceReady, isPlaying, phase, userHasPlayed, stage });
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;
  const activeChapterPageRef = useRef(activeChapter);
  activeChapterPageRef.current = activeChapter;
  const chapterAudioSrcsRef = useRef(chapterAudioSrcs);
  chapterAudioSrcsRef.current = chapterAudioSrcs;
  // Tracks whether the current pause was caused by muting (so unmuting can resume)
  const pausedByMuteRef = useRef(false);

  // Load persisted mute preference on mount
  useEffect(() => {
    setIsMuted(loadMutePref());
  }, []);

  // Track the last known auditId so we never lose it from the URL during
  // persona transitions (when auditId briefly resets to null).
  const lastAuditIdRef = useRef<string | null>(initialAuditId);

  // Keep the URL bar in sync with current state.
  // Uses replaceState directly — no navigation, no re-render, no Next.js router
  // interference. The id/persona/url are only read on initial mount anyway.
  useEffect(() => {
    if (!url || !persona) return;
    if (auditId) lastAuditIdRef.current = auditId;
    const id = lastAuditIdRef.current;
    const u = new URL(window.location.href);
    u.searchParams.set("url", url);
    u.searchParams.set("persona", persona);
    if (id) u.searchParams.set("id", id);
    else u.searchParams.delete("id");
    const next = u.toString();
    if (next !== window.location.href) window.history.replaceState({}, "", next);
  }, [url, persona, auditId]);

  // Derive the correct stage from phase + data availability.
  // On persona switch the phase resets to "loading" with audit cleared but
  // the screenshot may be preserved from a previous persona's cache.
  useEffect(() => {
    if (phase === "loading" && !hasAudit) {
      setStage(hasScreenshot ? "scanning" : "loading");
    }
  }, [phase, hasAudit, hasScreenshot]);

  // loading -> scanning when screenshot arrives
  useEffect(() => {
    if (stage === "loading" && hasScreenshot) {
      setStage("scanning");
    }
  }, [stage, hasScreenshot]);

  const voiceGate = voiceReady || voiceFailed;

  // scanning -> active when audit data AND first audio are ready
  useEffect(() => {
    if (stage === "scanning" && hasAudit && voiceGate) {
      setStage("active");
    }
  }, [stage, hasAudit, voiceGate]);

  // Cache hit: both arrive at once — go straight to active (screenshot present)
  useEffect(() => {
    if (stage === "loading" && hasAudit && hasScreenshot && voiceGate) {
      setStage("active");
    }
  }, [stage, hasAudit, hasScreenshot, voiceGate]);

  // Cache hit with no screenshot — still need to transition out of loading.
  // Without this, stage stays "loading" forever and the UI shows a blank screen.
  useEffect(() => {
    if (stage === "loading" && hasAudit && !hasScreenshot && voiceGate) {
      setStage("active");
    }
  }, [stage, hasAudit, hasScreenshot, voiceGate]);

  // Auto-play audio when it becomes ready (if not muted).
  const autoPlayedRef = useRef(false);
  useEffect(() => {
    if (voiceReady && !autoPlayedRef.current && stage === "active" && !isMuted) {
      autoPlayedRef.current = true;
      play();
    }
  }, [voiceReady, stage, isMuted, play]);

  // Listen for the native "playing" event on the audio element.
  // This only fires when audio actually starts playing — never when the
  // browser blocks autoplay. This is the single reliable way to know
  // playback succeeded, so we use it to hide the play prompt.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    function onPlaying() { setUserHasPlayed(true); }
    el.addEventListener("playing", onPlaying);
    return () => el.removeEventListener("playing", onPlaying);
  }, [audioRef]);

  // Reset flags on persona switch / new URL so autoplay re-fires and
  // the play-prompt is eligible to appear again for the new persona.
  useEffect(() => {
    if (phase === "loading") {
      autoPlayedRef.current = false;
      setUserHasPlayed(false);
    }
  }, [phase]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Escape") {
        if (completionOpen) {
          setCompletionOpen(false);
          e.preventDefault();
        }
        if (actionPlanOpen) {
          setActionPlanOpen(false);
          e.preventDefault();
        }
        return;
      }
      if (completionOpen) return;
      if (stage !== "active") return;
      if (e.key === " ") {
        e.preventDefault();
        if (voiceReady) {
          if (isPlaying) pause();
          else { setUserHasPlayed(true); play(); }
        }
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const cur = activeChapterPageRef.current;
        const canNav = isMutedRef.current || audioWaitExpiredRef.current || audioRestoreDoneRef.current || !!chapterAudioSrcsRef.current[cur - 1];
        if (cur > 0 && canNav) {
          seekToChapter(cur - 1);
          if (!isMutedRef.current && chapterAudioSrcsRef.current[cur - 1]) play();
        }
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        const cur = activeChapterPageRef.current;
        const total = audit?.chapters?.length ?? 0;
        const canNav = isMutedRef.current || audioWaitExpiredRef.current || audioRestoreDoneRef.current || !!chapterAudioSrcsRef.current[cur + 1];
        if (cur < total - 1 && canNav) {
          seekToChapter(cur + 1);
          if (!isMutedRef.current && chapterAudioSrcsRef.current[cur + 1]) play();
        }
      }
      if (e.key === "m") {
        const newMuted = !isMutedRef.current;
        setIsMuted(newMuted);
        saveMutePref(newMuted);
        if (newMuted && audioRef.current) {
          audioRef.current.muted = true;
          pause();
        } else if (!newMuted && audioRef.current) {
          audioRef.current.muted = false;
        }
      }
    },
    [
      completionOpen,
      actionPlanOpen,
      audit,
      stage,
      isPlaying,
      voiceReady,
      play,
      pause,
      seekToChapter,
      audioRef,
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Auto-open completion flow when audit finishes; close overlays when reset
  useEffect(() => {
    if (phase === "done") {
      let hn = "";
      try { hn = new URL(url!).hostname; } catch { hn = url ?? ""; }
      track("Audit Completed", { persona: persona!, hostname: hn, score: audit?.overallScore ?? 0, chapters: audit?.chapters?.length ?? 0 });
      setCompletionOpen(true);
    } else if (phase === "loading") {
      setCompletionOpen(false);
      setActionPlanOpen(false);
      setRedesignOpen(false);
    }
  }, [phase, persona, url, audit]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "r" && !e.metaKey && !e.ctrlKey && !e.altKey && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        if (audit && screenshot) {
          let hn = "";
          try { hn = new URL(url!).hostname; } catch { hn = url ?? ""; }
          track("Redesign Opened", { persona: persona!, hostname: hn });
          setRedesignOpen(true);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [audit, screenshot]);

  if (!url || !persona) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-neutral-950">
        <p className="text-sm text-neutral-500">Missing URL or persona.</p>
      </div>
    );
  }

  const meta = personaMeta[persona];
  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = url;
  }

  function openCompletion(view: CompletionView = "hub") {
    track("Completion Opened", { persona: persona!, hostname, score: audit?.overallScore ?? 0, view });
    if (isPlaying) pause();
    setCompletionView(view);
    setCompletionOpen(true);
  }

  function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    const normalized = trimmed.match(/^https?:\/\//)
      ? trimmed
      : `https://${trimmed}`;
    let newHn = "";
    try { newHn = new URL(normalized).hostname; } catch { newHn = normalized; }
    track("URL Changed", { url: normalized, hostname: newHn, persona: persona!, source: "audit_header" });
    router.push(
      `/audit?url=${encodeURIComponent(normalized)}&persona=${persona}`
    );
  }

  if (error && !audit) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 bg-neutral-950">
        <div className="relative">
          <div className="h-20 w-20 overflow-hidden rounded-full ring-1 ring-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={meta.avatar}
              alt={meta.name}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
        <div className="max-w-sm text-center">
          <p className="text-sm text-white/90">
            &ldquo;Well, that didn&apos;t go as planned...&rdquo;
          </p>
          <p className="mt-2 text-xs text-red-400/80">{error}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { track("Audit Retried", { persona: persona!, hostname }); retry(); }}
            className="cursor-pointer rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-neutral-900 transition-all hover:bg-neutral-200 hover:scale-105 active:scale-95"
          >
            Retry
          </button>
          <a
            href="/"
            className="rounded-full bg-white/8 px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/12"
          >
            Home
          </a>
        </div>
      </div>
    );
  }

  const currentChapter = audit?.chapters[activeChapter];
  const totalChapters = audit?.chapters.length ?? 0;
  const emptyAudit = {
    summary: "",
    overallScore: 0,
    script: "",
    chapters: [],
    hotspots: [],
    stats: [],
  };

  function togglePlay() {
    if (!voiceReady) return;
    if (isPlaying) {
      track("Playback Paused", { chapter: activeChapter, persona: persona! });
      pause();
    } else {
      track("Playback Started", { chapter: activeChapter, persona: persona! });
      if (isMuted) {
        setIsMuted(false);
        saveMutePref(false);
        if (audioRef.current) audioRef.current.muted = false;
        pausedByMuteRef.current = false;
      }
      setUserHasPlayed(true);
      play();
    }
  }

  function toggleMute() {
    const newMuted = !isMuted;
    track("Mute Toggled", { muted: newMuted, persona: persona! });
    setIsMuted(newMuted);
    saveMutePref(newMuted);
    if (audioRef.current) audioRef.current.muted = newMuted;
    if (newMuted && isPlaying) {
      pausedByMuteRef.current = true;
      pause();
    } else if (!newMuted && pausedByMuteRef.current && voiceReady) {
      pausedByMuteRef.current = false;
      setUserHasPlayed(true);
      play();
    } else {
      pausedByMuteRef.current = false;
    }
  }

  function cycleSpeed() {
    const speeds = [1, 1.5, 2];
    const next = speeds[(speeds.indexOf(playbackRate) + 1) % speeds.length];
    track("Speed Changed", { speed: next, persona: persona! });
    setPlaybackRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  // Keep playback rate in sync when audio elements change
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [chapterAudioSrcs, activeChapter, playbackRate, audioRef]);

  // Sync mute state to audio element
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted;
  }, [isMuted, chapterAudioSrcs, activeChapter, audioRef]);

  // After 5s of waiting for the next chapter's audio, allow skipping ahead
  const [audioWaitExpired, setAudioWaitExpired] = useState(false);
  const audioWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nextChapterIndex = activeChapter + 1;
  const nextChapterNeedsWait =
    !isPlaying &&
    phase === "paused" &&
    nextChapterIndex < totalChapters &&
    !chapterAudioSrcs[nextChapterIndex] &&
    !voiceFailed &&
    !isMuted;

  useEffect(() => {
    if (nextChapterNeedsWait && !audioWaitExpired) {
      audioWaitTimerRef.current = setTimeout(() => setAudioWaitExpired(true), 5000);
      return () => { if (audioWaitTimerRef.current) clearTimeout(audioWaitTimerRef.current); };
    }
    if (!nextChapterNeedsWait) setAudioWaitExpired(false);
  }, [nextChapterNeedsWait, audioWaitExpired]);

  const audioWaitExpiredRef = useRef(audioWaitExpired);
  audioWaitExpiredRef.current = audioWaitExpired;
  const audioRestoreDoneRef = useRef(audioRestoreDone);
  audioRestoreDoneRef.current = audioRestoreDone;

  const chapterHasAudio = useCallback(
    (index: number) => {
      if (!!chapterAudioSrcs[index]) return true;
      if (voiceFailed || isMuted || audioWaitExpired) return true;
      // If audio restore already finished and this chapter still has no audio,
      // it won't arrive — allow immediate navigation without waiting 5s.
      if (audioRestoreDone) return true;
      return false;
    },
    [chapterAudioSrcs, voiceFailed, isMuted, audioWaitExpired, audioRestoreDone]
  );

  function handleNavigateChapter(index: number) {
    if (!chapterHasAudio(index)) return;
    track("Chapter Navigated", { chapter: index, total: totalChapters, persona: persona! });
    seekToChapter(index);
    if (voiceReady && !isMuted && chapterAudioSrcs[index]) {
      play();
    }
  }

  function handleNext() {
    if (!audit) return;
    if (activeChapter === totalChapters - 1) {
      openCompletion();
      return;
    }
    const next = Math.min(activeChapter + 1, totalChapters - 1);
    handleNavigateChapter(next);
  }

  function handlePrev() {
    if (!audit || activeChapter === 0) return;
    handleNavigateChapter(activeChapter - 1);
  }

  const panelConstraintsRef = useRef<HTMLDivElement>(null);
  const panelDragControls = useDragControls();

  const isActive = stage === "active";
  const isScanning = stage === "scanning";
  const showHeader = isScanning || isActive;
  const showScreenshot =
    hasScreenshot && (isScanning || isActive);

  return (
    <div ref={panelConstraintsRef} className="flex h-dvh flex-col overflow-hidden bg-neutral-950" style={{ overscrollBehavior: "none" }}>
      {/* Hidden audio — per-chapter voiceover */}
      <audio
        ref={audioRef}
        preload="auto"
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />

      {/* ─── Header ─── */}
      <AnimatePresence>
        {showHeader && (
          <motion.header
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-50 flex shrink-0 items-center border-b border-white/[0.06] px-3 py-2.5 sm:px-5"
            style={{
              background:
                "linear-gradient(180deg, rgba(23,23,23,0.97) 0%, rgba(18,18,18,0.95) 100%)",
              backdropFilter: "blur(20px) saturate(1.2)",
              WebkitBackdropFilter: "blur(20px) saturate(1.2)",
            }}
          >
            {mobileUrlEditing ? (
              /* ── Mobile full-header URL edit mode ── */
              <div className="flex w-full items-center gap-2">
                <button
                  onClick={() => setMobileUrlEditing(false)}
                  className="shrink-0 rounded-full p-2 text-neutral-400 transition-colors hover:text-white cursor-pointer"
                >
                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M11 4L6 9l5 5" />
                  </svg>
                </button>
                <UrlEditForm
                  favicon={favicon}
                  urlInput={urlInput}
                  onUrlInputChange={setUrlInput}
                  onSubmit={(e) => { handleUrlSubmit(e); setMobileUrlEditing(false); }}
                  onCancel={() => setMobileUrlEditing(false)}
                  url={url}
                  autoFocus
                />
              </div>
            ) : (
            <>
            {/* Left: back + persona */}
            <div className="flex items-center gap-1">
              <a
                href="/"
                className="shrink-0 rounded-full p-2 text-neutral-400 transition-colors hover:text-white hover:bg-white/8"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 18 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M11 4L6 9l5 5" />
                </svg>
              </a>
              <PersonaSwitcher
                current={persona}
                onSwitch={(p) => {
                  track("Persona Switched", { from: persona!, to: p, hostname });
                  changePersona(p);
                }}
                isSpeaking={isPlaying}
                cachedPersonas={cachedPersonas}
                instantPersonas={instantPersonas}
              />
            </div>

            {/* Center: favicon on mobile, full URL bar on desktop */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Mobile: large centered favicon */}
              <button
                onClick={() => setMobileUrlEditing(true)}
                className="pointer-events-auto flex cursor-pointer items-center justify-center rounded-full p-2.5 transition-all hover:bg-white/[0.07] sm:hidden"
              >
                <SiteIcon favicon={favicon} size={28} />
              </button>
              {/* Desktop: full URL bar */}
              <div className="hidden sm:flex pointer-events-auto w-full max-w-md">
                <HeaderUrlBar
                  url={url}
                  hostname={hostname}
                  favicon={favicon}
                  urlInput={urlInput}
                  onUrlInputChange={setUrlInput}
                  onSubmit={handleUrlSubmit}
                />
              </div>
            </div>

            {/* Right: actions */}
            <div className="ml-auto flex items-center gap-2.5">
              {isActive && hasAudit && (
                <button
                  onClick={() => {
                    const opening = !actionPlanOpen;
                    if (opening) track("Tasks Panel Opened", { persona: persona!, hostname });
                    setActionPlanOpen(opening);
                  }}
                  className="relative flex cursor-pointer items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-2 text-[13px] font-medium text-neutral-300 transition-all hover:text-white hover:bg-white/[0.1] sm:px-3.5"
                  title="Tasks"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 4.5l2 2 4-4" />
                    <path d="M3 10.5l2 2 4-4" />
                    <path d="M12 4.5h2" />
                    <path d="M12 10.5h2" />
                  </svg>
                  <span>Tasks</span>
                  {(actionPlan.approvedCount + actionPlan.plan.userTasks.length) > 0 && (
                    <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-white">
                      {actionPlan.approvedCount + actionPlan.plan.userTasks.length}
                    </span>
                  )}
                </button>
              )}
              {isActive && hasAudit && (
                <button
                  onClick={() => openCompletion("share")}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-2 text-[13px] font-medium text-neutral-300 transition-all hover:text-white hover:bg-white/[0.1]"
                  title="Share"
                >
                  <Share2 size={14} />
                  <span className="hidden sm:inline">Share</span>
                </button>
              )}
              {/* AI Redesign button hidden — press 'r' to open */}
              {isActive && hasAudit && phase === "done" && (
                <button
                  onClick={() => openCompletion()}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full bg-orange-500 px-4 py-2 text-[13px] font-semibold text-white transition-all hover:bg-orange-400 hover:scale-[1.02] active:scale-[0.98] sm:px-5"
                >
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 8.5l3.5 3.5 6.5-8" />
                  </svg>
                  Done
                </button>
              )}
            </div>
            </>
            )}
          </motion.header>
        )}
      </AnimatePresence>

      {/* ─── Main area ─── */}
      <div className="relative flex-1 overflow-hidden">
        {/* Screenshot layer */}
        {showScreenshot && (
          <div className="absolute inset-0">
            <TheatrePlayer
              url={url}
              audit={audit ?? emptyAudit}
              activeChapter={activeChapter}
              scrollY={scrollY}
              screenshot={screenshot}
              zoomed={isActive}
              scanning={isScanning}
            />
          </div>
        )}

        {/* ─── LOADING: cinematic dark screen ─── */}
        <AnimatePresence>
          {stage === "loading" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }}
              className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-neutral-950"
            >
              {/* Ambient glow behind avatar */}
              <div
                className="pointer-events-none absolute animate-breathe"
                style={{
                  width: 280,
                  height: 280,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${meta.color}15 0%, transparent 70%)`,
                }}
              />

              <div className="relative flex flex-col items-center gap-5">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: 0.1,
                    type: "spring",
                    stiffness: 200,
                    damping: 20,
                  }}
                  className="relative"
                >
                  <div className="animate-float">
                    <div className="h-24 w-24 overflow-hidden rounded-full ring-1 ring-white/10 sm:h-28 sm:w-28">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={meta.avatar}
                        alt={meta.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                  <motion.span
                    className="absolute inset-0 rounded-full border border-white/10"
                    animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                  />
                  <motion.span
                    className="absolute inset-0 rounded-full border border-white/5"
                    animate={{ scale: [1, 2], opacity: [0.2, 0] }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeOut",
                      delay: 0.5,
                    }}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center"
                >
                  <p className="text-base font-medium text-white/90">
                    Fetching site...
                  </p>
                  <p className="text-sm text-neutral-400">
                    {meta.name} will review it next
                  </p>
                </motion.div>

                {/* Branded pill */}
                <AnimatePresence>
                  {favicon && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center gap-2.5 rounded-full bg-white/5 px-4 py-2 ring-1 ring-white/8"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={favicon}
                        alt=""
                        className="h-4 w-4 rounded-sm"
                      />
                      <span className="text-sm font-medium text-white/80">
                        {hostname}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Cycling quotes */}
                <div className="h-6 overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={fetchingQuote}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      className="max-w-xs text-center text-sm text-neutral-400"
                    >
                      {fetchingQuote}
                    </motion.p>
                  </AnimatePresence>
                </div>

                {/* Progress bar */}
                <div className="mt-1 h-0.5 w-36 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    initial={{ x: "-100%" }}
                    animate={{ x: "250%" }}
                    transition={{
                      duration: 1.6,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    style={{ width: "40%" }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── SCANNING: screenshot visible with status overlay ─── */}
        <AnimatePresence>
          {isScanning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{
                opacity: 0,
                transition: { duration: 0.5 },
              }}
              className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-end pb-12 sm:pb-16"
            >
              {/* Gradient scrim */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />

              <div className="relative z-10 flex flex-col items-center gap-5">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="rounded-full bg-white/[0.06] px-5 py-2.5 ring-1 ring-white/[0.08] backdrop-blur-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative h-8 w-8 overflow-hidden rounded-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={meta.avatar}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <motion.div
                          className="h-3 w-3 rounded-full border-[1.5px] border-transparent border-t-white/60"
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white/90">
                        {hasAudit ? `${meta.name} is preparing the walkthrough...` : `${meta.name} is analyzing...`}
                      </span>
                      <div className="h-5 overflow-hidden">
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={hasAudit ? "voice-prep" : loadingQuote}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.2 }}
                            className="block text-xs leading-5 text-white/45"
                          >
                            {hasAudit ? "Almost ready..." : loadingQuote}
                          </motion.span>
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── ACTIVE: bottom insight panel ─── */}
        {isActive && hasAudit && (
            <motion.div
              drag
              dragControls={panelDragControls}
              dragListener={false}
              dragMomentum={false}
              dragElastic={0.1}
              dragConstraints={panelConstraintsRef}
              className="absolute left-0 right-0 bottom-0 z-10 flex justify-center pb-6 px-3 sm:px-5"
            >
              <div
                className="w-full max-w-[520px] rounded-2xl shadow-[0_8px_60px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.08]"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(20,20,20,0.85) 0%, rgba(10,10,10,0.9) 100%)",
                  backdropFilter: "blur(40px) saturate(1.2)",
                  WebkitBackdropFilter: "blur(40px) saturate(1.2)",
                }}
              >
                {/* Drag handle */}
                <div
                  onPointerDown={(e) => panelDragControls.start(e)}
                  className="hidden xl:flex items-center justify-center pt-2 pb-0 cursor-grab active:cursor-grabbing select-none"
                  style={{ touchAction: "none" }}
                >
                  <div className="h-1 w-8 rounded-full bg-white/10 transition-colors hover:bg-white/20" />
                </div>
                {/* Content area */}
                <div className="flex items-start gap-3 px-4 pt-4 pb-3 sm:px-5 sm:gap-4 xl:px-6 xl:pt-3 xl:pb-4 xl:gap-5">
                  {/* Voice orb — audio enhancement layer */}
                  <VoiceOrb
                    avatarUrl={meta.avatar}
                    name={meta.name}
                    isPlaying={isPlaying}
                    voiceReady={voiceReady}
                    userHasPlayed={userHasPlayed}
                    audioRef={audioRef}
                    onTogglePlay={togglePlay}
                    playbackRate={playbackRate}
                    onCycleSpeed={cycleSpeed}
                  />

                  {/* Insight text / play prompt */}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <AnimatePresence mode="wait">
                      {showPlayPrompt ? (
                        <motion.div
                          key="play-prompt"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.25 }}
                          className="flex flex-col"
                        >
                          <p className="text-[13px] xl:text-[15px] font-semibold text-white">
                            Ready to walk you through it
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/30">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 5L6 9H2v6h4l5 4V5z" />
                              <path d="M15.54 8.46a5 5 0 010 7.07" />
                            </svg>
                            Turn up your volume
                          </p>
                          <button
                            onClick={togglePlay}
                            className="mt-3 inline-flex w-fit cursor-pointer items-center gap-2 rounded-full bg-orange-500 px-4 py-1.5 text-[12px] font-semibold text-white transition-all hover:bg-orange-400 active:scale-95"
                          >
                            <svg width="10" height="10" viewBox="0 0 14 14" fill="white">
                              <path d="M4 2v10l8-5-8-5Z" />
                            </svg>
                            Play walkthrough
                          </button>
                        </motion.div>
                      ) : (
                        <motion.div
                          key={`ch-${activeChapter}`}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.25 }}
                        >
                          <div className="mb-1 flex items-baseline gap-2">
                            <h3 className="text-[13px] xl:text-[15px] font-semibold leading-tight text-white">
                              {currentChapter?.title}
                            </h3>
                            <span className="shrink-0 text-[10px] tabular-nums font-medium text-white/25">
                              {activeChapter + 1}/{totalChapters}
                            </span>
                          </div>
                          <p className="text-[12px] xl:text-[13px] leading-relaxed text-white/55">
                            {currentChapter?.summary}
                          </p>
                          {currentChapter?.learnUrl && (
                            <a
                              href={currentChapter.learnUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-flex items-center gap-1 text-[10px] text-orange-400/60 transition-colors hover:text-orange-400"
                            >
                              <svg width="9" height="9" viewBox="0 0 16 16" fill="none" className="shrink-0">
                                <path d="M6 3H3v10h10v-3M9 2h5v5M14 2L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              {currentChapter.learnLabel || "Learn more"}
                            </a>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Rating buttons + Results */}
                  <div className="flex shrink-0 items-center gap-1">
                    {!showPlayPrompt && audit && (
                      <>
                        <button
                          onClick={() => {
                            const wasApproved = actionPlan.plan.ratings[activeChapter]?.status === "approved";
                            track(wasApproved ? "Insight Removed" : "Insight Approved", { chapter: activeChapter, title: currentChapter?.title ?? "", persona: persona! });
                            actionPlan.rate(activeChapter, "approved");
                          }}
                          title={actionPlan.plan.ratings[activeChapter]?.status === "approved" ? "Remove from plan" : "Add to plan"}
                          className={`flex cursor-pointer h-7 w-7 items-center justify-center rounded-full transition-all ${
                            actionPlan.plan.ratings[activeChapter]?.status === "approved"
                              ? "bg-emerald-500 text-white"
                              : "bg-white/[0.06] text-white/30 hover:bg-emerald-500/20 hover:text-emerald-400"
                          }`}
                        >
                          {actionPlan.plan.ratings[activeChapter]?.status === "approved"
                            ? <ThumbsUp size={13} fill="currentColor" />
                            : <ThumbsUp size={13} />
                          }
                        </button>
                      </>
                    )}
                    {phase === "done" && (
                      <button
                        onClick={() => openCompletion()}
                        className="cursor-pointer rounded-full bg-orange-500 px-3.5 py-1.5 text-[11px] font-semibold text-white transition-all hover:bg-orange-400 active:scale-95"
                      >
                        Results
                      </button>
                    )}
                  </div>
                </div>

                {/* Navigation bar — hidden while play prompt is showing */}
                {!showPlayPrompt && <div className="flex items-center gap-1.5 border-t border-white/[0.05] px-3 py-2 sm:px-4 xl:px-5 xl:py-2.5">
                  {/* Prev */}
                  <button
                    onClick={handlePrev}
                    disabled={activeChapter === 0 || !chapterHasAudio(activeChapter - 1)}
                    className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/30 transition-all hover:text-white/70 hover:bg-white/5 disabled:opacity-15 disabled:cursor-not-allowed"
                    title="Previous (←)"
                  >
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 3L5 7l4 4" />
                    </svg>
                  </button>

                  {/* Progress pips */}
                  <div className="flex flex-1 items-center justify-center gap-1">
                    {audit.chapters.map((_, i) => {
                      const hasAudio = chapterHasAudio(i);
                      const isCurrent = i === activeChapter;
                      return (
                        <button
                          key={i}
                          onClick={() => handleNavigateChapter(i)}
                          disabled={!hasAudio}
                          className={`flex items-center justify-center py-2 ${hasAudio ? "cursor-pointer" : "cursor-not-allowed"}`}
                        >
                          <span className={`block rounded-full transition-all duration-500 ${
                            isCurrent
                              ? "w-7 h-1 bg-orange-500"
                              : hasAudio && i < activeChapter
                                ? "w-1.5 h-1 bg-white/25 hover:bg-white/45"
                                : hasAudio
                                  ? "w-1.5 h-1 bg-white/10 hover:bg-white/20"
                                  : "w-1.5 h-1 bg-white/5 animate-pulse"
                          }`}
                          title={hasAudio ? (audit.chapters[i]?.title ?? `Insight ${i + 1}`) : "Loading audio..."}
                          />
                        </button>
                      );
                    })}
                  </div>

                  {/* Next / Complete */}
                  {activeChapter === totalChapters - 1 ? (
                    <button
                      onClick={() => openCompletion()}
                      className="flex cursor-pointer items-center gap-1.5 rounded-full bg-orange-500 px-5 py-2 text-[12px] font-semibold text-white transition-all hover:bg-orange-400 hover:scale-[1.03] active:scale-[0.97]"
                    >
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M3 8.5l3.5 3.5 6.5-8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Complete
                    </button>
                  ) : (
                    <button
                      onClick={handleNext}
                      disabled={!chapterHasAudio(activeChapter + 1)}
                      className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-[12px] font-semibold text-white transition-all ${
                        chapterHasAudio(activeChapter + 1)
                          ? "cursor-pointer bg-orange-500 hover:bg-orange-400 hover:scale-[1.03] active:scale-[0.97]"
                          : "bg-white/10 cursor-not-allowed opacity-60"
                      }`}
                      title={chapterHasAudio(activeChapter + 1) ? "Next (→)" : "Loading next chapter..."}
                    >
                      {!chapterAudioSrcs[activeChapter + 1] && !voiceFailed && !isMuted && !audioRestoreDone
                        ? (audioWaitExpired ? "Skip" : "Loading...")
                        : "Next"}
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 3l4 4-4 4" />
                      </svg>
                    </button>
                  )}
                </div>}
              </div>
            </motion.div>
        )}

      </div>

      {/* Voice failed notice */}
      {voiceFailed && !voiceReady && isActive && hasAudit && (
        <div className="absolute bottom-20 left-1/2 z-20 -translate-x-1/2">
          <p className="rounded-full bg-neutral-900/90 px-4 py-2 text-xs text-neutral-400 shadow-lg ring-1 ring-white/5 backdrop-blur-sm">
            Voice unavailable — use controls to navigate
          </p>
        </div>
      )}

      {/* Action Plan panel */}
      {audit && (
        <ActionPlan
          open={actionPlanOpen}
          onClose={() => setActionPlanOpen(false)}
          chapters={audit.chapters}
          hostname={hostname}
          url={typeof window !== "undefined" ? window.location.href : `${url ?? ""}?persona=${persona ?? ""}`}
          score={audit.overallScore}
          actionPlan={actionPlan}
          onSeek={(i) => {
            handleNavigateChapter(i);
            setActionPlanOpen(false);
          }}
        />
      )}

      {/* Completion flow */}
      {audit && (
        <CompletionFlow
          open={completionOpen}
          initialView={completionView}
          onClose={() => setCompletionOpen(false)}
          onOpenTasks={() => setActionPlanOpen(true)}
          url={typeof window !== "undefined" ? window.location.href : `${url ?? ""}?persona=${persona ?? ""}`}
          hostname={hostname}
          score={audit.overallScore}
          summary={audit.summary}
          personaName={meta.name}
          personaAvatar={meta.avatar}
          personaColor={meta.color}
          actionPlan={actionPlan}
          chapters={audit.chapters}
        />
      )}

      {/* AI Redesign modal */}
      {audit && screenshot && (
        <RedesignModal
          open={redesignOpen}
          onClose={() => setRedesignOpen(false)}
          audit={audit}
          persona={persona}
          hostname={hostname}
          screenshot={screenshot}
        />
      )}

    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-neutral-950">
          <p className="text-sm text-neutral-500">Loading...</p>
        </div>
      }
    >
      <AuditContent />
    </Suspense>
  );
}
