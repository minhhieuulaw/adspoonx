"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Users, TrendingUp, Database, DollarSign, Activity,
  Star, Globe, Play, Trash2, RefreshCw, Zap,
  Bell, CheckCircle, Clock, AlertCircle, Plus, Pencil, X,
  MessageSquare, ChevronDown, ChevronUp,
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

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2" style={{ color: "var(--text-3)" }}>
      <div className="w-4 h-4 rounded-full border-2 border-[var(--ai-light)] border-t-transparent animate-spin" />
      Loading...
    </div>
  );

  if (error || !stats) return (
    <div className="flex items-center justify-center h-64" style={{ color: "var(--text-3)" }}>
      {error || "No data"}
    </div>
  );

  const revenueData = stats.revenue.scanPurchases.byMonth.map(m => ({
    month: m.month.slice(5),
    revenue: Math.round(m.amountCents / 100),
    orders: m.count,
  }));

  const planPieData = (() => {
    const agg: Record<string, number> = {};
    for (const s of stats.subscriptions.byPlan) {
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

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KpiCard icon={Users}      label="Tổng thành viên"    value={stats.users.total.toLocaleString()}
          sub={`${stats.users.google} Google · ${stats.users.email} Email`} color="#A78BFA" bg="rgba(124,58,237,0.12)" />
        <KpiCard icon={Star}       label="Đang dùng bản trả phí" value={stats.subscriptions.activeTotal}
          sub={`Conversion ${stats.users.conversionRate}%`} color="#34D399" bg="rgba(52,211,153,0.12)" />
        <KpiCard icon={DollarSign} label="Doanh thu scan"     value={fmt$(stats.revenue.scanPurchases.totalCents)}
          sub={`${stats.revenue.scanPurchases.totalCount} đơn hàng`} color="#FCD34D" bg="rgba(245,158,11,0.12)" />
        <KpiCard icon={Database}   label="Tổng ads"           value={stats.ads.total.toLocaleString()}
          sub={`${stats.ads.active.toLocaleString()} active`} color="#60A5FA" bg="rgba(59,130,246,0.12)" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard icon={Activity}   label="Paid users"         value={stats.users.paid}
          sub="starter / premium / business" color="#A78BFA" bg="rgba(124,58,237,0.12)" />
        <KpiCard icon={TrendingUp} label="Saved Ads"          value={stats.savedAds.toLocaleString()}
          sub="tổng lượt lưu" color="#34D399" bg="rgba(52,211,153,0.12)" />
        <KpiCard icon={Globe}      label="Markets"            value={stats.ads.byCountry.length}
          sub="quốc gia đang khai thác" color="#FCD34D" bg="rgba(245,158,11,0.12)" />
        <KpiCard icon={Database}   label="Niches"             value={stats.ads.byNiche.length}
          sub="ngành hàng phân loại" color="#60A5FA" bg="rgba(59,130,246,0.12)" />
      </div>

      {/* ── Charts row 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        <Card title="📈 Thành viên mới — 30 ngày">
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
              <Area type="monotone" dataKey="count" name="Thành viên" stroke="#A78BFA" fill="url(#g1)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="💰 Doanh thu — 12 tháng">
          {revenueData.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-[12px]" style={{ color: "var(--text-3)" }}>
              Chưa có doanh thu
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

        <Card title="🏷️ Phân bổ gói (active)">
          {planPieData.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-[12px]" style={{ color: "var(--text-3)" }}>
              Chưa có subscription
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

        <Card title="🗃️ Ads scraped — 7 ngày">
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

        <Card title="🔐 Đăng ký qua">
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

        <Card title="🌍 Top quốc gia">
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
              <p className="text-[12px]" style={{ color: "var(--text-3)" }}>Chưa có niche data</p>
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
      <Card title="📋 Chi tiết subscriptions">
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ color: "var(--text-3)" }} className="text-[10px]">
              <th className="text-left pb-2">Plan</th>
              <th className="text-left pb-2">Status</th>
              <th className="text-right pb-2">Số lượng</th>
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

      {/* ── Crawl Control ── */}
      <CrawlControl />

      {/* ── Announcements ── */}
      <AnnouncementsPanel />

      {/* ── Workflow History ── */}
      <WorkflowHistory />

      {/* ── Tickets ── */}
      <TicketList />

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
    addLog("Đang xử lý...");
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
        addLog(`✅ Đã xóa ${String(d.deleted)} ads cũ.`);
      } else {
        const saved = d.saved ?? d.totalSaved ?? "?";
        addLog(`✅ Đã lưu ${String(saved)} ads (quality filter đang bật).`);
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
        🕷️ Crawl Control (thủ công)
      </p>
      <div className="rounded-[8px] px-3 py-2 mb-3 text-[11px]"
        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#F87171" }}>
        Auto-cron đã <strong>TẮT</strong> (CRON_DISABLED=true). Quality filter bật:
        chỉ lưu ads có pageName + bodyText + ảnh/video.
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
          <Trash2 size={11} /> Xóa ads cũ &gt;90 ngày
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
    if (!confirm("Xóa announcement này?")) return;
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
          placeholder="Nội dung thông báo..."
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
            placeholder="Link (tuỳ chọn)"
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
            <Plus size={11} /> {editId ? "Cập nhật" : "Thêm mới"}
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
        <p className="text-[12px]" style={{ color: "var(--text-3)" }}>Đang tải...</p>
      ) : list.length === 0 ? (
        <p className="text-[12px]" style={{ color: "var(--text-3)" }}>Chưa có announcement nào.</p>
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
                <button onClick={() => startEdit(item)} title="Sửa"
                  className="p-1 rounded hover:opacity-80 transition-opacity"
                  style={{ color: "var(--text-3)" }}>
                  <Pencil size={13} />
                </button>
                <button onClick={() => void remove(item.id)} title="Xóa"
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
          <p className="text-[12px]" style={{ color: "var(--text-3)" }}>Đang tải...</p>
        ) : runs.length === 0 ? (
          <div className="rounded-[8px] px-3 py-3 text-[12px]"
            style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-3)" }}>
            Chưa có run nào. Scraper VPS cần gọi <code className="text-[11px]">/api/workflow-run</code> sau mỗi lần chạy.
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
        <p className="text-[12px]" style={{ color: "var(--text-3)" }}>Đang tải...</p>
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
                      <strong>Đã trả lời:</strong> {ticket.reply}
                    </div>
                  )}
                  <textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    placeholder="Nhập reply..."
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
