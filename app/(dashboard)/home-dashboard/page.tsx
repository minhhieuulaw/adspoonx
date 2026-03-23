"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Sparkles, Store, TrendingUp, Bookmark,
  ArrowRight, Zap, BarChart2, Globe, Play,
  Brain, Eye,
} from "lucide-react";

interface NicheItem { niche: string; count: number }
interface StoreItem { pageName: string; pageId: string | null; adCount: number }

interface PlatformItem { platform: string; count: number }
interface WeeklyItem { week: string; count: number }

interface Stats {
  totalAds: number;
  activeAds: number;
  countries: number;
  videoCount: number;
  niches: NicheItem[];
  stores: StoreItem[];
  platformDist?: PlatformItem[];
  weeklyGrowth?: WeeklyItem[];
}

const tips = [
  "Search by product keyword to find winning ad creatives in your niche.",
  "Save ads you like — use them as inspiration for your own campaigns.",
  "Check Trending Niche weekly to spot emerging markets early.",
  "Use Potential Store to reverse-engineer competitors' strategies.",
  "Filter by AI Score to see only proven, high-performing ads.",
  "Use the Video filter to find video creatives — they convert 2x better.",
];

const spring = { type: "spring" as const, stiffness: 380, damping: 30 };
const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 8 },
  animate:    { opacity: 1, y: 0 },
  transition: { ...spring, delay },
});

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!value) return;
    const step  = Math.ceil(value / 40);
    let cur     = 0;
    const timer = setInterval(() => {
      cur = Math.min(cur + step, value);
      setDisplay(cur);
      if (cur >= value) clearInterval(timer);
    }, 18);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display.toLocaleString()}</>;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({
  label, value, icon: Icon, color, bg, delay,
}: {
  label: string; value: React.ReactNode; icon: React.ElementType; color: string; bg: string; delay: number;
}) {
  return (
    <motion.div {...fadeUp(delay)}
      className="rounded-[12px] p-4 flex items-center gap-3"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
        <Icon size={16} strokeWidth={1.8} style={{ color }} />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>{label}</p>
        <p className="font-display text-[22px] font-bold leading-none mt-0.5" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>
          {value}
        </p>
      </div>
    </motion.div>
  );
}

// ── Niche Bar ─────────────────────────────────────────────────────────────────

const NICHE_COLORS = [
  "#A78BFA", "#60A5FA", "#34D399", "#F472B6", "#FCD34D",
  "#FB923C", "#38BDF8", "#F87171", "#818CF8", "#94A3B8",
];

function NicheBar({ niches, total }: { niches: NicheItem[]; total: number }) {
  return (
    <div className="flex flex-col gap-2">
      {niches.map((n, i) => {
        const pct = total > 0 ? (n.count / total) * 100 : 0;
        const color = NICHE_COLORS[i % NICHE_COLORS.length];
        return (
          <Link key={n.niche} href={`/niche/${encodeURIComponent(n.niche.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}`}>
            <div className="group flex items-center gap-2.5 cursor-pointer">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-medium truncate group-hover:text-white transition-colors" style={{ color: "var(--text-2)" }}>
                    {n.niche}
                  </span>
                  <span className="text-[11px] font-data font-semibold tabular-nums" style={{ color: "var(--text-3)" }}>
                    {n.count.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(2, pct)}%`, background: color }}
                  />
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ── Quick Link Card ───────────────────────────────────────────────────────────

function QuickLink({
  href, icon: Icon, iconColor, iconBg, title, desc, delay,
}: {
  href: string; icon: React.ElementType; iconColor: string; iconBg: string;
  title: string; desc: string; delay: number;
}) {
  return (
    <motion.div {...fadeUp(delay)}>
      <Link href={href}
        className="flex items-center gap-3 p-3 rounded-[10px] group transition-colors"
        style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}
      >
        <div className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
          <Icon size={15} strokeWidth={1.8} style={{ color: iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>{title}</p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>{desc}</p>
        </div>
        <ArrowRight size={14} strokeWidth={1.5} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: iconColor }} />
      </Link>
    </motion.div>
  );
}

// ── Top Stores Row ────────────────────────────────────────────────────────────

function TopStores({ stores }: { stores: StoreItem[] }) {
  if (!stores.length) return null;
  const max = stores[0]?.adCount ?? 1;
  return (
    <div className="flex flex-col gap-2">
      {stores.map((s, i) => (
        <Link key={s.pageName + i} href="/stores">
          <div className="flex items-center gap-2.5 group cursor-pointer">
            <span className="font-data text-[10px] font-bold w-4 text-center" style={{ color: "var(--text-3)" }}>
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium truncate group-hover:text-white transition-colors" style={{ color: "var(--text-2)" }}>
                {s.pageName}
              </p>
            </div>
            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="h-full rounded-full" style={{
                width: `${(s.adCount / max) * 100}%`,
                background: "linear-gradient(90deg, #F59E0B, #F97316)",
              }} />
            </div>
            <span className="font-data text-[11px] font-semibold tabular-nums w-8 text-right" style={{ color: "var(--text-3)" }}>
              {s.adCount}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ── Platform Distribution (horizontal bars) ──────────────────────────────────

const PLATFORM_COLORS: Record<string, string> = {
  FACEBOOK: "#1877F2", INSTAGRAM: "#E4405F", MESSENGER: "#0084FF",
  AUDIENCE_NETWORK: "#A78BFA", THREADS: "#94A3B8",
};

function PlatformChart({ data }: { data: PlatformItem[] }) {
  if (!data.length) return null;
  const max = data[0]?.count ?? 1;
  return (
    <div className="flex flex-col gap-2.5">
      {data.map(p => {
        const pct = max > 0 ? (p.count / max) * 100 : 0;
        const color = PLATFORM_COLORS[p.platform.toUpperCase()] ?? "#94A3B8";
        const label = p.platform.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        return (
          <div key={p.platform}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium" style={{ color: "var(--text-2)" }}>{label}</span>
              <span className="font-data text-[11px] font-semibold tabular-nums" style={{ color: "var(--text-3)" }}>
                {p.count.toLocaleString()}
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.max(3, pct)}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Weekly Growth (SVG sparkline area chart) ─────────────────────────────────

function WeeklyChart({ data }: { data: WeeklyItem[] }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  const w = 100;
  const h = 50;
  const padding = 2;

  const points = data.map((d, i) => ({
    x: padding + (i / Math.max(data.length - 1, 1)) * (w - padding * 2),
    y: h - padding - ((d.count / max) * (h - padding * 2)),
  }));
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${line} L ${points[points.length - 1].x} ${h} L ${points[0].x} ${h} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 80 }}>
        <defs>
          <linearGradient id="weekGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#A78BFA" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#weekGrad)" />
        <path d={line} fill="none" stroke="#A78BFA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2" fill="#A78BFA" />
        ))}
      </svg>
      <div className="flex justify-between mt-1.5">
        {data.map((d, i) => (
          <div key={i} className="text-center" style={{ flex: 1 }}>
            <p className="font-data text-[8px] font-semibold" style={{ color: "var(--text-3)" }}>
              {new Date(d.week).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
            <p className="font-data text-[9px] font-bold" style={{ color: "var(--text-2)" }}>
              {d.count.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function HomeDashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [randomTip, setRandomTip] = useState(tips[0]);

  useEffect(() => { setRandomTip(tips[Math.floor(Math.random() * tips.length)]); }, []);
  useEffect(() => { fetch("/api/stats").then(r => r.json()).then(setStats).catch(() => null); }, []);

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="max-w-6xl page-enter">
      {/* ── Welcome Banner ── */}
      <motion.div
        {...fadeUp(0)}
        className="rounded-[14px] p-6 mb-5 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(59,130,246,0.06) 100%)",
          border: "1px solid rgba(124,58,237,0.15)",
        }}
      >
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)" }} />
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--ai-light)", letterSpacing: "0.1em" }}>
          Dashboard
        </p>
        <h1 className="font-display text-[24px] font-bold mb-1.5" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>
          Welcome back, <span className="gradient-text">{firstName}</span>
        </h1>
        <p className="text-[13px] mb-5" style={{ color: "var(--text-2)" }}>
          Your ad intelligence hub — powered by real data from {stats?.totalAds?.toLocaleString() ?? "…"} ads.
        </p>
        <div className="flex gap-2.5">
          <Link href="/ads"
            className="flex items-center gap-2 px-4 py-2 rounded-[8px] text-[13px] font-semibold text-white"
            style={{ background: "var(--ai)", transition: "opacity 120ms" }}
          >
            <Sparkles size={13} strokeWidth={2} /> Explore Ads
          </Link>
          <Link href="/trending"
            className="flex items-center gap-2 px-4 py-2 rounded-[8px] text-[13px] font-medium"
            style={{ border: "1px solid var(--border)", color: "var(--text-2)" }}
          >
            <TrendingUp size={13} strokeWidth={1.5} /> Trending
          </Link>
        </div>
      </motion.div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KPICard label="Total Ads" delay={0.04}
          value={stats ? <AnimatedNumber value={stats.totalAds} /> : "—"}
          icon={BarChart2} color="var(--ai-light)" bg="var(--ai-soft)" />
        <KPICard label="Active" delay={0.06}
          value={stats ? <AnimatedNumber value={stats.activeAds} /> : "—"}
          icon={Zap} color="#34D399" bg="rgba(52,211,153,0.12)" />
        <KPICard label="With Video" delay={0.08}
          value={stats ? <AnimatedNumber value={stats.videoCount} /> : "—"}
          icon={Play} color="#60A5FA" bg="rgba(59,130,246,0.12)" />
        <KPICard label="Markets" delay={0.10}
          value={stats?.countries ?? "—"}
          icon={Globe} color="#FCD34D" bg="rgba(245,158,11,0.12)" />
      </div>

      {/* ── Two-column: Niches + Stores ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        {/* Niche Distribution */}
        <motion.div {...fadeUp(0.12)}
          className="rounded-[12px] p-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain size={14} strokeWidth={1.8} style={{ color: "var(--ai-light)" }} />
              <h2 className="font-display text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>
                Niche Distribution
              </h2>
            </div>
            <Link href="/ads" className="text-[11px] font-medium flex items-center gap-1" style={{ color: "var(--ai-light)" }}>
              View all <ArrowRight size={10} />
            </Link>
          </div>
          {stats?.niches ? (
            <NicheBar niches={stats.niches} total={stats.totalAds} />
          ) : (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-6 rounded skeleton" />
              ))}
            </div>
          )}
        </motion.div>

        {/* Top Stores */}
        <motion.div {...fadeUp(0.14)}
          className="rounded-[12px] p-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Store size={14} strokeWidth={1.8} style={{ color: "#F59E0B" }} />
              <h2 className="font-display text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>
                Top Advertisers
              </h2>
            </div>
            <Link href="/stores" className="text-[11px] font-medium flex items-center gap-1" style={{ color: "#F59E0B" }}>
              All stores <ArrowRight size={10} />
            </Link>
          </div>
          {stats?.stores ? (
            <TopStores stores={stats.stores} />
          ) : (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-5 rounded skeleton" />
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Analytics: Platform Distribution + Weekly Growth ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        {/* Platform Distribution */}
        <motion.div {...fadeUp(0.16)}
          className="rounded-[12px] p-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={14} strokeWidth={1.8} style={{ color: "#60A5FA" }} />
            <h2 className="font-display text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>
              Platform Distribution
            </h2>
          </div>
          {stats?.platformDist?.length ? (
            <PlatformChart data={stats.platformDist} />
          ) : (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-6 rounded skeleton" />
              ))}
            </div>
          )}
        </motion.div>

        {/* Weekly Growth */}
        <motion.div {...fadeUp(0.18)}
          className="rounded-[12px] p-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} strokeWidth={1.8} style={{ color: "#A78BFA" }} />
            <h2 className="font-display text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>
              Ads Added Per Week
            </h2>
          </div>
          {stats?.weeklyGrowth?.length ? (
            <WeeklyChart data={stats.weeklyGrowth} />
          ) : (
            <div className="h-[100px] rounded skeleton" />
          )}
        </motion.div>
      </div>

      {/* ── Quick Links ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <QuickLink href="/ads" delay={0.22}
          icon={Sparkles} iconColor="var(--ai-light)" iconBg="var(--ai-soft)"
          title="Ads Finder" desc="Search & filter all ads" />
        <QuickLink href="/stores" delay={0.24}
          icon={Store} iconColor="#F59E0B" iconBg="rgba(245,158,11,0.1)"
          title="Potential Store" desc="Top advertisers by volume" />
        <QuickLink href="/trending" delay={0.26}
          icon={TrendingUp} iconColor="#34D399" iconBg="rgba(52,211,153,0.1)"
          title="Trending" desc="Hot ads right now" />
        <QuickLink href="/saved" delay={0.28}
          icon={Bookmark} iconColor="#A78BFA" iconBg="rgba(167,139,250,0.1)"
          title="Saved Ads" desc="Your saved collection" />
      </div>

      {/* ── Pro Tip ── */}
      <motion.div {...fadeUp(0.30)}
        className="rounded-[10px] px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.12)" }}
      >
        <Eye size={13} strokeWidth={1.8} style={{ color: "var(--ai-light)", flexShrink: 0 }} />
        <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
          <span className="font-semibold" style={{ color: "var(--ai-light)" }}>TIP — </span>
          {randomTip}
        </p>
      </motion.div>
    </div>
  );
}
