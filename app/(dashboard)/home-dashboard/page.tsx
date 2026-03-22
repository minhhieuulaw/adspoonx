"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Sparkles, Store, TrendingUp, Bookmark,
  ArrowRight, Zap, BarChart2, Globe,
} from "lucide-react";

interface Stats {
  totalAds: number;
  activeAds: number;
  countries: number;
}

const tips = [
  "Search by product keyword to find winning ad creatives in your niche.",
  "Save ads you like — use them as inspiration for your own campaigns.",
  "Check Trending Niche weekly to spot emerging markets early.",
  "Use Potential Store to reverse-engineer competitors' strategies.",
  "Filter by country to find ads running in your target market.",
];

/* Linear-style spring transition */
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

/* ── Stat card ── */
function StatCard({
  label, value, icon, color, delay,
}: {
  label: string; value: React.ReactNode; icon: React.ReactNode; color: string; delay: number;
}) {
  return (
    <motion.div {...fadeUp(delay)} className="col-span-4 glass-card glow-hover p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-widest" style={{ color: "var(--text-muted)", letterSpacing: "0.09em" }}>
          {label}
        </span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}14` }}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
      <p className="text-3xl font-semibold tabular-nums" style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
        {value}
      </p>
    </motion.div>
  );
}

/* ── Feature card ── */
function FeatureCard({
  href, icon, iconColor, iconBg, title, description, cta, delay,
}: {
  href: string; icon: React.ReactNode; iconColor: string; iconBg: string;
  title: string; description: string; cta: string; delay: number;
}) {
  return (
    <motion.div {...fadeUp(delay)} className="col-span-6">
      <Link href={href}>
        <div className="glass-card glow-hover p-5 cursor-pointer h-full flex flex-col">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
            style={{ background: iconBg }}>
            <span style={{ color: iconColor }}>{icon}</span>
          </div>
          <h3 className="text-[14px] font-semibold mb-1.5" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
            {title}
          </h3>
          <p className="text-[13px] leading-relaxed flex-1" style={{ color: "var(--text-muted)" }}>
            {description}
          </p>
          <div className="mt-4 flex items-center gap-1 text-[12px] font-medium" style={{ color: iconColor }}>
            {cta} <ArrowRight size={12} strokeWidth={2} />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function HomeDashboardPage() {
  const { data: session } = useSession();
  const [stats,     setStats]     = useState<Stats | null>(null);
  const [randomTip, setRandomTip] = useState(tips[0]);

  useEffect(() => { setRandomTip(tips[Math.floor(Math.random() * tips.length)]); }, []);
  useEffect(() => { fetch("/api/stats").then(r => r.json()).then(setStats).catch(() => null); }, []);

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="max-w-5xl">
      <div className="grid grid-cols-12 gap-4 auto-rows-auto">

        {/* ── Welcome ── col 8 */}
        <motion.div
          {...fadeUp(0)}
          className="col-span-8 rounded-2xl p-6 relative overflow-hidden"
          style={{
            background: "rgba(94,106,210,0.06)",
            border:     "1px solid rgba(94,106,210,0.14)",
          }}
        >
          {/* Subtle top-right glow */}
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(94,106,210,0.12) 0%, transparent 70%)" }} />

          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent-light)", letterSpacing: "0.1em" }}>
            Dashboard
          </p>
          <h1 className="text-[26px] font-semibold mb-2" style={{ color: "var(--text-primary)", letterSpacing: "-0.025em" }}>
            Welcome back, <span className="gradient-text">{firstName}</span>
          </h1>
          <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
            Your ad intelligence hub — powered by real data.
          </p>

          <div className="mt-6 flex gap-2.5">
            <Link
              href="/ads"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium text-white"
              style={{
                background:  "var(--accent)",
                transition:  "opacity var(--duration) var(--ease)",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.85")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
            >
              <Sparkles size={13} strokeWidth={2} /> Start Exploring
            </Link>
            <Link
              href="/trending"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium"
              style={{
                border:      "1px solid var(--card-border)",
                color:       "var(--text-secondary)",
                transition:  "background var(--duration) var(--ease), border-color var(--duration) var(--ease)",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background    = "rgba(255,255,255,0.05)";
                el.style.borderColor   = "var(--card-border)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background    = "transparent";
              }}
            >
              <TrendingUp size={13} strokeWidth={1.5} /> See Trending
            </Link>
          </div>
        </motion.div>

        {/* ── Stat: Total Ads — col 4 ── */}
        <StatCard
          label="Total Ads" delay={0.04}
          value={stats ? <AnimatedNumber value={stats.totalAds} /> : "—"}
          icon={<BarChart2 size={14} strokeWidth={1.5} />}
          color="var(--accent-light)"
        />

        {/* ── Stat: Active Ads — col 4 ── */}
        <StatCard
          label="Running" delay={0.08}
          value={stats ? <AnimatedNumber value={stats.activeAds} /> : "—"}
          icon={<span className="w-2 h-2 rounded-full bg-emerald-400 block" style={{ boxShadow: "0 0 6px rgba(52,211,153,0.6)" }} />}
          color="#34d399"
        />

        {/* ── Stat: Countries — col 4 ── */}
        <StatCard
          label="Markets" delay={0.1}
          value={stats?.countries ?? "—"}
          icon={<Globe size={14} strokeWidth={1.5} />}
          color="#f59e0b"
        />

        {/* ── Spacer so stat row is only 3×col-4 ── */}
        {/* col 4+4+4 = 12, next row auto */}

        {/* ── Feature cards ── */}
        <FeatureCard
          href="/ads" delay={0.12}
          icon={<Sparkles size={18} strokeWidth={1.5} />}
          iconColor="var(--accent-light)" iconBg="var(--accent-soft)"
          title="Ads Finder by AI"
          description="Search millions of Facebook ads. Filter by keyword, country, and status."
          cta="Open library"
        />
        <FeatureCard
          href="/stores" delay={0.15}
          icon={<Store size={18} strokeWidth={1.5} />}
          iconColor="#f59e0b" iconBg="rgba(245,158,11,0.1)"
          title="Potential Store"
          description="Discover top advertisers by ad volume. Reverse-engineer winning stores."
          cta="Browse stores"
        />
        <FeatureCard
          href="/trending" delay={0.17}
          icon={<TrendingUp size={18} strokeWidth={1.5} />}
          iconColor="#34d399" iconBg="rgba(52,211,153,0.1)"
          title="Trending Niche"
          description="Spot the hottest niches with growing ad spend before your competitors."
          cta="View trends"
        />
        <FeatureCard
          href="/saved" delay={0.19}
          icon={<Bookmark size={18} strokeWidth={1.5} />}
          iconColor="#a78bfa" iconBg="rgba(167,139,250,0.1)"
          title="Saved Ads"
          description="Your personal collection of winning ad creatives and references."
          cta="View saved"
        />

        {/* ── Pro tip ── full width */}
        <motion.div
          {...fadeUp(0.25)}
          className="col-span-12 rounded-xl px-4 py-3 flex items-center gap-3"
          style={{
            background: "rgba(94,106,210,0.05)",
            border:     "1px solid rgba(94,106,210,0.12)",
          }}
        >
          <Zap size={13} strokeWidth={2} style={{ color: "var(--accent-light)", flexShrink: 0 }} />
          <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            <span className="font-semibold" style={{ color: "var(--accent-light)" }}>TIP — </span>
            {randomTip}
          </p>
        </motion.div>

      </div>
    </div>
  );
}
