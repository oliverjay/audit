"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ease } from "@/lib/animations";

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  margin?: string;
}

export function FadeIn({ children, className, delay = 0, margin = "-60px" }: FadeInProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: margin as `${number}${"px" | "%"}` });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
