"use client";

import { motion } from "framer-motion";
import { Search, TrendingUp, Bookmark, Globe, Zap, BarChart2 } from "lucide-react";

const features = [
  {
    icon: Search,
    color: "#6366f1",
    title: "Ads Search",
    description:
      "Search millions of Facebook ads by keyword, brand, or niche. Filter by country, status, and date range.",
  },
  {
    icon: TrendingUp,
    color: "#f59e0b",
    title: "Trending Ads",
    description:
      "Discover what's working right now. See the highest-impression ads sorted by engagement in real time.",
  },
  {
    icon: Bookmark,
    color: "#10b981",
    title: "Save & Organize",
    description:
      "Bookmark winning ads to your personal collection. Organize by campaign, niche, or client.",
  },
  {
    icon: Globe,
    color: "#ec4899",
    title: "Multi-Country",
    description:
      "Spy on ads running in Vietnam, US, Thailand, and 50+ other markets simultaneously.",
  },
  {
    icon: Zap,
    color: "#8b5cf6",
    title: "Real-Time Data",
    description:
      "Data pulled directly from Facebook's official Ads Library API. Always fresh, always accurate.",
  },
  {
    icon: BarChart2,
    color: "#06b6d4",
    title: "Impression Analytics",
    description:
      "See estimated reach and impression ranges for any ad. Identify viral creatives before they peak.",
  },
];

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
          className="text-center mb-16"
        >
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "#818cf8" }}
          >
            Features
          </span>
          <h2
            className="text-4xl font-bold mt-3"
            style={{ color: "var(--text-primary)" }}
          >
            Everything you need to find
            <br />
            winning ad creatives
          </h2>
          <p className="mt-4 text-lg max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
            Stop guessing. Start spying on what actually works in your market.
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className="rounded-2xl p-6 flex flex-col gap-4 group hover:border-indigo-500/50 transition-colors"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${feat.color}20` }}
              >
                <feat.icon size={20} style={{ color: feat.color }} />
              </div>
              <div>
                <h3 className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                  {feat.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {feat.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
