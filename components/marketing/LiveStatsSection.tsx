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
  { key: "totalAds",    label: "Tổng ads",        icon: Database,  color: "#A78BFA", suffix: "+" },
  { key: "activeAds",   label: "Ads đang chạy",   icon: Zap,       color: "#34D399", suffix: "" },
  { key: "countries",   label: "Quốc gia",         icon: Globe,     color: "#60A5FA", suffix: "+" },
  { key: "todayNewAds", label: "Mới hôm nay",      icon: TrendingUp, color: "#FCD34D", suffix: "" },
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
    <section className="py-16 px-6" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
      <div className="max-w-5xl mx-auto">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-xs font-semibold uppercase tracking-widest mb-8"
          style={{ color: "var(--text-secondary)" }}
        >
          Live database stats — cập nhật mỗi 5 phút
        </motion.p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS_CONFIG.map(({ key, label, icon: Icon, color, suffix }, i) => {
            const value = stats ? stats[key] : null;
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl p-5 flex flex-col gap-3"
                style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `${color}20` }}
                >
                  <Icon size={18} style={{ color }} strokeWidth={1.8} />
                </div>
                <div>
                  <p
                    className="text-2xl font-extrabold leading-none"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {loading || value === null ? (
                      <span
                        className="inline-block h-7 w-20 rounded animate-pulse"
                        style={{ background: "var(--card-border)" }}
                      />
                    ) : (
                      `${fmtNum(value)}${suffix}`
                    )}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
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
