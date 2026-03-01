"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AuditResult } from "@/lib/config";

interface TheatrePlayerProps {
  url: string;
  audit: AuditResult;
  activeChapter: number;
  scrollY: number;
  screenshot: string | null;
  zoomed: boolean;
  scanning?: boolean;
}

const ZOOM_DURATION = 0.8;
const ZOOM_EASE = [0.22, 1, 0.36, 1] as const;

export function TheatrePlayer({
  url,
  audit,
  activeChapter,
  scrollY,
  screenshot,
  zoomed,
  scanning,
}: TheatrePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const prevScreenshotRef = useRef<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const prevZoomed = useRef(zoomed);
  const [previewRect, setPreviewRect] = useState<DOMRect | null>(null);

  const screenshotUrl = screenshot ?? null;

  useEffect(() => {
    if (screenshotUrl !== prevScreenshotRef.current) {
      prevScreenshotRef.current = screenshotUrl;
      setImgLoaded(false);
    }
  }, [screenshotUrl]);

  // Capture preview image rect right before zooming
  useEffect(() => {
    if (zoomed && !prevZoomed.current) {
      if (previewRef.current) {
        const img = previewRef.current.querySelector("img");
        if (img) {
          setPreviewRect(img.getBoundingClientRect());
        }
      }
      setTransitioning(true);
      const timer = setTimeout(() => setTransitioning(false), ZOOM_DURATION * 1000 + 100);
      return () => clearTimeout(timer);
    }
    if (!zoomed && prevZoomed.current) {
      setTransitioning(true);
      const timer = setTimeout(() => setTransitioning(false), ZOOM_DURATION * 1000 + 100);
      return () => clearTimeout(timer);
    }
    prevZoomed.current = zoomed;
  }, [zoomed]);

  const handleImgLoad = useCallback(() => {
    setImgLoaded(true);
  }, []);

  function scrollToPercent(pct: number, smooth: boolean) {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return;

    const renderedH = img.offsetHeight;
    const viewH = container.clientHeight;
    const maxScroll = Math.max(0, renderedH - viewH);

    let target: number;
    if (pct <= 3) {
      target = 0;
    } else {
      const absoluteY = (pct / 100) * renderedH;
      target = Math.max(0, Math.min(absoluteY - viewH * 0.33, maxScroll));
    }

    container.scrollTo({ top: target, behavior: smooth ? "smooth" : "instant" });
  }

  useEffect(() => {
    if (!imgLoaded || !zoomed || transitioning) return;

    const chapterHotspots = audit.hotspots.filter(
      (h) => h.chapter === activeChapter
    );
    let targetPct = scrollY;
    if (chapterHotspots.length > 0) {
      targetPct =
        chapterHotspots.reduce((sum, h) => sum + h.y, 0) /
        chapterHotspots.length;
    }

    scrollToPercent(targetPct, true);
  }, [activeChapter, scrollY, imgLoaded, zoomed, transitioning, audit]);

  useEffect(() => {
    if (zoomed && imgLoaded && !transitioning) {
      scrollToPercent(0, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomed, imgLoaded, transitioning]);

  const activeHotspots = zoomed
    ? audit.hotspots.filter((h) => h.chapter === activeChapter)
    : [];

  useEffect(() => {
    if (!zoomed) return;
    console.log(`[theatre] chapter=${activeChapter} hotspots=${activeHotspots.length}, scrollY=${scrollY}, total audit hotspots=${audit.hotspots.length}`, activeHotspots.map(h => ({
      label: h.label, x: h.x?.toFixed(1), y: h.y?.toFixed(1), chapter: h.chapter,
    })));
  }, [zoomed, activeChapter, activeHotspots, scrollY, audit.hotspots.length]);

  const enableScroll = zoomed && !transitioning;

  // Calculate initial scale for the zoomed image based on the preview rect
  const containerEl = containerRef.current;
  let initialScale = 0.5;
  let initialY = 0;
  if (previewRect && containerEl) {
    const containerRect = containerEl.getBoundingClientRect();
    const containerW = containerRect.width;
    if (containerW > 0) {
      initialScale = previewRect.width / containerW;
    }
    // Offset so the zoomed image starts from where the preview was
    const previewCenterY = previewRect.top + previewRect.height / 2 - containerRect.top;
    const containerCenterY = containerRect.height / 2;
    initialY = previewCenterY - containerCenterY;
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-neutral-950">
      <div
        ref={containerRef}
        className={`relative flex-1 ${
          enableScroll
            ? "overflow-y-auto overflow-x-hidden"
            : "overflow-hidden"
        }`}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
        }}
      >
        {screenshotUrl ? (
          <>
            {/* Preview mode: centered contained screenshot */}
            <AnimatePresence>
              {!zoomed && (
                <motion.div
                  ref={previewRef}
                  className="absolute inset-0 flex items-center justify-center"
                  initial={false}
                  exit={{
                    opacity: 0,
                    transition: { duration: ZOOM_DURATION * 0.4, ease: "easeOut" },
                  }}
                >
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={screenshotUrl}
                      alt={`Screenshot of ${url}`}
                      className="max-h-[72vh] w-auto max-w-[88vw] rounded-xl shadow-2xl shadow-black/40 ring-1 ring-white/[0.06] select-none pointer-events-none"
                      style={{ objectFit: "contain" }}
                      draggable={false}
                      onLoad={handleImgLoad}
                    />

                    {scanning && imgLoaded && (
                      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
                        <motion.div
                          className="absolute inset-x-0 h-[2px]"
                          style={{
                            background: "linear-gradient(90deg, transparent 0%, rgba(255,107,53,0.6) 30%, rgba(255,107,53,0.9) 50%, rgba(255,107,53,0.6) 70%, transparent 100%)",
                            boxShadow: "0 0 20px rgba(255,107,53,0.4), 0 0 60px rgba(255,107,53,0.15)",
                          }}
                          animate={{ top: ["0%", "100%", "0%"] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <motion.div
                          className="pointer-events-none absolute inset-x-0 h-24"
                          style={{
                            background: "linear-gradient(180deg, rgba(255,107,53,0.06) 0%, transparent 100%)",
                          }}
                          animate={{ top: ["0%", "100%", "0%"] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Zoomed mode: full-width scrollable screenshot */}
            <AnimatePresence>
              {zoomed && (
                <motion.div
                  className="relative w-full origin-top"
                  initial={{
                    opacity: 0,
                    scale: initialScale,
                    y: initialY,
                    borderRadius: 12,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    borderRadius: 0,
                  }}
                  transition={{
                    duration: ZOOM_DURATION,
                    ease: ZOOM_EASE,
                    opacity: { duration: ZOOM_DURATION * 0.5, delay: 0.05 },
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imgRef}
                    src={screenshotUrl}
                    alt={`Screenshot of ${url}`}
                    className="w-full select-none"
                    draggable={false}
                    onLoad={handleImgLoad}
                  />

                  {/* Hotspots */}
                  {imgLoaded &&
                    activeHotspots.map((h, i) => (
                      <div
                        key={`${activeChapter}-${i}`}
                        className="pointer-events-none absolute"
                        style={{
                          left: `${h.x}%`,
                          top: `${h.y}%`,
                          transform: "translate(-50%, -50%)",
                          zIndex: 10,
                        }}
                      >
                        <span className="absolute -left-[14px] -top-[14px] h-10 w-10 animate-ping rounded-full bg-orange-500/15" />
                        <span className="absolute -left-[8px] -top-[8px] h-7 w-7 rounded-full border-[1.5px] border-orange-500/25" />
                        <span
                          className="block h-3 w-3 rounded-full border-2 border-white bg-orange-500"
                          style={{
                            boxShadow:
                              "0 0 8px rgba(255,107,53,.35), 0 0 24px rgba(255,107,53,.12)",
                          }}
                        />
                      </div>
                    ))}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-neutral-600">
            Loading preview...
          </div>
        )}
      </div>

      {/* Hide scrollbar with CSS */}
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
