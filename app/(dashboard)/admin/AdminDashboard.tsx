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

  function load() {
    setLoading(true);
    fetch("/api/admin/vps-status")
      .then(r => r.json() as Promise<VpsStatus>)
      .then(d => { setData(d); setLastRefresh(new Date()); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
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

  const statusColor = (s: string) =>
    s === "success" ? "#34D399" : s === "error" ? "#F87171" : "#FCD34D";

  const statusBg = (s: string) =>
    s === "success" ? "rgba(52,211,153,0.1)" : s === "error" ? "rgba(248,113,113,0.1)" : "rgba(252,211,77,0.1)";

  return (
    <div className="rounded-[12px] p-4 mb-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Server size={13} style={{ color: "var(--ai-light)" }} />
          <span className="font-display text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>
            VPS Job Monitor
          </span>
          {data && (
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--bg-hover)", color: "var(--text-3)" }}>
              auto-refresh 60s
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
          {/* ── Summary stats row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <div className="rounded-[8px] px-3 py-2 flex flex-col gap-0.5" style={{ background: "var(--bg-hover)" }}>
              <span className="text-[10px]" style={{ color: "var(--text-3)" }}>New ads today</span>
              <span className="font-display text-[18px] font-bold" style={{ color: "#60A5FA" }}>
                {data.totalNewToday.toLocaleString()}
              </span>
            </div>
            <div className="rounded-[8px] px-3 py-2 flex flex-col gap-0.5" style={{ background: "var(--bg-hover)" }}>
              <span className="text-[10px]" style={{ color: "var(--text-3)" }}>Updated today</span>
              <span className="font-display text-[18px] font-bold" style={{ color: "#A78BFA" }}>
                {data.totalUpdatedToday.toLocaleString()}
              </span>
            </div>
            <div className="rounded-[8px] px-3 py-2 flex flex-col gap-0.5" style={{ background: "var(--bg-hover)" }}>
              <span className="text-[10px]" style={{ color: "var(--text-3)" }}>Classified today</span>
              <span className="font-display text-[18px] font-bold" style={{ color: "#34D399" }}>
                {data.todayClassified.toLocaleString()}
                <span className="text-[11px] font-normal ml-1" style={{ color: "var(--text-3)" }}>
                  / {data.todayNewAds}
                </span>
              </span>
            </div>
            <div className="rounded-[8px] px-3 py-2 flex flex-col gap-0.5" style={{ background: "var(--bg-hover)" }}>
              <span className="text-[10px]" style={{ color: "var(--text-3)" }}>Unclassified total</span>
              <span className="font-display text-[18px] font-bold" style={{ color: data.totalUnclassified > 0 ? "#FCD34D" : "#34D399" }}>
                {data.totalUnclassified.toLocaleString()}
              </span>
            </div>
          </div>

          {/* ── Next run + errors ── */}
          <div className="flex items-center gap-4 mb-3 text-[11px]">
            <div className="flex items-center gap-1.5" style={{ color: "var(--text-2)" }}>
              <Timer size={11} style={{ color: "var(--ai-light)" }} />
              <span style={{ color: "var(--text-3)" }}>Next run</span>
              <strong style={{ color: "var(--text-1)" }}>
                {new Date(data.nextRun).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })} UTC
              </strong>
              <span style={{ color: "var(--text-3)" }}>({fmtCountdown(data.nextRun)})</span>
            </div>
            {data.totalErrorsToday > 0 && (
              <div className="flex items-center gap-1" style={{ color: "#F87171" }}>
                <AlertCircle size={11} />
                <span>{data.totalErrorsToday} errors today</span>
              </div>
            )}
          </div>

          {/* ── Today's job runs ── */}
          {data.todayRuns.length === 0 ? (
            <div className="text-[11px] py-2" style={{ color: "var(--text-3)" }}>
              No jobs have run today yet. Schedules: 02:00 · 10:00 · 18:00 UTC
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold mb-1" style={{ color: "var(--text-3)" }}>
                TODAY&apos;S RUNS ({data.todayRuns.length})
              </div>
              {data.todayRuns.map(run => (
                <div key={run.id}
                  className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-[11px]"
                  style={{ background: statusBg(run.status), border: `1px solid ${statusColor(run.status)}22` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusColor(run.status) }} />
                  <span className="font-semibold w-16 flex-shrink-0" style={{ color: statusColor(run.status) }}>
                    {run.status}
                  </span>
                  <span style={{ color: "var(--text-3)" }} className="w-12 flex-shrink-0">
                    {fmtTime(run.runAt)}
                  </span>
                  <span className="flex items-center gap-1" style={{ color: "var(--text-2)" }}>
                    <span style={{ color: "#60A5FA" }}>+{run.newAds ?? 0}</span>
                    <span style={{ color: "var(--text-3)" }}>new</span>
                    <span style={{ color: "var(--text-3)" }}>·</span>
                    <span style={{ color: "#A78BFA" }}>~{run.updatedAds ?? 0}</span>
                    <span style={{ color: "var(--text-3)" }}>updated</span>
                    {(run.errors ?? 0) > 0 && (
                      <>
                        <span style={{ color: "var(--text-3)" }}>·</span>
                        <span style={{ color: "#F87171" }}>{run.errors} err</span>
                      </>
                    )}
                  </span>
                  {run.durationMs && (
                    <span className="ml-auto flex-shrink-0 font-data" style={{ color: "var(--text-3)" }}>
                      {(run.durationMs / 1000).toFixed(1)}s
                    </span>
                  )}
                  <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--bg-hover)", color: "var(--text-3)" }}>
                    {run.schedule ?? "manual"}
                  </span>
                </div>
              ))}
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

const STATUS_STYLE: Record<string, { color: string; icon: React.ElementType }> = {
  success: { color: "#34D399", icon: CheckCircle },
  error:   { color: "#F87171", icon: AlertCircle },
  partial: { color: "#FCD34D", icon: AlertCircle },
};

function WorkflowHistory() {
  const [runs,    setRuns]    = useState<WorkflowRunItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open,    setOpen]    = useState(true);

  useEffect(() => {
    fetch("/api/admin/workflow-runs?limit=20")
      .then(r => r.json() as Promise<WorkflowRunItem[]>)
      .then(d => setRuns(Array.isArray(d) ? d : []))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-[12px] p-4 mt-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <button className="flex items-center justify-between w-full mb-2" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-2">
          <Clock size={13} style={{ color: "var(--ai-light)" }} />
          <p className="font-display text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>
            Workflow History — Daily A
          </p>
        </div>
        {open ? <ChevronUp size={13} style={{ color: "var(--text-3)" }} /> : <ChevronDown size={13} style={{ color: "var(--text-3)" }} />}
      </button>

      {open && (
        loading ? (
          <p className="text-[12px]" style={{ color: "var(--text-3)" }}>Loading...</p>
        ) : runs.length === 0 ? (
          <div className="rounded-[8px] px-3 py-3 text-[12px]"
            style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-3)" }}>
            No runs yet. VPS scraper should call <code className="text-[11px]">/api/workflow-run</code> after each job.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-[10px]" style={{ color: "var(--text-3)" }}>
                  <th className="text-left pb-2 pr-3">Thời gian</th>
                  <th className="text-left pb-2 pr-3">Schedule</th>
                  <th className="text-left pb-2 pr-3">Status</th>
                  <th className="text-right pb-2 pr-3">Total</th>
                  <th className="text-right pb-2 pr-3">New</th>
                  <th className="text-right pb-2 pr-3">Updated</th>
                  <th className="text-right pb-2 pr-3">Errors</th>
                  <th className="text-right pb-2">Duration</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(run => {
                  const style = STATUS_STYLE[run.status] ?? STATUS_STYLE.error;
                  const Icon  = style.icon;
                  return (
                    <tr key={run.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td className="py-1.5 pr-3 tabular-nums" style={{ color: "var(--text-2)" }}>
                        {new Date(run.runAt).toLocaleString("vi-VN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-1.5 pr-3" style={{ color: "var(--text-3)" }}>{run.schedule ?? "manual"}</td>
                      <td className="py-1.5 pr-3">
                        <span className="flex items-center gap-1" style={{ color: style.color }}>
                          <Icon size={11} /> {run.status}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums" style={{ color: "var(--text-2)" }}>{run.totalAds.toLocaleString()}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums" style={{ color: "#34D399" }}>+{run.newAds.toLocaleString()}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums" style={{ color: "#60A5FA" }}>{run.updatedAds.toLocaleString()}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums" style={{ color: run.errors > 0 ? "#F87171" : "var(--text-3)" }}>{run.errors}</td>
                      <td className="py-1.5 text-right tabular-nums" style={{ color: "var(--text-3)" }}>
                        {run.durationMs != null ? `${Math.round(run.durationMs / 1000)}s` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
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
