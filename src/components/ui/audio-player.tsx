"use client";

import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";

interface AudioPlayerProps {
  src: string | null;
  autoPlay?: boolean;
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
  onReady?: () => void;
  onPlay?: () => void;
}

export const AudioPlayer = forwardRef<HTMLAudioElement, AudioPlayerProps>(
  function AudioPlayer({ src, autoPlay, onTimeUpdate, onEnded, onReady, onPlay: onPlayProp }, ref) {
    const internalRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showRemaining, setShowRemaining] = useState(false);
    const [hoveringTrack, setHoveringTrack] = useState(false);

    const onTimeUpdateRef = useRef(onTimeUpdate);
    onTimeUpdateRef.current = onTimeUpdate;
    const onEndedRef = useRef(onEnded);
    onEndedRef.current = onEnded;
    const onReadyRef = useRef(onReady);
    onReadyRef.current = onReady;
    const onPlayPropRef = useRef(onPlayProp);
    onPlayPropRef.current = onPlayProp;

    useImperativeHandle(ref, () => internalRef.current as HTMLAudioElement);

    useEffect(() => {
      const el = internalRef.current;
      if (!el) return;

      const handleTime = () => {
        setProgress(el.currentTime);
        onTimeUpdateRef.current?.(el.currentTime);
      };
      const onLoadedMetadata = () => {
        setDuration(el.duration);
        onReadyRef.current?.();
      };
      const onCanPlay = () => {
        if (el.duration && !isNaN(el.duration)) {
          setDuration(el.duration);
          onReadyRef.current?.();
        }
      };
      const onPlay = () => { setIsPlaying(true); onPlayPropRef.current?.(); };
      const onPause = () => setIsPlaying(false);
      const onEndedHandler = () => {
        setIsPlaying(false);
        onEndedRef.current?.();
      };

      el.addEventListener("loadedmetadata", onLoadedMetadata);
      el.addEventListener("canplay", onCanPlay);
      el.addEventListener("timeupdate", handleTime);
      el.addEventListener("play", onPlay);
      el.addEventListener("pause", onPause);
      el.addEventListener("ended", onEndedHandler);

      return () => {
        el.removeEventListener("loadedmetadata", onLoadedMetadata);
        el.removeEventListener("canplay", onCanPlay);
        el.removeEventListener("timeupdate", handleTime);
        el.removeEventListener("play", onPlay);
        el.removeEventListener("pause", onPause);
        el.removeEventListener("ended", onEndedHandler);
      };
    }, []);

    const autoPlayRef = useRef(autoPlay);
    autoPlayRef.current = autoPlay;

    useEffect(() => {
      const el = internalRef.current;
      if (!el || !src) return;
      const wasPlaying = !el.paused;
      el.load();
      if (wasPlaying || autoPlayRef.current) {
        el.play().catch(() => {});
      }
    }, [src]);

    function togglePlay() {
      const el = internalRef.current;
      if (!el) return;
      if (isPlaying) {
        el.pause();
      } else {
        el.play().catch((err) => console.warn("[audio] play blocked:", err));
      }
    }

    function toggleMute() {
      const el = internalRef.current;
      if (!el) return;
      el.muted = !el.muted;
      setIsMuted(el.muted);
    }

    function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
      const el = internalRef.current;
      if (!el) return;
      const time = parseFloat(e.target.value);
      el.currentTime = time;
      setProgress(time);
    }

    function formatTime(s: number) {
      if (!s || isNaN(s)) return "0:00";
      const mins = Math.floor(s / 60);
      const secs = Math.floor(s % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }

    const pct = duration > 0 ? (progress / duration) * 100 : 0;
    const remaining = duration - progress;
    const rightLabel = showRemaining ? `-${formatTime(remaining)}` : formatTime(duration);

    return (
      <div className="flex items-center gap-3">
        <audio ref={internalRef} src={src ?? undefined} preload="auto" autoPlay={autoPlay} />

        <button
          type="button"
          onClick={togglePlay}
          disabled={!src}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-foreground text-background transition-colors hover:bg-foreground/80 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {isPlaying ? (
            <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor">
              <rect x="2" y="1" width="3.5" height="12" rx="1" />
              <rect x="8.5" y="1" width="3.5" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor">
              <path d="M3 1.5v11l9-5.5L3 1.5Z" />
            </svg>
          )}
        </button>

        <div className="flex flex-1 items-center gap-2">
          <span className="w-10 text-right text-[11px] tabular-nums text-muted">
            {formatTime(progress)}
          </span>
          <div
            className="group relative flex-1"
            onMouseEnter={() => setHoveringTrack(true)}
            onMouseLeave={() => setHoveringTrack(false)}
          >
            <div className="h-1 w-full rounded-full bg-border">
              <div
                className="h-full rounded-full bg-accent transition-all duration-100"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div
              className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-100"
              style={{
                left: `${pct}%`,
                opacity: hoveringTrack || isPlaying ? 1 : 0,
                transform: `translate(-50%, -50%) scale(${hoveringTrack ? 1 : 0.5})`,
              }}
            >
              <div className="h-3 w-3 rounded-full bg-accent shadow-sm ring-2 ring-background" />
            </div>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={progress}
              onChange={handleSeek}
              disabled={!src}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowRemaining((v) => !v)}
            className="w-10 cursor-pointer text-right text-[11px] tabular-nums text-muted transition-colors hover:text-foreground"
          >
            {rightLabel}
          </button>
        </div>

        <button
          type="button"
          onClick={toggleMute}
          disabled={!src}
          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M19.07 4.93a10 10 0 010 14.14" />
              <path d="M15.54 8.46a5 5 0 010 7.07" />
            </svg>
          )}
        </button>
      </div>
    );
  }
);
