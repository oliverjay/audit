"use client";

export function SiteNav() {
  return (
    <nav
      className="sticky top-0 z-40 flex items-center justify-between px-6 h-[52px]"
      style={{
        background: "rgba(10,10,10,0.9)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <a
        href="/"
        className="text-[16px] text-white/85 tracking-[-0.02em] transition-colors hover:text-white"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        Retake
      </a>
      <div className="flex items-center gap-3">
        <a
          href="/"
          className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-medium text-white/60 transition-all duration-300 hover:text-white/90 hover:bg-white/[0.06]"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          Audit my site
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6h7m0 0L6 2.5M9.5 6 6 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>
    </nav>
  );
}
