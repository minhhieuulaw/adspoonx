"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { Users, TrendingUp, Database, DollarSign, Activity, Star, Globe, Zap, Play, Trash2, RefreshCw } from "lucide-react";

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

// ── Colours ──────────────────────────────────────────────────────────────────
const PLAN_COLORS: Record<string, string> = {
  free:     "#6b7280",
  starter:  "#6366f1",
  premium:  "#8b5cf6",
  business: "#ec4899",
};
const PIE_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#6b7280", "#10b981", "#f59e0b"];

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt$ = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const fmtDate = (d: string) => d.slice(5); // "03-25"

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sub, color = "#6366f1",
}: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>{label}</span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}22` }}>
          <Icon size={17} style={{ color }} />
        </div>
      </div>
      <div>
        <div className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</div>
        {sub && <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
      <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-secondary)" }}>{title}</h3>
      {children}
    </div>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, prefix = "", suffix = "" }: {
  active?: boolean; payload?: { value: number; name?: string }[]; label?: string; prefix?: string; suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-lg" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }}>
      <div className="font-medium mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i}>{p.name ?? ""}: <strong>{prefix}{p.value.toLocaleString()}{suffix}</strong></div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(r => r.json() as Promise<AdminStats & { error?: string }>)
      .then(d => {
        if ("error" in d && d.error) { setError(d.error); return; }
        setStats(d as AdminStats);
      })
      .catch(() => setError("Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--sidebar-bg)" }}>
      <div className="flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
        <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        Loading...
      </div>
    </div>
  );

  if (error || !stats) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--sidebar-bg)", color: "var(--text-primary)" }}>
      {error || "No data"}
    </div>
  );

  // Prep data
  const signupData = stats.users.last30Days;
  const revenueData = stats.revenue.scanPurchases.byMonth.map(m => ({
    month: m.month.slice(5), // "03"
    revenue: Math.round(m.amountCents / 100),
    orders: m.count,
  }));

  // Active paid plan counts (exclude cancelled/expired)
  const planPieData = (() => {
    const agg: Record<string, number> = {};
    for (const s of stats.subscriptions.byPlan) {
      if (s.status === "cancelled" || s.status === "expired") continue;
      agg[s.plan] = (agg[s.plan] ?? 0) + s.count;
    }
    return Object.entries(agg).map(([plan, count]) => ({ name: plan, value: count }));
  })();

  const authPieData = [
    { name: "Google", value: stats.users.google },
    { name: "Email", value: stats.users.email },
  ];

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto" style={{ background: "var(--sidebar-bg)" }}>

      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center">
          <Zap size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Admin Dashboard</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>adspoonX — Tổng quan hệ thống</p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users}      label="Tổng thành viên"       value={stats.users.total.toLocaleString()}       sub={`${stats.users.google} Google · ${stats.users.email} Email`} color="#6366f1" />
        <StatCard icon={Star}       label="Đang dùng bản trả phí" value={stats.subscriptions.activeTotal}          sub={`Conversion ${stats.users.conversionRate}%`}                  color="#8b5cf6" />
        <StatCard icon={DollarSign} label="Doanh thu scan"        value={fmt$(stats.revenue.scanPurchases.totalCents)} sub={`${stats.revenue.scanPurchases.totalCount} đơn hàng`}       color="#10b981" />
        <StatCard icon={Database}   label="Tổng ads trong DB"     value={stats.ads.total.toLocaleString()}         sub={`${stats.ads.active.toLocaleString()} đang active`}            color="#f59e0b" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Activity}   label="Paid users"        value={stats.users.paid}             sub="starter / premium / business"                  color="#6366f1" />
        <StatCard icon={TrendingUp} label="Saved Ads"         value={stats.savedAds.toLocaleString()} sub="tổng lượt lưu ads"                          color="#8b5cf6" />
        <StatCard icon={Globe}      label="Quốc gia theo dõi" value={stats.ads.byCountry.length}   sub="markets đang khai thác"                         color="#ec4899" />
        <StatCard icon={Database}   label="Niches"            value={stats.ads.byNiche.length}     sub="ngành hàng phân loại được"                      color="#10b981" />
      </div>

      {/* ── Charts row 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        {/* Signup theo ngày */}
        <Section title="📈 Thành viên mới — 30 ngày gần nhất">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={signupData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: "var(--text-muted)" }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="count" name="Thành viên" stroke="#6366f1" fill="url(#signupGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Section>

        {/* Doanh thu theo tháng */}
        <Section title="💰 Doanh thu scan purchases — 12 tháng">
          {revenueData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
              Chưa có doanh thu
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <Tooltip content={<ChartTooltip prefix="$" />} />
                <Bar dataKey="revenue" name="Revenue ($)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>
      </div>

      {/* ── Charts row 2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

        {/* Plans pie */}
        <Section title="🏷️ Phân bổ gói trả phí (active)">
          {planPieData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
              Chưa có subscription
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={planPieData} cx="50%" cy="50%" outerRadius={75} dataKey="value" nameKey="name" label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                  {planPieData.map((entry, i) => (
                    <Cell key={i} fill={PLAN_COLORS[entry.name] ?? PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Section>

        {/* Auth method pie */}
        <Section title="🔐 Phương thức đăng nhập">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={authPieData} cx="50%" cy="50%" outerRadius={75} dataKey="value" nameKey="name" label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                <Cell fill="#6366f1" />
                <Cell fill="#8b5cf6" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Section>

        {/* Ads last 7 days */}
        <Section title="🗃️ Ads scraped — 7 ngày gần nhất">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.ads.last7Days} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Ads" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      {/* ── Tables row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        {/* Top countries */}
        <Section title="🌍 Top quốc gia — số ads">
          <div className="space-y-2">
            {stats.ads.byCountry.slice(0, 10).map((c, i) => {
              const max = stats.ads.byCountry[0]?.count ?? 1;
              const pct = Math.round((c.count / max) * 100);
              return (
                <div key={c.country} className="flex items-center gap-3">
                  <div className="w-7 text-xs font-mono text-right flex-shrink-0" style={{ color: "var(--text-muted)" }}>#{i + 1}</div>
                  <div className="w-10 text-xs font-bold flex-shrink-0" style={{ color: "var(--text-primary)" }}>{c.country}</div>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--content-bg)" }}>
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="w-16 text-xs text-right flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                    {c.count.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Top niches */}
        <Section title="🎯 Top niches — số ads">
          <div className="space-y-2">
            {stats.ads.byNiche.slice(0, 10).map((n, i) => {
              const max = stats.ads.byNiche[0]?.count ?? 1;
              const pct = Math.round((n.count / max) * 100);
              return (
                <div key={n.niche} className="flex items-center gap-3">
                  <div className="w-7 text-xs font-mono text-right flex-shrink-0" style={{ color: "var(--text-muted)" }}>#{i + 1}</div>
                  <div className="flex-1 min-w-0 text-xs truncate" style={{ color: "var(--text-primary)" }}>{n.niche}</div>
                  <div className="w-24 h-2 rounded-full overflow-hidden flex-shrink-0" style={{ background: "var(--content-bg)" }}>
                    <div className="h-full rounded-full bg-purple-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="w-16 text-xs text-right flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                    {n.count.toLocaleString()}
                  </div>
                </div>
              );
            })}
            {stats.ads.byNiche.length === 0 && (
              <div className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
                Chưa có niche data
              </div>
            )}
          </div>
        </Section>
      </div>

      {/* ── Subscription breakdown table ── */}
      <Section title="📋 Chi tiết subscriptions">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: "var(--text-muted)" }} className="text-xs">
                <th className="text-left pb-3">Plan</th>
                <th className="text-left pb-3">Status</th>
                <th className="text-right pb-3">Số lượng</th>
              </tr>
            </thead>
            <tbody>
              {stats.subscriptions.byPlan.map((s, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--card-border)" }}>
                  <td className="py-2.5">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ background: `${PLAN_COLORS[s.plan] ?? "#6b7280"}22`, color: PLAN_COLORS[s.plan] ?? "var(--text-muted)" }}
                    >
                      {s.plan}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {s.status ?? "—"}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-semibold" style={{ color: "var(--text-primary)" }}>
                    {s.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── Crawl Control ── */}
      <CrawlControl />

      <p className="text-center text-xs mt-6" style={{ color: "var(--text-muted)" }}>
        adspoonX Admin · Dữ liệu real-time từ PostgreSQL
      </p>
    </div>
  );
}

// ── Crawl Control Panel ───────────────────────────────────────────────────────
function CrawlControl() {
  const [keyword, setKeyword] = useState("");
  const [country, setCountry] = useState("US");
  const [status, setStatus]   = useState<string | null>(null);
  const [busy, setBusy]       = useState(false);

  async function post(body: object) {
    setBusy(true);
    setStatus("Đang xử lý...");
    try {
      const r = await fetch("/api/admin/crawl", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const d = await r.json() as Record<string, unknown>;
      if (!r.ok) {
        setStatus(`Lỗi: ${String(d.error ?? "unknown")}`);
      } else if (body && (body as Record<string,unknown>).action === "clean") {
        setStatus(`Đã xóa ${String(d.deleted)} ads cũ.`);
      } else {
        const saved = d.saved ?? d.totalSaved ?? "?";
        setStatus(`✅ Đã lưu ${String(saved)} ads mới (với quality filter).`);
      }
    } catch {
      setStatus("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl p-5 mt-4" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
      <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-secondary)" }}>🕷️ Crawl Control (thủ công)</h3>
      <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
        Auto-cron đã TẮT (<code>CRON_DISABLED=true</code>). Ba có thể crawl thủ công tại đây.
        Quality filter đã bật: chỉ lưu ads có page name + body text + ảnh/video.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <input
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          placeholder="Keyword (e.g. fashion)"
          className="px-3 py-2 rounded-xl text-sm outline-none"
          style={{ background: "var(--content-bg)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }}
        />
        <input
          value={country}
          onChange={e => setCountry(e.target.value.toUpperCase())}
          placeholder="Country (e.g. US)"
          maxLength={2}
          className="px-3 py-2 rounded-xl text-sm outline-none"
          style={{ background: "var(--content-bg)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }}
        />
        <button
          onClick={() => { if (keyword && country) void post({ action: "crawl_single", keyword, country }); }}
          disabled={busy || !keyword || !country}
          className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }}
        >
          <Play size={14} />
          Crawl 1 keyword
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => void post({ action: "crawl_all" })}
          disabled={busy}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "#f59e0b" }}
        >
          <RefreshCw size={14} />
          Crawl toàn bộ (10 jobs đầu)
        </button>
        <button
          onClick={() => void post({ action: "clean" })}
          disabled={busy}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "#ef4444" }}
        >
          <Trash2 size={14} />
          Xóa ads cũ (>90 ngày)
        </button>
      </div>

      {status && (
        <div className="px-3 py-2 rounded-lg text-sm" style={{ background: "var(--content-bg)", color: "var(--text-primary)" }}>
          {status}
        </div>
      )}
    </div>
  );
}
