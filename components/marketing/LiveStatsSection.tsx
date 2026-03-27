"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Database, Zap, Globe, TrendingUp } from "lucide-react";

interface Stats {
  totalAds:    number;
  activeAds:   number;
  countries:   number;
  todayNewAds: number;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

const STATS_CONFIG = [
  {
    key:    "totalAds",
    label:  "Total Ads",
    icon:   Database,
    color:  "var(--ai-light)",
    glow:   "rgba(167,139,250,0.3)",
    suffix: "+",
  },
  {
    key:    "activeAds",
    label:  "Active Now",
    icon:   Zap,
    color:  "var(--green-light)",
    glow:   "rgba(52,211,153,0.3)",
    suffix: "",
  },
  {
    key:    "countries",
    label:  "Countries",
    icon:   Globe,
    color:  "var(--blue-light)",
    glow:   "rgba(96,165,250,0.3)",
    suffix: "+",
  },
  {
    key:    "todayNewAds",
    label:  "New Today",
    icon:   TrendingUp,
    color:  "#FCD34D",
    glow:   "rgba(252,211,77,0.3)",
    suffix: "",
  },
] as const;

export default function LiveStatsSection() {
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/stats")
      .then(r => r.json() as Promise<Stats>)
      .then(d => setStats(d))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-20 px-6 relative overflow-hidden">
      {/* Animated gradient border top */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent 0%, var(--ai) 30%, var(--ai-light) 50%, var(--ai) 70%, transparent 100%)",
          opacity: 0.4,
        }}
      />

      <div className="max-w-5xl mx-auto">

        {/* Live label */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex items-center justify-center gap-2 mb-10"
        >
          {/* Pulsing green dot */}
          <span className="relative flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full rounded-full animate-ping"
              style={{ background: "var(--green)", opacity: 0.6 }}
            />
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ background: "var(--green)" }}
            />
          </span>
          <span
            className="text-xs font-semibold uppercase tracking-[0.16em]"
            style={{ color: "var(--text-2)" }}
          >
            Live database stats
          </span>
          <span
            className="text-xs"
            style={{ color: "var(--text-3)" }}
          >
            — updated every 5 minutes
          </span>
        </motion.div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS_CONFIG.map(({ key, label, icon: Icon, color, glow, suffix }, i) => {
            const value = stats ? stats[key] : null;
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className="rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid var(--border)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                }}
                whileHover={{
                  borderColor: color as string,
                  boxShadow: `0 0 24px ${glow}`,
                  y: -2,
                }}
              >
                {/* Card glow accent */}
                <div
                  className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none"
                  style={{
                    background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`,
                    transform: "translate(30%, -30%)",
                  }}
                />

                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${color === "var(--ai-light)" ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.06)"}` }}
                >
                  <Icon size={18} style={{ color }} strokeWidth={1.8} />
                </div>

                {/* Number */}
                <div>
                  <p
                    className="text-3xl font-extrabold leading-none"
                    style={{
                      color: "var(--text-1)",
                      fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                      filter: loading || value === null ? "none" : `drop-shadow(0 0 8px ${glow})`,
                    }}
                  >
                    {loading || value === null ? (
                      <span
                        className="inline-block h-8 w-24 rounded-lg animate-pulse"
                        style={{ background: "rgba(255,255,255,0.07)" }}
                      />
                    ) : (
                      `${fmtNum(value)}${suffix}`
                    )}
                  </p>
                  <p
                    className="text-xs mt-1.5 font-medium"
                    style={{ color: "var(--text-2)" }}
                  >
                    {label}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
