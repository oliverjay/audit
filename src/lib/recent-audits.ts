import type { Persona } from "./config";

export interface RecentAudit {
  url: string;
  hostname: string;
  persona: Persona;
  score: number;
  favicon: string | null;
  timestamp: number;
}

const STORAGE_KEY = "audit-ai-recents";
const MAX_RECENTS = 8;

export function getRecentAudits(): RecentAudit[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentAudit[];
  } catch {
    return [];
  }
}

export function saveRecentAudit(entry: RecentAudit) {
  if (typeof window === "undefined") return;
  try {
    const existing = getRecentAudits();
    const filtered = existing.filter(
      (e) => !(e.url === entry.url && e.persona === entry.persona)
    );
    const updated = [entry, ...filtered].slice(0, MAX_RECENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage full or unavailable
  }
}
