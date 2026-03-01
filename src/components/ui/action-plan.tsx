"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import type { AuditResult } from "@/lib/config";
import type { UseActionPlanReturn } from "@/hooks/use-action-plan";
import { track } from "@/lib/analytics";

interface PersonaSummary {
  avatar: string;
  name: string;
  title: string;
  score: number;
  verdict: string;
}

interface ActionPlanProps {
  open: boolean;
  onClose: () => void;
  chapters: AuditResult["chapters"];
  hostname: string;
  url: string;
  score: number;
  actionPlan: UseActionPlanReturn;
  onSeek?: (index: number) => void;
  persona?: PersonaSummary;
}

function letter(n: number) {
  return String.fromCharCode(65 + n);
}

/* ─── AI insight row ─── */
function InsightRow({
  badge,
  chapter,
  inPlan,
  note,
  onToggle,
  onNoteChange,
  onSeek,
}: {
  badge: string;
  chapter: AuditResult["chapters"][number];
  inPlan: boolean;
  note: string | undefined;
  onToggle: () => void;
  onNoteChange: (note: string) => void;
  onSeek?: () => void;
}) {
  const [noteValue, setNoteValue] = useState(note ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setNoteValue(note ?? ""); }, [note]);

  return (
    <div className={`rounded-xl transition-all duration-200 ${
      inPlan
        ? "bg-emerald-500/[0.06] ring-1 ring-emerald-500/[0.15]"
        : "bg-white/[0.02] ring-1 ring-white/[0.05] hover:bg-white/[0.04]"
    }`}>
      <div className="flex items-start gap-3 p-3">
        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold transition-colors ${
          inPlan ? "bg-emerald-500/20 text-emerald-400" : "bg-white/8 text-white/30"
        }`}>
          {badge}
        </span>

        <div className="min-w-0 flex-1">
          <button
            onClick={onSeek}
            disabled={!onSeek}
            className={`text-left text-[13px] font-medium leading-snug transition-colors ${
              inPlan ? "text-white" : "text-white/75"
            } ${onSeek ? "cursor-pointer hover:text-white" : "cursor-default"}`}
          >
            {chapter.title}
          </button>
          <p className={`mt-0.5 text-[11px] leading-relaxed text-white/45 ${
            inPlan ? "" : "line-clamp-2"
          }`}>
            {chapter.summary}
          </p>
          {inPlan && chapter.learnUrl && (
            <a
              href={chapter.learnUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-orange-400/60 transition-colors hover:text-orange-400"
            >
              <svg width="9" height="9" viewBox="0 0 16 16" fill="none" className="shrink-0">
                <path d="M6 3H3v10h10v-3M9 2h5v5M14 2L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {chapter.learnLabel || "Learn more"}
            </a>
          )}
          {inPlan && (
            <input
              ref={inputRef}
              type="text"
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              onBlur={() => onNoteChange(noteValue)}
              onKeyDown={(e) => { if (e.key === "Enter") inputRef.current?.blur(); }}
              placeholder="Add a note..."
              className="mt-2 w-full rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-white/60 placeholder-white/20 outline-none ring-1 ring-white/[0.07] transition-all focus:ring-emerald-500/30 focus:text-white/80"
            />
          )}
        </div>

        <button
          onClick={onToggle}
          title={inPlan ? "Remove from plan" : "Add to plan"}
          className={`flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all ${
            inPlan
              ? "bg-emerald-500 text-white hover:bg-emerald-400"
              : "bg-white/[0.06] text-white/30 hover:bg-emerald-500/20 hover:text-emerald-400"
          }`}
        >
          {inPlan ? <Check size={12} strokeWidth={2.5} /> : (
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2v8M2 6h8" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

/* ─── User-added task row ─── */
function UserTaskRow({
  badge,
  text,
  note,
  onDelete,
  onNoteChange,
}: {
  badge: string;
  text: string;
  note: string | undefined;
  onDelete: () => void;
  onNoteChange: (note: string) => void;
}) {
  const [noteValue, setNoteValue] = useState(note ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setNoteValue(note ?? ""); }, [note]);

  return (
    <div className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/[0.06]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/8 text-[10px] font-bold text-white/35">
          {badge}
        </span>
        <p className="flex-1 text-[13px] leading-snug text-white/65">{text}</p>
        <button
          onClick={onDelete}
          title="Remove task"
          className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/25 transition-all hover:bg-red-500/15 hover:text-red-400"
        >
          <X size={11} />
        </button>
      </div>
      <div className="mt-2 pl-8">
        <input
          ref={inputRef}
          type="text"
          value={noteValue}
          onChange={(e) => setNoteValue(e.target.value)}
          onBlur={() => onNoteChange(noteValue)}
          onKeyDown={(e) => { if (e.key === "Enter") inputRef.current?.blur(); }}
          placeholder="Add a note..."
          className="w-full rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-white/50 placeholder-white/15 outline-none ring-1 ring-white/[0.06] transition-all focus:ring-white/[0.15] focus:text-white/70"
        />
      </div>
    </div>
  );
}

/* ─── Add task row ─── */
function AddTaskRow({ onAdd }: { onAdd: (text: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleExpand() {
    setExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) { setExpanded(false); return; }
    onAdd(value.trim());
    setValue("");
    setExpanded(false);
  }

  function handleBlur() {
    if (!value.trim()) setExpanded(false);
  }

  if (!expanded) {
    return (
      <button
        onClick={handleExpand}
        className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/[0.12] px-3 py-3 text-left text-[12px] text-white/30 transition-all hover:border-white/25 hover:text-white/50 hover:bg-white/[0.02]"
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-white/30">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 2v8M2 6h8" strokeLinecap="round" />
          </svg>
        </span>
        Add your own task…
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => { if (e.key === "Escape") { setValue(""); setExpanded(false); } }}
        placeholder="Describe the task…"
        className="flex-1 rounded-xl bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none ring-1 ring-white/[0.15] focus:ring-white/30 transition-all"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        className="cursor-pointer rounded-xl bg-white/[0.08] px-3.5 py-2.5 text-xs font-medium text-white/60 transition-all hover:bg-white/[0.14] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Add
      </button>
    </form>
  );
}

/* ─── Main component ─── */
export function ActionPlan({
  open,
  onClose,
  chapters,
  hostname,
  url,
  score,
  actionPlan,
  onSeek,
}: ActionPlanProps) {
  const { plan, approvedCount, rate, addNote, addUserTask, removeUserTask, updateUserTaskNote, isSaving } = actionPlan;
  const [copiedTasks, setCopiedTasks] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const totalItems = approvedCount + plan.userTasks.length;

  // Assign letters across the full list:
  // AI insights come first (by chapter index order, only approved get letters that matter for export,
  // but we show all with letters positionally).
  // User tasks continue after the last chapter.
  const userTaskStartLetter = chapters.length;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 bg-black/40"
            onClick={onClose}
          />

          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute right-0 top-0 bottom-0 z-40 flex flex-col w-80 max-w-[calc(100vw-2rem)] bg-neutral-950/98 shadow-2xl ring-1 ring-white/[0.06] backdrop-blur-xl lg:w-96"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm font-semibold text-white/90">Tasks</h3>
                {totalItems > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500/20 px-1.5 text-[10px] font-bold text-emerald-400">
                    {totalItems}
                  </span>
                )}
                {isSaving ? (
                  <span className="text-[10px] text-white/20">Saving…</span>
                ) : totalItems > 0 ? (
                  <span className="flex items-center gap-1 text-[10px] text-white/20">
                    <svg width="8" height="8" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3.5 3.5 6.5-8" /></svg>
                    Saved
                  </span>
                ) : null}
              </div>
              <button
                onClick={onClose}
                className="cursor-pointer rounded-full p-1.5 text-white/25 transition-colors hover:text-white hover:bg-white/5"
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l8 8M14 6l-8 8" />
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto">


              {/* Unified task list */}
              <div className="flex flex-col gap-1.5 px-4 py-4">
                {/* AI insight rows — all chapters, lettered A B C... */}
                {chapters.map((chapter, i) => {
                  const inPlan = plan.ratings[i]?.status === "approved";
                  return (
                    <InsightRow
                      key={i}
                      badge={letter(i)}
                      chapter={chapter}
                      inPlan={inPlan}
                      note={plan.ratings[i]?.userNote}
                      onToggle={() => rate(i, "approved")}
                      onNoteChange={(n) => addNote(i, n)}
                      onSeek={onSeek ? () => { onSeek(i); onClose(); } : undefined}
                    />
                  );
                })}

                {/* User-added task rows — continue the letter sequence */}
                {plan.userTasks.map((task, i) => (
                  <UserTaskRow
                    key={`user-${i}`}
                    badge={letter(userTaskStartLetter + i)}
                    text={task.text}
                    note={task.note}
                    onDelete={() => removeUserTask(i)}
                    onNoteChange={(n) => updateUserTaskNote(i, n)}
                  />
                ))}
              </div>
            </div>

            {/* Bottom bar — fixed, always visible */}
            <div className="border-t border-white/[0.05] px-4 py-3 space-y-2">
              <AddTaskRow onAdd={(text) => {
                track("User Task Added", { hostname });
                addUserTask(text);
                requestAnimationFrame(() => {
                  scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
                });
              }} />
              {totalItems > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      track("Tasks Copied", { hostname, total_tasks: totalItems });
                      await actionPlan.copyMarkdown(chapters, hostname, url);
                      setCopiedTasks(true);
                      setTimeout(() => setCopiedTasks(false), 2000);
                    }}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-white/[0.05] px-3 py-2.5 text-[12px] font-medium text-white/60 transition-all hover:bg-white/[0.09] active:scale-[0.98]"
                  >
                    {copiedTasks ? (
                      <><Check size={12} className="text-emerald-400" /> Copied!</>
                    ) : (
                      <><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="5" width="8" height="8" rx="1.5" /><path d="M3 11V3.5A1.5 1.5 0 0 1 4.5 2H11" /></svg> Copy tasks</>
                    )}
                  </button>
                  <a
                    href={`mailto:?subject=${encodeURIComponent(`Website audit for ${hostname} (${score}/100)`)}&body=${encodeURIComponent(`Hi,\n\nI ran an AI audit on ${hostname} — it scored ${score}/100.\n\nFull walkthrough with recommendations:\n${url}\n\nCan we prioritise fixing the top issues?`)}`}
                    onClick={() => track("Email Developer Clicked", { hostname, source: "tasks_panel" })}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-3 py-2.5 text-[12px] font-semibold text-white transition-all hover:bg-orange-400 active:scale-[0.98]"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3.5" width="12" height="9" rx="2" /><path d="M2 5.5l6 3.5 6-3.5" /></svg>
                    Send to dev
                  </a>
                </div>
              )}
              <p className="text-center text-[10px] text-white/15">
                Saved automatically
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
