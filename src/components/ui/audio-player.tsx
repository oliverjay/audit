"use client";

import { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from "react";

interface AudioPlayerProps {
  src: string | null;
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
  onReady?: () => void;
}

export const AudioPlayer = forwardRef<HTMLAudioElement, AudioPlayerProps>(
  function AudioPlayer({ src, onTimeUpdate, onEnded, onReady }, ref) {
    const internalRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showRemaining, setShowRemaining] = useState(false);
    const [hoveringTrack, setHoveringTrack] = useState(false);

    useImperativeHandle(ref, () => internalRef.current as HTMLAudioElement);

    const handleTimeUpdate = useCallback(() => {
      const el = internalRef.current;
      if (!el) return;
      setProgress(el.currentTime);
      onTimeUpdate?.(el.currentTime);
    }, [onTimeUpdate]);

    useEffect(() => {
      const el = internalRef.current;
      if (!el) return;

      const onLoadedMetadata = () => {
        setDuration(el.duration);
        onReady?.();
      };
      const onCanPlay = () => {
        if (el.duration && !isNaN(el.duration)) {
          setDuration(el.duration);
          onReady?.();
        }
      };
      const onPlay = () => setIsPlaying(true);
      const onPause = () => setIsPlaying(false);
      const onEndedHandler = () => {
        setIsPlaying(false);
        onEnded?.();
      };

      el.addEventListener("loadedmetadata", onLoadedMetadata);
      el.addEventListener("canplay", onCanPlay);
      el.addEventListener("timeupdate", handleTimeUpdate);
      el.addEventListener("play", onPlay);
      el.addEventListener("pause", onPause);
      el.addEventListener("ended", onEndedHandler);

      return () => {
        el.removeEventListener("loadedmetadata", onLoadedMetadata);
        el.removeEventListener("canplay", onCanPlay);
        el.removeEventListener("timeupdate", handleTimeUpdate);
        el.removeEventListener("play", onPlay);
        el.removeEventListener("pause", onPause);
        el.removeEventListener("ended", onEndedHandler);
      };
    }, [handleTimeUpdate, onEnded, onReady]);

    useEffect(() => {
      const el = internalRef.current;
      if (!el || !src) return;
      el.load();
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
        <audio ref={internalRef} src={src ?? undefined} preload="auto" />

        <button
          type="button"
          onClick={togglePlay}
          disabled={!src}
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-foreground text-background transition-colors hover:bg-foreground/80 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="2" y="1" width="3.5" height="12" rx="1" />
              <rect x="8.5" y="1" width="3.5" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M3 1.5v11l9-5.5L3 1.5Z" />
            </svg>
          )}
        </button>

        <div className="flex flex-1 items-center gap-2">
          <span className="w-10 text-right text-xs tabular-nums text-muted">
            {formatTime(progress)}
          </span>
          <div
            className="group relative flex-1"
            onMouseEnter={() => setHoveringTrack(true)}
            onMouseLeave={() => setHoveringTrack(false)}
          >
            <div className="h-1.5 w-full rounded-full bg-border">
              <div
                className="h-full rounded-full bg-accent transition-all duration-150"
                style={{ width: `${pct}%` }}
              />
            </div>
            {/* Scrubber thumb */}
            <div
              className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-150"
              style={{
                left: `${pct}%`,
                opacity: hoveringTrack || isPlaying ? 1 : 0,
                transform: `translate(-50%, -50%) scale(${hoveringTrack ? 1 : 0.5})`,
              }}
            >
              <div className="h-3.5 w-3.5 rounded-full bg-accent shadow-md ring-2 ring-white" />
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
            className="w-12 cursor-pointer text-right text-xs tabular-nums text-muted transition-colors hover:text-foreground"
          >
            {rightLabel}
          </button>
        </div>
      </div>
    );
  }
);
