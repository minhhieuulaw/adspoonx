"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LogOut, User, Bell, Zap, Menu, TrendingUp, Database, Star, Info } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { Locale } from "@/lib/i18n/translations";

// ── Notification types ────────────────────────────────────────────────────────

interface Notification {
  id: string;
  type: "info" | "update" | "tip" | "stats";
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const NOTIF_ICON = {
  info: Info,
  update: Database,
  tip: Star,
  stats: TrendingUp,
};
const NOTIF_COLOR = {
  info: "#60A5FA",
  update: "#34D399",
  tip: "#FCD34D",
  stats: "#A78BFA",
};

const PLAN_COLORS: Record<string, { bg: string; color: string; border: string; shadow?: string }> = {
  free:     { bg: "rgba(80,80,100,0.10)",  color: "var(--text-muted)",  border: "rgba(100,100,120,0.15)" },
  starter:  { bg: "rgba(59,130,246,0.12)", color: "#60A5FA",            border: "rgba(59,130,246,0.28)" },
  premium:  {
    bg: "linear-gradient(135deg, rgba(124,58,237,0.22) 0%, rgba(79,70,229,0.14) 100%)",
    color: "#C4B5FD",
    border: "rgba(167,139,250,0.40)",
    shadow: "0 0 12px rgba(124,58,237,0.30), inset 0 1px 0 rgba(255,255,255,0.08)",
  },
  business: { bg: "rgba(245,158,11,0.13)", color: "#FCD34D",            border: "rgba(245,158,11,0.28)" },
};

export default function Header() {
  const { data: session } = useSession();
  const { locale, setLocale } = useLanguage();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [plan, setPlan] = useState<string>("free");
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    fetch("/api/me/plan").then(r => r.json()).then(d => { if (d.plan) setPlan(d.plan); }).catch(() => null);
  }, [session?.user?.id]);

  // Generate contextual notifications from stats (with AbortController cleanup)
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/stats", { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        const notifs: Notification[] = [];
        const now = new Date().toISOString();
        if (data.totalAds) {
          notifs.push({
            id: "db-stats", type: "stats", read: false, time: now,
            title: `${data.totalAds.toLocaleString()} ads in database`,
            body: `${data.activeAds?.toLocaleString() ?? 0} active ads across ${data.countries ?? 1} market${(data.countries ?? 1) > 1 ? "s" : ""}.`,
          });
        }
        if (data.videoCount) {
          notifs.push({
            id: "video-count", type: "info", read: false, time: now,
            title: `${data.videoCount.toLocaleString()} video ads available`,
            body: "Filter by video to find high-performing creatives.",
          });
        }
        notifs.push({
          id: "tip-1", type: "tip", read: false, time: now,
          title: "Pro tip: Use AI Score filter",
          body: "Filter by \"Elite\" (85+) to see only top-performing ads worth studying.",
        });
        if (data.recentCount > 0) {
          notifs.push({
            id: "recent", type: "update", read: false, time: now,
            title: "Fresh ads added",
            body: `${data.recentCount} new ads added this week.`,
          });
        }
        setNotifications(notifs);
      })
      .catch(e => { if (e.name !== "AbortError") console.error(e); });
    return () => controller.abort();
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;
  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  function toggleLocale() {
    setLocale(locale === "en" ? "vi" : ("en" as Locale));
  }

  function toggleSidebar() {
    window.dispatchEvent(new Event("toggle-sidebar"));
  }

  return (
    <header
      className="flex items-center gap-2 px-4 fixed top-0 right-0 left-0 md:left-64"
      style={{
        height: 56,
        zIndex: 30,
        background: "rgba(7,8,16,0.94)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 1px 0 rgba(124,58,237,0.10), 0 4px 24px rgba(0,0,0,0.40)",
      }}
    >
      {/* Hamburger — mobile only (hidden on md+) */}
      <button
        onClick={toggleSidebar}
        className="md:hidden w-8 h-8 rounded-[7px] flex items-center justify-center flex-shrink-0"
        style={{ color: "var(--text-secondary)", background: "var(--hover-bg)", border: "1px solid var(--card-border)" }}
      >
        <Menu size={15} strokeWidth={1.8} />
      </button>

      {/* App name — mobile only */}
      <span className="md:hidden font-display text-[14px] font-bold flex-shrink-0"
        style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
        adspoon<span style={{ color: "var(--accent)" }}>X</span>
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right controls */}
      <div className="flex items-center gap-1.5">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(v => !v); setDropdownOpen(false); }}
            className="w-7 h-7 rounded-[6px] flex items-center justify-center transition-colors relative"
            style={{ color: notifOpen ? "var(--text-primary)" : "var(--text-muted)", background: notifOpen ? "var(--hover-bg)" : "transparent" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--hover-bg)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
            onMouseLeave={(e) => { if (!notifOpen) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; } }}
            title="Notifications"
          >
            <Bell size={14} strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white"
                style={{ background: "#EF4444", lineHeight: 1 }}>
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1.5 w-72 rounded-[12px] z-50 overflow-hidden"
                  style={{
                    background: "linear-gradient(160deg, #1C1D2E 0%, #161724 100%)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    boxShadow: "0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(124,58,237,0.08)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-3.5 py-2.5" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
                    <p className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>Notifications</p>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-[10px] font-medium" style={{ color: "var(--ai-light)" }}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  {/* Items */}
                  <div className="max-h-[320px] overflow-y-auto no-scrollbar">
                    {notifications.map(n => {
                      const Icon = NOTIF_ICON[n.type];
                      const color = NOTIF_COLOR[n.type];
                      return (
                        <div key={n.id}
                          className="flex items-start gap-2.5 px-3.5 py-2.5"
                          style={{
                            background: n.read ? "transparent" : "rgba(124,58,237,0.04)",
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                          }}
                        >
                          <div className="w-6 h-6 rounded-[6px] flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                            <Icon size={11} style={{ color }} strokeWidth={1.8} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold" style={{ color: n.read ? "var(--text-secondary)" : "var(--text-primary)" }}>
                              {n.title}
                            </p>
                            <p className="text-[10px] mt-0.5 leading-snug" style={{ color: "var(--text-muted)" }}>
                              {n.body}
                            </p>
                          </div>
                          {!n.read && (
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: "var(--ai-light)" }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

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
          className="flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-[10px] font-bold uppercase"
          style={{
            background: PLAN_COLORS[plan]?.bg ?? PLAN_COLORS.free.bg,
            color: PLAN_COLORS[plan]?.color ?? PLAN_COLORS.free.color,
            border: `1px solid ${PLAN_COLORS[plan]?.border ?? PLAN_COLORS.free.border}`,
            boxShadow: PLAN_COLORS[plan]?.shadow ?? "none",
            letterSpacing: "0.07em",
            transition: "opacity 150ms",
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
            <span className="text-[12px] font-medium max-w-[80px] truncate hidden sm:inline" style={{ color: "var(--text-secondary)" }}>
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
                  background: "linear-gradient(160deg, #1C1D2E 0%, #161724 100%)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(124,58,237,0.06)",
                  backdropFilter: "blur(12px)",
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
