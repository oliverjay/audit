"use client";

import { motion } from "framer-motion";

interface HotspotProps {
  x: number;
  y: number;
  label: string;
  score: number;
  active: boolean;
}

export function Hotspot({ x, y, score, active }: HotspotProps) {
  if (!active) return null;

  const color =
    score >= 70
      ? "rgb(34, 197, 94)"
      : score >= 40
        ? "rgb(234, 179, 8)"
        : "rgb(239, 68, 68)";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div className="relative flex items-center justify-center">
        <span
          className="absolute h-10 w-10 rounded-full animate-pulse-ring"
          style={{ backgroundColor: color }}
        />
        <span
          className="relative h-5 w-5 rounded-full border-2 border-white shadow-lg"
          style={{ backgroundColor: color }}
        />
      </div>
    </motion.div>
  );
}
