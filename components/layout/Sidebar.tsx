"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sparkles, Store, TrendingUp, Bookmark, Settings, Zap, Database } from "lucide-react";
import { cn } from "@/lib/utils";

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
      { label: "Admin", href: "/admin", icon: Database },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="h-full flex flex-col select-none"
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: 256,
        zIndex: 40,
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--sidebar-border)", height: 56 }}
      >
        <div
          className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, var(--purple), var(--accent))", boxShadow: "0 0 12px rgba(124,58,237,0.4)" }}
        >
          <Zap size={13} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="font-display text-[15px] font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
          adspoon<span style={{ color: "var(--accent)" }}>X</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {NAV.map((group, gi) => (
          <div key={group.label} className={cn(gi > 0 && "mt-4")}>
            <p
              className="px-2 mb-1.5 text-[10px] font-semibold uppercase"
              style={{ color: "var(--text-muted)", letterSpacing: "0.1em" }}
            >
              {group.label}
            </p>

            {group.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;

              return (
                <Link key={item.href} href={item.href} className="block relative">
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                      style={{ background: "var(--accent)" }}
                    />
                  )}

                  <div
                    className="flex items-center gap-3 px-3 py-[7px] rounded-[8px] mb-0.5"
                    style={{
                      background: isActive ? "var(--active-bg)" : "transparent",
                      color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                      transition: "background 120ms var(--ease)",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--hover-bg)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <Icon
                      size={15}
                      strokeWidth={isActive ? 2 : 1.5}
                      style={{ color: isActive ? "var(--text-primary)" : "var(--text-muted)", flexShrink: 0 }}
                    />
                    <span className="flex-1 text-[13px]" style={{ fontWeight: isActive ? 500 : 400 }}>
                      {item.label}
                    </span>
                    {"tag" in item && item.tag && (
                      <span
                        className="text-[9px] font-semibold uppercase px-1.5 py-[2px] rounded-[4px]"
                        style={{ background: "var(--purple-soft)", color: "var(--purple-light)", letterSpacing: "0.06em" }}
                      >
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
      <div className="px-3 py-3 flex-shrink-0" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
        <Link
          href="/pricing"
          className="flex items-center gap-3 px-3 py-2.5 rounded-[9px] w-full"
          style={{ background: "var(--accent-soft)", border: "1px solid rgba(124,58,237,0.2)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.18)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent-soft)"; }}
        >
          <div
            className="w-6 h-6 rounded-[6px] flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, var(--purple), var(--accent))" }}
          >
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
