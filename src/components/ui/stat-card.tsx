"use client";

import { motion } from "framer-motion";

interface StatCardProps {
  label: string;
  value: string;
  active: boolean;
}

export function StatCard({ label, value, active }: StatCardProps) {
  if (!active) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 8 }}
      className="rounded-lg border border-white/10 bg-foreground/90 px-4 py-2.5 shadow-lg backdrop-blur-md"
    >
      <p className="text-[10px] font-medium uppercase tracking-wider text-white/70">{label}</p>
      <p className="mt-0.5 text-base font-bold text-white">{value}</p>
    </motion.div>
  );
}
