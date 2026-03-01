"use client";

import { useRef, useEffect } from "react";
import { ThumbsUp } from "lucide-react";
import type { AuditResult } from "@/lib/config";
import type { ChapterRating, ChapterRatingStatus } from "@/hooks/use-action-plan";

interface ChapterNavProps {
  chapters: AuditResult["chapters"];
  activeChapter: number;
  onSeek: (index: number) => void;
  ratings?: Record<number, ChapterRating>;
  onRate?: (index: number, status: ChapterRatingStatus) => void;
}

export function ChapterNav({
  chapters,
  activeChapter,
  onSeek,
  ratings,
  onRate,
}: ChapterNavProps) {
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeChapter]);

  const showRatings = !!ratings && !!onRate;

  return (
    <div className="flex flex-col gap-0.5">
      {chapters.map((chapter, i) => {
        const isActive = i === activeChapter;
        const isApproved = ratings?.[i]?.status === "approved";

        return (
          <div key={i} ref={isActive ? activeRef : undefined}>
            <div
              onClick={() => onSeek(i)}
              className={`flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors ${
                isActive ? "bg-white/5" : "hover:bg-white/5"
              }`}
            >
              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                isActive
                  ? "bg-orange-500 text-white"
                  : isApproved
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-white/10 text-neutral-400"
              }`}>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium leading-tight ${isActive ? "text-white" : "text-white/70"}`}>
                  {chapter.title}
                </p>
                <p className={`mt-1 text-xs leading-relaxed text-neutral-400 ${isActive ? "" : "line-clamp-2"}`}>
                  {chapter.summary}
                </p>
                {isActive && chapter.learnUrl && (
                  <a
                    href={chapter.learnUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-orange-400/70 hover:text-orange-400 transition-colors"
                  >
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="shrink-0 opacity-60">
                      <path d="M6 3H3v10h10v-3M9 2h5v5M14 2L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {chapter.learnLabel || "Learn more"}
                  </a>
                )}
              </div>

              {showRatings && (
                <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                  <button
                    onClick={() => onRate(i, "approved")}
                    title={isApproved ? "Remove from plan" : "Add to plan"}
                    className={`flex cursor-pointer h-6 w-6 items-center justify-center rounded-full transition-all ${
                      isApproved
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "text-white/20 hover:text-emerald-400 hover:bg-emerald-500/10"
                    }`}
                  >
                    <ThumbsUp size={11} fill={isApproved ? "currentColor" : "none"} />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
