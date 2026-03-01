"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { track } from "@/lib/analytics";

interface UrlInputProps {
  onSubmit: (url: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
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

export function UrlInput({ onSubmit, disabled, autoFocus }: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      const timer = setTimeout(() => inputRef.current?.focus(), 600);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();

    if (!trimmed) {
      track("URL Validation Error", { error: "empty" });
      setError("Paste a website URL to get started");
      inputRef.current?.focus();
      return;
    }

    if (!isValidUrl(trimmed)) {
      track("URL Validation Error", { error: "invalid", input: trimmed });
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="w-full"
    >
      <div
        className="flex items-center rounded-2xl transition-all duration-500"
        style={{
          background: error
            ? "rgba(255,255,255,0.025)"
            : focused
              ? "rgba(255,255,255,0.045)"
              : "rgba(255,255,255,0.025)",
          border: error
            ? "1px solid rgba(220,60,60,0.2)"
            : focused
              ? "1px solid rgba(255,255,255,0.1)"
              : "1px solid rgba(255,255,255,0.04)",
          boxShadow: focused
            ? "0 0 0 1px rgba(255,255,255,0.02), 0 16px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)"
            : "0 4px 30px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.02)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        {/* Globe icon */}
        <div className="pl-5 text-white/25">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="9" cy="9" r="7.25" stroke="currentColor" strokeWidth="1.2"/>
            <ellipse cx="9" cy="9" rx="3.5" ry="7.25" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M2 9h14" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError(null);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onPaste={handlePaste}
          placeholder="Enter any website..."
          disabled={disabled}
          className="h-[60px] w-full bg-transparent pl-3 pr-3 text-[16px] text-white/90 outline-none placeholder:text-white/18 disabled:opacity-50"
        />
        <div className="pr-2.5">
          <motion.button
            type="submit"
            disabled={disabled}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-5 py-3 text-[15px] font-semibold whitespace-nowrap transition-all disabled:cursor-not-allowed"
            style={{
              background: "var(--accent)",
              color: "white",
              boxShadow: "0 2px 28px rgba(255,107,53,0.45), 0 0 60px rgba(255,107,53,0.15)",
              opacity: disabled ? 0.5 : 1,
            }}
          >
            Audit site
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-80">
              <path d="M3 7.5h9m0 0L8.5 4M12 7.5 8.5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.button>
        </div>
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-3 text-center text-[13px] text-red-400/60"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.form>
  );
}
