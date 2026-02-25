"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ShareMenuProps {
  url: string;
  text: string;
  score?: number;
  hostname?: string;
  personaName?: string;
  personaAvatar?: string;
  personaColor?: string;
}

function ShareIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 5l-3-3-3 3" />
      <path d="M7 2v8" />
      <path d="M2 10v1.5A1.5 1.5 0 0 0 3.5 13h7a1.5 1.5 0 0 0 1.5-1.5V10" />
    </svg>
  );
}

function useShareChannels(url: string, text: string, score?: number) {
  const [copied, setCopied] = useState(false);

  const shareText = score ? `${text} — Scored ${score}/100` : text;
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(url);

  const channels = [
    {
      name: "Copy Link",
      label: copied ? "Copied!" : "Copy Link",
      icon: (
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="5" y="5" width="8" height="8" rx="1.5" />
          <path d="M3 11V3.5A1.5 1.5 0 0 1 4.5 2H11" />
        </svg>
      ),
      action: async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
    },
    {
      name: "X / Twitter",
      label: "X / Twitter",
      icon: (
        <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
          <path d="M9.47 6.77 14.37 1H13.1l-4.26 4.99L5.35 1H1l5.14 7.55L1 15h1.28l4.49-5.27L10.65 15H15L9.47 6.77Zm-1.59 1.87-.52-.75L2.84 2.01h1.78l3.34 4.84.52.75 4.34 6.28h-1.78L7.88 8.64Z" />
        </svg>
      ),
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    },
    {
      name: "LinkedIn",
      label: "LinkedIn",
      icon: (
        <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
          <path d="M13.6 1H2.4C1.63 1 1 1.63 1 2.4v11.2c0 .77.63 1.4 1.4 1.4h11.2c.77 0 1.4-.63 1.4-1.4V2.4c0-.77-.63-1.4-1.4-1.4ZM5.34 13H3.17V6.34h2.17V13ZM4.25 5.41a1.26 1.26 0 1 1 0-2.52 1.26 1.26 0 0 1 0 2.52ZM13 13h-2.17V9.75c0-.77-.01-1.76-1.07-1.76-1.07 0-1.24.84-1.24 1.71V13H6.35V6.34h2.08v.91h.03c.29-.55 1-1.13 2.05-1.13 2.19 0 2.6 1.44 2.6 3.32V13Z" />
        </svg>
      ),
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      name: "WhatsApp",
      label: "WhatsApp",
      icon: (
        <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8.02 1C4.15 1 1 4.13 1 7.98c0 1.23.33 2.44.95 3.49L1 15l3.63-.95A7 7 0 0 0 8.02 15C11.87 15 15 11.87 15 8c0-3.87-3.13-7-6.98-7Zm3.44 9.73c-.15.42-.86.8-1.2.85-.32.05-.72.07-1.16-.07a10.6 10.6 0 0 1-1.05-.39c-1.85-.8-3.06-2.66-3.15-2.78-.1-.13-.77-1.02-.77-1.95 0-.93.49-1.38.66-1.57.17-.19.37-.23.5-.23h.36c.12 0 .28-.04.43.33.16.38.53 1.3.58 1.4.05.1.08.2.02.33-.07.12-.1.2-.2.3-.09.11-.2.25-.28.33-.1.1-.2.2-.08.39.11.19.5.83 1.08 1.34.75.66 1.37.86 1.57.96.19.1.31.08.42-.05.12-.13.5-.58.64-.78.13-.2.26-.17.44-.1.19.07 1.17.55 1.37.65.2.1.33.15.38.23.05.08.05.47-.1.9Z" />
        </svg>
      ),
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    },
    {
      name: "Email",
      label: "Email",
      icon: (
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="1.5" y="3" width="13" height="10" rx="2" />
          <path d="M1.5 5l6.5 4 6.5-4" />
        </svg>
      ),
      href: `mailto:?subject=${encodedText}&body=Check%20out%20this%20AI%20audit:%20${encodedUrl}`,
    },
  ];

  return channels;
}

export function ShareButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-surface px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-warm-200"
    >
      <ShareIcon />
      Share
    </button>
  );
}

export function ShareModal({
  open,
  onClose,
  url,
  text,
  score,
  hostname,
  personaName,
  personaAvatar,
  personaColor,
  onBackToAudit,
}: ShareMenuProps & {
  open: boolean;
  onClose: () => void;
  onBackToAudit?: () => void;
}) {
  const channels = useShareChannels(url, text, score);
  const [hasNativeShare, setHasNativeShare] = useState(false);

  useEffect(() => {
    setHasNativeShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  async function handleNativeShare() {
    try {
      await navigator.share({
        title: "Audit AI Results",
        text: score ? `${text} — Scored ${score}/100` : text,
        url,
      });
    } catch {
      // user cancelled or not supported
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 backdrop-blur-sm"
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 cursor-pointer rounded-full p-2 text-muted transition-colors hover:bg-surface hover:text-foreground"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l8 8M14 6l-8 8" />
            </svg>
          </button>

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            className="flex w-full max-w-md flex-col items-center gap-8 px-6"
          >
            {/* Score hero */}
            <div className="flex flex-col items-center gap-4">
              {personaAvatar && (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 25 }}
                  className="h-16 w-16 overflow-hidden rounded-full border-2"
                  style={{ borderColor: personaColor || "var(--border)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={personaAvatar} alt="" className="h-full w-full object-cover" />
                </motion.div>
              )}

              {score !== undefined && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 20 }}
                  className="flex flex-col items-center"
                >
                  <div className="flex items-baseline gap-1">
                    <span className="text-7xl font-bold tracking-tighter text-foreground sm:text-8xl">
                      {score}
                    </span>
                    <span className="text-2xl font-medium text-muted">/100</span>
                  </div>
                  {hostname && (
                    <p className="mt-1 text-sm text-muted">{hostname}</p>
                  )}
                </motion.div>
              )}

              <p className="text-center text-base text-muted">
                {personaName
                  ? `Audited by ${personaName}. Share the results.`
                  : "Share your audit results."}
              </p>
            </div>

            {/* Native share (mobile) */}
            {hasNativeShare && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                onClick={handleNativeShare}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-accent-secondary"
              >
                <ShareIcon size={18} />
                Share...
              </motion.button>
            )}

            {/* Share grid */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid w-full grid-cols-5 gap-3"
            >
              {channels.map((ch) => {
                const content = (
                  <div className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl bg-surface p-4 transition-colors hover:bg-warm-200">
                    <span className="text-foreground">{ch.icon}</span>
                    <span className="text-[11px] font-medium text-muted">{ch.label}</span>
                  </div>
                );

                if ("href" in ch && ch.href) {
                  return (
                    <a
                      key={ch.name}
                      href={ch.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      {content}
                    </a>
                  );
                }

                return (
                  <button
                    key={ch.name}
                    onClick={() => ch.action?.()}
                    className="block w-full text-left"
                  >
                    {content}
                  </button>
                );
              })}
            </motion.div>

            {/* Back to audit button */}
            {onBackToAudit && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                onClick={onBackToAudit}
                className="cursor-pointer rounded-xl border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface"
              >
                &larr; Back to audit
              </motion.button>
            )}

            {/* Try another */}
            <motion.a
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              href="/"
              className="text-xs text-muted transition-colors hover:text-foreground"
            >
              Audit another site
            </motion.a>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
