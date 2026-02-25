"use client";

import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface UrlInputProps {
  onSubmit: (url: string) => void;
  disabled?: boolean;
}

function isValidUrl(input: string): boolean {
  try {
    const withProtocol = input.match(/^https?:\/\//) ? input : `https://${input}`;
    const u = new URL(withProtocol);
    return !!u.hostname.includes(".");
  } catch {
    return false;
  }
}

export function UrlInput({ onSubmit, disabled }: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    if (!isValidUrl(trimmed)) {
      setError("Enter a valid URL like yoursite.com");
      return;
    }

    setError(null);
    const withProtocol =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`;

    onSubmit(withProtocol);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").trim();
    const urlMatch = pasted.match(/https?:\/\/[^\s<>"']+/);
    if (urlMatch && pasted !== urlMatch[0]) {
      e.preventDefault();
      setUrl(urlMatch[0]);
      setError(null);
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.6 }}
      className="w-full"
    >
      <div
        className={`flex items-center gap-2 rounded-2xl border bg-surface px-2 py-2 transition-all duration-200 ${
          error
            ? "border-red-400/60 shadow-[0_0_0_4px_rgba(239,68,68,0.08)]"
            : focused
              ? "border-accent/40 shadow-[0_0_0_4px_var(--accent-soft)]"
              : "border-border shadow-sm"
        }`}
      >
        <div className="flex flex-1 items-center gap-2.5 pl-3">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="shrink-0 text-muted/60"
          >
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 3v0a5 5 0 0 1 0 10v0" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3 8h10" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <input
            type="text"
            value={url}
            onChange={(e) => { setUrl(e.target.value); if (error) setError(null); }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPaste={handlePaste}
            placeholder="yoursite.com"
            disabled={disabled}
            className="h-11 w-full bg-transparent text-sm text-foreground placeholder:text-muted outline-none disabled:opacity-50"
          />
        </div>
        <motion.button
          type="submit"
          disabled={disabled || !url.trim()}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="relative shrink-0 cursor-pointer rounded-xl bg-accent px-7 py-3 text-sm font-semibold text-white transition-all hover:bg-accent-secondary disabled:cursor-not-allowed disabled:opacity-40"
        >
          Analyze
          <span className="ml-2 hidden text-white/50 sm:inline">↵</span>
        </motion.button>
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-2 text-center text-xs text-red-500"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.form>
  );
}
