"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Persona, AuditResult } from "@/lib/config";
import { personaMeta } from "@/lib/config";
import { saveRecentAudit } from "@/lib/recent-audits";
import { track } from "@/lib/analytics";

export type AuditPhase =
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "done";

interface CachedAudit {
  audit: AuditResult;
  auditId: string | null;
  favicon: string | null;
  siteName: string | null;
  screenshot: string | null;
  chapterAudioSrcs: string[];
}

const auditCache = new Map<string, CachedAudit>();

// Track which url::persona combos we've already triggered prewarm for this session
const prewarmedKeys = new Set<string>();

/**
 * After a successful audit for `currentPersona`, silently trigger analysis +
 * audio generation for the other two personas so they're ready in Supabase
 * when the user switches. The server will skip any that are already cached.
 * We drain-and-discard the streaming response so the server runs to completion.
 */
function prewarmOtherPersonas(url: string, currentPersona: Persona) {
  const allPersonas: Persona[] = ["ux", "cro", "roast"];
  const others = allPersonas.filter((p) => p !== currentPersona);

  for (const persona of others) {
    const key = `${url}::${persona}`;
    if (prewarmedKeys.has(key)) continue;
    prewarmedKeys.add(key);

    console.log(`[prewarm] Triggering background audit for ${url} (${persona})`);

    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // keepalive keeps the request alive even if the page navigates away
      keepalive: true,
      body: JSON.stringify({ url, persona }),
    })
      .then((res) => {
        if (!res.body) return;
        // Drain the stream so the server runs through to Supabase save
        const reader = res.body.getReader();
        const drain = (): void => {
          reader.read().then(({ done }) => { if (!done) drain(); }).catch(() => {});
        };
        drain();
      })
      .catch(() => {
        // Fire-and-forget — ignore errors, main audit is unaffected
        prewarmedKeys.delete(key); // allow retry next session
      });
  }
}

function cacheKey(url: string, persona: string) {
  return `${persona}::${url}`;
}

const PERSIST_PREFIX = "audit-cache::";
const CHAPTER_AUDIO_PREFIX = "audit-chaudio::";
const SCRAPE_CACHE_KEY = "audit-scrape-cache";
const CACHE_VERSION = 23;

function consumeScrapeData(url: string): Record<string, unknown> | null {
  try {
    const raw = sessionStorage.getItem(SCRAPE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.url !== url) return null;
    if (Date.now() - (parsed.ts || 0) > 5 * 60 * 1000) return null;
    // Homepage fires the scrape early with pending:true / data:null.
    // Only consume when the data has actually landed.
    if (!parsed.data || parsed.pending) return null;
    sessionStorage.removeItem(SCRAPE_CACHE_KEY);
    return parsed.data;
  } catch {
    return null;
  }
}


/**
 * Find scrape artifacts (screenshot, favicon, siteName) from any persona's
 * cached audit for the same URL. This avoids a blank loading screen when
 * re-auditing the same URL with a different persona.
 */
function findCachedScrapeForUrl(url: string): { screenshot: string | null; favicon: string | null; siteName: string | null } | null {
  for (const p of Object.keys(personaMeta)) {
    const key = cacheKey(url, p);
    // Check in-memory cache first
    const mem = auditCache.get(key);
    if (mem?.screenshot) {
      return { screenshot: mem.screenshot, favicon: mem.favicon, siteName: mem.siteName };
    }
    // Check localStorage
    const stored = loadFromStorage(key);
    if (stored?.screenshot) {
      return { screenshot: stored.screenshot, favicon: stored.favicon, siteName: stored.siteName };
    }
  }
  return null;
}

function persistToStorage(key: string, data: Omit<CachedAudit, "chapterAudioSrcs">) {
  try {
    const storageKey = PERSIST_PREFIX + key;
    const payload = JSON.stringify({ ...data, ts: Date.now(), v: CACHE_VERSION });
    localStorage.setItem(storageKey, payload);
  } catch { /* quota exceeded */ }
}

async function persistChapterAudio(key: string, chapterIndex: number, blob: Blob) {
  try {
    const reader = new FileReader();
    const dataUrl: string = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    localStorage.setItem(`${CHAPTER_AUDIO_PREFIX}${key}::${chapterIndex}`, dataUrl);
  } catch { /* quota exceeded */ }
}

function loadChapterAudioFromStorage(key: string): string[] {
  const result: string[] = [];
  try {
    for (let i = 0; i < 20; i++) {
      const item = localStorage.getItem(`${CHAPTER_AUDIO_PREFIX}${key}::${i}`);
      // Stop at the first gap: chapters are always stored consecutively 0…N.
      // A missing slot means storage was incomplete; the server-fetch path will
      // re-populate any missing chapters.
      if (!item) break;
      result.push(item);
    }
  } catch {}
  return result;
}

function clearChapterAudioStorage(key: string) {
  try {
    for (let i = 0; i < 20; i++) {
      localStorage.removeItem(`${CHAPTER_AUDIO_PREFIX}${key}::${i}`);
    }
  } catch {}
}

function loadFromStorage(key: string): Omit<CachedAudit, "chapterAudioSrcs"> | null {
  try {
    const raw = localStorage.getItem(PERSIST_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if ((parsed.v || 0) < CACHE_VERSION) {
      localStorage.removeItem(PERSIST_PREFIX + key);
      clearChapterAudioStorage(key);
      return null;
    }
    const age = Date.now() - (parsed.ts || 0);
    if (age > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(PERSIST_PREFIX + key);
      clearChapterAudioStorage(key);
      return null;
    }
    return {
      audit: parsed.audit,
      auditId: parsed.auditId ?? null,
      favicon: parsed.favicon,
      siteName: parsed.siteName,
      screenshot: parsed.screenshot ?? null,
    };
  } catch {
    return null;
  }
}

function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 90000, signal: outerSignal, ...fetchInit } = init;
  const timeoutController = new AbortController();

  // Build a combined signal: abort if either the caller aborts or the timer fires.
  // AbortSignal.any is the cleanest way; fall back to manual wiring for older runtimes.
  let combinedSignal: AbortSignal;
  const anyFn = (AbortSignal as { any?: (signals: AbortSignal[]) => AbortSignal }).any;
  if (outerSignal && anyFn) {
    combinedSignal = anyFn([outerSignal, timeoutController.signal]);
  } else if (outerSignal) {
    // Manual fallback: mirror the outer signal into the timeoutController
    if (outerSignal.aborted) {
      timeoutController.abort(outerSignal.reason);
    } else {
      outerSignal.addEventListener("abort", () => timeoutController.abort(outerSignal.reason), { once: true });
    }
    combinedSignal = timeoutController.signal;
  } else {
    combinedSignal = timeoutController.signal;
  }

  const timer = setTimeout(() => {
    timeoutController.abort(new Error("Request timed out — the site may be too slow or complex. Please try again."));
  }, timeout);

  return fetch(input, { ...fetchInit, signal: combinedSignal })
    .then((res) => { clearTimeout(timer); return res; })
    .catch((err) => {
      clearTimeout(timer);
      // Surface a friendlier message when only the timer triggered (not a caller abort)
      if (timeoutController.signal.aborted && !outerSignal?.aborted) {
        throw new Error("Request timed out — the site may be too slow or complex. Please try again.");
      }
      throw err;
    });
}

function isValidCacheData(audit: AuditResult | undefined | null): boolean {
  return !!(audit?.chapters?.length && audit.chapters.length > 0 && audit.script);
}

function resolveCache(url: string, persona: string): CachedAudit | null {
  const key = cacheKey(url, persona);
  const mem = auditCache.get(key);
  if (mem) {
    if (!isValidCacheData(mem.audit)) {
      auditCache.delete(key);
    } else {
      return mem;
    }
  }

  if (typeof window === "undefined") return null;
  const stored = loadFromStorage(key);
  if (stored) {
    if (!isValidCacheData(stored.audit)) {
      try { localStorage.removeItem(PERSIST_PREFIX + key); } catch {}
      clearChapterAudioStorage(key);
      return null;
    }
    const storedAudios = loadChapterAudioFromStorage(key);
    const full: CachedAudit = { ...stored, chapterAudioSrcs: storedAudios };
    auditCache.set(key, full);
    return full;
  }
  return null;
}

export function hasCachedAudit(url: string, persona: string): boolean {
  return resolveCache(url, persona) !== null;
}

export function hasCachedAuditWithFullAudio(url: string, persona: string): boolean {
  const cached = resolveCache(url, persona);
  if (!cached) return false;
  const totalChapters = cached.audit?.chapters?.length ?? 0;
  if (totalChapters === 0) return false;
  const audioCount = cached.chapterAudioSrcs?.filter(Boolean).length ?? 0;
  return audioCount >= totalChapters;
}

export function useAudit(url: string | null, initialPersona: Persona | null, initialAuditId: string | null = null) {
  const [persona, setPersona] = useState<Persona | null>(initialPersona);

  const [phase, setPhase] = useState<AuditPhase>("loading");
  const [fetchingQuote, setFetchingQuote] = useState("");
  const [loadingQuote, setLoadingQuote] = useState("");
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [auditId, setAuditId] = useState<string | null>(initialAuditId);
  const [favicon, setFavicon] = useState<string | null>(null);
  const [siteName, setSiteName] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [activeChapter, setActiveChapter] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [chapterAudioSrcs, setChapterAudioSrcs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [voiceFailed, setVoiceFailed] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const [audioRestoreDone, setAudioRestoreDone] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [retryCount, setRetryCount] = useState(0);
  const forceRef = useRef(false);
  const voiceFetchingRef = useRef(false);
  // When play() is called but the current chapter has no audio yet,
  // set this flag so the audio swap effect auto-plays once it arrives.
  const pendingPlayRef = useRef(false);
  const loadedAuditKeyRef = useRef<string | null>(null);
  // initialAuditId is only valid for the very first fetch (shared link).
  // After that it must NOT be forwarded, or every persona switch will return
  // the original persona's audit (the server's findAuditById ignores persona).
  const initialAuditIdConsumedRef = useRef(false);

  const activeChapterRef = useRef(activeChapter);
  activeChapterRef.current = activeChapter;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const auditRef = useRef(audit);
  auditRef.current = audit;
  const chapterAudioSrcsRef = useRef(chapterAudioSrcs);
  chapterAudioSrcsRef.current = chapterAudioSrcs;
  const waitIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const switchingRef = useRef(false);
  const clearWaitInterval = useCallback(() => {
    if (waitIntervalRef.current) {
      clearInterval(waitIntervalRef.current);
      waitIntervalRef.current = null;
    }
  }, []);

  // Cycle generic fetching quotes (before screenshot arrives)
  useEffect(() => {
    if (screenshot) return;
    const tips = [
      "Fetching the page...",
      "Downloading site assets...",
      "Rendering the full page...",
      "Capturing a full-page screenshot...",
      "Scanning the DOM for elements...",
      "Measuring element positions...",
      "Almost there — loading styles and images...",
      "Mapping the page layout...",
      "Reading the page structure...",
    ];
    let i = Math.floor(Math.random() * tips.length);
    setFetchingQuote(tips[i]);
    const interval = setInterval(() => {
      i = (i + 1) % tips.length;
      setFetchingQuote(tips[i]);
    }, 2500);
    return () => clearInterval(interval);
  }, [screenshot]);

  // Cycle persona quotes during AI analysis; stop as soon as audit data arrives
  useEffect(() => {
    if (!persona) return;
    if (audit) return;
    const quotes = personaMeta[persona].loadingQuotes;
    let i = Math.floor(Math.random() * quotes.length);
    setLoadingQuote(quotes[i]);
    const interval = setInterval(() => {
      i = (i + 1) % quotes.length;
      setLoadingQuote(quotes[i]);
    }, 2000);
    return () => clearInterval(interval);
  }, [persona, audit]);

  // Main fetch effect
  useEffect(() => {
    if (!url || !persona) return;
    switchingRef.current = false;
    // Always reset so a new fetch (URL change or persona switch) can start
    // the audio-fetch leg even if the previous effect was aborted mid-flight
    // before its voiceFetchingRef cleanup line ran.
    voiceFetchingRef.current = false;

    const abortController = new AbortController();
    const { signal } = abortController;
    const key = cacheKey(url, persona);

    // Check cache first
    const existing = resolveCache(url, persona);
    if (existing) {
      console.log(`[audit] Client cache hit for persona=${persona}:`, {
        auditId: existing.auditId,
        chapters: existing.audit.chapters?.length,
        hotspots: existing.audit.hotspots?.map((h: { label: string; x: number; y: number; chapter: number; elementIndex?: number }) => ({
          label: h.label, x: h.x?.toFixed(1), y: h.y?.toFixed(1), ch: h.chapter, elemIdx: h.elementIndex,
        })),
      });

      initialAuditIdConsumedRef.current = true;
      track("Audit Cache Hit", { url, persona, score: existing.audit.overallScore ?? 0 });

      setAudit(existing.audit);
      if (existing.auditId) setAuditId(existing.auditId);
      setFavicon(existing.favicon);
      setSiteName(existing.siteName);
      setScreenshot(existing.screenshot);
      setError(null);
      setVoiceFailed(false);

      // Only reset chapter position and audio-loaded tracking when
      // initialising a *different* audit. Re-running for the same key
      // (React Strict Mode double-mount) must not clobber a src that is
      // already loaded/playing.
      const isReInit = loadedAuditKeyRef.current === key;
      if (!isReInit) {
        activeChapterRef.current = 0;
        setActiveChapter(0);
        setScrollY(0);
        loadedSrcRef.current = null;
      }
      loadedAuditKeyRef.current = key;

      async function restoreAudio() {
        const expectedChapters = existing!.audit.chapters?.length ?? 0;
        const cachedSrcs = existing!.chapterAudioSrcs;
        let restoredFromCache = false;
        console.log("[audit] restoreAudio, srcs:", cachedSrcs.length, "expected:", expectedChapters, "first:", cachedSrcs[0]?.slice(0, 30));

        if (cachedSrcs.length > 0 && cachedSrcs[0]) {
          const firstSrc = cachedSrcs[0];
          let valid = false;
          if (firstSrc.startsWith("data:")) {
            valid = true;
          } else if (firstSrc.startsWith("blob:")) {
            try {
              const probe = await fetch(firstSrc, { method: "HEAD" });
              valid = probe.ok;
            } catch { valid = false; }
          } else {
            try {
              const probe = await fetch(firstSrc, { method: "HEAD" });
              valid = probe.ok;
            } catch { /* dead URL */ }
          }

          if (signal.aborted) return;
          console.log("[audit] restoreAudio valid:", valid, "cached:", cachedSrcs.length, "expected:", expectedChapters);
          if (valid) {
            setChapterAudioSrcs(cachedSrcs);
            setVoiceReady(true);
            setPhase("ready");
            restoredFromCache = true;
            if (cachedSrcs.length >= expectedChapters) return;
          }
        }

        if (signal.aborted) return;
        if (!restoredFromCache) setPhase("ready");

        if (!voiceFetchingRef.current) {
          voiceFetchingRef.current = true;
          try {
            const res = await fetchWithTimeout("/api/analyze", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url, persona }),
              signal,
              timeout: 60000,
            });
            if (signal.aborted) return;
            if (!res.ok) throw new Error("Server voice fetch failed");

            const reader = res.body?.getReader();
            if (!reader) throw new Error("No stream");
            const decoder = new TextDecoder();
            let buf = "";
            const srcs: string[] = restoredFromCache ? [...cachedSrcs] : [];
            let fetchedNewAudio = false;

            while (true) {
              const { done, value } = await reader.read();
              if (signal.aborted) { reader.cancel(); return; }
              if (done) break;
              buf += decoder.decode(value, { stream: true });
              const lines = buf.split("\n");
              buf = lines.pop() || "";
              for (const line of lines) {
                if (!line.trim()) continue;
                try {
                  const chunk = JSON.parse(line);
                  if (chunk.type === "audio_chapter" && (chunk.url || chunk.data)) {
                    const chIdx = chunk.chapter as number;
                    if (srcs[chIdx]) continue;

                    let blob: Blob | null = null;
                    if (chunk.url && !chunk.data) {
                      try {
                        const aRes = await fetch(chunk.url);
                        if (aRes.ok) {
                          blob = await aRes.blob();
                        } else {
                          console.warn(`[audit] restoreAudio: ch${chIdx} URL returned ${aRes.status}`);
                        }
                      } catch (e) {
                        console.warn(`[audit] restoreAudio: ch${chIdx} fetch failed:`, e);
                      }
                    } else if (chunk.data) {
                      const byteChars = atob(chunk.data);
                      const bytes = new Uint8Array(byteChars.length);
                      for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
                      blob = new Blob([bytes], { type: "audio/mpeg" });
                    }

                    if (blob) {
                      srcs[chIdx] = URL.createObjectURL(blob);
                      fetchedNewAudio = true;
                      if (!signal.aborted) {
                        setChapterAudioSrcs([...srcs]);
                        if (srcs[0]) setVoiceReady(true);
                      }
                      persistChapterAudio(key, chIdx, blob);
                    }
                  }
                } catch { /* skip */ }
              }
            }

            if (signal.aborted) return;

            const filledCount = srcs.filter(Boolean).length;
            const missingIndices: number[] = [];
            for (let idx = 0; idx < expectedChapters; idx++) {
              if (!srcs[idx]) missingIndices.push(idx);
            }
            if (missingIndices.length > 0) {
              console.warn(`[audit] restoreAudio: ${missingIndices.length}/${expectedChapters} chapters have no audio (missing: [${missingIndices.join(", ")}])`);
            }

            if (srcs.length > 0 && srcs.some(Boolean)) {
              existing!.chapterAudioSrcs = [...srcs];
              auditCache.set(key, existing!);
              if (!restoredFromCache && srcs[0]) {
                setChapterAudioSrcs([...srcs]);
                setVoiceReady(true);
              }
            } else if (!restoredFromCache) {
              console.warn("[audit] restoreAudio: server returned no usable audio, marking voiceFailed");
              setVoiceFailed(true);
            }

            if (fetchedNewAudio) {
              setChapterAudioSrcs([...srcs]);
            }

            // Auto-regenerate missing chapters via dedicated endpoint
            if (missingIndices.length > 0 && existing!.auditId) {
              console.log(`[audit] Regenerating missing chapters [${missingIndices.join(", ")}] via /api/regenerate-audio`);
              try {
                const regenRes = await fetchWithTimeout("/api/regenerate-audio", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    auditId: existing!.auditId,
                    persona,
                    missingChapters: missingIndices,
                  }),
                  signal,
                  timeout: 120000,
                });
                if (signal.aborted) return;
                if (!regenRes.ok) throw new Error(`Regen returned ${regenRes.status}`);

                const regenReader = regenRes.body?.getReader();
                if (regenReader) {
                  const regenDecoder = new TextDecoder();
                  let regenBuf = "";
                  while (true) {
                    const { done: rDone, value: rValue } = await regenReader.read();
                    if (signal.aborted) { regenReader.cancel(); return; }
                    if (rDone) break;
                    regenBuf += regenDecoder.decode(rValue, { stream: true });
                    const rLines = regenBuf.split("\n");
                    regenBuf = rLines.pop() || "";
                    for (const rLine of rLines) {
                      if (!rLine.trim()) continue;
                      try {
                        const rChunk = JSON.parse(rLine);
                        if (rChunk.type === "audio_chapter" && rChunk.data) {
                          const chIdx = rChunk.chapter as number;
                          const byteChars = atob(rChunk.data);
                          const bytes = new Uint8Array(byteChars.length);
                          for (let b = 0; b < byteChars.length; b++) bytes[b] = byteChars.charCodeAt(b);
                          const blob = new Blob([bytes], { type: "audio/mpeg" });
                          srcs[chIdx] = URL.createObjectURL(blob);
                          if (!signal.aborted) {
                            setChapterAudioSrcs([...srcs]);
                            if (srcs[0]) setVoiceReady(true);
                          }
                          persistChapterAudio(key, chIdx, blob);
                          console.log(`[audit] Regenerated ch${chIdx} audio received`);
                        }
                      } catch { /* skip */ }
                    }
                  }
                  existing!.chapterAudioSrcs = [...srcs];
                  auditCache.set(key, existing!);
                  const finalFilled = srcs.filter(Boolean).length;
                  console.log(`[audit] Regeneration complete: ${finalFilled}/${expectedChapters} chapters now have audio`);
                }
              } catch (regenErr) {
                if (signal.aborted) return;
                if (regenErr instanceof DOMException && regenErr.name === "AbortError") return;
                console.warn("[audit] Regeneration failed:", regenErr);
              }
            }
          } catch (err) {
            if (signal.aborted) return;
            if (err instanceof DOMException && err.name === "AbortError") return;
            console.warn("[audit] restoreAudio: fetch error:", err);
            if (!restoredFromCache) setVoiceFailed(true);
          }
          voiceFetchingRef.current = false;
          setAudioRestoreDone(true);
        }
      }

      restoreAudio();
      return () => { abortController.abort("cleanup"); };
    }

    // Fresh fetch

    async function fetchAnalysis() {
      try {
        let hn = "";
        try { hn = new URL(url!).hostname; } catch { hn = url!; }
        track("Audit Started", { url: url!, hostname: hn, persona: persona! });
        setPhase("loading");
        setError(null);
        setVoiceFailed(false);
        setVoiceReady(false);
        setAudit(null);
        setChapterAudioSrcs([]);
        activeChapterRef.current = 0;
        setActiveChapter(0);
        loadedSrcRef.current = null;

        // Reuse screenshot/favicon from any persona's cache for this URL so
        // the scanning view appears instantly on persona switches.
        const cachedScrape = findCachedScrapeForUrl(url!);
        if (cachedScrape?.screenshot) {
          console.log("[audit] Reusing cached screenshot from previous persona");
        }
        setScreenshot(cachedScrape?.screenshot ?? null);
        setFavicon(cachedScrape?.favicon ?? null);
        setSiteName(cachedScrape?.siteName ?? null);

        // Check if the homepage pre-scrape has already completed.
        // We never block here — the server has its own scrape cache and will
        // handle scraping if needed. This just avoids a redundant server scrape
        // when the client already has the data ready.
        const preScrape = consumeScrapeData(url!);
        if (preScrape) {
          console.log("[audit] Using completed homepage pre-scrape");
          if (preScrape.favicon) setFavicon(preScrape.favicon as string);
          if (preScrape.siteName) setSiteName(preScrape.siteName as string);
          if (preScrape.screenshot) setScreenshot(preScrape.screenshot as string);
        }

        const shouldForce = forceRef.current;
        forceRef.current = false;

        // initialAuditId is only valid for the very first fetch (shared link lookup).
        // Once consumed, persona switches must NOT send it or the server will return
        // the original persona's audit for every subsequent switch.
        const shouldUseInitialId = initialAuditId && !shouldForce && !initialAuditIdConsumedRef.current;
        initialAuditIdConsumedRef.current = true;

        const res = await fetchWithTimeout("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url,
            persona,
            ...(shouldForce ? { force: true } : {}),
            ...(shouldUseInitialId ? { auditId: initialAuditId } : {}),
            ...(preScrape ? { scrapeData: preScrape } : {}),
          }),
          signal,
          timeout: 120000,
        });

        if (!res.ok) {
          let errMsg = "Analysis failed";
          try { const err = await res.json(); errMsg = err.error || errMsg; } catch {}
          throw new Error(errMsg);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";
        let streamedAudit: AuditResult | null = null;
        let streamedAuditId: string | null = null;
        let streamedFavicon: string | null = null;
        let streamedSiteName: string | null = null;
        let streamedScreenshot: string | null = null;
        const chapterSrcs: string[] = [];
        const voiceReadyRef = { current: false };

        while (true) {
          const { done, value } = await reader.read();
          if (signal.aborted) { reader.cancel(); return; }
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const chunk = JSON.parse(line);
              console.log("[audit] stream chunk:", chunk.type);

              if (chunk.type === "scrape") {
                streamedFavicon = chunk.favicon ?? null;
                streamedSiteName = chunk.siteName ?? null;
                streamedScreenshot = chunk.screenshot ?? null;

                if (streamedFavicon) setFavicon(streamedFavicon);
                if (streamedSiteName) setSiteName(streamedSiteName);
                if (streamedScreenshot) setScreenshot(streamedScreenshot);
              }

              if (chunk.type === "audit" && chunk.audit) {
                streamedAudit = chunk.audit;
                setAudit(chunk.audit);

                console.log(`[audit] Received audit for persona=${persona}:`, {
                  auditId: chunk.auditId,
                  chapters: chunk.audit.chapters?.length,
                  hotspots: chunk.audit.hotspots?.map((h: { label: string; x: number; y: number; chapter: number; elementIndex?: number }) => ({
                    label: h.label, x: h.x?.toFixed(1), y: h.y?.toFixed(1), ch: h.chapter, elemIdx: h.elementIndex,
                  })),
                });

                if (chunk.auditId) {
                  streamedAuditId = chunk.auditId;
                  setAuditId(chunk.auditId);
                }

                if (chunk.audit.chapters?.length > 0) {
                  setScrollY(0);
                }

                track("Audit Data Received", {
                  url: url!,
                  persona: persona!,
                  score: chunk.audit.overallScore ?? 0,
                  chapters: chunk.audit.chapters?.length ?? 0,
                  cached: false,
                });
                setPhase("ready");

                persistToStorage(key, {
                  audit: chunk.audit,
                  auditId: chunk.auditId ?? null,
                  favicon: streamedFavicon,
                  siteName: streamedSiteName,
                  screenshot: streamedScreenshot,
                });

                let hn = "";
                try { hn = new URL(url!).hostname; } catch { hn = url!; }
                saveRecentAudit({
                  url: url!,
                  hostname: hn,
                  persona: persona!,
                  score: chunk.audit.overallScore,
                  favicon: streamedFavicon,
                  timestamp: Date.now(),
                });
              }

              // Per-chapter audio: each chapter arrives as base64 data
              if (chunk.type === "audio_chapter" && chunk.data) {
                const byteChars = atob(chunk.data);
                const bytes = new Uint8Array(byteChars.length);
                for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
                const blob = new Blob([bytes], { type: "audio/mpeg" });
                const blobUrl = URL.createObjectURL(blob);
                const chIdx = chunk.chapter as number;

                chapterSrcs[chIdx] = blobUrl;
                setChapterAudioSrcs([...chapterSrcs]);

                // Voice is ready as soon as chapter 0 arrives
                if (!voiceReadyRef.current) {
                  setVoiceReady(true);
                  voiceReadyRef.current = true;
                }

                persistChapterAudio(key, chIdx, blob);
              }

              if (chunk.type === "audio_chapter" && chunk.url && !chunk.data) {
                const chIdx = chunk.chapter as number;
                try {
                  const audioRes = await fetch(chunk.url, { signal });
                  if (signal.aborted) return;
                  if (audioRes.ok) {
                    const blob = await audioRes.blob();
                    chapterSrcs[chIdx] = URL.createObjectURL(blob);
                    persistChapterAudio(key, chIdx, blob);
                  } else {
                    console.warn(`[audit] ch${chIdx} audio URL returned ${audioRes.status}, skipping`);
                  }
                } catch (fetchErr) {
                  if (signal.aborted) return;
                  console.warn(`[audit] ch${chIdx} audio fetch failed:`, fetchErr);
                }
                if (!signal.aborted) setChapterAudioSrcs([...chapterSrcs]);

                if (!voiceReadyRef.current && chapterSrcs[0]) {
                  setVoiceReady(true);
                  voiceReadyRef.current = true;
                }
              }

              if (chunk.type === "audio_done") {
                const totalExpected = chunk.totalChapters ?? streamedAudit?.chapters?.length ?? 0;
                const filled = chapterSrcs.filter(Boolean).length;
                const freshMissing: number[] = [];
                for (let mi = 0; mi < totalExpected; mi++) {
                  if (!chapterSrcs[mi]) freshMissing.push(mi);
                }
                if (freshMissing.length > 0) {
                  console.warn(`[audit] audio_done: only ${filled}/${totalExpected} chapters have audio, missing: [${freshMissing.join(", ")}]`);
                }
                if (chapterSrcs.length > 0 && streamedAudit) {
                  auditCache.set(key, {
                    audit: streamedAudit,
                    auditId: streamedAuditId,
                    favicon: streamedFavicon,
                    siteName: streamedSiteName,
                    screenshot: streamedScreenshot,
                    chapterAudioSrcs: [...chapterSrcs],
                  });
                }
                setAudioRestoreDone(true);
                if (url && persona) prewarmOtherPersonas(url, persona);

                // Auto-regenerate any chapters that failed during the fresh pipeline
                if (freshMissing.length > 0 && streamedAuditId) {
                  console.log(`[audit] Regenerating ${freshMissing.length} missing chapter(s) [${freshMissing.join(", ")}]`);
                  fetchWithTimeout("/api/regenerate-audio", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      auditId: streamedAuditId,
                      persona,
                      missingChapters: freshMissing,
                    }),
                    signal,
                    timeout: 120000,
                  }).then(async (regenRes) => {
                    if (signal.aborted || !regenRes.ok) return;
                    const rr = regenRes.body?.getReader();
                    if (!rr) return;
                    const rd = new TextDecoder();
                    let rb = "";
                    while (true) {
                      const { done: rDone, value: rValue } = await rr.read();
                      if (signal.aborted) { rr.cancel(); return; }
                      if (rDone) break;
                      rb += rd.decode(rValue, { stream: true });
                      const rLines = rb.split("\n");
                      rb = rLines.pop() || "";
                      for (const rl of rLines) {
                        if (!rl.trim()) continue;
                        try {
                          const rc = JSON.parse(rl);
                          if (rc.type === "audio_chapter" && rc.data) {
                            const ci = rc.chapter as number;
                            const bc = atob(rc.data);
                            const ba = new Uint8Array(bc.length);
                            for (let bi = 0; bi < bc.length; bi++) ba[bi] = bc.charCodeAt(bi);
                            const bl = new Blob([ba], { type: "audio/mpeg" });
                            chapterSrcs[ci] = URL.createObjectURL(bl);
                            if (!signal.aborted) {
                              setChapterAudioSrcs([...chapterSrcs]);
                              if (chapterSrcs[0] && !voiceReadyRef.current) {
                                setVoiceReady(true);
                                voiceReadyRef.current = true;
                              }
                            }
                            persistChapterAudio(key, ci, bl);
                            console.log(`[audit] Regenerated ch${ci} received`);
                          }
                        } catch { /* skip */ }
                      }
                    }
                    if (streamedAudit) {
                      auditCache.set(key, {
                        audit: streamedAudit,
                        auditId: streamedAuditId,
                        favicon: streamedFavicon,
                        siteName: streamedSiteName,
                        screenshot: streamedScreenshot,
                        chapterAudioSrcs: [...chapterSrcs],
                      });
                    }
                    console.log(`[audit] Regeneration done: ${chapterSrcs.filter(Boolean).length}/${totalExpected} chapters now have audio`);
                  }).catch((regenErr) => {
                    if (signal.aborted) return;
                    console.warn("[audit] Regeneration failed:", regenErr);
                  });
                }
              }

              // Legacy single audio blob (backwards compat with old cached audits)
              if (chunk.type === "audio_url" && chunk.url) {
                console.log("[audit] received legacy audio_url:", chunk.url);
                chapterSrcs[0] = chunk.url;
                setChapterAudioSrcs([...chapterSrcs]);
                setVoiceReady(true);
                voiceReadyRef.current = true;

                if (streamedAudit) {
                  auditCache.set(key, {
                    audit: streamedAudit,
                    auditId: streamedAuditId,
                    favicon: streamedFavicon,
                    siteName: streamedSiteName,
                    screenshot: streamedScreenshot,
                    chapterAudioSrcs: [...chapterSrcs],
                  });
                }
              }

              if (chunk.type === "error") {
                throw new Error(chunk.error || "Analysis failed");
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message.includes("failed")) throw parseErr;
              console.warn("[audit] stream parse error:", parseErr);
            }
          }
        }

        // Fallback: if stream ended without audio but we have audit data
        console.log("[audit] stream ended, voiceReady:", voiceReadyRef.current, "hasAudit:", !!streamedAudit);

        // If stream ended without any audit data, surface an error so the UI
        // doesn't stay stuck in scanning state indefinitely.
        if (!streamedAudit) {
          setError("Analysis failed — please try again.");
          setPhase("ready");
          return;
        }

        // If we have audit data but chapter 0 audio failed (all URL fetches 404'd),
        // mark voice as failed so the UI shows the fallback message and doesn't
        // get stuck in "scanning" state.
        if (streamedAudit && !voiceReadyRef.current && !chapterSrcs[0]) {
          console.warn("[audit] No chapter 0 audio after stream, attempting legacy voice fallback");
          setVoiceFailed(true);
        }

        if (streamedAudit && !voiceReadyRef.current) {
          try {
            const voiceRes = await fetchWithTimeout("/api/voice", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: streamedAudit.script, persona }),
              signal,
              timeout: 60000,
            });
            if (!voiceRes.ok) throw new Error("Voice API error");
            const audioBlob = await voiceRes.blob();
            if (signal.aborted) return;
            const audioBlobUrl = URL.createObjectURL(audioBlob);
            chapterSrcs[0] = audioBlobUrl;
            setChapterAudioSrcs([...chapterSrcs]);
            setVoiceReady(true);

            auditCache.set(key, {
              audit: streamedAudit,
              auditId: streamedAuditId,
              favicon: streamedFavicon,
              siteName: streamedSiteName,
              screenshot: streamedScreenshot,
              chapterAudioSrcs: [...chapterSrcs],
            });
            loadedAuditKeyRef.current = key;
          } catch (voiceErr) {
            if (signal.aborted) return;
            if (voiceErr instanceof DOMException && voiceErr.name === "AbortError") return;
            if (voiceErr instanceof Error && voiceErr.message?.includes("aborted")) return;
            setVoiceFailed(true);
          }
        }
      } catch (err) {
        if (signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (err instanceof Error && err.message?.includes("aborted")) return;
        const msg = err instanceof Error ? err.message : "Something went wrong";
        track("Audit Error", { url: url!, persona: persona!, error: msg });
        setError(msg);
        setPhase("ready");
      }
    }

    fetchAnalysis();
    return () => { abortController.abort("cleanup"); };
  }, [url, persona, retryCount]);

  // Track which blob URL the <audio> element currently has loaded
  const loadedSrcRef = useRef<string | null>(null);

  // Swap audio src when activeChapter changes or chapterAudioSrcs update
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const src = chapterAudioSrcs[activeChapter];
    if (!src) {
      el.pause();
      loadedSrcRef.current = null;
      if (phaseRef.current === "playing") setPhase("paused");
      return;
    }
    if (loadedSrcRef.current === src) return;
    console.log(`[audit] Loading audio for chapter ${activeChapter}, src type: ${src.startsWith("data:") ? "data-url" : src.startsWith("blob:") ? "blob" : "url"}, title: ${auditRef.current?.chapters?.[activeChapter]?.title}`);

    // Play if phase is already "playing" OR if the user previously tried to play
    // this chapter when it had no audio (pendingPlayRef).
    const shouldPlay = phaseRef.current === "playing" || pendingPlayRef.current;
    if (pendingPlayRef.current) {
      console.log(`[audit] Fulfilling pending play for ch${activeChapter}`);
      pendingPlayRef.current = false;
      setPhase("playing");
    }
    loadedSrcRef.current = src;
    el.src = src;
    el.currentTime = 0;

    let cancelled = false;
    if (shouldPlay) {
      const doPlay = () => {
        if (cancelled) return;
        el.play().catch(() => {
          console.warn("[audit] chapter swap play() rejected");
          if (!cancelled) setPhase("paused");
        });
      };
      if (el.readyState >= 2) {
        doPlay();
      } else {
        const onReady = () => {
          el.removeEventListener("canplay", onReady);
          doPlay();
        };
        el.addEventListener("canplay", onReady);
        return () => {
          cancelled = true;
          el.removeEventListener("canplay", onReady);
        };
      }
    }
  }, [activeChapter, chapterAudioSrcs]);

  // Clear intervals on full unmount (blob URLs are left alive so the
  // in-memory auditCache stays valid across navigations and React
  // Strict Mode remounts — they are lightweight and GC'd on page unload)
  useEffect(() => {
    return () => {
      clearWaitInterval();
    };
  }, [clearWaitInterval]);

  const retry = useCallback(() => {
    if (!url || !persona) return;
    clearWaitInterval();
    const key = cacheKey(url, persona);
    auditCache.delete(key);
    try { localStorage.removeItem(PERSIST_PREFIX + key); } catch {}
    clearChapterAudioStorage(key);
    voiceFetchingRef.current = false;
    forceRef.current = true;
    loadedSrcRef.current = null;
    loadedAuditKeyRef.current = null;
    setAuditId(null);
    setChapterAudioSrcs([]);
    setVoiceReady(false);
    setError(null);
    setRetryCount((c) => c + 1);
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete("id");
      window.history.replaceState({}, "", u.toString());
    } catch {}
  }, [url, persona, clearWaitInterval]);

  // handleTimeUpdate is now a no-op — chapter transitions are driven by onEnded
  const handleTimeUpdate = useCallback(() => {}, []);

  const play = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    const ch = activeChapterRef.current;
    const src = chapterAudioSrcsRef.current[ch];
    if (!src) {
      // No audio yet — remember that the user wants to play so we auto-start
      // once the audio arrives (e.g. from regeneration).
      pendingPlayRef.current = true;
      console.log(`[audit] play() called for ch${ch} but no audio yet — will auto-play when available`);
      return;
    }
    pendingPlayRef.current = false;
    if (loadedSrcRef.current !== src) {
      loadedSrcRef.current = src;
      el.src = src;
      el.currentTime = 0;
    }
    setPhase("playing");

    function tryPlay() {
      el!.play().catch((err) => {
        console.warn("[audit] play() rejected:", err?.message);
        setPhase("paused");
      });
    }

    if (el.readyState >= 2) {
      tryPlay();
    } else {
      const onReady = () => {
        el.removeEventListener("canplay", onReady);
        if (phaseRef.current === "playing") tryPlay();
      };
      el.addEventListener("canplay", onReady);
    }
  }, []);

  const pause = useCallback(() => {
    pendingPlayRef.current = false;
    audioRef.current?.pause();
    setPhase("paused");
  }, []);

  const seekToChapter = useCallback(
    (index: number) => {
      if (!audit) return;
      const chapter = audit.chapters[index];
      if (!chapter) return;

      clearWaitInterval();
      if (!chapterAudioSrcsRef.current[index] && audioRef.current) {
        audioRef.current.pause();
      }
      activeChapterRef.current = index;
      setActiveChapter(index);
      setScrollY(chapter.scrollY);
      loadedSrcRef.current = null;
    },
    [audit, clearWaitInterval]
  );

  const nextChapter = useCallback(() => {
    if (!audit) return;
    const current = activeChapterRef.current;
    const next = Math.min(current + 1, audit.chapters.length - 1);
    seekToChapter(next);
  }, [audit, seekToChapter]);

  const prevChapter = useCallback(() => {
    if (!audit) return;
    const current = activeChapterRef.current;
    const prev = Math.max(current - 1, 0);
    seekToChapter(prev);
  }, [audit, seekToChapter]);

  const handleEnded = useCallback(() => {
    console.log("[audit] handleEnded fired, switching:", switchingRef.current, "phase:", phaseRef.current, "chapter:", activeChapterRef.current);
    if (switchingRef.current) return;
    // After changePersona(), loadedSrcRef is null and chapterAudioSrcsRef is [].
    // A stale ended event from the old persona's audio can fire after the fetch
    // effect resets switchingRef=false. Without this guard, handleEnded would
    // create a wait interval and overwrite the new persona's phase.
    if (!loadedSrcRef.current) return;
    const expectedSrc = chapterAudioSrcsRef.current[activeChapterRef.current];
    if (expectedSrc && loadedSrcRef.current !== expectedSrc) {
      console.log("[audit] handleEnded: stale src, ignoring");
      return;
    }
    clearWaitInterval();
    const currentAudit = auditRef.current;
    if (!currentAudit) return;
    const current = activeChapterRef.current;
    const srcs = chapterAudioSrcsRef.current;
    const isLastChapter = current >= currentAudit.chapters.length - 1;

    if (isLastChapter) {
      setPhase("done");
      return;
    }

    const next = current + 1;

    if (srcs[next]) {
      activeChapterRef.current = next;
      setActiveChapter(next);
      setScrollY(currentAudit.chapters[next].scrollY);
      return;
    }

    // Next chapter audio hasn't arrived yet — wait for it.
    // The UI disables the Next button for chapters without audio,
    // so the user won't get out of sync.
    console.log(`[audit] Waiting for ch${next} audio to arrive...`);
    setPhase("paused");

    const interval = setInterval(() => {
      const latestSrcs = chapterAudioSrcsRef.current;
      if (latestSrcs[next]) {
        clearWaitInterval();
        activeChapterRef.current = next;
        setActiveChapter(next);
        const a = auditRef.current;
        if (a?.chapters[next]) setScrollY(a.chapters[next].scrollY);
        setPhase("playing");
      }
    }, 300);
    waitIntervalRef.current = interval;

    // Safety: stop waiting after 30s to prevent infinite polling
    setTimeout(() => clearWaitInterval(), 30_000);
  }, [clearWaitInterval]);

  const changePersona = useCallback(
    (newPersona: Persona) => {
      if (newPersona === persona) return;
      switchingRef.current = true;
      clearWaitInterval();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        // Set src to empty string before removeAttribute — belt-and-suspenders
        // for iOS Safari which sometimes needs the explicit empty-string assignment
        // to fully abort the current media load before load() is called.
        audioRef.current.src = "";
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      }
      voiceFetchingRef.current = false;
      pendingPlayRef.current = false;
      loadedSrcRef.current = null;
      loadedAuditKeyRef.current = null;
      setPhase("loading");
      setAudit(null);
      setAuditId(null);
      setChapterAudioSrcs([]);
      setVoiceReady(false);
      setVoiceFailed(false);
      setAudioRestoreDone(false);
      setActiveChapter(0);
      activeChapterRef.current = 0;
      setScrollY(0);
      setError(null);

      // Preserve screenshot/favicon from the current (or any cached) audit for
      // this URL so the scanning view appears instantly instead of flashing a
      // blank loading screen while the new persona's analysis starts.
      const cached = url ? findCachedScrapeForUrl(url) : null;
      if (cached) {
        if (cached.screenshot) setScreenshot(cached.screenshot);
        else setScreenshot(null);
        if (cached.favicon) setFavicon(cached.favicon);
        else setFavicon(null);
        if (cached.siteName) setSiteName(cached.siteName);
        else setSiteName(null);
      } else {
        setFavicon(null);
        setSiteName(null);
        setScreenshot(null);
      }

      setPersona(newPersona);
      try {
        const u = new URL(window.location.href);
        u.searchParams.delete("id");
        window.history.replaceState({}, "", u.toString());
      } catch {}
    },
    [persona, clearWaitInterval]
  );

  return {
    phase,
    fetchingQuote,
    loadingQuote,
    audit,
    auditId,
    favicon,
    siteName,
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
    prevChapter,
    handleTimeUpdate,
    handleEnded,
    changePersona,
    retry,
  };
}
