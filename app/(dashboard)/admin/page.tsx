"use client";

import { useState, useEffect, useCallback } from "react";
import { Database, RefreshCw, Trash2, Play, Globe, Zap, Activity, Clock } from "lucide-react";

interface Stats {
  total: number;
  active: number;
  last24h: number;
  byCountry: { country: string; _count: { _all: number } }[];
}

interface AdminData {
  stats: Stats;
  jobs: { keyword: string; country: string }[];
}

interface CrawlResult { job: string; saved: number; error?: string }

export default function AdminPage() {
  const [stats, setStats]       = useState<Stats | null>(null);
  const [jobCount, setJobCount] = useState<number>(20);
  const [loading, setLoading]   = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [log, setLog]           = useState<string[]>([]);

  const [keyword, setKeyword]   = useState("");
  const [country, setCountry]   = useState("US");

  const addLog = (msg: string) => setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 49)]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/crawl");
    if (res.ok) {
      const data = await res.json() as AdminData;
      setStats(data.stats);
      if (data.jobs?.length) setJobCount(data.jobs.length);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  async function crawlSingle() {
    if (!keyword.trim()) return;
    setCrawling(true);
    addLog(`Starting crawl: "${keyword}" / ${country}…`);
    const res = await fetch("/api/admin/crawl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "crawl_single", keyword, country }),
    });
    const data = await res.json() as { saved?: number; error?: string };
    addLog(data.error ? `❌ Error: ${data.error}` : `✅ Saved ${data.saved} ads`);
    setCrawling(false);
    fetchStats();
  }

  async function crawlAll() {
    setCrawling(true);
    addLog("Starting batch crawl (10 jobs in parallel)…");
    const res = await fetch("/api/admin/crawl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "crawl_all" }),
    });
    const data = await res.json() as { totalSaved?: number; results?: CrawlResult[]; error?: string };
    if (data.error) {
      addLog(`❌ Error: ${data.error}`);
    } else {
      addLog(`✅ Batch done: ${data.totalSaved} ads saved`);
      data.results?.forEach(r => {
        addLog(`  ${r.error ? "❌" : "✓"} ${r.job}: ${r.saved} ads${r.error ? ` — ${r.error}` : ""}`);
      });
    }
    setCrawling(false);
    fetchStats();
  }

  async function cleanOld() {
    setCleaning(true);
    addLog("Cleaning old ads…");
    const res = await fetch("/api/admin/crawl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clean" }),
    });
    const data = await res.json() as { deleted?: number; error?: string };
    addLog(data.error ? `❌ Error: ${data.error}` : `✅ Deleted ${data.deleted} old ads`);
    setCleaning(false);
    fetchStats();
  }

  return (
    <div className="page-enter max-w-4xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Database size={15} style={{ color: "var(--ai-light)" }} />
          <h1 className="font-display text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>
            Admin — Data Pipeline
          </h1>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px]"
          style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-2)" }}
        >
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Ads",    value: stats?.total ?? "—",   icon: Database,  color: "#A78BFA", bg: "rgba(124,58,237,0.12)" },
          { label: "Active Ads",   value: stats?.active ?? "—",  icon: Activity,  color: "#34D399", bg: "rgba(52,211,153,0.12)" },
          { label: "Added Today",  value: stats?.last24h ?? "—", icon: Clock,     color: "#60A5FA", bg: "rgba(59,130,246,0.12)" },
          { label: "Job Configs",  value: jobCount, icon: Zap,  color: "#FCD34D", bg: "rgba(245,158,11,0.12)" },
        ].map(stat => (
          <div key={stat.label} className="kpi-card flex items-start gap-3">
            <div className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ background: stat.bg }}>
              <stat.icon size={15} style={{ color: stat.color }} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[10px] mb-0.5" style={{ color: "var(--text-3)" }}>{stat.label}</p>
              <p className="font-display text-[22px] font-bold leading-none" style={{ color: "var(--text-1)" }}>
                {loading ? "…" : stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        {/* Manual crawl */}
        <div className="rounded-[12px] p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <p className="font-display text-[13px] font-semibold mb-3" style={{ color: "var(--text-1)" }}>
            Manual Crawl
          </p>

          <div className="flex gap-2 mb-3">
            <input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && crawlSingle()}
              placeholder="keyword (e.g. skincare)"
              className="flex-1 px-3 py-2 rounded-[8px] text-[12px] outline-none"
              style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-1)" }}
            />
            <select
              value={country}
              onChange={e => setCountry(e.target.value)}
              className="px-2 py-2 rounded-[8px] text-[12px] outline-none"
              style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-2)" }}
            >
              {["US","GB","AU","CA","VN","TH","ID","PH","MY","SG"].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={crawlSingle}
              disabled={crawling || !keyword.trim()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-semibold flex-1 justify-center"
              style={{
                background: "var(--ai-soft)", border: "1px solid rgba(124,58,237,0.3)",
                color: "var(--ai-light)", opacity: (crawling || !keyword.trim()) ? 0.5 : 1,
              }}
            >
              <Play size={11} />
              Crawl Single
            </button>
            <button
              onClick={crawlAll}
              disabled={crawling}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-semibold flex-1 justify-center"
              style={{
                background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)",
                color: "#60A5FA", opacity: crawling ? 0.5 : 1,
              }}
            >
              <Zap size={11} />
              Crawl All (10 jobs)
            </button>
          </div>
        </div>

        {/* Country breakdown */}
        <div className="rounded-[12px] p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="font-display text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>
              Ads by Country
            </p>
            <button
              onClick={cleanOld}
              disabled={cleaning}
              className="flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-[11px]"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#F87171" }}
            >
              <Trash2 size={10} />
              Clean old
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1,2,3,4].map(i => <div key={i} className="skeleton h-7 rounded-[6px]" />)}
            </div>
          ) : stats?.byCountry.length ? (
            <div className="flex flex-col gap-1.5">
              {stats.byCountry.map(row => {
                const pct = Math.round((row._count._all / (stats.total || 1)) * 100);
                return (
                  <div key={row.country} className="flex items-center gap-2">
                    <Globe size={10} style={{ color: "var(--text-3)", flexShrink: 0 }} />
                    <span className="text-[11px] font-medium w-8" style={{ color: "var(--text-2)" }}>{row.country}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--ai-light)" }} />
                    </div>
                    <span className="font-data text-[11px] tabular-nums w-10 text-right" style={{ color: "var(--text-3)" }}>
                      {row._count._all}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[12px]" style={{ color: "var(--text-3)" }}>No ads in database yet.</p>
          )}
        </div>
      </div>

      {/* Activity log */}
      <div className="rounded-[12px] p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="font-display text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>
            Activity Log
          </p>
          {crawling && (
            <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--green-light)" }}>
              <span className="live-dot inline-block w-1.5 h-1.5 rounded-full" style={{ background: "var(--green-light)" }} />
              Crawling…
            </span>
          )}
        </div>
        {log.length === 0 ? (
          <p className="text-[12px]" style={{ color: "var(--text-3)" }}>No activity yet. Trigger a crawl above.</p>
        ) : (
          <div className="flex flex-col gap-1 max-h-60 overflow-y-auto no-scrollbar">
            {log.map((line, i) => (
              <p key={i} className="font-data text-[11px] leading-relaxed"
                style={{ color: line.includes("❌") ? "var(--red-light)" : line.includes("✅") ? "var(--green-light)" : "var(--text-3)" }}>
                {line}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Cron info */}
      <div className="mt-4 rounded-[10px] px-4 py-3"
        style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)" }}>
        <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
          <span style={{ color: "var(--ai-light)", fontWeight: 600 }}>Vercel Cron</span>{" "}
          — chạy tự động mỗi 8 tiếng (<code className="font-data">0 */8 * * *</code>),
          crawl 10 jobs song song, xóa ads cũ hơn 90 ngày.
          Cần set <code className="font-data">CRON_SECRET</code> trong Vercel Environment Variables.
        </p>
      </div>
    </div>
  );
}
