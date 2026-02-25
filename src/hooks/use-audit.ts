"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Persona, AuditResult } from "@/lib/config";
import { personaMeta } from "@/lib/config";
import { saveRecentAudit } from "@/lib/recent-audits";

export type AuditPhase = "loading" | "ready" | "playing" | "paused" | "done";

export type LoadingStep =
  | "scraping"
  | "analyzing"
  | "generating-voice"
  | "finalizing";

interface CachedAudit {
  audit: AuditResult;
  screenshot: string | null;
  favicon: string | null;
  siteName: string | null;
  audioSrc: string | null;
}

const auditCache = new Map<string, CachedAudit>();

function cacheKey(url: string, persona: string) {
  return `${persona}::${url}`;
}

const PERSIST_PREFIX = "audit-cache::";

function persistToStorage(key: string, data: Omit<CachedAudit, "audioSrc">) {
  try {
    const storageKey = PERSIST_PREFIX + key;
    const payload = JSON.stringify({ ...data, ts: Date.now() });
    localStorage.setItem(storageKey, payload);
  } catch { /* quota exceeded */ }
}

function loadFromStorage(key: string): Omit<CachedAudit, "audioSrc"> | null {
  try {
    const raw = localStorage.getItem(PERSIST_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const age = Date.now() - (parsed.ts || 0);
    if (age > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(PERSIST_PREFIX + key);
      return null;
    }
    return {
      audit: parsed.audit,
      screenshot: parsed.screenshot,
      favicon: parsed.favicon,
      siteName: parsed.siteName,
    };
  } catch {
    return null;
  }
}

function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 90000, ...fetchInit } = init;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Request timed out — the site may be too slow or complex. Please try again."));
    }, timeout);

    fetch(input, fetchInit)
      .then(resolve, reject)
      .finally(() => clearTimeout(timer));
  });
}

function resolveCache(url: string, persona: string): CachedAudit | null {
  const key = cacheKey(url, persona);
  const mem = auditCache.get(key);
  if (mem) return mem;

  if (typeof window === "undefined") return null;
  const stored = loadFromStorage(key);
  if (stored) {
    const full: CachedAudit = { ...stored, audioSrc: null };
    auditCache.set(key, full);
    return full;
  }
  return null;
}

export function useAudit(url: string | null, initialPersona: Persona | null) {
  const [persona, setPersona] = useState<Persona | null>(initialPersona);

  const cached =
    url && persona ? resolveCache(url, persona) : null;

  const [phase, setPhase] = useState<AuditPhase>(cached ? "ready" : "loading");
  const [loadingStep, setLoadingStep] = useState<LoadingStep>("scraping");
  const [loadingQuote, setLoadingQuote] = useState("");
  const [audit, setAudit] = useState<AuditResult | null>(cached?.audit ?? null);
  const [screenshot, setScreenshot] = useState<string | null>(cached?.screenshot ?? null);
  const [favicon, setFavicon] = useState<string | null>(cached?.favicon ?? null);
  const [siteName, setSiteName] = useState<string | null>(cached?.siteName ?? null);
  const [activeChapter, setActiveChapter] = useState(0);
  const [scrollY, setScrollY] = useState(
    cached?.audit.chapters?.[0]?.scrollY ?? 0
  );
  const [audioSrc, setAudioSrc] = useState<string | null>(cached?.audioSrc ?? null);
  const [error, setError] = useState<string | null>(null);
  const [voiceFailed, setVoiceFailed] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Cycle through persona quotes during loading
  useEffect(() => {
    if (phase !== "loading" || !persona) return;
    const quotes = personaMeta[persona].loadingQuotes;
    let i = 0;
    setLoadingQuote(quotes[0]);
    const interval = setInterval(() => {
      i = (i + 1) % quotes.length;
      setLoadingQuote(quotes[i]);
    }, 3000);
    return () => clearInterval(interval);
  }, [phase, persona]);

  useEffect(() => {
    if (!url || !persona) return;

    const key = cacheKey(url, persona);
    const existing = resolveCache(url, persona);
    if (existing) {
      setAudit(existing.audit);
      setScreenshot(existing.screenshot);
      setFavicon(existing.favicon);
      setSiteName(existing.siteName);
      setAudioSrc(existing.audioSrc);
      setActiveChapter(0);
      setScrollY(existing.audit.chapters?.[0]?.scrollY ?? 0);
      setError(null);
      setVoiceFailed(false);
      setPhase("ready");
      return;
    }

    const abortController = new AbortController();
    const { signal } = abortController;

    async function fetchAnalysis() {
      try {
        setPhase("loading");
        setLoadingStep("scraping");
        setError(null);
        setVoiceFailed(false);
        setAudit(null);
        setActiveChapter(0);

        const analyzeTimeout = setTimeout(() => {
          if (!signal.aborted) setLoadingStep("analyzing");
        }, 4000);

        const res = await fetchWithTimeout("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, persona }),
          signal,
          timeout: 90000,
        });

        clearTimeout(analyzeTimeout);

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Analysis failed");
        }

        const data = await res.json();
        if (signal.aborted) return;

        setAudit(data.audit);
        setScreenshot(data.screenshot);
        setFavicon(data.favicon);
        setSiteName(data.siteName);

        if (data.audit.chapters?.length > 0) {
          setScrollY(data.audit.chapters[0].scrollY);
        }

        setLoadingStep("generating-voice");

        let audioBlobUrl: string | null = null;

        try {
          const voiceRes = await fetchWithTimeout("/api/voice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: data.audit.script, persona }),
            signal,
            timeout: 30000,
          });

          if (!voiceRes.ok) throw new Error("Voice API error");

          const audioBlob = await voiceRes.blob();
          if (signal.aborted) return;

          audioBlobUrl = URL.createObjectURL(audioBlob);
          setAudioSrc(audioBlobUrl);
        } catch (voiceErr) {
          if (signal.aborted) return;
          console.warn("[useAudit] Voice failed, continuing without audio:", voiceErr);
          setVoiceFailed(true);
        }

        if (!signal.aborted) {
          const cacheEntry: CachedAudit = {
            audit: data.audit,
            screenshot: data.screenshot,
            favicon: data.favicon,
            siteName: data.siteName,
            audioSrc: audioBlobUrl,
          };
          auditCache.set(key, cacheEntry);
          persistToStorage(key, {
            audit: data.audit,
            screenshot: data.screenshot,
            favicon: data.favicon,
            siteName: data.siteName,
          });

          let hn = "";
          try { hn = new URL(url!).hostname; } catch { hn = url!; }
          saveRecentAudit({
            url: url!,
            hostname: hn,
            persona: persona!,
            score: data.audit.overallScore,
            favicon: data.favicon,
            timestamp: Date.now(),
          });

          setLoadingStep("finalizing");
          setPhase("ready");
        }
      } catch (err) {
        if (signal.aborted) return;
        const msg = err instanceof Error ? err.message : "Something went wrong";
        setError(msg.includes("aborted") ? "Request was cancelled" : msg);
        setPhase("ready");
      }
    }

    fetchAnalysis();
    return () => {
      abortController.abort();
    };
  }, [url, persona, retryCount]);

  // Clean up audio blob URLs on unmount
  useEffect(() => {
    return () => {
      if (audioSrc && audioSrc.startsWith("blob:")) {
        URL.revokeObjectURL(audioSrc);
      }
    };
  }, [audioSrc]);

  const retry = useCallback(() => {
    if (!url || !persona) return;
    const key = cacheKey(url, persona);
    auditCache.delete(key);
    try { localStorage.removeItem(PERSIST_PREFIX + key); } catch { /* */ }
    setError(null);
    setRetryCount((c) => c + 1);
  }, [url, persona]);

  const handleTimeUpdate = useCallback(
    (time: number) => {
      if (!audit) return;
      const el = audioRef.current;
      const duration = el?.duration && isFinite(el.duration) ? el.duration : 0;

      let current = 0;
      for (let i = audit.chapters.length - 1; i >= 0; i--) {
        const ch = audit.chapters[i];
        const chapterStart =
          duration > 0 && ch.wordFraction != null
            ? ch.wordFraction * duration
            : ch.startTime;
        if (time >= chapterStart) {
          current = i;
          break;
        }
      }
      if (current !== activeChapter) {
        setActiveChapter(current);
        setScrollY(audit.chapters[current].scrollY);
      }
    },
    [audit, activeChapter]
  );

  const play = useCallback(() => {
    if (audioSrc && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
    setPhase("playing");
  }, [audioSrc]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setPhase("paused");
  }, []);

  const seekToChapter = useCallback(
    (index: number) => {
      if (!audit) return;
      const chapter = audit.chapters[index];
      if (audioRef.current && audioSrc) {
        const el = audioRef.current;
        const duration = el.duration && isFinite(el.duration) ? el.duration : 0;
        const seekTime =
          duration > 0 && chapter.wordFraction != null
            ? chapter.wordFraction * duration
            : chapter.startTime;
        el.currentTime = seekTime;
      }
      setActiveChapter(index);
      setScrollY(chapter.scrollY);
    },
    [audit, audioSrc]
  );

  const nextChapter = useCallback(() => {
    if (!audit) return;
    const next = Math.min(activeChapter + 1, audit.chapters.length - 1);
    seekToChapter(next);
  }, [audit, activeChapter, seekToChapter]);

  const prevChapter = useCallback(() => {
    if (!audit) return;
    const prev = Math.max(activeChapter - 1, 0);
    seekToChapter(prev);
  }, [audit, activeChapter, seekToChapter]);

  const handleEnded = useCallback(() => {
    setPhase("done");
  }, []);

  const changePersona = useCallback(
    (newPersona: Persona) => {
      if (newPersona === persona) return;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setAudioSrc(null);
      setPersona(newPersona);
    },
    [persona]
  );

  return {
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
  };
}
