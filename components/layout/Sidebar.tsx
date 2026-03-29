"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sparkles, Store, TrendingUp, Bookmark, Settings, Zap, Database, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

// Admin check moved server-side — no more NEXT_PUBLIC_ADMIN_EMAILS exposure

const NAV = [
  {
    label: "Workspace",
    items: [{ label: "Home", href: "/home-dashboard", icon: Home }],
  },
  {
    label: "Tools",
    items: [
      { label: "Ads Finder",      href: "/ads",      icon: Sparkles },
      { label: "Potential Store", href: "/stores",   icon: Store },
      { label: "Trending Niche",  href: "/trending", icon: TrendingUp, tag: "new" },
      { label: "Saved",           href: "/saved",    icon: Bookmark },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Admin",    href: "/admin",    icon: Database },
    ],
  },
];

function NavContent({ onClose, isAdmin }: { onClose?: () => void; isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <aside
      className="h-full flex flex-col select-none"
      style={{
        width: 256,
        background: "linear-gradient(180deg, #181A32 0%, #111228 50%, #0C0D1E 100%)",
        borderRight: "1px solid rgba(124,58,237,0.15)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(124,58,237,0.14)", height: 56, background: "rgba(124,58,237,0.05)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-transparent.png" alt="AdSpoonX" className="h-[60px] flex-shrink-0" style={{ filter: "invert(1)", objectFit: "contain" }} />
        <span className="flex-1" />
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-[6px] md:hidden"
            style={{ color: "var(--text-muted)", background: "var(--hover-bg)" }}>
            <X size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {NAV.map((group, gi) => (
          <div key={group.label} className={cn(gi > 0 && "mt-4")}>
            <p className="px-2 mb-2 mt-1 text-[9px] font-bold uppercase"
              style={{ color: "rgba(167,139,250,0.45)", letterSpacing: "0.14em" }}>
              {group.label}
            </p>
            {group.items.filter(item => item.href !== "/admin" || isAdmin).map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="block relative" onClick={() => onClose?.()}>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                      style={{ background: "var(--accent)" }} />
                  )}
                  <div className="flex items-center gap-3 px-3 py-2 rounded-[9px] mb-0.5"
                    style={{
                      background: isActive ? "rgba(124,58,237,0.18)" : "transparent",
                      color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                      boxShadow: isActive ? "inset 0 0 0 1px rgba(124,58,237,0.25), 0 0 16px rgba(124,58,237,0.10)" : "none",
                      transition: "background 150ms var(--ease), box-shadow 200ms var(--ease)",
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <Icon size={15} strokeWidth={isActive ? 2 : 1.5}
                      style={{ color: isActive ? "var(--ai-light)" : "var(--text-muted)", flexShrink: 0 }} />
                    <span className="flex-1 text-[13px]" style={{ fontWeight: isActive ? 600 : 400 }}>
                      {item.label}
                    </span>
                    {"tag" in item && item.tag && (
                      <span className="text-[9px] font-semibold uppercase px-1.5 py-[2px] rounded-[4px]"
                        style={{ background: "var(--purple-soft)", color: "var(--purple-light)", letterSpacing: "0.06em" }}>
                        {item.tag}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Upgrade */}
      <div className="px-3 py-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(124,58,237,0.15)" }}>
        <Link href="/pricing"
          className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] w-full"
          style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.20) 0%, rgba(79,70,229,0.10) 100%)",
            border: "1px solid rgba(124,58,237,0.35)",
            transition: "background 150ms var(--ease), box-shadow 150ms var(--ease)",
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = "linear-gradient(135deg, rgba(124,58,237,0.26) 0%, rgba(79,70,229,0.16) 100%)";
            el.style.boxShadow = "0 0 20px rgba(124,58,237,0.25), inset 0 0 0 1px rgba(167,139,250,0.15)";
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = "linear-gradient(135deg, rgba(124,58,237,0.16) 0%, rgba(79,70,229,0.08) 100%)";
            el.style.boxShadow = "none";
          }}
        >
          <div className="w-6 h-6 rounded-[6px] flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, var(--purple), var(--accent))" }}>
            <Zap size={11} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold" style={{ color: "var(--accent-light)" }}>Upgrade to Pro</p>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Unlimited access</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.email) {
      fetch("/api/auth/me").then(r => r.json()).then(d => setIsAdmin(d.isAdmin)).catch(() => {});
    }
  }, [session?.user?.email]);

  useEffect(() => {
    const handler = () => setMobileOpen(v => !v);
    window.addEventListener("toggle-sidebar", handler);
    return () => window.removeEventListener("toggle-sidebar", handler);
  }, []);

  return (
    <>
      {/* ── Desktop: always visible via CSS, hidden on mobile ── */}
      <div className="hidden md:block" style={{ position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 40, width: 256 }}>
        <NavContent isAdmin={isAdmin} />
      </div>

      {/* ── Mobile: overlay drawer controlled by JS ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="sb-backdrop"
              className="md:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, zIndex: 49, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              key="sb-drawer"
              className="md:hidden"
              initial={{ x: -256 }} animate={{ x: 0 }} exit={{ x: -256 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              style={{ position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 50, width: 256 }}
            >
              <NavContent onClose={() => setMobileOpen(false)} isAdmin={isAdmin} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
