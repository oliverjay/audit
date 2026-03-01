"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ───

interface Stats {
  counts: Record<string, number>;
  total: number;
  activeCampaigns: number;
  recentActivity: RecentLead[];
}

interface RecentLead {
  id: number;
  email: string;
  company_name: string | null;
  website: string | null;
  state: string;
  audit_score: number | null;
  updated_at: string;
}

interface Lead {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  website: string | null;
  job_title: string | null;
  industry: string | null;
  country: string | null;
  state: string;
  audit_id: string | null;
  audit_score: number | null;
  audit_summary: string | null;
  audit_top_issue: string | null;
  audit_link: string | null;
  instantly_campaign_id: string | null;
  source: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

interface LeadDetail {
  lead: Lead;
  audit: {
    id: string;
    url: string;
    hostname: string;
    persona: string;
    score: number;
    summary: string;
    created_at: string;
    screenshot_path: string | null;
  } | null;
}

type Tab = "overview" | "leads" | "discover" | "import";

interface ApolloContact {
  id?: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  website: string;
  email: string | null;
  company: string | null;
  location: string | null;
  country: string | null;
  employees: string | null;
  linkedin: string | null;
  selected?: boolean;
}

// ─── API Helpers ───

async function apiGet(path: string) {
  const res = await fetch(path, { credentials: "include" });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiPost(path: string, body: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── State Color / Badge ───

const STATE_COLORS: Record<string, string> = {
  discovered: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  scraping: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  scraped: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  auditing: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  audited: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  emailed: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  replied: "bg-green-500/20 text-green-300 border-green-500/30",
  bounced: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
};

function StateBadge({ state }: { state: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border ${STATE_COLORS[state] ?? "bg-white/10 text-white/60 border-white/10"}`}
    >
      {state}
    </span>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-white/30">—</span>;
  const color =
    score >= 70
      ? "text-emerald-400"
      : score >= 40
        ? "text-amber-400"
        : "text-red-400";
  return <span className={`font-mono font-semibold ${color}`}>{score}</span>;
}

const COUNTRY_FLAGS: Record<string, string> = {
  "United Kingdom": "🇬🇧",
  "Australia": "🇦🇺",
  "United States": "🇺🇸",
  "Canada": "🇨🇦",
  "Germany": "🇩🇪",
};

const COUNTRY_SHORT: Record<string, string> = {
  "United Kingdom": "UK",
  "Australia": "AU",
  "United States": "US",
  "Canada": "CA",
  "Germany": "DE",
};

function CountryBadge({ country }: { country: string }) {
  const flag = COUNTRY_FLAGS[country] ?? "";
  const short = COUNTRY_SHORT[country] ?? country;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]" title={country}>
      {flag && <span>{flag}</span>}
      <span>{short}</span>
    </span>
  );
}

// ─── Login Screen ───

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiPost("/api/pipeline/auth", { password: pw });
      onLogin();
    } catch {
      setError("Invalid password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <form
        onSubmit={submit}
        className="w-full max-w-sm p-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
      >
        <div className="text-center mb-8">
          <div className="text-2xl font-semibold mb-1">Pipeline</div>
          <div className="text-sm text-[var(--muted)]">
            Agency outreach dashboard
          </div>
        </div>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Password"
          autoFocus
          className="w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border)] text-white placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)]/50 transition-colors mb-4"
        />
        {error && (
          <div className="text-red-400 text-sm mb-4 text-center">{error}</div>
        )}
        <button
          type="submit"
          disabled={loading || !pw}
          className="w-full py-3 rounded-xl bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-secondary)] transition-colors disabled:opacity-40"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

// ─── Stats Overview ───

function OverviewTab({ stats, onRefresh }: { stats: Stats | null; onRefresh: () => void }) {
  if (!stats) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--muted)]">
        Loading stats...
      </div>
    );
  }

  const funnelStages = [
    { key: "discovered", label: "Discovered", icon: "🔍" },
    { key: "audited", label: "Audited", icon: "📊" },
    { key: "emailed", label: "Emailed", icon: "📧" },
    { key: "replied", label: "Replied", icon: "💬" },
  ];

  const conversionRate = (from: string, to: string) => {
    const f = stats.counts[from] ?? 0;
    const t = stats.counts[to] ?? 0;
    if (f === 0 && t === 0) return "—";
    const total = f + t + (stats.counts.emailed ?? 0) + (stats.counts.replied ?? 0);
    if (total === 0) return "—";
    return `${Math.round((t / Math.max(total, 1)) * 100)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Funnel cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {funnelStages.map((stage) => (
          <div
            key={stage.key}
            className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
          >
            <div className="text-2xl mb-2">{stage.icon}</div>
            <div className="text-3xl font-semibold font-mono">
              {stats.counts[stage.key] ?? 0}
            </div>
            <div className="text-sm text-[var(--muted)] mt-1">
              {stage.label}
            </div>
          </div>
        ))}
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "In Progress", value: (stats.counts.scraping ?? 0) + (stats.counts.scraped ?? 0) + (stats.counts.auditing ?? 0) },
          { label: "Failed", value: stats.counts.failed ?? 0 },
          { label: "Bounced", value: stats.counts.bounced ?? 0 },
          { label: "Campaigns", value: stats.activeCampaigns },
          { label: "Total Leads", value: stats.total },
        ].map((s) => (
          <div
            key={s.label}
            className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]"
          >
            <div className="text-xl font-semibold font-mono">{s.value}</div>
            <div className="text-xs text-[var(--muted)] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Conversion funnel */}
      <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <h3 className="text-sm font-medium text-[var(--muted)] mb-4">Conversion Funnel</h3>
        <div className="flex items-center gap-2 text-sm">
          <span>Discovered</span>
          <span className="text-[var(--muted)]">→</span>
          <span className="font-mono text-[var(--accent)]">{conversionRate("discovered", "audited")}</span>
          <span className="text-[var(--muted)]">→</span>
          <span>Audited</span>
          <span className="text-[var(--muted)]">→</span>
          <span className="font-mono text-[var(--accent)]">{conversionRate("audited", "emailed")}</span>
          <span className="text-[var(--muted)]">→</span>
          <span>Emailed</span>
          <span className="text-[var(--muted)]">→</span>
          <span className="font-mono text-[var(--accent)]">{conversionRate("emailed", "replied")}</span>
          <span className="text-[var(--muted)]">→</span>
          <span>Replied</span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <h3 className="text-sm font-medium text-[var(--muted)] mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <ActionButton
            label="Run Audits"
            count={stats.counts.discovered ?? 0}
            onClick={async () => {
              const res = await apiPost("/api/pipeline", {
                action: "run-audits",
                limit: 10,
              });
              alert(res.message);
              onRefresh();
            }}
            disabled={(stats.counts.discovered ?? 0) === 0}
          />
          <ActionButton
            label="Retry Failed"
            count={stats.counts.failed ?? 0}
            onClick={async () => {
              await apiPost("/api/pipeline", { action: "retry-failed" });
              onRefresh();
            }}
            variant="warning"
            disabled={(stats.counts.failed ?? 0) === 0}
          />
        </div>
      </div>

      {/* Recent activity */}
      <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <h3 className="text-sm font-medium text-[var(--muted)] mb-4">Recent Activity</h3>
        {stats.recentActivity.length === 0 ? (
          <div className="text-[var(--muted)] text-sm py-4 text-center">
            No leads yet. Import some to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {stats.recentActivity.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-[var(--background)]/50 transition-colors"
              >
                <StateBadge state={lead.state} />
                <span className="text-sm truncate flex-1">
                  {lead.company_name || lead.email}
                </span>
                <ScoreBadge score={lead.audit_score} />
                <span className="text-xs text-[var(--muted)] tabular-nums">
                  {timeAgo(lead.updated_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  count,
  onClick,
  variant = "default",
  disabled = false,
}: {
  label: string;
  count?: number;
  onClick: () => Promise<void>;
  variant?: "default" | "warning" | "danger";
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  const colors = {
    default: "bg-white/5 hover:bg-white/10 border-white/10",
    warning: "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-400",
    danger: "bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400",
  };

  return (
    <button
      onClick={async () => {
        setLoading(true);
        try {
          await onClick();
        } finally {
          setLoading(false);
        }
      }}
      disabled={disabled || loading}
      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-30 ${colors[variant]}`}
    >
      {loading ? "..." : label}
      {count != null && count > 0 && (
        <span className="ml-1.5 opacity-60">({count})</span>
      )}
    </button>
  );
}

// ─── Leads Table ───

function LeadsTab({
  onSelectLead,
  onRefresh,
}: {
  onSelectLead: (id: number) => void;
  onRefresh: () => void;
}) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stateFilter, setStateFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchLeads = useCallback(async (p: number, state: string, country: string, q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        action: "leads",
        page: String(p),
        limit: "50",
      });
      if (state !== "all") params.set("state", state);
      if (country !== "all") params.set("country", country);
      if (q) params.set("search", q);

      const data = await apiGet(`/api/pipeline?${params}`);
      setLeads(data.leads);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error("Failed to fetch leads:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads(page, stateFilter, countryFilter, search);
  }, [page, stateFilter, countryFilter, fetchLeads, search]);

  const handleSearch = (value: string) => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 300);
  };

  const handleDelete = async (id: number) => {
    await apiPost("/api/pipeline", { action: "delete-lead", id });
    fetchLeads(page, stateFilter, countryFilter, search);
    onRefresh();
  };

  const handleReset = async (id: number) => {
    await apiPost("/api/pipeline", { action: "reset-lead", id });
    fetchLeads(page, stateFilter, countryFilter, search);
    onRefresh();
  };

  const countries = ["all", "United Kingdom", "Australia", "United States", "Canada", "Germany"];

  const states = [
    "all", "discovered", "scraping", "scraped", "auditing",
    "audited", "emailed", "replied", "bounced", "failed",
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search email, company, website..."
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-white text-sm placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)]/50 transition-colors"
        />
        <select
          value={countryFilter}
          onChange={(e) => {
            setCountryFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-white text-sm focus:outline-none appearance-none cursor-pointer"
        >
          {countries.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? "All countries" : c}
            </option>
          ))}
        </select>
        <select
          value={stateFilter}
          onChange={(e) => {
            setStateFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-white text-sm focus:outline-none appearance-none cursor-pointer"
        >
          {states.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All states" : s}
            </option>
          ))}
        </select>
      </div>

      {/* Count */}
      <div className="text-sm text-[var(--muted)]">
        {total} lead{total !== 1 ? "s" : ""}
        {countryFilter !== "all" && ` in ${countryFilter}`}
        {stateFilter !== "all" && ` in "${stateFilter}"`}
        {search && ` matching "${search}"`}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 text-[var(--muted)] font-medium">Company</th>
                <th className="text-left px-4 py-3 text-[var(--muted)] font-medium">Email</th>
                <th className="text-left px-4 py-3 text-[var(--muted)] font-medium">Website</th>
                <th className="text-left px-4 py-3 text-[var(--muted)] font-medium">Country</th>
                <th className="text-left px-4 py-3 text-[var(--muted)] font-medium">State</th>
                <th className="text-left px-4 py-3 text-[var(--muted)] font-medium">Score</th>
                <th className="text-left px-4 py-3 text-[var(--muted)] font-medium">Updated</th>
                <th className="text-right px-4 py-3 text-[var(--muted)] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[var(--muted)]">
                    Loading...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[var(--muted)]">
                    No leads found
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)]/50 transition-colors cursor-pointer"
                    onClick={() => onSelectLead(lead.id)}
                  >
                    <td className="px-4 py-3 font-medium truncate max-w-[200px]">
                      {lead.company_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)] truncate max-w-[200px]">
                      {lead.email}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)] truncate max-w-[160px]">
                      {lead.website ? (
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-[var(--accent)] transition-colors"
                        >
                          {extractHostname(lead.website)}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)] text-xs">
                      {lead.country ? (
                        <CountryBadge country={lead.country} />
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StateBadge state={lead.state} />
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={lead.audit_score} />
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)] text-xs tabular-nums">
                      {timeAgo(lead.updated_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {lead.state === "failed" && (
                          <button
                            onClick={() => handleReset(lead.id)}
                            className="px-2 py-1 text-xs rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                            title="Retry"
                          >
                            ↻
                          </button>
                        )}
                        {["scraping", "scraped", "auditing"].includes(lead.state) && (
                          <span className="px-2 py-1 text-xs text-[var(--muted)] italic">
                            processing...
                          </span>
                        )}
                        {lead.audit_link && lead.state === "audited" && (
                          <a
                            href={lead.audit_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 text-xs rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors"
                            title="View audit"
                          >
                            ↗
                          </a>
                        )}
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="px-2 py-1 text-xs rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                          title="Delete"
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--surface)] transition-colors disabled:opacity-30"
          >
            ← Previous
          </button>
          <span className="text-sm text-[var(--muted)]">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--surface)] transition-colors disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Lead Detail Panel ───

function LeadDetailPanel({
  leadId,
  onClose,
  onRefresh,
}: {
  leadId: number;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiGet(`/api/pipeline?action=lead&id=${leadId}`)
      .then(setDetail)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [leadId]);

  const handleReset = async () => {
    await apiPost("/api/pipeline", { action: "reset-lead", id: leadId });
    onRefresh();
    onClose();
  };

  const handleDelete = async () => {
    await apiPost("/api/pipeline", { action: "delete-lead", id: leadId });
    onRefresh();
    onClose();
  };

  if (loading || !detail) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div className="text-[var(--muted)]">Loading...</div>
      </div>
    );
  }

  const { lead, audit } = detail;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full max-w-lg bg-[var(--surface)] border-l border-[var(--border)] overflow-y-auto animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--surface)]">
          <div>
            <div className="font-semibold text-lg">
              {lead.company_name || lead.email}
            </div>
            <div className="text-sm text-[var(--muted)]">{lead.email}</div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-[var(--muted)]"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* State & Score */}
          <div className="flex items-center gap-4">
            <StateBadge state={lead.state} />
            {lead.audit_score != null && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--muted)]">Score:</span>
                <ScoreBadge score={lead.audit_score} />
              </div>
            )}
          </div>

          {/* Contact info */}
          <Section title="Contact">
            <InfoRow label="Email" value={lead.email} />
            <InfoRow label="Name" value={[lead.first_name, lead.last_name].filter(Boolean).join(" ") || null} />
            <InfoRow label="Company" value={lead.company_name} />
            <InfoRow label="Job Title" value={lead.job_title} />
            <InfoRow label="Country" value={lead.country ? <CountryBadge country={lead.country} /> : null} />
            <InfoRow label="Industry" value={lead.industry} />
            {lead.website && (
              <InfoRow
                label="Website"
                value={
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent)] hover:underline"
                  >
                    {extractHostname(lead.website)}
                  </a>
                }
              />
            )}
          </Section>

          {/* Audit info */}
          {audit && (
            <Section title="Audit">
              <InfoRow label="Score" value={<ScoreBadge score={audit.score} />} />
              <InfoRow label="Persona" value={audit.persona} />
              <InfoRow label="Summary" value={audit.summary} />
              <InfoRow label="Created" value={new Date(audit.created_at).toLocaleDateString()} />
              {lead.audit_link && lead.state === "audited" ? (
                <a
                  href={lead.audit_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-secondary)] transition-colors"
                >
                  View Audit ↗
                </a>
              ) : ["scraping", "scraped", "auditing"].includes(lead.state) ? (
                <div className="mt-2 text-sm text-[var(--muted)] italic">
                  Audit in progress — generating analysis and voice-over for all 3 personas...
                </div>
              ) : null}
            </Section>
          )}

          {/* Pipeline tracking */}
          <Section title="Pipeline">
            <InfoRow label="Source" value={lead.source} />
            <InfoRow label="Campaign ID" value={lead.instantly_campaign_id} />
            <InfoRow label="Top Issue" value={lead.audit_top_issue} />
            <InfoRow label="Created" value={new Date(lead.created_at).toLocaleDateString()} />
            <InfoRow label="Updated" value={timeAgo(lead.updated_at)} />
            {lead.error && (
              <div className="mt-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
                {lead.error}
              </div>
            )}
          </Section>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition-colors"
            >
              Reset to Discovered
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors"
            >
              Delete Lead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-3">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="text-[var(--muted)] w-24 shrink-0">{label}</span>
      <span className="text-white/90 break-all">{value}</span>
    </div>
  );
}

// ─── CSV Import ───

// ─── Discover Tab (Apollo.io) ───

const LOCATION_PRESETS = [
  { label: "United Kingdom", value: "United Kingdom" },
  { label: "Australia", value: "Australia" },
  { label: "United States", value: "United States" },
  { label: "Canada", value: "Canada" },
  { label: "Germany", value: "Germany" },
];

const TITLE_PRESETS = [
  "Founder",
  "CEO",
  "Owner",
  "Managing Director",
  "Creative Director",
  "CTO",
];

const INDUSTRY_PRESETS = [
  "web design",
  "web development",
  "digital agency",
  "marketing agency",
  "software development",
  "UX design",
];

const SIZE_PRESETS = [
  { label: "1-10", value: "1,10" },
  { label: "11-50", value: "11,50" },
  { label: "51-200", value: "51,200" },
  { label: "201-500", value: "201,500" },
];

function DiscoverTab({ onRefresh }: { onRefresh: () => void }) {
  const [apolloConfigured, setApolloConfigured] = useState<boolean | null>(null);
  const [contacts, setContacts] = useState<ApolloContact[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(1);
  const [searching, setSearching] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    total: number;
    skippedNoEmail: number;
  } | null>(null);
  const [error, setError] = useState("");

  // Filters
  const [selectedLocations, setSelectedLocations] = useState<string[]>([
    "United Kingdom",
    "Australia",
  ]);
  const [selectedTitles, setSelectedTitles] = useState<string[]>([
    "Founder",
    "CEO",
    "Owner",
    "Managing Director",
  ]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([
    "web design",
    "web development",
    "digital agency",
  ]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(["1,10", "11,50"]);
  const [perPage, setPerPage] = useState(25);

  // Check if Apollo is configured
  useEffect(() => {
    apiPost("/api/pipeline/discover", { action: "check-config" })
      .then((d) => setApolloConfigured(d.apolloConfigured))
      .catch(() => setApolloConfigured(false));
  }, []);

  const toggleFilter = (
    arr: string[],
    setter: (v: string[]) => void,
    value: string,
  ) => {
    setter(
      arr.includes(value) ? arr.filter((v2) => v2 !== value) : [...arr, value],
    );
  };

  const handleSearch = async (searchPage = 1) => {
    if (selectedLocations.length === 0 || selectedTitles.length === 0) {
      setError("Select at least one location and one job title");
      return;
    }
    setSearching(true);
    setError("");
    setImportResult(null);
    if (searchPage === 1) setContacts([]);
    try {
      const data = await apiPost("/api/pipeline/discover", {
        action: "search",
        titles: selectedTitles,
        locations: selectedLocations,
        industries: selectedIndustries,
        employeeRanges: selectedSizes,
        page: searchPage,
        perPage,
      });
      if (searchPage === 1) {
        setContacts(data.people.map((p: ApolloContact) => ({ ...p, selected: true })));
      } else {
        setContacts((prev) => [
          ...prev,
          ...data.people.map((p: ApolloContact) => ({ ...p, selected: true })),
        ]);
      }
      setTotalResults(data.totalResults);
      setPage(searchPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleEnrich = async () => {
    const selected = contacts.filter((c) => c.selected && !c.email && c.id);
    if (selected.length === 0) return;
    setEnriching(true);
    setError("");
    try {
      const data = await apiPost("/api/pipeline/discover", {
        action: "enrich",
        ids: selected.map((c) => c.id),
      });
      const enrichedMap = new Map(
        (data.people as ApolloContact[]).map((p) => [p.id, p]),
      );
      setContacts((prev) =>
        prev.map((c) => {
          const enriched = enrichedMap.get(c.id!);
          return enriched ? { ...c, email: enriched.email } : c;
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enrichment failed");
    } finally {
      setEnriching(false);
    }
  };

  const handleImport = async () => {
    const selected = contacts.filter((c) => c.selected && c.email);
    if (selected.length === 0) return;
    setImporting(true);
    setImportResult(null);
    try {
      const data = await apiPost("/api/pipeline/discover", {
        action: "import",
        agencies: selected,
      });
      setImportResult(data);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const toggleAll = (checked: boolean) => {
    setContacts((prev) => prev.map((c) => ({ ...c, selected: checked })));
  };

  const selectedContacts = contacts.filter((c) => c.selected);
  const withEmail = selectedContacts.filter((c) => c.email);
  const needEnrich = selectedContacts.filter((c) => !c.email && c.id);
  const totalPages = Math.ceil(totalResults / perPage);

  if (apolloConfigured === null) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--muted)]">
        Checking configuration...
      </div>
    );
  }

  if (!apolloConfigured) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-center">
          <div className="text-4xl mb-4">🔑</div>
          <h3 className="text-lg font-semibold mb-2">Apollo.io API Key Required</h3>
          <p className="text-sm text-[var(--muted)] mb-4">
            Apollo.io gives you access to 450M+ verified business contacts. Search by industry,
            location, and job title to find decision-makers at web agencies.
          </p>
          <div className="text-left space-y-3 mb-6">
            <Step n={1}>
              Sign up free at{" "}
              <a
                href="https://www.apollo.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] hover:underline"
              >
                apollo.io
              </a>{" "}
              (100 email credits/month free)
            </Step>
            <Step n={2}>
              Go to Settings → API Keys → Create a new key
            </Step>
            <Step n={3}>
              Add to your{" "}
              <code className="text-xs bg-white/5 px-1.5 py-0.5 rounded">
                .env.local
              </code>
              :
            </Step>
          </div>
          <code className="block w-full text-left px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border)] text-sm font-mono text-emerald-400 mb-4">
            APOLLO_API_KEY=your_api_key_here
          </code>
          <p className="text-xs text-[var(--muted)]">
            Then restart your dev server and refresh this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search filters */}
      <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <h3 className="text-sm font-medium text-[var(--muted)] mb-1">
          Apollo.io Lead Search
        </h3>
        <p className="text-sm text-[var(--muted)] mb-5">
          Search 450M+ contacts. Searching is free. Getting emails costs 1 credit each
          (free plan: 100/mo, Basic $49/mo: 5,000/mo).
        </p>

        {/* Locations */}
        <FilterSection label="Locations">
          {LOCATION_PRESETS.map((loc) => (
            <FilterChip
              key={loc.value}
              label={loc.label}
              active={selectedLocations.includes(loc.value)}
              onClick={() =>
                toggleFilter(selectedLocations, setSelectedLocations, loc.value)
              }
            />
          ))}
        </FilterSection>

        {/* Job Titles */}
        <FilterSection label="Job Titles (decision-makers)">
          {TITLE_PRESETS.map((t) => (
            <FilterChip
              key={t}
              label={t}
              active={selectedTitles.includes(t)}
              onClick={() => toggleFilter(selectedTitles, setSelectedTitles, t)}
            />
          ))}
        </FilterSection>

        {/* Industries */}
        <FilterSection label="Industry Keywords">
          {INDUSTRY_PRESETS.map((ind) => (
            <FilterChip
              key={ind}
              label={ind}
              active={selectedIndustries.includes(ind)}
              onClick={() =>
                toggleFilter(selectedIndustries, setSelectedIndustries, ind)
              }
            />
          ))}
        </FilterSection>

        {/* Company Size */}
        <FilterSection label="Company Size (employees)">
          {SIZE_PRESETS.map((s) => (
            <FilterChip
              key={s.value}
              label={s.label}
              active={selectedSizes.includes(s.value)}
              onClick={() =>
                toggleFilter(selectedSizes, setSelectedSizes, s.value)
              }
            />
          ))}
        </FilterSection>

        {/* Search button */}
        <div className="flex items-center gap-4 mt-5 pt-4 border-t border-[var(--border)]">
          <button
            onClick={() => handleSearch(1)}
            disabled={searching}
            className="px-6 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-secondary)] transition-colors disabled:opacity-40"
          >
            {searching ? "Searching..." : "Search Apollo"}
          </button>
          <select
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
            className="px-3 py-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-white text-sm focus:outline-none appearance-none cursor-pointer"
          >
            {[25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
            ))}
          </select>
          {totalResults > 0 && (
            <span className="text-sm text-[var(--muted)]">
              {totalResults.toLocaleString()} total matches
            </span>
          )}
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {contacts.length > 0 && (
        <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          {/* Action bar */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">
              {contacts.length} contacts loaded
              <span className="text-[var(--muted)] ml-2">
                ({selectedContacts.length} selected, {withEmail.length} with email)
              </span>
            </h3>
            <div className="flex gap-2">
              {needEnrich.length > 0 && (
                <button
                  onClick={handleEnrich}
                  disabled={enriching}
                  className="px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-medium hover:bg-cyan-500/20 transition-colors disabled:opacity-40"
                >
                  {enriching
                    ? "Getting emails..."
                    : `Get ${needEnrich.length} emails (${needEnrich.length} credits)`}
                </button>
              )}
              <button
                onClick={handleImport}
                disabled={importing || withEmail.length === 0}
                className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-medium hover:bg-[var(--accent-secondary)] transition-colors disabled:opacity-40"
              >
                {importing
                  ? "Importing..."
                  : `Import ${withEmail.length} leads`}
              </button>
            </div>
          </div>

          {importResult && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              Imported {importResult.imported} of {importResult.total} leads
              {importResult.skippedNoEmail > 0 &&
                ` (${importResult.skippedNoEmail} skipped — no email)`}
            </div>
          )}

          {/* Contacts table */}
          <div className="rounded-xl border border-[var(--border)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[var(--background)]">
                    <th className="px-3 py-2 w-8">
                      <input
                        type="checkbox"
                        checked={
                          contacts.length > 0 &&
                          contacts.every((c) => c.selected)
                        }
                        onChange={(e) => toggleAll(e.target.checked)}
                        className="accent-[var(--accent)]"
                      />
                    </th>
                    <th className="text-left px-3 py-2 text-[var(--muted)]">
                      Name
                    </th>
                    <th className="text-left px-3 py-2 text-[var(--muted)]">
                      Title
                    </th>
                    <th className="text-left px-3 py-2 text-[var(--muted)]">
                      Company
                    </th>
                    <th className="text-left px-3 py-2 text-[var(--muted)]">
                      Email
                    </th>
                    <th className="text-left px-3 py-2 text-[var(--muted)]">
                      Country
                    </th>
                    <th className="text-left px-3 py-2 text-[var(--muted)]">
                      Size
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c, i) => (
                    <tr
                      key={c.id || i}
                      className={`border-t border-[var(--border)] transition-colors ${
                        c.selected
                          ? "bg-white/[0.02]"
                          : "opacity-40"
                      }`}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={c.selected ?? false}
                          onChange={() =>
                            setContacts((prev) =>
                              prev.map((p, j) =>
                                j === i
                                  ? { ...p, selected: !p.selected }
                                  : p,
                              ),
                            )
                          }
                          className="accent-[var(--accent)]"
                        />
                      </td>
                      <td className="px-3 py-2 font-medium max-w-[140px] truncate">
                        {c.name}
                        {c.linkedin && (
                          <a
                            href={c.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1 text-blue-400 hover:text-blue-300"
                            title="LinkedIn"
                          >
                            in
                          </a>
                        )}
                      </td>
                      <td className="px-3 py-2 text-[var(--muted)] max-w-[140px] truncate">
                        {c.title || "—"}
                      </td>
                      <td className="px-3 py-2 max-w-[140px] truncate">
                        {c.company || "—"}
                        {c.website && (
                          <a
                            href={
                              c.website.startsWith("http")
                                ? c.website
                                : `https://${c.website}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1 text-[var(--muted)] hover:text-[var(--accent)] text-[10px]"
                          >
                            ↗
                          </a>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {c.email ? (
                          <span className="text-emerald-400">{c.email}</span>
                        ) : (
                          <span className="text-white/20 italic">
                            needs enrichment
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-[var(--muted)]">
                        {c.country ? <CountryBadge country={c.country} /> : "—"}
                      </td>
                      <td className="px-3 py-2 text-[var(--muted)]">
                        {c.employees || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-[var(--muted)]">
              Page {page} of {totalPages.toLocaleString()} ({totalResults.toLocaleString()} results)
            </span>
            <div className="flex gap-2">
              {page < totalPages && (
                <button
                  onClick={() => handleSearch(page + 1)}
                  disabled={searching}
                  className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm hover:bg-white/5 transition-colors disabled:opacity-40"
                >
                  {searching ? "Loading..." : "Load next page"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="text-xs text-[var(--muted)] mb-2">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
        active
          ? "border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--accent)]"
          : "border-[var(--border)] text-[var(--muted)] hover:border-white/20 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="w-6 h-6 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-medium flex items-center justify-center shrink-0">
        {n}
      </span>
      <span className="text-[var(--muted)]">{children}</span>
    </div>
  );
}

// ─── CSV Import ───

function ImportTab({ onRefresh }: { onRefresh: () => void }) {
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvText(ev.target?.result as string);
    };
    reader.readAsText(file);
  };

  const parseCsv = (text: string) => {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = values[i] || "";
      });
      return {
        email: row.email || "",
        first_name: row.first_name || row.firstname || "",
        last_name: row.last_name || row.lastname || "",
        company_name: row.company_name || row.company || "",
        website: row.website || row.url || row.domain || "",
      };
    }).filter((r) => r.email);
  };

  const handleImport = async () => {
    const leads = parseCsv(csvText);
    if (leads.length === 0) return;

    setImporting(true);
    setResult(null);
    try {
      const res = await apiPost("/api/pipeline", { action: "import-csv", leads });
      setResult(res);
      onRefresh();
    } catch (err) {
      console.error("Import failed:", err);
    } finally {
      setImporting(false);
    }
  };

  const preview = csvText ? parseCsv(csvText) : [];

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <h3 className="text-sm font-medium mb-4">Import Leads from CSV</h3>
        <p className="text-sm text-[var(--muted)] mb-4">
          Upload a CSV with columns: <code className="text-xs bg-white/5 px-1.5 py-0.5 rounded">email</code>,{" "}
          <code className="text-xs bg-white/5 px-1.5 py-0.5 rounded">first_name</code>,{" "}
          <code className="text-xs bg-white/5 px-1.5 py-0.5 rounded">last_name</code>,{" "}
          <code className="text-xs bg-white/5 px-1.5 py-0.5 rounded">company_name</code>,{" "}
          <code className="text-xs bg-white/5 px-1.5 py-0.5 rounded">website</code>
        </p>

        <div className="flex gap-3 mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFile}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--surface-raised)] transition-colors"
          >
            Choose File
          </button>
          <span className="text-sm text-[var(--muted)] self-center">or paste below</span>
        </div>

        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder="email,first_name,last_name,company_name,website&#10;john@agency.com,John,Smith,Smith Agency,smithagency.com"
          rows={8}
          className="w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border)] text-white text-sm font-mono placeholder:text-[var(--muted)]/50 focus:outline-none focus:border-[var(--accent)]/50 transition-colors resize-y"
        />
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <h3 className="text-sm font-medium mb-3">
            Preview ({preview.length} lead{preview.length !== 1 ? "s" : ""})
          </h3>
          <div className="rounded-xl border border-[var(--border)] overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[var(--background)]">
                  <th className="text-left px-3 py-2 text-[var(--muted)]">Email</th>
                  <th className="text-left px-3 py-2 text-[var(--muted)]">Name</th>
                  <th className="text-left px-3 py-2 text-[var(--muted)]">Company</th>
                  <th className="text-left px-3 py-2 text-[var(--muted)]">Website</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 10).map((r, i) => (
                  <tr key={i} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2">{r.email}</td>
                    <td className="px-3 py-2 text-[var(--muted)]">{[r.first_name, r.last_name].filter(Boolean).join(" ") || "—"}</td>
                    <td className="px-3 py-2 text-[var(--muted)]">{r.company_name || "—"}</td>
                    <td className="px-3 py-2 text-[var(--muted)]">{r.website || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 10 && (
              <div className="px-3 py-2 text-xs text-[var(--muted)] text-center border-t border-[var(--border)]">
                ...and {preview.length - 10} more
              </div>
            )}
          </div>

          <button
            onClick={handleImport}
            disabled={importing}
            className="mt-4 px-6 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-secondary)] transition-colors disabled:opacity-40"
          >
            {importing ? "Importing..." : `Import ${preview.length} Lead${preview.length !== 1 ? "s" : ""}`}
          </button>

          {result && (
            <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              Imported {result.imported} of {result.total} leads
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ───

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Main Dashboard ───

export default function PipelineDashboard() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedLead, setSelectedLead] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Check auth on mount
  useEffect(() => {
    fetch("/api/pipeline/auth", { credentials: "include" })
      .then((r) => setAuthenticated(r.ok))
      .catch(() => setAuthenticated(false));
  }, []);

  // Fetch stats
  useEffect(() => {
    if (!authenticated) return;
    apiGet("/api/pipeline?action=stats")
      .then(setStats)
      .catch((err) => {
        if (err.message === "UNAUTHORIZED") setAuthenticated(false);
      });
  }, [authenticated, refreshKey]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!authenticated) return;
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [authenticated, refresh]);

  if (authenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
    return <LoginScreen onLogin={() => setAuthenticated(true)} />;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "leads", label: "Leads" },
    { key: "discover", label: "Discover" },
    { key: "import", label: "Import" },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="font-semibold text-lg">Pipeline</div>
            <nav className="flex gap-1">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    tab === t.key
                      ? "bg-white/10 text-white"
                      : "text-[var(--muted)] hover:text-white hover:bg-white/5"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refresh}
              className="px-3 py-1.5 rounded-lg text-sm text-[var(--muted)] hover:text-white hover:bg-white/5 transition-colors"
              title="Refresh"
            >
              ↻
            </button>
            <button
              onClick={async () => {
                await fetch("/api/pipeline/auth", { method: "DELETE", credentials: "include" });
                setAuthenticated(false);
              }}
              className="px-3 py-1.5 rounded-lg text-sm text-[var(--muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {tab === "overview" && (
          <OverviewTab stats={stats} onRefresh={refresh} />
        )}
        {tab === "leads" && (
          <LeadsTab onSelectLead={setSelectedLead} onRefresh={refresh} />
        )}
        {tab === "discover" && <DiscoverTab onRefresh={refresh} />}
        {tab === "import" && <ImportTab onRefresh={refresh} />}
      </main>

      {/* Lead detail slide-over */}
      {selectedLead != null && (
        <LeadDetailPanel
          leadId={selectedLead}
          onClose={() => setSelectedLead(null)}
          onRefresh={refresh}
        />
      )}
    </div>
  );
}
