"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Zap, TrendingUp, Search } from "lucide-react";

const stats = [
  { value: "10M+", label: "Ads tracked" },
  { value: "50+", label: "Countries" },
  { value: "Real-time", label: "Data updates" },
];

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }}
      />

      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-xs font-semibold"
        style={{
          background: "rgba(99,102,241,0.15)",
          border: "1px solid rgba(99,102,241,0.3)",
          color: "#818cf8",
        }}
      >
        <Zap size={12} />
        Powered by Facebook Ads Library API
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-center leading-tight max-w-4xl"
        style={{ color: "var(--text-primary)" }}
      >
        Spy on winning{" "}
        <span
          className="relative inline-block"
          style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Facebook Ads
        </span>
        <br />
        before your competitors do.
      </motion.h1>

      {/* Subheadline */}
      <motion.p
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-lg md:text-xl text-center max-w-2xl mt-6 leading-relaxed"
        style={{ color: "var(--text-secondary)" }}
      >
        Discover trending ads, analyze competitors, and find winning creatives.
        Built for e-commerce brands, agencies, and media buyers.
      </motion.p>

      {/* CTA buttons */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-col sm:flex-row items-center gap-3 mt-10"
      >
        <Link
          href="/login"
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition-all hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98]"
        >
          Start for free
          <ArrowRight size={16} />
        </Link>
        <Link
          href="#features"
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-colors hover:bg-white/5"
          style={{
            border: "1px solid var(--card-border)",
            color: "var(--text-secondary)",
          }}
        >
          See how it works
        </Link>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="flex items-center gap-8 mt-16"
      >
        {stats.map((stat, i) => (
          <div key={i} className="text-center">
            <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              {stat.value}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {stat.label}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Mock dashboard preview */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.5 }}
        className="mt-16 w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl"
        style={{
          border: "1px solid var(--card-border)",
          background: "var(--content-bg)",
        }}
      >
        {/* Fake browser bar */}
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{ background: "var(--sidebar-bg)", borderBottom: "1px solid var(--card-border)" }}
        >
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
          <div
            className="flex-1 mx-4 h-6 rounded-md flex items-center px-3"
            style={{ background: "var(--card-bg)" }}
          >
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              app.adspoonx.com/ads
            </span>
          </div>
        </div>

        {/* Mock content */}
        <div className="p-6 grid grid-cols-3 gap-4">
          {[
            { icon: Search, label: "Search Ads", color: "#6366f1" },
            { icon: TrendingUp, label: "Trending", color: "#f59e0b" },
            { icon: Zap, label: "Analytics", color: "#10b981" },
          ].map(({ icon: Icon, label, color }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="rounded-xl p-4 flex flex-col gap-3"
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${color}20` }}
              >
                <Icon size={16} style={{ color }} />
              </div>
              <div>
                <div className="h-3 rounded mb-2" style={{ background: "var(--card-border)", width: "60%" }} />
                <div className="h-2 rounded mb-1.5" style={{ background: "var(--sidebar-border)", width: "90%" }} />
                <div className="h-2 rounded" style={{ background: "var(--sidebar-border)", width: "70%" }} />
              </div>
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
