"use client";

import { useEffect, useState, useRef } from "react";
import type { AuditResult } from "@/lib/config";
import type { ElementPosition } from "@/lib/firecrawl";

interface Fixture {
  slug: string;
  screenshot: string | null;
  hasLocalScreenshot: boolean;
  elementPositions: ElementPosition[];
  audits: Record<string, AuditResult>;
}

export default function DebugPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState(0);
  const [persona, setPersona] = useState("ux");
  const [highlightedElem, setHighlightedElem] = useState<number | null>(null);
  const [showElements, setShowElements] = useState(false);
  const [showChapterLines, setShowChapterLines] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    fetch("/api/debug/fixtures")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setFixtures(data);
          if (data.length > 0) {
            const personas = Object.keys(data[0].audits);
            if (personas.length > 0) setPersona(personas[0]);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="flex h-screen items-center justify-center bg-neutral-950 text-white/50">Loading fixtures...</div>;
  if (error) return <div className="flex h-screen items-center justify-center bg-neutral-950 text-red-400">{error}</div>;
  if (fixtures.length === 0) return <div className="flex h-screen items-center justify-center bg-neutral-950 text-white/50">No fixtures. Run: <code className="ml-2 rounded bg-white/10 px-2 py-1">npm run capture</code></div>;

  const fixture = fixtures[selected];
  const audit = fixture.audits[persona] as AuditResult | undefined;
  const positions = fixture.elementPositions;

  return (
    <div className="flex h-screen bg-neutral-950 text-white">
      {/* Sidebar */}
      <div className="flex w-80 shrink-0 flex-col border-r border-white/10 overflow-y-auto">
        {/* Fixture selector */}
        <div className="border-b border-white/10 p-3">
          <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1">Site</label>
          <select
            className="w-full rounded bg-white/5 px-2 py-1.5 text-sm text-white/90 outline-none"
            value={selected}
            onChange={(e) => { setSelected(Number(e.target.value)); setHighlightedElem(null); }}
          >
            {fixtures.map((f, i) => (
              <option key={f.slug} value={i}>{f.slug}</option>
            ))}
          </select>
        </div>

        {/* Persona selector */}
        <div className="border-b border-white/10 p-3">
          <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1">Persona</label>
          <div className="flex gap-1">
            {Object.keys(fixture.audits).map((p) => (
              <button
                key={p}
                onClick={() => setPersona(p)}
                className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-all ${
                  p === persona ? "bg-orange-500 text-white" : "bg-white/5 text-white/50 hover:text-white/80"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="border-b border-white/10 p-3 flex gap-3">
          <label className="flex items-center gap-1.5 text-xs text-white/60 cursor-pointer">
            <input type="checkbox" checked={showChapterLines} onChange={(e) => setShowChapterLines(e.target.checked)} className="accent-orange-500" />
            Chapters
          </label>
          <label className="flex items-center gap-1.5 text-xs text-white/60 cursor-pointer">
            <input type="checkbox" checked={showElements} onChange={(e) => setShowElements(e.target.checked)} className="accent-orange-500" />
            All elements
          </label>
        </div>

        {/* Audit summary */}
        {audit && (
          <div className="border-b border-white/10 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">Score</span>
              <span className="text-lg font-bold">{audit.overallScore}</span>
            </div>
            <p className="mt-1 text-[11px] text-white/50 leading-relaxed">{audit.summary}</p>
          </div>
        )}

        {/* Hotspots list */}
        {audit && (
          <div className="border-b border-white/10 p-3">
            <h4 className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Hotspots ({audit.hotspots.length})</h4>
            {audit.hotspots.map((h, i) => {
              const elem = h.elementIndex != null ? positions[h.elementIndex] : null;
              return (
                <button
                  key={i}
                  onClick={() => setHighlightedElem(h.elementIndex ?? null)}
                  className={`mb-1 block w-full rounded px-2 py-1.5 text-left text-[11px] transition-all ${
                    highlightedElem === h.elementIndex
                      ? "bg-orange-500/20 text-orange-300"
                      : "bg-white/[0.03] text-white/70 hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{h.label}</span>
                    <span className="text-white/30">ch{h.chapter} · {h.score}/100</span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-white/30">
                    elem[{h.elementIndex ?? "?"}] x:{h.x?.toFixed(1)}% y:{h.y?.toFixed(1)}%
                    {elem && ` → "${elem.text.slice(0, 30)}"`}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Chapters list */}
        {audit && (
          <div className="border-b border-white/10 p-3">
            <h4 className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Chapters ({audit.chapters.length})</h4>
            {audit.chapters.map((ch, i) => {
              const elem = ch.elementIndex != null ? positions[ch.elementIndex] : null;
              return (
                <div key={i} className="mb-1.5 rounded bg-white/[0.03] px-2 py-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-500/20 text-[9px] font-bold text-orange-400">{i}</span>
                    <span className="font-medium text-white/80">{ch.title}</span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-white/30">
                    scrollY: {ch.scrollY?.toFixed(1)}% · elem[{ch.elementIndex ?? "?"}]
                    {elem && ` → "${elem.text.slice(0, 30)}"`}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Element positions count */}
        <div className="p-3 text-[11px] text-white/30">
          {positions.length} elements measured
        </div>
      </div>

      {/* Main: screenshot with overlays */}
      <div className="flex-1 overflow-auto bg-neutral-900" style={{ scrollbarWidth: "thin" }}>
        {fixture.screenshot ? (
          <div className="relative inline-block min-w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={fixture.screenshot}
              alt={fixture.slug}
              className="w-full"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />

            {/* Chapter scroll lines */}
            {showChapterLines && audit?.chapters.map((ch, i) => (
              <div
                key={`ch-${i}`}
                className="absolute left-0 right-0 pointer-events-none"
                style={{ top: `${ch.scrollY}%` }}
              >
                <div className="h-px bg-orange-500/40" />
                <span className="absolute left-2 -top-3 rounded bg-orange-500/80 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  Ch{i}: {ch.title}
                </span>
              </div>
            ))}

            {/* All element positions (small dots) */}
            {showElements && positions.map((p, i) => (
              <div
                key={`elem-${i}`}
                className="absolute pointer-events-none"
                style={{
                  left: `${p.xPct}%`,
                  top: `${p.yPct}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <span
                  className={`block h-1.5 w-1.5 rounded-full ${
                    highlightedElem === i ? "bg-green-400 ring-2 ring-green-400/50 h-3 w-3" : "bg-blue-400/40"
                  }`}
                />
              </div>
            ))}

            {/* Hotspot dots */}
            {audit?.hotspots.map((h, i) => (
              <div
                key={`hot-${i}`}
                className="absolute pointer-events-none"
                style={{
                  left: `${h.x}%`,
                  top: `${h.y}%`,
                  transform: "translate(-50%, -50%)",
                  zIndex: 10,
                }}
              >
                <span className="absolute -left-[10px] -top-[10px] h-6 w-6 rounded-full border border-orange-500/40" />
                <span
                  className={`block h-3 w-3 rounded-full border-2 border-white ${
                    highlightedElem === h.elementIndex ? "bg-green-400" : "bg-orange-500"
                  }`}
                  style={{ boxShadow: "0 0 8px rgba(255,107,53,.4)" }}
                />
                <span className="absolute left-4 -top-1 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-medium text-white">
                  {h.label} [{h.elementIndex}]
                </span>
              </div>
            ))}

            {/* Highlighted element */}
            {highlightedElem != null && positions[highlightedElem] && (
              <div
                className="absolute border-2 border-green-400 pointer-events-none"
                style={{
                  left: `${positions[highlightedElem].xPct - positions[highlightedElem].widthPct / 2}%`,
                  top: `${positions[highlightedElem].yPct - positions[highlightedElem].heightPct / 2}%`,
                  width: `${positions[highlightedElem].widthPct}%`,
                  height: `${positions[highlightedElem].heightPct}%`,
                  zIndex: 20,
                }}
              >
                <span className="absolute -top-5 left-0 whitespace-nowrap rounded bg-green-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  [{highlightedElem}] {positions[highlightedElem].tag} — &quot;{positions[highlightedElem].text.slice(0, 40)}&quot;
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-white/30">
            No screenshot available. Run <code className="ml-1 rounded bg-white/10 px-2 py-0.5">npm run capture</code>
          </div>
        )}
      </div>
    </div>
  );
}
