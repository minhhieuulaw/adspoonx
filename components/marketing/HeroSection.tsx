"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";

// Mock ad data for the product preview
const MOCK_ADS = [
  {
    live: "46d",
    brand: "GLOWSKIN CO.",
    name: "GlowSkin Co.",
    desc: "Finally — a serum that works in 7 days or ...",
    tag: "Health & Beauty",
    cta: "Shop Now",
    gradient: "linear-gradient(135deg, rgba(120,60,100,0.6) 0%, rgba(60,80,100,0.5) 100%)",
    tagColor: "#10B981",
  },
  {
    live: "31d",
    brand: "FITPULSE",
    name: "Fitpulse",
    desc: "5-minute morning workout that actually sti...",
    tag: "Fitness",
    cta: "Learn More",
    aiScore: 87,
    aiScoreColor: "#10B981",
    gradient: "linear-gradient(135deg, rgba(80,50,120,0.6) 0%, rgba(60,80,110,0.5) 100%)",
    tagColor: "#8B5CF6",
  },
  {
    live: "12d",
    brand: "AUTODASH",
    name: "AutoDash",
    desc: "Your dashboard—upgraded. Premium mats that...",
    tag: "Automotive",
    cta: "Order Now",
    gradient: "linear-gradient(135deg, rgba(40,80,80,0.6) 0%, rgba(60,90,70,0.5) 100%)",
    tagColor: "#F59E0B",
  },
  {
    live: "22d",
    brand: "LUXECARRY",
    name: "LuxeCarry",
    desc: "Handcrafted leather bags — 40% off this we...",
    tag: "Fashion",
    cta: "Shop Now",
    gradient: "linear-gradient(135deg, rgba(60,50,80,0.5) 0%, rgba(50,60,80,0.4) 100%)",
    tagColor: "#EC4899",
  },
  {
    live: "58d",
    brand: "SLEEPDEEP",
    name: "SleepDeep",
    desc: "Join 50k people sleeping better with our #...",
    tag: "Supplements",
    cta: "Order Now",
    aiScore: 91,
    aiScoreColor: "#A78BFA",
    gradient: "linear-gradient(135deg, rgba(80,40,120,0.6) 0%, rgba(70,60,100,0.5) 100%)",
    tagColor: "#6366F1",
  },
  {
    live: "9d",
    brand: "CHEFMATE",
    name: "ChefMate",
    desc: "The air fryer that cooks 2x faster. 4.8★ ...",
    tag: "Home Appliances",
    cta: "Shop Now",
    gradient: "linear-gradient(135deg, rgba(80,80,40,0.5) 0%, rgba(60,80,60,0.4) 100%)",
    tagColor: "#F97316",
  },
] as const;

// Avatar colors for social proof
const AVATAR_COLORS = ["#F59E0B", "#3B82F6", "#06B6D4", "#10B981", "#EF4444"];

interface MockAd {
  live: string;
  brand: string;
  name: string;
  desc: string;
  tag: string;
  cta: string;
  gradient: string;
  tagColor: string;
  aiScore?: number;
  aiScoreColor?: string;
}

function MockAdCard({ ad, delay }: { ad: MockAd; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="rounded-xl overflow-hidden flex flex-col relative"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Image area */}
      <div
        className="w-full relative overflow-hidden"
        style={{ aspectRatio: "16 / 10", background: ad.gradient }}
      >
        {/* Live badge */}
        <div
          className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold"
          style={{
            background: "rgba(0,0,0,0.5)",
            color: "#fff",
            backdropFilter: "blur(4px)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#10B981" }}
          />
          LIVE · {ad.live}
        </div>

        {/* AI Score badge */}
        {ad.aiScore && (
          <div
            className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: ad.aiScoreColor }}
          >
            {ad.aiScore}
          </div>
        )}

        {/* Brand watermark */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-sm font-bold tracking-[0.2em] uppercase"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            {ad.brand}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col gap-1">
        <span
          className="text-xs font-semibold"
          style={{ color: "var(--text-1)" }}
        >
          {ad.name}
        </span>
        <span
          className="text-[11px] leading-snug"
          style={{ color: "var(--text-3)" }}
        >
          {ad.desc}
        </span>
        <div className="flex items-center justify-between mt-1">
          <span
            className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
            style={{
              background: `${ad.tagColor}20`,
              color: ad.tagColor,
              border: `1px solid ${ad.tagColor}30`,
            }}
          >
            {ad.tag}
          </span>
          <span
            className="text-[10px] font-medium"
            style={{ color: "var(--text-3)" }}
          >
            {ad.cta}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-start px-6 pt-32 pb-0 overflow-hidden">

      {/* ── Background layers ── */}
      {/* Grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 20%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 20%, transparent 80%)",
        }}
      />
      {/* Central orb */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "5%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "700px",
          height: "700px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.22) 0%, rgba(124,58,237,0.06) 40%, transparent 70%)",
          filter: "blur(1px)",
        }}
      />
      {/* Side accent glows */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "20%", left: "-5%",
          width: "320px", height: "320px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          top: "25%", right: "-5%",
          width: "280px", height: "280px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* ── Badge ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs font-semibold"
        style={{
          background: "rgba(124,58,237,0.15)",
          border: "1px solid rgba(124,58,237,0.35)",
          color: "var(--ai-light)",
        }}
      >
        {/* Pulse dot */}
        <span className="relative flex h-2 w-2 shrink-0">
          <span
            className="absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{
              background: "var(--ai-light)",
              animation: "ping 1.4s cubic-bezier(0,0,0.2,1) infinite",
            }}
          />
          <span
            className="relative inline-flex h-2 w-2 rounded-full"
            style={{ background: "var(--ai-light)" }}
          />
        </span>
        10M+ ads tracked across 50+ countries
        <span style={{ color: "var(--text-3)" }}>·</span>
        Updated 3x daily
      </motion.div>

      {/* ── Headline ── */}
      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.1 }}
        className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-center leading-[1.1] max-w-4xl tracking-tight"
        style={{ color: "var(--text-1)" }}
      >
        Outspy your rivals.
        <br />
        <span
          style={{
            background: "linear-gradient(135deg, #10B981 0%, #06B6D4 40%, #8B5CF6 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Scale what wins.
        </span>
      </motion.h1>

      {/* ── Subheadline ── */}
      <motion.p
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-lg md:text-xl text-center max-w-2xl mt-5 leading-relaxed"
        style={{ color: "var(--text-2)" }}
      >
        The Facebook ad intelligence platform for media buyers, agencies, and
        e-commerce brands. Find what converts — before your competitors do.
      </motion.p>

      {/* ── CTAs ── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-col sm:flex-row items-center gap-3 mt-9"
      >
        <Link
          href="/login"
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, var(--ai) 0%, #5B21B6 100%)",
            boxShadow: "0 4px 24px var(--ai-glow), 0 0 0 1px rgba(124,58,237,0.2)",
          }}
        >
          Start for Free
          <ArrowRight size={16} />
        </Link>
        <Link
          href="#features"
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:bg-white/5 active:scale-[0.98]"
          style={{
            border: "1px solid var(--border)",
            color: "var(--text-2)",
          }}
        >
          <Play size={14} />
          See how it works
        </Link>
      </motion.div>

      {/* ── Social proof ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.45 }}
        className="flex flex-col items-center gap-2 mt-6"
      >
        {/* Avatars + rating + teams */}
        <div className="flex items-center gap-3">
          {/* Avatar stack */}
          <div className="flex -space-x-2">
            {AVATAR_COLORS.map((color, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-full border-2"
                style={{
                  background: color,
                  borderColor: "var(--bg-base)",
                  zIndex: AVATAR_COLORS.length - i,
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span style={{ color: "#FBBF24", fontSize: "13px" }}>★★★★★</span>
            <span className="text-sm font-medium" style={{ color: "var(--text-2)" }}>
              2,300+ teams in 50 countries
            </span>
          </div>
        </div>

        {/* Sub-badges */}
        <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-3)" }}>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--text-3)" }} />
            No credit card required
          </span>
          <span className="flex items-center gap-1">
            <span style={{ fontSize: "10px" }}>↗</span>
            Free plan available
          </span>
        </div>
      </motion.div>

      {/* ── Product preview ── */}
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mt-14 w-full max-w-5xl relative"
        style={{ perspective: "1200px" }}
      >
        <div
          className="rounded-2xl overflow-hidden shadow-2xl"
          style={{
            transform: "rotateX(8deg)",
            transformOrigin: "center top",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          {/* macOS browser chrome */}
          <div
            className="flex items-center gap-0 px-4 py-3"
            style={{
              background: "rgba(20,21,30,0.95)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex items-center gap-1.5 mr-4">
              <div className="w-3 h-3 rounded-full" style={{ background: "#FF5F57" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "#FFBD2E" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "#28C840" }} />
            </div>
            {/* URL bar */}
            <div
              className="flex-1 h-6 rounded-md flex items-center px-3 gap-2"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#10B981" }} />
              <span
                className="text-[11px]"
                style={{
                  color: "var(--text-3)",
                  fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                }}
              >
                app.adspoonx.com/ads
              </span>
            </div>
            {/* AI Score active badge */}
            <div
              className="ml-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
              style={{
                background: "rgba(16,185,129,0.15)",
                border: "1px solid rgba(16,185,129,0.3)",
                color: "#10B981",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#10B981" }} />
              AI Score active
            </div>
          </div>

          {/* Dashboard mock content */}
          <div
            className="p-5"
            style={{ background: "rgba(13,14,20,0.98)" }}
          >
            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-4">
              {/* Search bar */}
              <div
                className="flex-1 h-8 rounded-lg flex items-center px-3 gap-2"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }}
              >
                <div className="w-3 h-3 rounded" style={{ background: "rgba(255,255,255,0.15)" }} />
                <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.08)", width: "140px" }} />
              </div>
              {/* Filter buttons */}
              <div
                className="h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-semibold"
                style={{
                  background: "rgba(124,58,237,0.2)",
                  border: "1px solid rgba(124,58,237,0.3)",
                  color: "var(--ai-light)",
                }}
              >
                AI Score ✦
              </div>
              <div
                className="h-8 px-3 rounded-lg flex items-center text-xs font-semibold"
                style={{
                  background: "rgba(59,130,246,0.2)",
                  border: "1px solid rgba(59,130,246,0.3)",
                  color: "#60A5FA",
                }}
              >
                LIVE
              </div>
              <div
                className="h-8 px-3 rounded-lg flex items-center text-xs font-medium"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--border)",
                  color: "var(--text-2)",
                }}
              >
                US · EN
              </div>
            </div>

            {/* Ad cards grid — 2 rows × 3 cols */}
            <div className="grid grid-cols-3 gap-3">
              {MOCK_ADS.map((ad, i) => (
                <MockAdCard key={ad.brand} ad={ad} delay={0.75 + i * 0.07} />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none rounded-b-2xl"
          style={{
            background: "linear-gradient(to top, var(--bg-base) 0%, transparent 100%)",
          }}
        />
      </motion.div>

      {/* Keyframes */}
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </section>
  );
}
