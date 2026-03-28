"use client";

import { useEffect, useRef, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Users, TrendingUp, Database, DollarSign, Activity,
  Star, Globe, Play, Trash2, RefreshCw, Zap,
  Bell, CheckCircle, Clock, AlertCircle, Plus, Pencil, X,
  MessageSquare, ChevronDown, ChevronUp, Server, Timer,
  Search, Brain, HardDrive, ArrowRight,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface AdminStats {
  users: {
    total: number; google: number; email: number; paid: number;
    conversionRate: number;
    last30Days: { date: string; count: number }[];
  };
  subscriptions: {
    byPlan: { plan: string; status: string | null; count: number }[];
    activeTotal: number;
  };
  revenue: {
    scanPurchases: {
      totalCents: number; totalCount: number;
      byMonth: { month: string; amountCents: number; count: number }[];
    };
  };
  ads: {
    total: number; active: number;
    byCountry: { country: string; count: number }[];
    byNiche: { niche: string; count: number }[];
    last7Days: { date: string; count: number }[];
  };
  savedAds: number;
}

interface VpsStatus {
  todayRuns:         { id: string; runAt: string; schedule: string; status: string; newAds: number; updatedAds: number; errors: number; durationMs: number | null; notes: string | null }[];
  todayNewAds:       number;
  todayClassified:   number;
  totalUnclassified: number;
  totalNewToday:     number;
  totalUpdatedToday: number;
  totalErrorsToday:  number;
  nextRun:           string;
  lastRun:           { status: string; runAt: string; newAds: number; updatedAds: number; errors: number; durationMs: number | null } | null;
}

const PLAN_COLORS: Record<string, string> = {
  free:     "#6b7280",
  starter:  "#A78BFA",
  premium:  "#8b5cf6",
  business: "#ec4899",
};
const PIE_COLORS = ["#A78BFA", "#8b5cf6", "#ec4899", "#6b7280", "#34D399", "#FCD34D"];

const fmt$ = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const fmtDate = (d: string) => d.slice(5);

// ── Components ───────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, color = "#A78BFA", bg = "rgba(124,58,237,0.12)",
}: {
  icon: React.ElementType; label: string; value: string | number; sub?: string;
  color?: string; bg?: string;
}) {
  return (
    <div className="kpi-card flex items-start gap-3">
      <div className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
        <Icon size={15} style={{ color }} strokeWidth={1.8} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] mb-0.5" style={{ color: "var(--text-3)" }}>{label}</p>
        <p className="font-display text-[22px] font-bold leading-none" style={{ color: "var(--text-1)" }}>{value}</p>
        {sub && <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--text-3)" }}>{sub}</p>}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <p className="font-display text-[13px] font-semibold mb-3" style={{ color: "var(--text-1)" }}>{title}</p>
      {children}
    </div>
  );
}

function ChartTip({ active, payload, label, prefix = "" }: {
  active?: boolean; payload?: { value: number; name?: string }[]; label?: string; prefix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[8px] px-3 py-2 text-[11px] shadow-lg"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-1)" }}>
      <div className="font-medium mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i}>{p.name ?? ""}: <strong>{prefix}{p.value.toLocaleString()}</strong></div>
      ))}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [stats,   setStats]   = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  function load() {
    setLoading(true);
    fetch("/api/admin/stats")
      .then(r => r.json() as Promise<AdminStats & { error?: string }>)
      .then(d => {
        if ("error" in d && d.error) { setError(String(d.error)); return; }
        setStats(d as AdminStats);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const revenueData = (stats?.revenue.scanPurchases.byMonth ?? []).map(m => ({
    month: m.month.slice(5),
    revenue: Math.round(m.amountCents / 100),
    orders: m.count,
  }));

  const planPieData = (() => {
    const agg: Record<string, number> = {};
    for (const s of (stats?.subscriptions.byPlan ?? [])) {
      if (s.status === "cancelled" || s.status === "expired") continue;
      agg[s.plan] = (agg[s.plan] ?? 0) + s.count;
    }
    return Object.entries(agg).map(([name, value]) => ({ name, value }));
  })();

  return (
    <div className="page-enter max-w-6xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Zap size={15} style={{ color: "var(--ai-light)" }} />
          <h1 className="font-display text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>
            Admin Dashboard
          </h1>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px]"
          style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-2)" }}
        >
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── VPS Status Bar ── */}
      <VpsStatusBar />

      {/* ── Stats Section (loading / error / content) ── */}
      {loading ? (
        <div className="flex items-center justify-center h-48 gap-2" style={{ color: "var(--text-3)" }}>
          <div className="w-4 h-4 rounded-full border-2 border-[var(--ai-light)] border-t-transparent animate-spin" />
          Loading stats...
        </div>
      ) : (error || !stats) ? (
        <div className="flex items-center justify-center h-20 text-[12px] rounded-[10px] mb-4"
          style={{ color: "#F87171", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)" }}>
          ⚠ {error || "Không có dữ liệu"}
        </div>
      ) : (<>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KpiCard icon={Users}      label="Total Users"       value={stats.users.total.toLocaleString()}
          sub={`${stats.users.google} Google · ${stats.users.email} Email`} color="#A78BFA" bg="rgba(124,58,237,0.12)" />
        <KpiCard icon={Star}       label="Active Paid Users" value={stats.subscriptions.activeTotal}
          sub={`Conversion ${stats.users.conversionRate}%`} color="#34D399" bg="rgba(52,211,153,0.12)" />
        <KpiCard icon={DollarSign} label="Scan Revenue"      value={fmt$(stats.revenue.scanPurchases.totalCents)}
          sub={`${stats.revenue.scanPurchases.totalCount} orders`} color="#FCD34D" bg="rgba(245,158,11,0.12)" />
        <KpiCard icon={Database}   label="Total Ads"         value={stats.ads.total.toLocaleString()}
          sub={`${stats.ads.active.toLocaleString()} active`} color="#60A5FA" bg="rgba(59,130,246,0.12)" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard icon={Activity}   label="Paid users"         value={stats.users.paid}
          sub="starter / premium / business" color="#A78BFA" bg="rgba(124,58,237,0.12)" />
        <KpiCard icon={TrendingUp} label="Saved Ads"          value={stats.savedAds.toLocaleString()}
          sub="total saves" color="#34D399" bg="rgba(52,211,153,0.12)" />
        <KpiCard icon={Globe}      label="Markets"            value={stats.ads.byCountry.length}
          sub="countries tracked" color="#FCD34D" bg="rgba(245,158,11,0.12)" />
        <KpiCard icon={Database}   label="Niches"             value={stats.ads.byNiche.length}
          sub="niches classified" color="#60A5FA" bg="rgba(59,130,246,0.12)" />
      </div>

      {/* ── Charts row 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        <Card title="📈 New Users — 30 days">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={stats.users.last30Days} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#A78BFA" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: "var(--text-3)" }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-3)" }} allowDecimals={false} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="count" name="Users" stroke="#A78BFA" fill="url(#g1)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="💰 Revenue — 12 months">
          {revenueData.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-[12px]" style={{ color: "var(--text-3)" }}>
              No revenue yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={revenueData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--text-3)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-3)" }} />
                <Tooltip content={<ChartTip prefix="$" />} />
                <Bar dataKey="revenue" name="Revenue ($)" fill="#34D399" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* ── Charts row 2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

        <Card title="🏷️ Plan Distribution (active)">
          {planPieData.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-[12px]" style={{ color: "var(--text-3)" }}>
              No subscriptions yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={planPieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name">
                  {planPieData.map((e, i) => (
                    <Cell key={i} fill={PLAN_COLORS[e.name] ?? PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, String(n)]} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {planPieData.map((e, i) => (
              <span key={e.name} className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-2)" }}>
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: PLAN_COLORS[e.name] ?? PIE_COLORS[i % PIE_COLORS.length] }} />
                {e.name} ({e.value})
              </span>
            ))}
          </div>
        </Card>

        <Card title="🗃️ Ads scraped — 7 days">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.ads.last7Days} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: "var(--text-3)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-3)" }} allowDecimals={false} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="count" name="Ads" fill="#FCD34D" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="🔐 Sign-up method">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={[{ name: "Google", value: stats.users.google }, { name: "Email", value: stats.users.email }]}
                cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name"
              >
                <Cell fill="#A78BFA" />
                <Cell fill="#60A5FA" />
              </Pie>
              <Tooltip formatter={(v, n) => [v, String(n)]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex gap-3 mt-2">
            <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-2)" }}>
              <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" /> Google ({stats.users.google})
            </span>
            <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-2)" }}>
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Email ({stats.users.email})
            </span>
          </div>
        </Card>
      </div>

      {/* ── Tables ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        <Card title="🌍 Top countries">
          <div className="space-y-1.5">
            {stats.ads.byCountry.slice(0, 10).map((c, i) => {
              const max = stats.ads.byCountry[0]?.count ?? 1;
              return (
                <div key={c.country} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono w-4 text-right" style={{ color: "var(--text-3)" }}>#{i + 1}</span>
                  <span className="text-[11px] font-semibold w-8" style={{ color: "var(--text-2)" }}>{c.country}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.round(c.count / max * 100)}%`, background: "var(--ai-light)" }} />
                  </div>
                  <span className="text-[10px] w-12 text-right tabular-nums" style={{ color: "var(--text-3)" }}>
                    {c.count.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="🎯 Top niches">
          <div className="space-y-1.5">
            {stats.ads.byNiche.length === 0 ? (
              <p className="text-[12px]" style={{ color: "var(--text-3)" }}>No niche data</p>
            ) : stats.ads.byNiche.slice(0, 10).map((n, i) => {
              const max = stats.ads.byNiche[0]?.count ?? 1;
              return (
                <div key={n.niche} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono w-4 text-right" style={{ color: "var(--text-3)" }}>#{i + 1}</span>
                  <span className="text-[11px] flex-1 min-w-0 truncate" style={{ color: "var(--text-2)" }}>{n.niche}</span>
                  <div className="w-20 h-1.5 rounded-full overflow-hidden flex-shrink-0" style={{ background: "var(--bg-hover)" }}>
                    <div className="h-full rounded-full bg-purple-500" style={{ width: `${Math.round(n.count / max * 100)}%` }} />
                  </div>
                  <span className="text-[10px] w-12 text-right tabular-nums" style={{ color: "var(--text-3)" }}>
                    {n.count.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── Subscription detail ── */}
      <Card title="📋 Subscription Details">
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ color: "var(--text-3)" }} className="text-[10px]">
              <th className="text-left pb-2">Plan</th>
              <th className="text-left pb-2">Status</th>
              <th className="text-right pb-2">Count</th>
            </tr>
          </thead>
          <tbody>
            {stats.subscriptions.byPlan.map((s, i) => (
              <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                <td className="py-2">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                    style={{ background: `${PLAN_COLORS[s.plan] ?? "#6b7280"}22`, color: PLAN_COLORS[s.plan] ?? "var(--text-3)" }}>
                    {s.plan}
                  </span>
                </td>
                <td className="py-2" style={{ color: "var(--text-3)" }}>{s.status ?? "—"}</td>
                <td className="py-2 text-right font-semibold" style={{ color: "var(--text-1)" }}>{s.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      </>)}

      {/* ── Crawl Control ── */}
      <CrawlControl />

      {/* ── Niche Intelligence ── */}
      <NicheIntelligence />

      {/* ── Announcements ── */}
      <AnnouncementsPanel />

      {/* ── Workflow History ── */}
      <WorkflowHistory />

      {/* ── Tickets ── */}
      <TicketList />

    </div>
  );
}

// ── VPS Status Bar ────────────────────────────────────────────────────────────

function VpsStatusBar() {
  const [data,    setData]    = useState<VpsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [prevData, setPrevData] = useState<VpsStatus | null>(null);
  const [flashKeys, setFlashKeys] = useState<Set<string>>(new Set());

  function load() {
    setLoading(true);
    fetch("/api/admin/vps-status")
      .then(r => r.json() as Promise<VpsStatus>)
      .then(d => {
        setPrevData(data);
        setData(d);
        setLastRefresh(new Date());
        // Detect which stats changed for flash animation
        if (data) {
          const changed = new Set<string>();
          if (d.totalNewToday !== data.totalNewToday) changed.add("new");
          if (d.totalUpdatedToday !== data.totalUpdatedToday) changed.add("updated");
          if (d.todayClassified !== data.todayClassified) changed.add("classified");
          if (d.totalUnclassified !== data.totalUnclassified) changed.add("unclassified");
          if (changed.size > 0) {
            setFlashKeys(changed);
            setTimeout(() => setFlashKeys(new Set()), 1200);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fmtCountdown(isoStr: string) {
    const diff = new Date(isoStr).getTime() - Date.now();
    if (diff <= 0) return "now";
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  function fmtTime(isoStr: string) {
    return new Date(isoStr).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  }

  /** Progress fraction (0..1) of time elapsed between lastRun and nextRun */
  function countdownProgress(isoStr: string, lastRunIso?: string | null): number {
    const now = Date.now();
    const next = new Date(isoStr).getTime();
    if (next <= now) return 1;
    // Use 8h (interval between scheduled runs) as total window if no lastRun
    const totalWindow = lastRunIso
      ? next - new Date(lastRunIso).getTime()
      : 8 * 3_600_000;
    const elapsed = totalWindow - (next - now);
    return Math.max(0, Math.min(1, elapsed / totalWindow));
  }

  const statusColor = (s: string) =>
    s === "success" ? "#34D399" : s === "error" ? "#F87171" : "#FCD34D";

  const statusBg = (s: string) =>
    s === "success" ? "rgba(52,211,153,0.08)" : s === "error" ? "rgba(248,113,113,0.08)" : "rgba(252,211,77,0.08)";

  // Pipeline step data derived from today's runs
  const pipelineStats = (() => {
    if (!data) return null;
    const totalScraped = data.totalNewToday + data.totalUpdatedToday;
    const totalFiltered = data.todayNewAds; // ads that passed filter
    const totalClassified = data.todayClassified;
    const totalStored = totalClassified; // classified = stored
    const hasActiveRun = data.lastRun?.status === "running";
    return { totalScraped, totalFiltered, totalClassified, totalStored, hasActiveRun };
  })();

  // CSS keyframes injected once
  const pulseKeyframes = `
    @keyframes vpsPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    @keyframes vpsFlash { 0%{transform:scale(1)} 50%{transform:scale(1.08)} 100%{transform:scale(1)} }
    @keyframes vpsBreath { 0%,100%{box-shadow:0 0 0 0 rgba(124,58,237,0.3)} 50%{box-shadow:0 0 8px 2px rgba(124,58,237,0.15)} }
  `;

  return (
    <div className="rounded-[12px] p-4 mb-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <style>{pulseKeyframes}</style>

      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-[6px] flex items-center justify-center" style={{ background: "rgba(124,58,237,0.15)" }}>
            <Server size={12} style={{ color: "#A78BFA" }} />
          </div>
          <span className="font-display text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>
            VPS Job Monitor
          </span>
          {data && (
            <span className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: "rgba(52,211,153,0.1)", color: "#34D399", border: "1px solid rgba(52,211,153,0.15)" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#34D399", animation: "vpsPulse 2s ease-in-out infinite" }} />
              live · 15s
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
              {lastRefresh.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1 px-2 py-1 rounded-[6px] text-[11px]"
            style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-2)" }}
          >
            <RefreshCw size={10} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center gap-2 h-10 text-[11px]" style={{ color: "var(--text-3)" }}>
          <div className="w-3 h-3 rounded-full border-2 border-[var(--ai-light)] border-t-transparent animate-spin" />
          Loading...
        </div>
      ) : !data ? (
        <div className="text-[11px]" style={{ color: "#F87171" }}>Failed to load VPS status.</div>
      ) : (
        <>
          {/* ── Summary stats row with gradient backgrounds ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {[
              { key: "new", label: "New ads today", value: data.totalNewToday, color: "#60A5FA", gradient: "linear-gradient(135deg, rgba(96,165,250,0.12) 0%, rgba(96,165,250,0.04) 100%)" },
              { key: "updated", label: "Updated today", value: data.totalUpdatedToday, color: "#A78BFA", gradient: "linear-gradient(135deg, rgba(167,139,250,0.12) 0%, rgba(167,139,250,0.04) 100%)" },
              { key: "classified", label: "Classified today", value: data.todayClassified, color: "#34D399", gradient: "linear-gradient(135deg, rgba(52,211,153,0.12) 0%, rgba(52,211,153,0.04) 100%)", extra: data.todayNewAds },
              { key: "unclassified", label: "Unclassified total", value: data.totalUnclassified, color: data.totalUnclassified > 0 ? "#FCD34D" : "#34D399", gradient: data.totalUnclassified > 0 ? "linear-gradient(135deg, rgba(252,211,77,0.12) 0%, rgba(252,211,77,0.04) 100%)" : "linear-gradient(135deg, rgba(52,211,153,0.12) 0%, rgba(52,211,153,0.04) 100%)" },
            ].map(stat => (
              <div key={stat.key}
                className="rounded-[8px] px-3 py-2 flex flex-col gap-0.5"
                style={{
                  background: stat.gradient,
                  border: `1px solid ${stat.color}15`,
                  animation: flashKeys.has(stat.key) ? "vpsFlash 0.6s ease-out" : undefined,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px]" style={{ color: "var(--text-3)" }}>{stat.label}</span>
                  {flashKeys.has(stat.key) && (
                    <span className="text-[9px] px-1 rounded" style={{ background: `${stat.color}20`, color: stat.color }}>
                      changed
                    </span>
                  )}
                </div>
                <span className="font-display text-[18px] font-bold" style={{ color: stat.color }}>
                  {stat.value.toLocaleString()}
                  {stat.key === "classified" && (
                    <span className="text-[11px] font-normal ml-1" style={{ color: "var(--text-3)" }}>
                      / {stat.extra}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* ── Pipeline Flow Visualization ── */}
          {pipelineStats && (
            <div className="rounded-[10px] p-3 mb-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-[10px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: "var(--text-3)" }}>
                Pipeline Flow
              </div>
              <div className="flex items-center gap-1 overflow-x-auto">
                {[
                  { icon: Globe, label: "Crawl", stat: `${pipelineStats.totalScraped.toLocaleString()} scraped`, color: "#60A5FA", bg: "rgba(96,165,250,0.1)", active: pipelineStats.totalScraped > 0 },
                  { icon: Search, label: "Filter", stat: `${pipelineStats.totalFiltered.toLocaleString()} passed`, color: "#FCD34D", bg: "rgba(252,211,77,0.1)", active: pipelineStats.totalFiltered > 0 },
                  { icon: Brain, label: "Classify", stat: `${pipelineStats.totalClassified.toLocaleString()} classified`, color: "#A78BFA", bg: "rgba(167,139,250,0.1)", active: pipelineStats.totalClassified > 0 },
                  { icon: HardDrive, label: "Store", stat: `${pipelineStats.totalStored.toLocaleString()} stored`, color: "#34D399", bg: "rgba(52,211,153,0.1)", active: pipelineStats.totalStored > 0 },
                ].map((step, i, arr) => {
                  const StepIcon = step.icon;
                  return (
                    <div key={step.label} className="flex items-center gap-1" style={{ flex: "1 1 0", minWidth: 0 }}>
                      <div className="flex flex-col items-center gap-1 flex-1 min-w-0 rounded-[8px] px-2 py-2"
                        style={{
                          background: step.bg,
                          border: `1px solid ${step.color}20`,
                          animation: step.active ? "vpsBreath 3s ease-in-out infinite" : undefined,
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="relative">
                            <StepIcon size={13} style={{ color: step.color }} />
                            {step.active && (
                              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                                style={{ background: step.color, animation: "vpsPulse 2s ease-in-out infinite" }} />
                            )}
                          </div>
                          <span className="text-[11px] font-semibold" style={{ color: step.color }}>{step.label}</span>
                        </div>
                        <span className="text-[10px] truncate max-w-full" style={{ color: "var(--text-3)" }}>{step.stat}</span>
                      </div>
                      {i < arr.length - 1 && (
                        <ArrowRight size={11} className="flex-shrink-0 mx-0.5" style={{ color: "var(--text-3)", opacity: 0.4 }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Next run countdown bar ── */}
          <div className="rounded-[10px] p-3 mb-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[11px]">
                <Timer size={11} style={{ color: "#A78BFA" }} />
                <span style={{ color: "var(--text-3)" }}>Next run</span>
                <strong className="font-display" style={{ color: "var(--text-1)" }}>
                  {new Date(data.nextRun).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })} UTC
                </strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-data" style={{ color: "#A78BFA" }}>
                  {fmtCountdown(data.nextRun)}
                </span>
                {data.totalErrorsToday > 0 && (
                  <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(248,113,113,0.1)", color: "#F87171", border: "1px solid rgba(248,113,113,0.15)" }}>
                    <AlertCircle size={9} />
                    {data.totalErrorsToday} errors
                  </span>
                )}
              </div>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.round(countdownProgress(data.nextRun, data.lastRun?.runAt) * 100)}%`,
                  background: "linear-gradient(90deg, #7C3AED, #A78BFA)",
                }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[9px]" style={{ color: "var(--text-3)", opacity: 0.6 }}>
              <span>{data.lastRun ? fmtTime(data.lastRun.runAt) : "—"}</span>
              <span>{new Date(data.nextRun).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
            </div>
          </div>

          {/* ── Today's Runs - Timeline View ── */}
          {data.todayRuns.length === 0 ? (
            <div className="text-[11px] py-3 text-center rounded-[8px]" style={{ color: "var(--text-3)", background: "rgba(255,255,255,0.02)" }}>
              No jobs have run today yet. Schedules: 02:00 · 10:00 · 18:00 UTC
            </div>
          ) : (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-3)" }}>
                Today&apos;s Runs ({data.todayRuns.length})
              </div>
              <div className="flex flex-col">
                {data.todayRuns.map((run, i) => {
                  const isLast = i === data.todayRuns.length - 1;
                  const color = statusColor(run.status);
                  return (
                    <div key={run.id} className="flex gap-3">
                      {/* Timeline left: time + line */}
                      <div className="flex flex-col items-center flex-shrink-0" style={{ width: 48 }}>
                        <span className="text-[10px] font-data tabular-nums" style={{ color: "var(--text-3)" }}>
                          {fmtTime(run.runAt)}
                        </span>
                        {/* Status dot */}
                        <div className="relative my-1">
                          <div className="w-3 h-3 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}40` }} />
                          {run.status === "success" && i === 0 && (
                            <div className="absolute inset-0 w-3 h-3 rounded-full" style={{ background: color, animation: "vpsPulse 2s ease-in-out infinite" }} />
                          )}
                        </div>
                        {/* Connecting line */}
                        {!isLast && (
                          <div className="flex-1 w-0.5 rounded-full" style={{ background: color, opacity: 0.3, minHeight: 16 }} />
                        )}
                      </div>
                      {/* Timeline right: content card */}
                      <div className="flex-1 min-w-0 rounded-[8px] px-3 py-2 mb-2"
                        style={{ background: statusBg(run.status), border: `1px solid ${color}18` }}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[11px] font-semibold capitalize" style={{ color }}>{run.status}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--bg-hover)", color: "var(--text-3)" }}>
                            {run.schedule ?? "manual"}
                          </span>
                          {run.durationMs && (
                            <span className="ml-auto text-[10px] font-data" style={{ color: "var(--text-3)" }}>
                              {(run.durationMs / 1000).toFixed(1)}s
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full" style={{ background: "#60A5FA" }} />
                            <span style={{ color: "#60A5FA" }}>+{run.newAds ?? 0}</span>
                            <span style={{ color: "var(--text-3)" }}>new</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full" style={{ background: "#A78BFA" }} />
                            <span style={{ color: "#A78BFA" }}>~{run.updatedAds ?? 0}</span>
                            <span style={{ color: "var(--text-3)" }}>upd</span>
                          </span>
                          {(run.errors ?? 0) > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full" style={{ background: "#F87171" }} />
                              <span style={{ color: "#F87171" }}>{run.errors} err</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Crawl Control ─────────────────────────────────────────────────────────────

function CrawlControl() {
  const [keyword, setKeyword] = useState("");
  const [country, setCountry] = useState("US");
  const [log,     setLog]     = useState<string[]>([]);
  const [busy,    setBusy]    = useState(false);

  function addLog(msg: string) {
    setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 49)]);
  }

  async function post(body: object) {
    setBusy(true);
    addLog("Processing...");
    try {
      const r = await fetch("/api/admin/crawl", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const d = await r.json() as Record<string, unknown>;
      if (!r.ok) {
        addLog(`❌ Lỗi: ${String(d.error ?? "unknown")}`);
      } else if ((body as Record<string, unknown>).action === "clean") {
        addLog(`✅ Deleted ${String(d.deleted)} old ads.`);
      } else {
        const saved = d.saved ?? d.totalSaved ?? "?";
        addLog(`✅ Saved ${String(saved)} ads (quality filter on).`);
      }
    } catch {
      addLog("❌ Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[12px] p-4 mt-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <p className="font-display text-[13px] font-semibold mb-2" style={{ color: "var(--text-1)" }}>
        🕷️ Crawl Control (manual)
      </p>
      <div className="rounded-[8px] px-3 py-2 mb-3 text-[11px]"
        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#F87171" }}>
        Auto-cron <strong>DISABLED</strong> (CRON_DISABLED=true). Quality filter on:
        only saves ads with pageName + bodyText + image/video.
      </div>

      <div className="flex gap-2 mb-3">
        <input
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && keyword && void post({ action: "crawl_single", keyword, country })}
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
          {["US","GB","AU","CA","VN","TH","ID","PH","MY","SG","DE","FR","NL"].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={() => { if (keyword) void post({ action: "crawl_single", keyword, country }); }}
          disabled={busy || !keyword}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-semibold disabled:opacity-50"
          style={{ background: "var(--ai-soft)", border: "1px solid rgba(124,58,237,0.3)", color: "var(--ai-light)" }}
        >
          <Play size={11} /> Crawl 1 keyword
        </button>
        <button
          onClick={() => void post({ action: "crawl_all" })}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-semibold disabled:opacity-50"
          style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)", color: "#60A5FA" }}
        >
          <RefreshCw size={11} /> Crawl All (10 jobs)
        </button>
        <button
          onClick={() => void post({ action: "clean" })}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-semibold disabled:opacity-50"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#F87171" }}
        >
          <Trash2 size={11} /> Delete ads &gt;90 days
        </button>
      </div>

      {log.length > 0 && (
        <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto">
          {log.map((line, i) => (
            <p key={i} className="font-data text-[11px] leading-relaxed"
              style={{ color: line.includes("❌") ? "#F87171" : line.includes("✅") ? "#34D399" : "var(--text-3)" }}>
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Announcements Panel ───────────────────────────────────────────────────────

// ── Niche Intelligence ────────────────────────────────────────────────────────

interface NicheStats {
  distribution:    { niche: string; count: number }[];
  otherCount:      number;
  classifiedCount: number;
  normalizable:    number;
  estimatedCostUsd: number;
}

interface ReclassifyResult {
  ok:           boolean;
  action:       string;
  processed?:   number;
  updated?:     number;
  breakdown?:   Record<string, number>;
  needsConfirm?: boolean;
  willReset?:   number;
  estimatedCostUsd?: number;
}

function NicheIntelligence() {
  const [stats,        setStats]        = useState<NicheStats | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [running,      setRunning]      = useState<"normalize" | "bulk-detect" | "reclassify" | "split-migration" | null>(null);
  const [result,       setResult]       = useState<ReclassifyResult | null>(null);
  const [autoRunning,  setAutoRunning]  = useState(false);
  const [progress,     setProgress]     = useState<{ done: number; total: number } | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [splitConfirm, setSplitConfirm] = useState(false);
  const stopRef = useRef(false);

  async function doFetchStats(): Promise<NicheStats> {
    const r = await fetch("/api/admin/reclassify-niches");
    if (!r.ok) throw new Error("fetch failed");
    return r.json() as Promise<NicheStats>;
  }

  function refresh() {
    setLoading(true);
    void doFetchStats()
      .then(s => setStats(s))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  async function runAll() {
    stopRef.current = false;
    setAutoRunning(true);
    setResult(null);

    // Step 1: normalize tên cũ + invalid niches (free, nhanh)
    const s = await doFetchStats().catch(() => null);
    if (!s) { setAutoRunning(false); return; }
    setStats(s);

    if (s.normalizable > 0) {
      setRunning("normalize");
      await fetch("/api/admin/reclassify-niches", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "normalize" }),
      }).catch(() => null);
      setRunning(null);
    }

    let currentTotal = s.otherCount;
    let done = 0;
    setProgress({ done, total: currentTotal });

    // Step 2: bulk-detect loop — free, instant, uses page_categories from rawData
    setRunning("bulk-detect");
    while (!stopRef.current) {
      const r = await fetch("/api/admin/reclassify-niches", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk-detect", limit: 5000 }),
      }).catch(() => null);

      if (!r?.ok) break;
      const d = await r.json() as ReclassifyResult;
      if ((d.processed ?? 0) === 0) break;

      done += d.updated ?? 0;
      setResult(d);

      const s2 = await doFetchStats().catch(() => null);
      if (s2) {
        setStats(s2);
        currentTotal = s2.otherCount + done;
        if (s2.otherCount === 0 || (d.updated ?? 0) === 0) break;
      }
      setProgress({ done, total: currentTotal });
    }
    setRunning(null);

    // Step 3: reclassify remaining "Other" using Claude Haiku (for hard cases)
    const sAfterBulk = await doFetchStats().catch(() => null);
    if (sAfterBulk) setStats(sAfterBulk);
    if (!stopRef.current && (sAfterBulk?.otherCount ?? 0) > 0) {
      let stuckRounds = 0;
      setRunning("reclassify");

      while (!stopRef.current) {
        const r = await fetch("/api/admin/reclassify-niches", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reclassify", limit: 100 }),
        }).catch(() => null);

        if (!r?.ok) break;
        const d = await r.json() as ReclassifyResult;
        if ((d.processed ?? 0) === 0) break;

        done += d.processed ?? 0;
        setResult(d);

        if ((d.updated ?? 0) === 0) {
          stuckRounds++;
          if (stuckRounds >= 8) break;
        } else {
          stuckRounds = 0;
        }

        const s2 = await doFetchStats().catch(() => null);
        if (s2) {
          setStats(s2);
          currentTotal = s2.otherCount + done;
          if (s2.otherCount === 0) break;
        }
        setProgress({ done, total: currentTotal });

        await new Promise(res => setTimeout(res, 1500));
      }
    }

    setRunning(null);
    setAutoRunning(false);
    setProgress(null);

    // Final refresh
    const sFinal = await doFetchStats().catch(() => null);
    if (sFinal) setStats(sFinal);
  }

  function stop() { stopRef.current = true; }

  async function resetInvalid() {
    setLoading(true);
    const r = await fetch("/api/admin/reclassify-niches", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset-invalid" }),
    }).catch(() => null);
    if (r?.ok) {
      const d = await r.json() as ReclassifyResult;
      setResult(d);
    }
    refresh();
  }

  async function resetAll() {
    if (!resetConfirm) { setResetConfirm(true); return; }
    setResetConfirm(false);
    setLoading(true);
    const r = await fetch("/api/admin/reclassify-niches", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset", confirm: true }),
    }).catch(() => null);
    if (r?.ok) {
      const d = await r.json() as ReclassifyResult;
      setResult(d);
    }
    refresh();
  }

  async function runSplitMigration() {
    if (!splitConfirm) { setSplitConfirm(true); return; }
    setSplitConfirm(false);
    stopRef.current = false;
    setAutoRunning(true);
    setResult(null);
    setRunning("split-migration");

    // Loop split-by-keywords until no more ads are moved
    // (each call processes 5000 ads; touch updatedAt on unmatched → natural rotation)
    let totalUpdated = 0;
    let noProgressRounds = 0;

    while (!stopRef.current) {
      const r = await fetch("/api/admin/reclassify-niches", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "split-by-keywords", limit: 5000 }),
      }).catch(() => null);
      if (!r?.ok) break;
      const d = await r.json() as ReclassifyResult;
      if ((d.processed ?? 0) === 0) break;

      totalUpdated += d.updated ?? 0;
      setResult(d);
      const s = await doFetchStats().catch(() => null);
      if (s) setStats(s);

      if ((d.updated ?? 0) === 0) {
        noProgressRounds++;
        if (noProgressRounds >= 2) break; // 2 passes with 0 matches → done
      } else {
        noProgressRounds = 0;
      }
    }

    setRunning(null);
    setAutoRunning(false);
    refresh();
  }

  // Mount: load stats + auto-refresh mỗi 120s khi idle
  useEffect(() => {
    refresh();
    const id = setInterval(() => {
      if (!autoRunning) refresh();
    }, 120_000);
    return () => {
      clearInterval(id);
      stopRef.current = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const PIE_COLORS_10 = ["#A78BFA","#60A5FA","#F472B6","#34D399","#FCD34D","#FB923C","#38BDF8","#818CF8","#4ADE80","#94A3B8"];

  return (
    <div className="rounded-[12px] p-5 mt-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>

      {/* Header row 1: title + status badges */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <div className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: "rgba(167,139,250,0.15)" }}>
          <Database size={13} style={{ color: "#A78BFA" }} />
        </div>
        <p className="font-display text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>Niche Intelligence</p>
        {stats && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: "rgba(248,113,113,0.12)", color: "#F87171" }}>
            {stats.otherCount.toLocaleString()} unclassified
          </span>
        )}
        {!autoRunning && (
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--bg-hover)", color: "var(--text-3)" }}>
            auto-refresh 120s
          </span>
        )}
        {running && (
          <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--ai-light)" }}>
            <div className="w-3 h-3 rounded-full border-2 border-[var(--ai-light)] border-t-transparent animate-spin" />
            {running === "normalize" ? "Normalizing..." : running === "split-migration" ? "Resetting broad niches..." : running === "bulk-detect" ? "Auto-classifying..." : "AI classifying..."}
          </span>
        )}
      </div>

      {/* Header row 2: action buttons */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* Refresh */}
        <button
          onClick={refresh}
          disabled={loading || autoRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[11px] disabled:opacity-40"
          style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-2)" }}
        >
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} /> Refresh
        </button>

        {/* Reset Invalid */}
        {!autoRunning && stats && stats.normalizable > 0 && (
          <button
            onClick={() => void resetInvalid()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[11px] disabled:opacity-40"
            style={{ background: "rgba(252,211,77,0.1)", border: "1px solid rgba(252,211,77,0.25)", color: "#FCD34D" }}
          >
            Fix invalid ({stats.normalizable})
          </button>
        )}

        {/* Split Migration — two-click confirm */}
        {!autoRunning && (
          splitConfirm ? (
            <span className="flex items-center gap-1.5">
              <span className="text-[10px]" style={{ color: "var(--text-3)" }}>Reset 4 broad niches & re-classify?</span>
              <button
                onClick={() => void runSplitMigration()}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-[7px] text-[11px] font-semibold"
                style={{ background: "rgba(96,165,250,0.15)", border: "1px solid rgba(96,165,250,0.35)", color: "#60A5FA" }}
              >
                Yes, migrate
              </button>
              <button
                onClick={() => setSplitConfirm(false)}
                className="px-2.5 py-1.5 rounded-[7px] text-[11px]"
                style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-3)" }}
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              onClick={() => void runSplitMigration()}
              disabled={loading || !stats || stats.classifiedCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[11px] disabled:opacity-40"
              style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)", color: "#60A5FA" }}
            >
              Split Niches
            </button>
          )
        )}

        {/* Reset All — two-click confirm */}
        {!autoRunning && (
          resetConfirm ? (
            <span className="flex items-center gap-1.5">
              <span className="text-[10px]" style={{ color: "var(--text-3)" }}>Confirm reset all?</span>
              <button
                onClick={() => void resetAll()}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-[7px] text-[11px] font-semibold"
                style={{ background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.35)", color: "#F87171" }}
              >
                Yes, reset
              </button>
              <button
                onClick={() => setResetConfirm(false)}
                className="px-2.5 py-1.5 rounded-[7px] text-[11px]"
                style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-3)" }}
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              onClick={() => void resetAll()}
              disabled={loading || !stats || stats.classifiedCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[11px] disabled:opacity-40"
              style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#F87171" }}
            >
              <Trash2 size={10} /> Reset All
            </button>
          )
        )}

        <div className="ml-auto flex items-center gap-2">
          {autoRunning ? (
            <button
              onClick={stop}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[11px] font-semibold"
              style={{ background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)", color: "#F87171" }}
            >
              ⏹ Stop
            </button>
          ) : (
            <button
              onClick={() => void runAll()}
              disabled={loading || !stats || stats.otherCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[11px] font-semibold disabled:opacity-40"
              style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", color: "#A78BFA" }}
            >
              <Zap size={11} /> Run All ({stats?.otherCount.toLocaleString() ?? "…"})
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {progress && (
        <div className="mb-4">
          <div className="flex justify-between text-[10px] mb-1" style={{ color: "var(--text-3)" }}>
            <span>Processed {progress.done.toLocaleString()} / {progress.total.toLocaleString()}</span>
            <span>{Math.min(100, Math.round(progress.done / Math.max(progress.total, 1) * 100))}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.round(progress.done / Math.max(progress.total, 1) * 100))}%`,
                background: "linear-gradient(90deg, #A78BFA, #60A5FA)",
              }}
            />
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !stats && <div className="h-20 skeleton rounded-[8px]" />}

      {/* Stats + distribution */}
      {stats && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: "Unclassified", value: stats.otherCount.toLocaleString(), color: "#F87171" },
              { label: "Classified", value: stats.classifiedCount.toLocaleString(), color: "#34D399" },
              { label: "Needs fix", value: stats.normalizable.toLocaleString(), color: "#FCD34D" },
              { label: "Est. cost remaining", value: `$${stats.estimatedCostUsd}`, color: "#60A5FA" },
            ].map(k => (
              <div key={k.label} className="rounded-[10px] p-3"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
                <p className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: "var(--text-3)" }}>{k.label}</p>
                <p className="font-display text-[20px] font-bold" style={{ color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Distribution chart */}
          <div className="mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-3)" }}>
              Niche Distribution
            </p>
            <div className="flex flex-col gap-1.5">
              {stats.distribution.slice(0, 12).map((d, i) => {
                const totalCount = stats.distribution.reduce((s, x) => s + x.count, 0);
                const pct   = totalCount > 0 ? (d.count / totalCount) * 100 : 0;
                const color = PIE_COLORS_10[i % PIE_COLORS_10.length];
                return (
                  <div key={d.niche} className="flex items-center gap-2">
                    <span className="text-[10px] w-36 truncate flex-shrink-0" style={{ color: "var(--text-2)" }}>{d.niche}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 0.5)}%`, background: color }} />
                    </div>
                    <span className="text-[10px] font-data w-16 text-right flex-shrink-0" style={{ color: "var(--text-3)" }}>
                      {d.count.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Last action result */}
          {result && (
            <div className="p-3 rounded-[10px] mt-2"
              style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)" }}>
              <p className="text-[11px] font-semibold mb-2" style={{ color: "#34D399" }}>
                ✓ {result.action === "normalize" ? "Normalized" :
                   result.action === "reset" ? "Reset all" :
                   result.action === "reset-invalid" ? "Fixed invalid" : "Reclassified"}{" "}
                {result.updated?.toLocaleString()} ads
                {result.processed ? ` (of ${result.processed} processed)` : ""}
              </p>
              {result.breakdown && Object.keys(result.breakdown).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(result.breakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([niche, count]) => (
                      <span key={niche} className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: "rgba(52,211,153,0.12)", color: "#34D399", border: "1px solid rgba(52,211,153,0.2)" }}>
                        {niche}: {count}
                      </span>
                    ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface AnnouncementItem {
  id: string; message: string; color: string;
  isActive: boolean; link: string | null; linkText: string | null;
  expiresAt: string | null; createdAt: string;
}

const COLORS = ["purple", "blue", "green", "red", "yellow"] as const;
const COLOR_LABELS: Record<string, string> = {
  purple: "#A78BFA", blue: "#60A5FA", green: "#34D399", red: "#F87171", yellow: "#FCD34D",
};

function AnnouncementsPanel() {
  const [list,    setList]    = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState({ message: "", color: "purple", link: "", linkText: "", expiresAt: "" });
  const [saving,  setSaving]  = useState(false);
  const [editId,  setEditId]  = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/admin/announcements");
    setList(await r.json() as AnnouncementItem[]);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function submit() {
    if (!form.message.trim()) return;
    setSaving(true);
    const url    = editId ? `/api/admin/announcements/${editId}` : "/api/admin/announcements";
    const method = editId ? "PATCH" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setForm({ message: "", color: "purple", link: "", linkText: "", expiresAt: "" });
    setEditId(null);
    setSaving(false);
    void load();
  }

  async function toggle(item: AnnouncementItem) {
    await fetch(`/api/admin/announcements/${item.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive }),
    });
    void load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this announcement?")) return;
    await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
    void load();
  }

  function startEdit(item: AnnouncementItem) {
    setEditId(item.id);
    setForm({ message: item.message, color: item.color, link: item.link ?? "", linkText: item.linkText ?? "", expiresAt: item.expiresAt ? item.expiresAt.slice(0, 16) : "" });
  }

  return (
    <div className="rounded-[12px] p-4 mt-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 mb-3">
        <Bell size={13} style={{ color: "var(--ai-light)" }} />
        <p className="font-display text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>
          Announcements (banner home page)
        </p>
      </div>

      {/* Form tạo / sửa */}
      <div className="rounded-[8px] p-3 mb-3 flex flex-col gap-2" style={{ background: "var(--bg-hover)", border: "1px solid var(--border)" }}>
        <input
          value={form.message}
          onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
          placeholder="Announcement content..."
          className="w-full px-2.5 py-2 rounded-[6px] text-[12px] outline-none"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-1)" }}
        />
        <div className="flex gap-2 flex-wrap">
          <select
            value={form.color}
            onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
            className="px-2 py-1.5 rounded-[6px] text-[12px] outline-none"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: COLOR_LABELS[form.color] }}
          >
            {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            value={form.link}
            onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
            placeholder="Link (optional)"
            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-[6px] text-[12px] outline-none"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-1)" }}
          />
          <input
            value={form.linkText}
            onChange={e => setForm(f => ({ ...f, linkText: e.target.value }))}
            placeholder="Link text"
            className="w-24 px-2.5 py-1.5 rounded-[6px] text-[12px] outline-none"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-1)" }}
          />
          <input
            type="datetime-local"
            value={form.expiresAt}
            onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
            className="px-2.5 py-1.5 rounded-[6px] text-[12px] outline-none"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-2)" }}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void submit()}
            disabled={saving || !form.message.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[12px] font-semibold disabled:opacity-50"
            style={{ background: "var(--ai-soft)", border: "1px solid rgba(124,58,237,0.3)", color: "var(--ai-light)" }}
          >
            <Plus size={11} /> {editId ? "Update" : "Add"}
          </button>
          {editId && (
            <button
              onClick={() => { setEditId(null); setForm({ message: "", color: "purple", link: "", linkText: "", expiresAt: "" }); }}
              className="px-3 py-1.5 rounded-[6px] text-[12px]"
              style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-3)" }}
            >
              Hủy
            </button>
          )}
        </div>
      </div>

      {/* Danh sách */}
      {loading ? (
        <p className="text-[12px]" style={{ color: "var(--text-3)" }}>Loading...</p>
      ) : list.length === 0 ? (
        <p className="text-[12px]" style={{ color: "var(--text-3)" }}>No announcements yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map(item => (
            <div key={item.id} className="flex items-start gap-2 rounded-[8px] px-3 py-2"
              style={{ background: "var(--bg-hover)", border: `1px solid ${COLOR_LABELS[item.color] ?? "#A78BFA"}40` }}>
              <div
                className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                style={{ background: COLOR_LABELS[item.color] ?? "#A78BFA", opacity: item.isActive ? 1 : 0.3 }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] truncate" style={{ color: item.isActive ? "var(--text-1)" : "var(--text-3)" }}>
                  {item.message}
                </p>
                {item.link && (
                  <p className="text-[10px] truncate" style={{ color: "var(--text-3)" }}>
                    → {item.link} {item.linkText && `(${item.linkText})`}
                  </p>
                )}
                {item.expiresAt && (
                  <p className="text-[10px]" style={{ color: "var(--text-3)" }}>
                    Hết hạn: {new Date(item.expiresAt).toLocaleDateString("vi-VN")}
                  </p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => void toggle(item)} title={item.isActive ? "Tắt" : "Bật"}
                  className="p-1 rounded hover:opacity-80 transition-opacity"
                  style={{ color: item.isActive ? "#34D399" : "var(--text-3)" }}>
                  <CheckCircle size={13} />
                </button>
                <button onClick={() => startEdit(item)} title="Edit"
                  className="p-1 rounded hover:opacity-80 transition-opacity"
                  style={{ color: "var(--text-3)" }}>
                  <Pencil size={13} />
                </button>
                <button onClick={() => void remove(item.id)} title="Delete"
                  className="p-1 rounded hover:opacity-80 transition-opacity"
                  style={{ color: "#F87171" }}>
                  <X size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Workflow History ──────────────────────────────────────────────────────────

interface WorkflowRunItem {
  id: string; runAt: string; schedule: string | null; status: string;
  totalAds: number; newAds: number; updatedAds: number; errors: number;
  durationMs: number | null; notes: string | null;
}

const STATUS_STYLE: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  success: { color: "#34D399", bg: "rgba(52,211,153,0.08)", icon: CheckCircle },
  error:   { color: "#F87171", bg: "rgba(248,113,113,0.08)", icon: AlertCircle },
  partial: { color: "#FCD34D", bg: "rgba(252,211,77,0.08)", icon: AlertCircle },
};

function WorkflowHistory() {
  const [runs,    setRuns]    = useState<WorkflowRunItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open,    setOpen]    = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/admin/workflow-runs?limit=20")
      .then(r => r.json() as Promise<WorkflowRunItem[]>)
      .then(d => { setRuns(Array.isArray(d) ? d : []); setLastRefresh(new Date()); })
      .catch(() => null)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute summary metrics
  const metrics = (() => {
    if (runs.length === 0) return null;
    const successCount = runs.filter(r => r.status === "success").length;
    const successRate = Math.round((successCount / runs.length) * 100);
    const durations = runs.filter(r => r.durationMs != null).map(r => r.durationMs!);
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 1000) : 0;
    const totalAds = runs.reduce((s, r) => s + r.totalAds, 0);
    const totalNew = runs.reduce((s, r) => s + r.newAds, 0);
    return { successRate, successCount, avgDuration, totalRuns: runs.length, totalAds, totalNew };
  })();

  // Max duration for proportional bar width
  const maxDuration = Math.max(...runs.filter(r => r.durationMs != null).map(r => r.durationMs!), 1);

  return (
    <div className="rounded-[12px] p-4 mt-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <button className="flex items-center gap-2" onClick={() => setOpen(o => !o)}>
          <div className="w-6 h-6 rounded-[6px] flex items-center justify-center" style={{ background: "rgba(124,58,237,0.15)" }}>
            <Clock size={12} style={{ color: "#A78BFA" }} />
          </div>
          <div>
            <p className="font-display text-[13px] font-semibold text-left" style={{ color: "var(--text-1)" }}>
              Workflow History
            </p>
            <p className="text-[10px]" style={{ color: "var(--text-3)" }}>
              Schedule: 02:00 · 10:00 · 18:00 UTC
            </p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: "rgba(52,211,153,0.1)", color: "#34D399", border: "1px solid rgba(52,211,153,0.15)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#34D399", animation: "vpsPulse 2s ease-in-out infinite" }} />
            30s
          </span>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1 px-2 py-1 rounded-[6px] text-[11px]"
            style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-2)" }}
          >
            <RefreshCw size={10} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setOpen(o => !o)}>
            {open ? <ChevronUp size={13} style={{ color: "var(--text-3)" }} /> : <ChevronDown size={13} style={{ color: "var(--text-3)" }} />}
          </button>
        </div>
      </div>

      {open && (
        <>
          {/* ── Summary Metrics Row ── */}
          {metrics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 mb-3">
              {/* Success Rate */}
              <div className="rounded-[8px] px-3 py-2 flex items-center gap-2.5"
                style={{ background: "linear-gradient(135deg, rgba(52,211,153,0.1) 0%, rgba(52,211,153,0.03) 100%)", border: "1px solid rgba(52,211,153,0.12)" }}>
                <div className="relative flex-shrink-0" style={{ width: 32, height: 32 }}>
                  <svg viewBox="0 0 36 36" style={{ width: 32, height: 32, transform: "rotate(-90deg)" }}>
                    <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#34D399" strokeWidth="3"
                      strokeDasharray={`${metrics.successRate * 0.88} 88`}
                      strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold" style={{ color: "#34D399" }}>
                    {metrics.successRate}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] block" style={{ color: "var(--text-3)" }}>Success Rate</span>
                  <span className="text-[12px] font-semibold" style={{ color: "#34D399" }}>{metrics.successCount}/{metrics.totalRuns}</span>
                </div>
              </div>

              {/* Avg Duration */}
              <div className="rounded-[8px] px-3 py-2"
                style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.1) 0%, rgba(167,139,250,0.03) 100%)", border: "1px solid rgba(167,139,250,0.12)" }}>
                <span className="text-[10px] block" style={{ color: "var(--text-3)" }}>Avg Duration</span>
                <span className="font-display text-[18px] font-bold" style={{ color: "#A78BFA" }}>
                  {metrics.avgDuration}s
                </span>
              </div>

              {/* Total Runs */}
              <div className="rounded-[8px] px-3 py-2"
                style={{ background: "linear-gradient(135deg, rgba(96,165,250,0.1) 0%, rgba(96,165,250,0.03) 100%)", border: "1px solid rgba(96,165,250,0.12)" }}>
                <span className="text-[10px] block" style={{ color: "var(--text-3)" }}>Total Runs</span>
                <span className="font-display text-[18px] font-bold" style={{ color: "#60A5FA" }}>
                  {metrics.totalRuns}
                </span>
              </div>

              {/* Total Ads Processed */}
              <div className="rounded-[8px] px-3 py-2"
                style={{ background: "linear-gradient(135deg, rgba(252,211,77,0.1) 0%, rgba(252,211,77,0.03) 100%)", border: "1px solid rgba(252,211,77,0.12)" }}>
                <span className="text-[10px] block" style={{ color: "var(--text-3)" }}>Ads Processed</span>
                <span className="font-display text-[18px] font-bold" style={{ color: "#FCD34D" }}>
                  {metrics.totalAds.toLocaleString()}
                </span>
                <span className="text-[10px] block" style={{ color: "var(--text-3)" }}>
                  +{metrics.totalNew.toLocaleString()} new
                </span>
              </div>
            </div>
          )}

          {/* ── Run Cards Grid ── */}
          {loading && runs.length === 0 ? (
            <div className="flex items-center gap-2 h-10 text-[11px]" style={{ color: "var(--text-3)" }}>
              <div className="w-3 h-3 rounded-full border-2 border-[var(--ai-light)] border-t-transparent animate-spin" />
              Loading...
            </div>
          ) : runs.length === 0 ? (
            <div className="rounded-[8px] px-3 py-3 text-[12px]"
              style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-3)" }}>
              No runs yet. VPS scraper should call <code className="text-[11px]">/api/workflow-run</code> after each job.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {runs.map(run => {
                const style = STATUS_STYLE[run.status] ?? STATUS_STYLE.error;
                const Icon = style.icon;
                const durationPct = run.durationMs != null ? Math.max(8, Math.round((run.durationMs / maxDuration) * 100)) : 0;
                return (
                  <div key={run.id} className="rounded-[10px] overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderLeft: `3px solid ${style.color}` }}>
                    {/* Card Header */}
                    <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-data tabular-nums" style={{ color: "var(--text-2)" }}>
                          {new Date(run.runAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded"
                          style={{ background: "var(--bg-hover)", color: "var(--text-3)" }}>
                          {run.schedule ?? "manual"}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                          style={{ background: style.bg, color: style.color }}>
                          <Icon size={9} /> {run.status}
                        </span>
                      </div>
                    </div>

                    {/* Card Body: 2x2 stats grid */}
                    <div className="grid grid-cols-2 gap-1.5 px-3 py-2">
                      <div className="rounded-[6px] px-2 py-1.5" style={{ background: "rgba(255,255,255,0.03)" }}>
                        <span className="text-[9px] block" style={{ color: "var(--text-3)" }}>Total</span>
                        <span className="text-[14px] font-bold font-display" style={{ color: "var(--text-1)" }}>
                          {run.totalAds.toLocaleString()}
                        </span>
                      </div>
                      <div className="rounded-[6px] px-2 py-1.5" style={{ background: "rgba(52,211,153,0.05)" }}>
                        <span className="text-[9px] block" style={{ color: "var(--text-3)" }}>New</span>
                        <span className="text-[14px] font-bold font-display" style={{ color: "#34D399" }}>
                          +{run.newAds.toLocaleString()}
                        </span>
                      </div>
                      <div className="rounded-[6px] px-2 py-1.5" style={{ background: "rgba(96,165,250,0.05)" }}>
                        <span className="text-[9px] block" style={{ color: "var(--text-3)" }}>Updated</span>
                        <span className="text-[14px] font-bold font-display" style={{ color: "#60A5FA" }}>
                          {run.updatedAds.toLocaleString()}
                        </span>
                      </div>
                      <div className="rounded-[6px] px-2 py-1.5" style={{ background: run.errors > 0 ? "rgba(248,113,113,0.05)" : "rgba(255,255,255,0.03)" }}>
                        <span className="text-[9px] block" style={{ color: "var(--text-3)" }}>Errors</span>
                        <span className="text-[14px] font-bold font-display" style={{ color: run.errors > 0 ? "#F87171" : "var(--text-3)" }}>
                          {run.errors}
                        </span>
                      </div>
                    </div>

                    {/* Card Footer: duration bar */}
                    <div className="px-3 pb-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px]" style={{ color: "var(--text-3)" }}>Duration</span>
                        <span className="text-[10px] font-data tabular-nums" style={{ color: "var(--text-3)" }}>
                          {run.durationMs != null ? `${Math.round(run.durationMs / 1000)}s` : "—"}
                        </span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${durationPct}%`, background: `linear-gradient(90deg, ${style.color}80, ${style.color})` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Ticket List ───────────────────────────────────────────────────────────────

interface TicketItem {
  id: string; subject: string; body: string; status: string; priority: string;
  reply: string | null; createdAt: string;
  user: { id: string; name: string | null; email: string | null; image: string | null };
}

const TICKET_STATUS_COLORS: Record<string, string> = {
  open:        "#F87171",
  in_progress: "#FCD34D",
  resolved:    "#34D399",
  closed:      "#6b7280",
};
const PRIORITY_COLORS: Record<string, string> = {
  low: "#6b7280", normal: "#60A5FA", high: "#FCD34D", urgent: "#F87171",
};

function TicketList() {
  const [tickets,  setTickets]  = useState<TicketItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("open");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reply,    setReply]    = useState("");
  const [saving,   setSaving]   = useState(false);

  async function load(status: string) {
    setLoading(true);
    const q = status === "all" ? "" : `?status=${status}`;
    const r  = await fetch(`/api/admin/tickets${q}`);
    setTickets(await r.json() as TicketItem[]);
    setLoading(false);
  }

  useEffect(() => { void load(filter); }, [filter]);

  async function sendReply(id: string, status: string) {
    setSaving(true);
    await fetch(`/api/admin/tickets/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ reply, status }),
    });
    setSaving(false);
    setReply("");
    setExpanded(null);
    void load(filter);
  }

  const STATUSES = ["open", "in_progress", "resolved", "closed", "all"];

  return (
    <div className="rounded-[12px] p-4 mt-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={13} style={{ color: "var(--ai-light)" }} />
          <p className="font-display text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>
            Support Tickets
          </p>
        </div>
        <div className="flex gap-1">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="px-2.5 py-1 rounded-[6px] text-[10px] font-semibold capitalize"
              style={filter === s
                ? { background: "var(--ai-soft)", color: "var(--ai-light)", border: "1px solid rgba(124,58,237,0.3)" }
                : { background: "var(--bg-hover)", color: "var(--text-3)", border: "1px solid var(--border)" }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-[12px]" style={{ color: "var(--text-3)" }}>Loading...</p>
      ) : tickets.length === 0 ? (
        <p className="text-[12px]" style={{ color: "var(--text-3)" }}>Không có ticket nào.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {tickets.map(ticket => (
            <div key={ticket.id} className="rounded-[8px] overflow-hidden"
              style={{ border: "1px solid var(--border)" }}>
              {/* Header row */}
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:opacity-90"
                style={{ background: "var(--bg-hover)" }}
                onClick={() => setExpanded(e => e === ticket.id ? null : ticket.id)}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: TICKET_STATUS_COLORS[ticket.status] ?? "#6b7280" }} />
                <span className="flex-1 min-w-0">
                  <span className="text-[12px] font-semibold block truncate" style={{ color: "var(--text-1)" }}>
                    {ticket.subject}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
                    {ticket.user.name ?? ticket.user.email} · {new Date(ticket.createdAt).toLocaleDateString("vi-VN")}
                  </span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0"
                  style={{ background: `${PRIORITY_COLORS[ticket.priority] ?? "#6b7280"}22`, color: PRIORITY_COLORS[ticket.priority] ?? "var(--text-3)" }}>
                  {ticket.priority}
                </span>
                {expanded === ticket.id
                  ? <ChevronUp size={12} style={{ color: "var(--text-3)", flexShrink: 0 }} />
                  : <ChevronDown size={12} style={{ color: "var(--text-3)", flexShrink: 0 }} />
                }
              </button>

              {/* Expanded detail */}
              {expanded === ticket.id && (
                <div className="px-3 pb-3 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                  <p className="text-[12px] mb-3 whitespace-pre-wrap leading-relaxed" style={{ color: "var(--text-2)" }}>
                    {ticket.body}
                  </p>
                  {ticket.reply && (
                    <div className="rounded-[6px] px-3 py-2 mb-3 text-[12px]"
                      style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", color: "#6ee7b7" }}>
                      <strong>Replied:</strong> {ticket.reply}
                    </div>
                  )}
                  <textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    placeholder="Enter reply..."
                    rows={3}
                    className="w-full px-2.5 py-2 rounded-[6px] text-[12px] outline-none resize-none mb-2"
                    style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-1)" }}
                  />
                  <div className="flex gap-2">
                    {["open","in_progress","resolved","closed"].map(s => (
                      <button
                        key={s}
                        onClick={() => void sendReply(ticket.id, s)}
                        disabled={saving}
                        className="px-2.5 py-1.5 rounded-[6px] text-[11px] font-semibold disabled:opacity-50 capitalize"
                        style={{
                          background: ticket.status === s ? `${TICKET_STATUS_COLORS[s]}22` : "var(--bg-hover)",
                          border: `1px solid ${TICKET_STATUS_COLORS[s] ?? "var(--border)"}`,
                          color: TICKET_STATUS_COLORS[s] ?? "var(--text-3)",
                        }}
                      >
                        {s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
