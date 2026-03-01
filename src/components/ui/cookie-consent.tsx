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
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm"
          style={{ bottom: "max(1rem, env(safe-area-inset-bottom, 1rem))" }}
        >
          <div className="rounded-xl bg-background p-4 shadow-xl">
            <p className="text-sm text-foreground/80">
              We use cookies for analytics and to improve your experience.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={decline}
                className="cursor-pointer rounded-full bg-surface px-4 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-raised"
              >
                Decline
              </button>
              <button
                onClick={accept}
                className="cursor-pointer rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background transition-colors hover:bg-foreground/80"
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
