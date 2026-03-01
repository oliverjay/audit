"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { AuditResult } from "@/lib/config";

export type ChapterRatingStatus = "approved" | "dismissed" | "unrated";

export interface ChapterRating {
  status: ChapterRatingStatus;
  userNote?: string;
}

export interface UserTask {
  text: string;
  note?: string;
}

export interface ActionPlan {
  key: string;
  ratings: Record<number, ChapterRating>;
  userTasks: UserTask[];
}

function makeKey(url: string, persona: string) {
  return `action-plan:${url}:${persona}`;
}

function loadFromStorage(key: string): ActionPlan | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActionPlan & { globalNotes?: string[] };
    // Migrate old globalNotes format
    if (parsed.globalNotes && !parsed.userTasks) {
      parsed.userTasks = parsed.globalNotes.map((t) => ({ text: t }));
      delete parsed.globalNotes;
    }
    return parsed as ActionPlan;
  } catch {
    return null;
  }
}

function saveToStorage(plan: ActionPlan) {
  try {
    localStorage.setItem(plan.key, JSON.stringify(plan));
  } catch {}
}

function emptyPlan(key: string): ActionPlan {
  return { key, ratings: {}, userTasks: [] };
}

export interface UseActionPlanReturn {
  plan: ActionPlan;
  approvedCount: number;
  approvedTasks: Array<{ index: number; chapter: AuditResult["chapters"][number]; rating: ChapterRating }>;
  isSaving: boolean;
  rate: (chapterIndex: number, status: ChapterRatingStatus) => void;
  addNote: (chapterIndex: number, note: string) => void;
  addUserTask: (text: string) => void;
  removeUserTask: (index: number) => void;
  updateUserTaskNote: (index: number, note: string) => void;
  exportMarkdown: (chapters: AuditResult["chapters"], hostname: string, auditUrl?: string) => string;
  copyMarkdown: (chapters: AuditResult["chapters"], hostname: string, auditUrl?: string) => Promise<void>;
}

export function useActionPlan(
  url: string | null,
  persona: string | null,
  chapters: AuditResult["chapters"] | undefined,
  auditId: string | null,
): UseActionPlanReturn {
  const storageKey = url && persona ? makeKey(url, persona) : null;
  const [isSaving, setIsSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [plan, setPlan] = useState<ActionPlan>(() => {
    if (!storageKey) return emptyPlan("");
    return loadFromStorage(storageKey) ?? emptyPlan(storageKey);
  });

  // Re-load when key changes (persona switch, new URL)
  useEffect(() => {
    if (!storageKey) {
      setPlan(emptyPlan(""));
      return;
    }
    setPlan(loadFromStorage(storageKey) ?? emptyPlan(storageKey));
  }, [storageKey]);

  // Load from DB when auditId becomes available
  useEffect(() => {
    if (!auditId) return;
    fetch(`/api/action-plan?auditId=${encodeURIComponent(auditId)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.action_plan) return;
        const remote = data.action_plan as ActionPlan;
        setPlan((prev) => {
          // Merge: remote wins, but preserve any local-only data
          const merged: ActionPlan = {
            ...prev,
            ratings: { ...prev.ratings, ...remote.ratings },
            userTasks: remote.userTasks?.length ? remote.userTasks : prev.userTasks,
          };
          if (prev.key) saveToStorage(merged);
          return merged;
        });
      })
      .catch(() => {/* silently fall back to localStorage */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditId]);

  // Debounced DB save
  function scheduleSave(nextPlan: ActionPlan) {
    if (!auditId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await fetch("/api/action-plan", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ auditId, plan: nextPlan }),
        });
      } catch {
        // silently fail — localStorage is the fallback
      } finally {
        setIsSaving(false);
      }
    }, 1500);
  }

  const update = useCallback(
    (updater: (prev: ActionPlan) => ActionPlan) => {
      setPlan((prev) => {
        const next = updater(prev);
        saveToStorage(next);
        scheduleSave(next);
        return next;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auditId]
  );

  const rate = useCallback(
    (chapterIndex: number, status: ChapterRatingStatus) => {
      update((prev) => {
        const existing = prev.ratings[chapterIndex];
        const newStatus = existing?.status === status ? "unrated" : status;
        return {
          ...prev,
          ratings: {
            ...prev.ratings,
            [chapterIndex]: { ...existing, status: newStatus },
          },
        };
      });
    },
    [update]
  );

  const addNote = useCallback(
    (chapterIndex: number, note: string) => {
      update((prev) => ({
        ...prev,
        ratings: {
          ...prev.ratings,
          [chapterIndex]: {
            ...prev.ratings[chapterIndex],
            status: prev.ratings[chapterIndex]?.status ?? "unrated",
            userNote: note,
          },
        },
      }));
    },
    [update]
  );

  const addUserTask = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      update((prev) => ({
        ...prev,
        userTasks: [...prev.userTasks, { text: text.trim() }],
      }));
    },
    [update]
  );

  const removeUserTask = useCallback(
    (index: number) => {
      update((prev) => ({
        ...prev,
        userTasks: prev.userTasks.filter((_, i) => i !== index),
      }));
    },
    [update]
  );

  const updateUserTaskNote = useCallback(
    (index: number, note: string) => {
      update((prev) => ({
        ...prev,
        userTasks: prev.userTasks.map((t, i) =>
          i === index ? { ...t, note: note || undefined } : t
        ),
      }));
    },
    [update]
  );

  const approvedTasks = useMemo(() => {
    if (!chapters) return [];
    return chapters
      .map((chapter, index) => ({ index, chapter, rating: plan.ratings[index] ?? { status: "unrated" as ChapterRatingStatus } }))
      .filter((item) => item.rating.status === "approved");
  }, [chapters, plan.ratings]);

  const approvedCount = approvedTasks.length;

  const exportMarkdown = useCallback(
    (chs: AuditResult["chapters"], hostname: string, auditUrl?: string): string => {
      const approved = chs
        .map((chapter, i) => ({ chapter, i, rating: plan.ratings[i] }))
        .filter(({ rating }) => rating?.status === "approved");

      const totalTasks = approved.length + plan.userTasks.length;
      const references: { label: string; url: string }[] = [];

      const lines: string[] = [
        `Task List — ${hostname}`,
        `${"=".repeat(Math.min(40, 13 + hostname.length))}`,
        ``,
        `${totalTasks} task${totalTasks !== 1 ? "s" : ""}${auditUrl ? `  ·  ${auditUrl}` : ""}`,
        ``,
      ];

      let taskNum = 0;

      approved.forEach(({ chapter, rating }) => {
        taskNum++;
        lines.push(`${taskNum}. ${chapter.title}`);
        lines.push(`   ${chapter.summary}`);
        if (rating?.userNote) {
          lines.push(`   Note: ${rating.userNote}`);
        }
        if (chapter.learnUrl) {
          references.push({ label: chapter.learnLabel ?? chapter.title, url: chapter.learnUrl });
        }
        lines.push(``);
      });

      plan.userTasks.forEach(({ text, note }) => {
        taskNum++;
        lines.push(`${taskNum}. ${text}`);
        if (note) {
          lines.push(`   Note: ${note}`);
        }
        lines.push(``);
      });

      if (references.length > 0) {
        lines.push(`—`);
        lines.push(`References`);
        references.forEach(({ label, url }) => {
          lines.push(`  · ${label} — ${url}`);
        });
        lines.push(``);
      }

      return lines.join("\n");
    },
    [plan]
  );

  const copyMarkdown = useCallback(
    async (chs: AuditResult["chapters"], hostname: string, auditUrl?: string) => {
      const md = exportMarkdown(chs, hostname, auditUrl);
      await navigator.clipboard.writeText(md);
    },
    [exportMarkdown]
  );

  return {
    plan,
    approvedCount,
    approvedTasks,
    isSaving,
    rate,
    addNote,
    addUserTask,
    removeUserTask,
    updateUserTaskNote,
    exportMarkdown,
    copyMarkdown,
  };
}
