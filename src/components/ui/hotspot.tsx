"use client";

import { motion } from "framer-motion";

interface HotspotProps {
  x: number;
  y: number;
  label: string;
  score: number;
  active: boolean;
}

export function Hotspot({ x, y, label, score, active }: HotspotProps) {
  if (!active) return null;

  const color =
    score >= 70
      ? "rgb(34, 197, 94)"
      : score >= 40
        ? "rgb(234, 179, 8)"
        : "rgb(239, 68, 68)";

  const nearBottom = y > 75;

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
      <motion.div
        initial={{ opacity: 0, y: nearBottom ? -8 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={`glass absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium text-foreground shadow-lg ${
          nearBottom ? "bottom-8" : "top-8"
        }`}
      >
        {label}
        <span className="ml-2 font-bold" style={{ color }}>
          {score}
        </span>
      </motion.div>
    </motion.div>
  );
}
