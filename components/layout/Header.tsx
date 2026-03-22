"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LogOut, User, Bell, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { Locale } from "@/lib/i18n/translations";

const PLAN_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  free:     { bg: "rgba(100,100,120,0.12)", color: "var(--text-muted)",  border: "rgba(100,100,120,0.2)" },
  starter:  { bg: "rgba(59,130,246,0.12)", color: "#60A5FA",            border: "rgba(59,130,246,0.25)" },
  premium:  { bg: "rgba(124,58,237,0.12)", color: "var(--ai-light)",    border: "rgba(124,58,237,0.25)" },
  business: { bg: "rgba(245,158,11,0.12)", color: "#FCD34D",            border: "rgba(245,158,11,0.25)" },
};

export default function Header() {
  const { data: session } = useSession();
  const { locale, setLocale } = useLanguage();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [plan, setPlan] = useState<string>("free");

  useEffect(() => {
    fetch("/api/me/plan").then(r => r.json()).then(d => { if (d.plan) setPlan(d.plan); }).catch(() => null);
  }, [session?.user?.id]);

  function toggleLocale() {
    setLocale(locale === "en" ? "vi" : ("en" as Locale));
  }

  return (
    <header
      className="flex items-center gap-3 px-5"
      style={{
        position: "fixed",
        top: 0,
        left: 256,
        right: 0,
        height: 56,
        zIndex: 30,
        background: "rgba(17,17,19,0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--sidebar-border)",
      }}
    >
      {/* Spacer */}
      <div className="flex-1" />

      {/* Right controls */}
      <div className="flex items-center gap-1.5">
        {/* Notifications (placeholder) */}
        <button
          className="w-7 h-7 rounded-[6px] flex items-center justify-center transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--hover-bg)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
          title="Notifications"
        >
          <Bell size={14} strokeWidth={1.5} />
        </button>

        {/* Language toggle */}
        <button
          onClick={toggleLocale}
          className="flex items-center gap-1 px-2 py-1 rounded-[6px] text-[11px] font-medium transition-colors"
          style={{ background: "var(--hover-bg)", border: "1px solid var(--card-border)", color: "var(--text-secondary)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--active-bg)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--hover-bg)"; }}
          title="Switch language"
        >
          <span style={{ color: locale === "en" ? "var(--accent-light)" : "var(--text-muted)" }}>EN</span>
          <span style={{ color: "var(--text-muted)" }}>/</span>
          <span style={{ color: locale === "vi" ? "var(--accent-light)" : "var(--text-muted)" }}>VI</span>
        </button>

        {/* Plan badge */}
        <Link
          href="/pricing"
          className="flex items-center gap-1 px-2 py-1 rounded-[6px] text-[10px] font-semibold uppercase transition-opacity hover:opacity-80"
          style={{
            background: PLAN_COLORS[plan]?.bg ?? PLAN_COLORS.free.bg,
            color: PLAN_COLORS[plan]?.color ?? PLAN_COLORS.free.color,
            border: `1px solid ${PLAN_COLORS[plan]?.border ?? PLAN_COLORS.free.border}`,
            letterSpacing: "0.06em",
          }}
        >
          {plan !== "free" && <Zap size={9} strokeWidth={2.5} />}
          {plan.toUpperCase()}
        </Link>

        {/* Divider */}
        <div className="w-px h-4 mx-0.5" style={{ background: "var(--sidebar-border)" }} />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-[7px] transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--hover-bg)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            {session?.user?.image ? (
              <Image src={session.user.image} alt={session.user.name ?? "User"} width={22} height={22} className="rounded-full" />
            ) : (
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--purple), var(--accent))" }}>
                <User size={11} className="text-white" strokeWidth={2} />
              </div>
            )}
            <span className="text-[12px] font-medium max-w-[90px] truncate" style={{ color: "var(--text-secondary)" }}>
              {session?.user?.name ?? "User"}
            </span>
            <ChevronDown
              size={11}
              strokeWidth={1.5}
              style={{
                color: "var(--text-muted)",
                transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform var(--duration) var(--ease)",
              }}
            />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.97 }}
                transition={{ duration: 0.1, ease: [0.2, 0, 0, 1] }}
                className="absolute right-0 top-full mt-1.5 w-48 rounded-[10px] py-1 z-50"
                style={{
                  background: "var(--elevated-bg)",
                  border: "1px solid var(--card-border)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}
              >
                <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
                  <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
                    {session?.user?.email}
                  </p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] transition-colors"
                  style={{ color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--hover-bg)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
                >
                  <LogOut size={12} strokeWidth={1.5} />
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
