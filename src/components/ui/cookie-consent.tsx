"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

function safeGetItem(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeSetItem(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* quota or private browsing */ }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = safeGetItem("cookie-consent");
    if (!dismissed) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  function accept() {
    safeSetItem("cookie-consent", "accepted");
    setVisible(false);
  }

  function decline() {
    safeSetItem("cookie-consent", "declined");
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="glass fixed bottom-0 left-0 right-0 z-50 border-t border-glass-border px-6 py-4"
        >
          <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-muted">
              We use cookies for analytics and to improve your experience.
            </p>
            <div className="flex gap-2">
              <button
                onClick={decline}
                className="cursor-pointer rounded-full border border-border px-4 py-2 text-xs font-medium text-muted transition-colors hover:bg-surface"
              >
                Decline
              </button>
              <button
                onClick={accept}
                className="cursor-pointer rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background transition-colors hover:bg-foreground/80"
              >
                Accept
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
