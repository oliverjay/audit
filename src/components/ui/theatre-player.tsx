"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hotspot } from "./hotspot";
import { StatCard } from "./stat-card";
import type { AuditResult } from "@/lib/config";

interface TheatrePlayerProps {
  screenshot: string | null;
  url: string;
  audit: AuditResult;
  activeChapter: number;
  scrollY: number;
}

export function TheatrePlayer({
  screenshot,
  url,
  audit,
  activeChapter,
  scrollY,
}: TheatrePlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const screenshotRef = useRef<HTMLDivElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeFailed, setIframeFailed] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [iframeScrollInfo, setIframeScrollInfo] = useState({
    scrollY: 0,
    scrollHeight: 1,
    viewportHeight: 1,
  });

  const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;

  const sendMessage = useCallback(
    (msg: Record<string, unknown>) => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(msg, "*");
      }
    },
    []
  );

  // Scroll on chapter change
  useEffect(() => {
    setIsScrolling(true);
    clearTimeout(scrollingTimer.current);

    if (iframeLoaded && !iframeFailed) {
      sendMessage({ type: "AUDIT_SCROLL", scrollY });
    } else if (screenshotRef.current) {
      const container = screenshotRef.current;
      const maxScroll = container.scrollHeight - container.clientHeight;
      const rawTarget = (scrollY / 100) * container.scrollHeight;
      const target = Math.max(0, Math.min(rawTarget - container.clientHeight * 0.35, maxScroll));
      container.scrollTo({ top: target, behavior: "smooth" });
    }

    scrollingTimer.current = setTimeout(() => {
      setIsScrolling(false);
    }, 900);

    return () => clearTimeout(scrollingTimer.current);
  }, [scrollY, iframeLoaded, iframeFailed, sendMessage]);

  // Iframe load timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!iframeLoaded) {
        console.warn("[theatre] Iframe load timeout, falling back to screenshot");
        setIframeFailed(true);
      }
    }, 12000);
    return () => clearTimeout(timer);
  }, [iframeLoaded]);

  // Listen for scroll position updates from iframe
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === "AUDIT_SCROLL_POS") {
        setIframeScrollInfo({
          scrollY: e.data.scrollY,
          scrollHeight: e.data.scrollHeight,
          viewportHeight: e.data.viewportHeight,
        });
      }
      if (e.data?.type === "AUDIT_HEIGHT") {
        setIframeScrollInfo((prev) => ({
          ...prev,
          scrollHeight: e.data.height,
        }));
      }
      if (e.data?.type === "AUDIT_SCROLL_DONE") {
        clearTimeout(scrollingTimer.current);
        setIsScrolling(false);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Poll scroll position after scroll commands
  useEffect(() => {
    if (!iframeLoaded || iframeFailed) return;
    const timer = setTimeout(() => {
      sendMessage({ type: "AUDIT_GET_SCROLL" });
    }, 600);
    return () => clearTimeout(timer);
  }, [scrollY, iframeLoaded, iframeFailed, sendMessage]);

  const activeHotspots = audit.hotspots.filter(
    (h) => h.chapter === activeChapter
  );
  const activeStats = audit.stats.filter(
    (s) => s.chapter === activeChapter
  );

  const useIframe = iframeLoaded && !iframeFailed;

  function hotspotViewportY(hotspotYPct: number): number {
    if (!useIframe) return hotspotYPct;
    const { scrollY: sy, scrollHeight: sh, viewportHeight: vh } = iframeScrollInfo;
    if (sh <= 0 || vh <= 0) return hotspotYPct;
    const hotspotAbsoluteY = (hotspotYPct / 100) * sh;
    const relativeToViewport = hotspotAbsoluteY - sy;
    return (relativeToViewport / vh) * 100;
  }

  function isHotspotVisible(hotspotYPct: number): boolean {
    const vy = hotspotViewportY(hotspotYPct);
    return vy >= -10 && vy <= 110;
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="relative flex-1 overflow-hidden">
        {/* Iframe — pointer-events disabled so user can't manually scroll */}
        <iframe
          ref={iframeRef}
          src={proxyUrl}
          title="Website preview"
          onLoad={() => setIframeLoaded(true)}
          onError={() => setIframeFailed(true)}
          className={`h-full w-full border-0 pointer-events-none ${useIframe ? "block" : "hidden"}`}
        />

        {!useIframe && (
          <div ref={screenshotRef} className="h-full overflow-hidden">
            {screenshot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={screenshot} alt="Website screenshot" className="w-full" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted">
                Loading preview...
              </div>
            )}
          </div>
        )}

        {/* Hotspot overlays — hidden while scrolling */}
        {!isScrolling && (
          <div className="pointer-events-none absolute inset-0 z-20">
            <AnimatePresence mode="popLayout">
              {activeHotspots
                .filter((h) => (useIframe ? isHotspotVisible(h.y) : true))
                .map((hotspot, i) => (
                  <Hotspot
                    key={`${activeChapter}-${hotspot.label}-${i}`}
                    x={hotspot.x}
                    y={useIframe ? hotspotViewportY(hotspot.y) : hotspot.y}
                    label={hotspot.label}
                    score={hotspot.score}
                    active={true}
                  />
                ))}
            </AnimatePresence>
          </div>
        )}

        {/* Floating stat cards */}
        <div className="absolute bottom-4 right-4 z-30 flex flex-col gap-2">
          <AnimatePresence mode="popLayout">
            {activeStats.map((stat, i) => (
              <StatCard
                key={`${activeChapter}-${stat.label}-${i}`}
                label={stat.label}
                value={stat.value}
                active={true}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
