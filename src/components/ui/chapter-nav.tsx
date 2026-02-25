"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AuditResult } from "@/lib/config";

interface ChapterNavProps {
  chapters: AuditResult["chapters"];
  activeChapter: number;
  onSeek: (index: number) => void;
}

export function ChapterNav({ chapters, activeChapter, onSeek }: ChapterNavProps) {
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeChapter]);

  return (
    <div className="flex flex-col gap-1">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
        Insights
      </h3>
      {chapters.map((chapter, i) => {
        const isActive = i === activeChapter;

        return (
          <div key={i} ref={isActive ? activeRef : undefined}>
            <motion.button
              onClick={() => onSeek(i)}
              whileHover={{ x: 2 }}
              className={`flex w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                isActive
                  ? "bg-accent-soft text-foreground"
                  : "text-muted hover:bg-surface-raised hover:text-foreground"
              }`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isActive
                    ? "bg-accent text-white"
                    : "bg-border text-muted"
                }`}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight">{chapter.title}</p>
                <AnimatePresence initial={false}>
                  {isActive ? (
                    <motion.p
                      key="full"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-1 overflow-hidden text-xs leading-relaxed text-muted"
                    >
                      {chapter.summary}
                    </motion.p>
                  ) : (
                    <motion.p
                      key="clamped"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-1 text-xs leading-relaxed text-muted line-clamp-2"
                    >
                      {chapter.summary}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </motion.button>
          </div>
        );
      })}
    </div>
  );
}
