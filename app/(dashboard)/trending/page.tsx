"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  TrendingUp, Flame, Rocket, Leaf, BarChart3, Users, Clock,
  ArrowUpRight, ArrowDownRight, Minus, Sparkles,
} from "lucide-react";

interface NicheData {
  niche: string;
  totalAds: number;
  activeAds: number;
  new24h: number;
  new7d: number;
  growth: number;
  storeCount: number;
  topStores: Array<{ name: string; pic: string }>;
}

const NICHE_ICONS: Record<string, string> = {
  "Skincare & Beauty": "💄",
  "Hair Care": "💇",
  "Fashion & Apparel": "👗",
  "Jewelry & Accessories": "💎",
  "Health & Supplements": "💊",
  "Weight Loss & Fitness": "🏋️",
  "Home & Kitchen": "🏠",
  "Tech & Gadgets": "📱",
  "Pet Supplies": "🐾",
  "Baby & Kids": "👶",
  "Food & Beverage": "☕",
  "Outdoor & Sports": "⛺",
  "Car & Auto": "🚗",
  "Dental & Oral Care": "🦷",
  "Dropshipping & E-com Tools": "🛒",
};

const COUNTRIES = [
  { code: "", label: "All Countries" },
  { code: "US", label: "🇺🇸 US" },
  { code: "GB", label: "🇬🇧 UK" },
  { code: "CA", label: "🇨🇦 CA" },
  { code: "AU", label: "🇦🇺 AU" },
  { code: "DE", label: "🇩🇪 DE" },
  { code: "FR", label: "🇫🇷 FR" },
];

function GrowthBadge({ growth }: { growth: number }) {
  if (growth > 0) return (
    <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
      style={{ background: "rgba(52,211,153,0.12)", color: "#34D399" }}>
      <ArrowUpRight size={10} /> +{growth}%
    </span>
  );
  if (growth < 0) return (
    <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
      style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444" }}>
      <ArrowDownRight size={10} /> {growth}%
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
      style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>
      <Minus size={10} /> 0%
    </span>
  );
}

function NicheCard({ niche, index, variant }: { niche: NicheData; index: number; variant: "hot" | "rising" | "evergreen" }) {
  const icon = NICHE_ICONS[niche.niche] ?? "📊";
  const variantColor = variant === "hot" ? "#EF4444" : variant === "rising" ? "#A78BFA" : "#34D399";

  return (
    <Link href={`/ads?niche=${encodeURIComponent(niche.niche)}`}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04, duration: 0.3 }}
        className="group rounded-xl p-4 cursor-pointer transition-all duration-200"
        style={{
          background: "var(--card-deep)",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "var(--shadow-card)",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = `${variantColor}50`;
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = `0 12px 32px ${variantColor}18, var(--shadow-card)`;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "var(--shadow-card)";
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{icon}</span>
            <div>
              <p className="text-sm font-semibold group-hover:text-purple-400 transition-colors"
                style={{ color: "var(--text-primary)" }}>
                {niche.niche}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Users size={10} style={{ color: "var(--text-muted)" }} />
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {niche.storeCount.toLocaleString()} stores
                </span>
              </div>
            </div>
          </div>
          <GrowthBadge growth={niche.growth} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div>
            <p className="text-[8px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Active</p>
            <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
              {niche.activeAds.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>New 24h</p>
            <p className="text-base font-bold" style={{ color: niche.new24h > 0 ? "#34D399" : "var(--text-muted)" }}>
              {niche.new24h > 0 ? `+${niche.new24h}` : "0"}
            </p>
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>7 days</p>
            <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
              {niche.new7d > 0 ? `+${niche.new7d.toLocaleString()}` : "0"}
            </p>
          </div>
        </div>

        {/* Top stores avatars */}
        {niche.topStores.length > 0 && (
          <div className="flex items-center gap-1.5 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="flex -space-x-2">
              {niche.topStores.map((s, i) => (
                s.pic ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={s.pic} alt="" className="w-6 h-6 rounded-full object-cover"
                    style={{ border: "2px solid var(--bg-base, #0A0A0F)", zIndex: 3 - i }} />
                ) : (
                  <div key={i} className="w-6 h-6 rounded-full flex items-center justify-center text-[7px] font-bold"
                    style={{ background: "rgba(124,58,237,0.15)", color: "#A78BFA", border: "2px solid var(--bg-base, #0A0A0F)", zIndex: 3 - i }}>
                    {s.name.slice(0, 2).toUpperCase()}
                  </div>
                )
              ))}
            </div>
            <span className="text-[9px] ml-1" style={{ color: "var(--text-muted)" }}>
              {niche.topStores.map(s => s.name.split(" ")[0]).join(", ")}
            </span>
          </div>
        )}
      </motion.div>
    </Link>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, color }: {
  icon: typeof Flame; title: string; subtitle: string; color: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: `${color}15` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{title}</h2>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{subtitle}</p>
      </div>
    </div>
  );
}

export default function TrendingPage() {
  const [data, setData] = useState<{ hotNow: NicheData[]; rising: NicheData[]; evergreen: NicheData[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = country ? `?country=${country}` : "";
      const r = await fetch(`/api/trending${params}`);
      const d = await r.json();
      setData(d);
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [country]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.2), rgba(245,158,11,0.15))" }}>
            <TrendingUp size={20} style={{ color: "#F59E0B" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Trending Niches</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Discover what&apos;s hot in Facebook advertising right now</p>
          </div>
        </div>

        {/* Country filter */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {COUNTRIES.map(c => (
            <button key={c.code} onClick={() => setCountry(c.code)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: country === c.code ? "rgba(124,58,237,0.15)" : "transparent",
                color: country === c.code ? "#A78BFA" : "var(--text-muted)",
              }}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-8">
          {[1, 2, 3].map(s => (
            <div key={s}>
              <div className="h-8 w-48 rounded-lg skeleton mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-[180px] rounded-xl skeleton" />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {!loading && data && (
        <div className="space-y-10">
          {/* Hot Right Now */}
          <section>
            <SectionHeader icon={Flame} title="Hot Right Now" subtitle="Most new ads in the last 24 hours" color="#EF4444" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {data.hotNow.map((n, i) => <NicheCard key={n.niche} niche={n} index={i} variant="hot" />)}
            </div>
          </section>

          {/* Rising Fast */}
          <section>
            <SectionHeader icon={Rocket} title="Rising Fast" subtitle="Highest growth this week vs last week" color="#A78BFA" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {data.rising.map((n, i) => <NicheCard key={n.niche} niche={n} index={i} variant="rising" />)}
            </div>
          </section>

          {/* Evergreen */}
          <section>
            <SectionHeader icon={Leaf} title="Evergreen" subtitle="Largest niches with consistent ad volume" color="#34D399" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {data.evergreen.map((n, i) => <NicheCard key={n.niche} niche={n} index={i} variant="evergreen" />)}
            </div>
          </section>
        </div>
      )}

      {/* Empty */}
      {!loading && !data && (
        <div className="flex flex-col items-center justify-center py-20">
          <Sparkles size={32} style={{ color: "#A78BFA" }} />
          <p className="mt-3 font-medium" style={{ color: "var(--text-primary)" }}>No trending data yet</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Data will appear after the daily crawl runs</p>
        </div>
      )}
    </div>
  );
}
