"use client";

import { useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceOrbProps {
  avatarUrl: string;
  name: string;
  isPlaying: boolean;
  voiceReady: boolean;
  userHasPlayed: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  onTogglePlay: () => void;
  playbackRate: number;
  onCycleSpeed: () => void;
}

const BAR_COUNT = 24;
const SMOOTHING = 0.72;
const CANVAS_PX = 140;
const DISPLAY_PX = 72;
const AVATAR_PX = 48;

// Module-level: a MediaElementAudioSourceNode is permanently bound to an
// element and can never be recreated, even with a new AudioContext.
const globalSourceMap = new WeakMap<HTMLAudioElement, { source: MediaElementAudioSourceNode; ctx: AudioContext }>();

export function VoiceOrb({
  avatarUrl,
  name,
  isPlaying,
  voiceReady,
  userHasPlayed,
  audioRef,
  onTogglePlay,
  playbackRate,
  onCycleSpeed,
}: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const boundElRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);
  const prevBarsRef = useRef<number[]>(new Array(BAR_COUNT).fill(0));
  const hasPlayed = userHasPlayed || isPlaying;

  const ensureAnalyser = useCallback(() => {
    const el = audioRef.current;
    if (!el) return null;

    try {
      // Reuse existing analyser if element hasn't changed
      if (analyserRef.current && boundElRef.current === el) {
        const entry = globalSourceMap.get(el);
        if (entry && entry.ctx.state === "suspended") entry.ctx.resume().catch(() => {});
        return analyserRef.current;
      }

      // Disconnect old analyser
      if (analyserRef.current) {
        try { analyserRef.current.disconnect(); } catch {}
        analyserRef.current = null;
      }

      // Get or create the source node (permanent per element)
      let entry = globalSourceMap.get(el);
      if (!entry) {
        const ctx = new AudioContext();
        const source = ctx.createMediaElementSource(el);
        entry = { source, ctx };
        globalSourceMap.set(el, entry);
      }

      const { source, ctx } = entry;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = SMOOTHING;

      source.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
      boundElRef.current = el;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      return analyser;
    } catch (e) {
      console.warn("[voice-orb] analyser setup failed:", e);
      return null;
    }
  }, [audioRef]);

  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(rafRef.current);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, CANVAS_PX, CANVAS_PX);
      }
      prevBarsRef.current.fill(0);
      return;
    }

    const analyser = ensureAnalyser();
    const el = audioRef.current;
    const entry = el ? globalSourceMap.get(el) : undefined;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const cx = CANVAS_PX / 2;
    const cy = CANVAS_PX / 2;
    const avatarRadius = (AVATAR_PX / DISPLAY_PX) * (CANVAS_PX / 2);

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, CANVAS_PX, CANVAS_PX);

      if (analyser && data) {
        analyser.getByteFrequencyData(data);
      }

      const bars = prevBarsRef.current;

      for (let i = 0; i < BAR_COUNT; i++) {
        const angle = (i / BAR_COUNT) * Math.PI * 2 - Math.PI / 2;

        let rawAmp = 0;
        if (data && data.length > 0) {
          const freqIdx = Math.floor((i / BAR_COUNT) * data.length);
          rawAmp = (data[freqIdx] ?? 0) / 255;
        }

        const target = rawAmp * 0.7 + 0.08;
        bars[i] = bars[i] * 0.6 + target * 0.4;
        const amp = bars[i];

        const gap = 3;
        const innerR = avatarRadius + gap;
        const barLen = 4 + amp * 16;
        const outerR = innerR + barLen;

        const x1 = cx + Math.cos(angle) * innerR;
        const y1 = cy + Math.sin(angle) * innerR;
        const x2 = cx + Math.cos(angle) * outerR;
        const y2 = cy + Math.sin(angle) * outerR;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(255, 107, 53, ${0.4 + amp * 0.6})`;
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.stroke();
      }
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, ensureAnalyser]);

  const speedLabel = playbackRate === 1 ? "1x" : playbackRate === 1.5 ? "1.5x" : "2x";

  return (
    <div className="relative shrink-0 flex flex-col items-center" style={{ width: DISPLAY_PX }}>
      {/* Avatar with waveform */}
      <button
        onClick={onTogglePlay}
        disabled={!voiceReady}
        className={`group relative flex items-center justify-center ${
          voiceReady ? "cursor-pointer" : "cursor-default"
        }`}
        style={{ width: DISPLAY_PX, height: DISPLAY_PX }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_PX}
          height={CANVAS_PX}
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: DISPLAY_PX, height: DISPLAY_PX }}
        />

        {isPlaying && (
          <motion.div
            className="absolute rounded-full"
            style={{ width: AVATAR_PX + 8, height: AVATAR_PX + 8 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="h-full w-full rounded-full" style={{ boxShadow: "0 0 20px rgba(255,107,53,0.3), 0 0 40px rgba(255,107,53,0.1)" }} />
          </motion.div>
        )}

        {/* Subtle breathing pulse while audio is loading */}
        {!voiceReady && (
          <motion.span
            className="absolute rounded-full"
            style={{ width: AVATAR_PX + 4, height: AVATAR_PX + 4 }}
            animate={{ opacity: [0.08, 0.2, 0.08] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="h-full w-full rounded-full border border-white/15" />
          </motion.span>
        )}

        {/* Attention ring — pulses when voice is ready but user hasn't tapped */}
        {voiceReady && !hasPlayed && !isPlaying && (
          <motion.span
            className="absolute rounded-full border-2 border-orange-500/60"
            style={{ width: AVATAR_PX + 6, height: AVATAR_PX + 6 }}
            animate={{ scale: [1, 1.25], opacity: [0.7, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
          />
        )}

        <div
          className={`relative z-10 flex items-center justify-center overflow-hidden rounded-full shadow-lg ring-2 transition-all duration-500 ${
            voiceReady
              ? "ring-orange-500/40 group-hover:ring-orange-500/70 group-hover:scale-105 group-active:scale-95"
              : "ring-white/[0.08]"
          }`}
          style={{ width: AVATAR_PX, height: AVATAR_PX }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />

          {voiceReady && (
            <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${
              isPlaying
                ? "bg-black/30 opacity-0 group-hover:opacity-100"
                : hasPlayed
                  ? "bg-black/30 opacity-0 group-hover:opacity-100"
                  : "bg-black/40 opacity-100"
            }`}>
              {isPlaying ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
                  <rect x="3" y="2" width="2.5" height="10" rx="0.75" />
                  <rect x="8.5" y="2" width="2.5" height="10" rx="0.75" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="white" className="ml-0.5">
                  <path d="M4 2v10l8-5-8-5Z" />
                </svg>
              )}
            </div>
          )}
        </div>

      </button>

      {/* Mini control bar — only visible after audio has started */}
      <AnimatePresence>
        {hasPlayed && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="mt-1 flex items-center gap-0.5"
          >
            {/* Play/Pause toggle */}
            <button
              onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-white/40 transition-all hover:text-white/70 hover:bg-white/5"
              title={isPlaying ? "Pause (space)" : "Play (space)"}
            >
              {isPlaying ? (
                <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor">
                  <rect x="3" y="2" width="2.5" height="10" rx="0.75" />
                  <rect x="8.5" y="2" width="2.5" height="10" rx="0.75" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor" className="ml-0.5">
                  <path d="M4 2v10l8-5-8-5Z" />
                </svg>
              )}
            </button>

            {/* Speed toggle */}
            <button
              onClick={(e) => { e.stopPropagation(); onCycleSpeed(); }}
              className="flex h-7 cursor-pointer items-center justify-center rounded-md px-2 text-[11px] font-bold tabular-nums text-white/40 transition-all hover:text-white/70 hover:bg-white/5"
              title="Playback speed"
            >
              {speedLabel}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
