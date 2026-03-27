"use client";

import { motion } from "framer-motion";
import { Search, TrendingUp, Bookmark, Globe, Zap, BarChart2 } from "lucide-react";

// ── Decorative mini-elements for large cards ──────────────────────────────────

function MiniSearchIllustration() {
  return (
    <div className="mt-4 flex flex-col gap-2 opacity-60">
      {[90, 70, 80].map((w, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="h-1.5 rounded-full"
            style={{ width: `${w}%`, background: "rgba(167,139,250,0.35)" }}
          />
          <div
            className="h-1.5 w-6 rounded-full shrink-0"
            style={{ background: "rgba(124,58,237,0.4)" }}
          />
        </div>
      ))}
      <div
        className="mt-1 self-start px-2 py-0.5 rounded text-[10px] font-semibold"
        style={{
          background: "rgba(124,58,237,0.25)",
          color: "var(--ai-light)",
          border: "1px solid rgba(124,58,237,0.3)",
        }}
      >
        10,482 results
      </div>
    </div>
  );
}

function MiniChartIllustration() {
  const bars = [40, 65, 50, 85, 70, 95, 78];
  return (
    <div className="mt-4 flex items-end gap-1.5 h-12 opacity-70">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm"
          style={{
            height: `${h}%`,
            background: i === bars.length - 1
              ? "var(--ai-light)"
              : "rgba(167,139,250,0.3)",
          }}
        />
      ))}
    </div>
  );
}

function MiniGlobeSVG() {
  return (
    <svg
      className="mt-3 opacity-50"
      width="56"
      height="56"
      viewBox="0 0 56 56"
      fill="none"
      style={{ color: "var(--ai-light)" }}
    >
      <circle cx="28" cy="28" r="22" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      <ellipse cx="28" cy="28" rx="10" ry="22" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
      <line x1="6" y1="28" x2="50" y2="28" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
      <line x1="10" y1="18" x2="46" y2="18" stroke="currentColor" strokeWidth="1" opacity="0.25" />
      <line x1="10" y1="38" x2="46" y2="38" stroke="currentColor" strokeWidth="1" opacity="0.25" />
      {[{ cx: 20, cy: 22 }, { cx: 34, cy: 30 }, { cx: 28, cy: 16 }].map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r="2.5" fill="currentColor" opacity="0.7" />
      ))}
    </svg>
  );
}

function MiniRealtimePulse() {
  return (
    <div className="mt-4 flex items-center gap-3">
      <div className="relative">
        <div
          className="w-3 h-3 rounded-full"
          style={{ background: "var(--green)" }}
        />
        <div
          className="absolute inset-0 w-3 h-3 rounded-full animate-ping"
          style={{ background: "var(--green)", opacity: 0.5 }}
        />
      </div>
      <div className="flex flex-col gap-1">
        <div className="h-1.5 w-32 rounded-full" style={{ background: "rgba(52,211,153,0.3)" }} />
        <div className="h-1.5 w-20 rounded-full" style={{ background: "rgba(52,211,153,0.2)" }} />
      </div>
    </div>
  );
}

// ── Feature card configs ──────────────────────────────────────────────────────

const BENTO = [
  {
    id: "search",
    icon: Search,
    iconColor: "var(--ai-light)",
    iconBg: "rgba(124,58,237,0.2)",
    title: "Ads Search",
    description: "Search millions of Facebook ads by keyword, brand, or niche. Filter by country, status, and date range.",
    span: "col-span-2",
    Decoration: MiniSearchIllustration,
  },
  {
    id: "countries",
    icon: Globe,
    iconColor: "var(--blue-light)",
    iconBg: "rgba(59,130,246,0.2)",
    title: "Multi-Country",
    description: "Spy on ads running in 50+ markets simultaneously.",
    span: "col-span-1",
    Decoration: MiniGlobeSVG,
  },
  {
    id: "trending",
    icon: TrendingUp,
    iconColor: "#FCD34D",
    iconBg: "rgba(245,158,11,0.2)",
    title: "Trending Ads",
    description: "See the highest-impression ads sorted by engagement in real time.",
    span: "col-span-1",
    Decoration: undefined,
  },
  {
    id: "save",
    icon: Bookmark,
    iconColor: "var(--green-light)",
    iconBg: "rgba(16,185,129,0.2)",
    title: "Save & Organize",
    description: "Bookmark winning ads to your personal collection. Organize by campaign, niche, or client.",
    span: "col-span-1",
    Decoration: undefined,
  },
  {
    id: "realtime",
    icon: Zap,
    iconColor: "var(--ai-light)",
    iconBg: "rgba(124,58,237,0.2)",
    title: "Real-Time Data",
    description: "Pulled directly from Facebook's official Ads Library API. Always fresh, always accurate.",
    span: "col-span-1 row-span-1",
    Decoration: MiniRealtimePulse,
  },
  {
    id: "analytics",
    icon: BarChart2,
    iconColor: "#67E8F9",
    iconBg: "rgba(6,182,212,0.2)",
    title: "Impression Analytics",
    description: "See estimated reach and impression ranges. Identify viral creatives before they peak.",
    span: "col-span-2",
    Decoration: MiniChartIllustration,
  },
] as const;

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <span
            className="text-xs font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--ai-light)" }}
          >
            Features
          </span>
          <h2
            className="text-4xl md:text-5xl font-bold mt-3 leading-tight"
            style={{ color: "var(--text-1)" }}
          >
            Everything you need
            <br />
            to spy smarter
          </h2>
          <p className="mt-4 text-base max-w-lg mx-auto leading-relaxed" style={{ color: "var(--text-2)" }}>
            Stop guessing. Start spying on what actually works in your market.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
        >
          {BENTO.map((card, i) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.07 }}
              className={`${card.span} rounded-2xl p-6 flex flex-col group cursor-default transition-all duration-300`}
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid var(--border)",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
              }}
              whileHover={{
                borderColor: "rgba(167,139,250,0.4)",
                boxShadow: "0 0 28px rgba(124,58,237,0.12), 0 4px 24px rgba(0,0,0,0.3)",
                y: -2,
              }}
            >
              {/* Icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: card.iconBg }}
              >
                <card.icon size={20} style={{ color: card.iconColor }} />
              </div>

              {/* Text */}
              <h3
                className="font-semibold mt-4 text-base"
                style={{ color: "var(--text-1)" }}
              >
                {card.title}
              </h3>
              <p
                className="text-sm leading-relaxed mt-1.5"
                style={{ color: "var(--text-2)" }}
              >
                {card.description}
              </p>

              {/* Decoration */}
              {card.Decoration && <card.Decoration />}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
