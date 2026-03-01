"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CloseButton } from "@/components/ui/close-button";
import { CopyIcon, CheckIcon, DownloadIcon } from "@/components/ui/icons";
import type { AuditResult, Persona } from "@/lib/config";

interface RedesignModalProps {
  open: boolean;
  onClose: () => void;
  audit: AuditResult;
  persona: Persona;
  hostname: string;
  screenshot: string;
}

export function RedesignModal({
  open,
  onClose,
  audit,
  persona,
  hostname,
  screenshot,
}: RedesignModalProps) {
  const [promptCopied, setPromptCopied] = useState(false);
  const [imgCopied, setImgCopied] = useState(false);
  const [bothDone, setBothDone] = useState(false);


  // Prompt state
  const [prompt, setPrompt] = useState<string | null>(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  // Track which cache key has already been fetched to avoid redundant calls
  const fetchedKeyRef = useRef<string | null>(null);

  const cacheKey = `${hostname}__${persona}__${audit.overallScore}`;

  const doFetch = useCallback(() => {
    setPromptLoading(true);
    setPromptError(null);
    fetch("/api/redesign-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audit, persona, hostname }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Request failed");
        return data as { prompt: string; source: "ai" };
      })
      .then((data) => setPrompt(data.prompt))
      .catch((err: unknown) => setPromptError(err instanceof Error ? err.message : "Failed to generate prompt"))
      .finally(() => setPromptLoading(false));
  }, [audit, persona, hostname]);

  // Fetch when modal opens — skip if we already have a result for this exact audit+persona
  useEffect(() => {
    if (!open) return;
    if (fetchedKeyRef.current === cacheKey && (prompt || promptError)) return;
    fetchedKeyRef.current = cacheKey;
    doFetch();
  }, [open, cacheKey, prompt, promptError, doFetch]);

  const copyPrompt = useCallback(async () => {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  }, [prompt]);

  const downloadScreenshot = useCallback(async () => {
    try {
      const res = await fetch(screenshot);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${hostname}-screenshot.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch {
      window.open(screenshot, "_blank", "noopener,noreferrer");
    }
  }, [screenshot, hostname]);

  const copyScreenshot = useCallback(async () => {
    try {
      const res = await fetch(screenshot);
      const blob = await res.blob();
      const mimeType = blob.type || "image/png";
      await navigator.clipboard.write([new ClipboardItem({ [mimeType]: blob })]);
      setImgCopied(true);
      setTimeout(() => setImgCopied(false), 2000);
    } catch {
      downloadScreenshot();
      setImgCopied(true);
      setTimeout(() => setImgCopied(false), 2000);
    }
  }, [screenshot, downloadScreenshot]);

  const copyBoth = useCallback(async () => {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    downloadScreenshot();
    setBothDone(true);
    setTimeout(() => setBothDone(false), 2500);
  }, [prompt, downloadScreenshot]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[70] flex overflow-y-auto bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative m-auto flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-neutral-900 shadow-2xl ring-1 ring-white/[0.08]"
            style={{ maxHeight: "90vh" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-white">AI Redesign</h2>
                  {prompt && !promptLoading && (
                    <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-medium text-orange-400">
                      AI
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-neutral-500">
                  Copy the prompt and screenshot, then paste both into your AI image editor
                </p>
              </div>
              <CloseButton onClick={onClose} size={16} className="cursor-pointer rounded-full p-1.5 text-neutral-500 transition-colors hover:bg-white/5 hover:text-white" />
            </div>

            {/* Body */}
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 sm:flex-row">

              {/* Left — Screenshot */}
              <div className="flex min-w-0 flex-col gap-2 sm:w-[280px] sm:shrink-0">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-widest text-neutral-500">Screenshot</p>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={copyScreenshot}
                      className="flex cursor-pointer items-center gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-white/60 transition-all hover:bg-white/[0.1] hover:text-white"
                    >
                      {imgCopied ? <CheckIcon /> : <CopyIcon />}
                      {imgCopied ? "Copied" : "Copy"}
                    </button>
                    <button
                      onClick={downloadScreenshot}
                      className="flex cursor-pointer items-center gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-white/60 transition-all hover:bg-white/[0.1] hover:text-white"
                    >
                      <DownloadIcon />
                      Save
                    </button>
                  </div>
                </div>
                <div className="relative min-h-0 flex-1 overflow-y-auto rounded-xl bg-neutral-950 ring-1 ring-white/[0.06]" style={{ maxHeight: "400px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={screenshot}
                    alt={`${hostname} screenshot`}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Right — Prompt */}
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-widest text-neutral-500">
                    Prompt · {audit.chapters.length} improvements
                  </p>
                  <button
                    onClick={copyPrompt}
                    disabled={promptLoading || !prompt}
                    className="flex cursor-pointer items-center gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-white/60 transition-all hover:bg-white/[0.1] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {promptCopied ? <CheckIcon /> : <CopyIcon />}
                    {promptCopied ? "Copied!" : "Copy prompt"}
                  </button>
                </div>
                <div
                  className="relative min-h-0 flex-1 overflow-y-auto rounded-xl bg-neutral-950 ring-1 ring-white/[0.06]"
                  style={{ maxHeight: "400px" }}
                >
                  {promptLoading ? (
                    <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-3 p-8">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-orange-500" />
                      <p className="text-[11px] text-neutral-600">Generating prompt…</p>
                    </div>
                  ) : promptError ? (
                    <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-3 p-8">
                      <p className="text-center text-[11px] text-red-400">{promptError}</p>
                      <button
                        onClick={() => { fetchedKeyRef.current = null; doFetch(); }}
                        className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[11px] text-neutral-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                      >
                        Retry
                      </button>
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap break-words p-4 font-mono text-[11px] leading-relaxed text-neutral-400">
                      {prompt}
                    </pre>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3">
              <p className="text-[11px] text-neutral-600">
                Works with Nano Banana, GPT-4o, Gemini, and other AI image editors
              </p>
              <button
                onClick={copyBoth}
                disabled={promptLoading || !prompt}
                className="flex cursor-pointer items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-[12px] font-semibold text-white transition-all hover:bg-orange-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bothDone ? (
                  <>
                    <CheckIcon />
                    Done — prompt copied &amp; screenshot saved
                  </>
                ) : (
                  <>
                    <CopyIcon />
                    Copy prompt + save screenshot
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
