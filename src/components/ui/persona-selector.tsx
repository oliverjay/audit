"use client";

import { motion } from "framer-motion";
import type { Persona } from "@/lib/config";
import { personaMeta } from "@/lib/config";

interface PersonaSelectorProps {
  selected: Persona;
  onSelect: (persona: Persona) => void;
}

const personaIds: Persona[] = ["ux", "cro", "roast"];

export function PersonaSelector({ selected, onSelect }: PersonaSelectorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.6 }}
      className="flex w-full max-w-xl justify-center gap-6 sm:gap-10"
    >
      {personaIds.map((id) => {
        const meta = personaMeta[id];
        const isSelected = selected === id;
        return (
          <motion.button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.95 }}
            className="flex cursor-pointer flex-col items-center gap-3"
          >
            {/* Avatar */}
            <div className="relative">
              <motion.div
                animate={isSelected ? { scale: 1 } : { scale: 0.88 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`relative h-20 w-20 overflow-hidden rounded-full border-[3px] transition-colors duration-200 sm:h-24 sm:w-24 ${
                  isSelected ? "border-accent" : "border-border"
                }`}
                style={isSelected ? { borderColor: meta.color } : undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={meta.avatar}
                  alt={meta.name}
                  className="h-full w-full object-cover"
                />
              </motion.div>
              {/* Active indicator dot */}
              {isSelected && (
                <motion.span
                  layoutId="persona-dot"
                  className="absolute -bottom-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-background"
                  style={{ backgroundColor: meta.color }}
                />
              )}
            </div>

            {/* Name & title */}
            <div className="text-center">
              <p
                className={`text-sm font-semibold transition-colors ${
                  isSelected ? "text-foreground" : "text-muted"
                }`}
              >
                {meta.name}
              </p>
              <p className="text-xs text-muted">{meta.title}</p>
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
