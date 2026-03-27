"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";

const NAV_LINKS = ["Features", "Pricing", "FAQ"] as const;

export default function MarketingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed left-0 right-0 z-50"
        style={{ top: "var(--banner-h, 0px)", transition: "top 0.2s ease" }}
      >
        {/* Gradient progress border-bottom on scroll */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px transition-opacity duration-300"
          style={{
            background: "linear-gradient(90deg, transparent, var(--ai), var(--ai-light), var(--ai), transparent)",
            opacity: scrolled ? 1 : 0,
          }}
        />

        <div
          className="flex items-center justify-between px-6 md:px-10 py-3.5"
          style={{
            background: scrolled
              ? "rgba(13,14,20,0.92)"
              : "rgba(13,14,20,0.75)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderBottom: scrolled ? "none" : "1px solid var(--border)",
            transition: "background 0.3s ease",
          }}
        >
          {/* Logo */}
          <Link href="/home" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-transparent.png"
              alt="AdSpoonX"
              className="h-7"
              style={{ filter: "invert(1)", objectFit: "contain" }}
            />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm px-3 py-1.5 rounded-lg transition-all duration-200 hover:bg-white/5 hover:text-white"
                style={{ color: "var(--text-2)" }}
              >
                {item}
              </a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/login"
              className="text-sm font-medium px-4 py-1.5 rounded-lg transition-all duration-200 hover:bg-white/5 hover:text-white"
              style={{ color: "var(--text-2)" }}
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg text-white transition-all duration-200 hover:opacity-90 active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg, var(--ai) 0%, #5B21B6 100%)",
                boxShadow: "0 0 20px var(--ai-glow)",
              }}
            >
              Get Started Free
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: "var(--text-2)" }}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile menu drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed left-0 right-0 z-40 md:hidden flex flex-col gap-1 px-4 pb-4 pt-2"
            style={{
              top: `calc(var(--banner-h, 0px) + 56px)`,
              background: "rgba(13,14,20,0.97)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {NAV_LINKS.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                onClick={() => setMobileOpen(false)}
                className="text-sm px-3 py-2.5 rounded-lg transition-colors hover:bg-white/5"
                style={{ color: "var(--text-2)" }}
              >
                {item}
              </a>
            ))}
            <div className="flex flex-col gap-2 mt-2 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="text-sm font-medium text-center py-2.5 rounded-lg transition-colors hover:bg-white/5"
                style={{ color: "var(--text-2)" }}
              >
                Sign in
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-lg text-white"
                style={{
                  background: "linear-gradient(135deg, var(--ai) 0%, #5B21B6 100%)",
                  boxShadow: "0 0 20px var(--ai-glow)",
                }}
              >
                Get Started Free <ArrowRight size={14} />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
