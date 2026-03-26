"use client";

import Link from "next/link";
import { motion } from "framer-motion";



export default function MarketingNav() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
      style={{
        top: "var(--banner-h, 0px)",
        transition: "top 0.2s ease",
        background: "rgba(15,17,23,0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--sidebar-border)",
      }}
    >
      {/* Logo */}
      <Link href="/home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-transparent.png" alt="AdSpoonX" className="h-7" style={{ filter: "invert(1)", objectFit: "contain" }} />
      </Link>

      {/* Nav links */}
      <div className="hidden md:flex items-center gap-6">
        {["Features", "Pricing", "FAQ"].map((item) => (
          <a
            key={item}
            href={`#${item.toLowerCase()}`}
            className="text-sm transition-colors hover:text-white"
            style={{ color: "var(--text-secondary)" }}
          >
            {item}
          </a>
        ))}
      </div>

      {/* CTA */}
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="text-sm font-medium transition-colors hover:text-white"
          style={{ color: "var(--text-secondary)" }}
        >
          Sign in
        </Link>
        <Link
          href="/login"
          className="text-sm font-semibold px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
        >
          Get Started Free
        </Link>
      </div>
    </motion.nav>
  );
}
