"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { Settings, Zap, Bookmark, LogOut, Crown, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface PlanData { plan: string; label: string }
interface SavedData { length: number }

const PLAN_META: Record<string, { color: string; bg: string; border: string; icon: React.ElementType; limit: number }> = {
  free:     { color: "var(--text-muted)",  bg: "rgba(100,100,120,0.08)", border: "rgba(100,100,120,0.15)", icon: Settings, limit: 10  },
  starter:  { color: "#60A5FA",            bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.2)",  icon: Zap,      limit: 100 },
  premium:  { color: "var(--ai-light)",    bg: "rgba(124,58,237,0.08)", border: "rgba(124,58,237,0.2)",  icon: Crown,    limit: 500 },
  business: { color: "#FCD34D",            bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)",  icon: Crown,    limit: 9999 },
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const [planData, setPlanData]   = useState<PlanData>({ plan: "free", label: "Free" });
  const [savedCount, setSavedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/me/plan").then(r => r.json() as Promise<PlanData>),
      fetch("/api/saved").then(r => r.json() as Promise<unknown[]>),
    ]).then(([p, s]) => {
      setPlanData(p);
      setSavedCount(Array.isArray(s) ? s.length : 0);
    }).catch(() => null).finally(() => setLoading(false));
  }, []);

  const meta  = PLAN_META[planData.plan] ?? PLAN_META.free;
  const PlanIcon = meta.icon;
  const usagePct = Math.min(100, Math.round((savedCount / meta.limit) * 100));

  return (
    <div className="page-enter max-w-xl">

      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Settings size={15} style={{ color: "var(--ai-light)" }} />
        <h1 className="font-display text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>
          Settings
        </h1>
      </div>

      {/* Profile card */}
      <div className="rounded-[12px] p-4 mb-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <p className="text-[11px] font-semibold uppercase mb-3" style={{ color: "var(--text-3)", letterSpacing: "0.08em" }}>Account</p>
        <div className="flex items-center gap-3">
          {session?.user?.image ? (
            <Image src={session.user.image} alt={session.user.name ?? ""} width={40} height={40} className="rounded-full flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,var(--purple),var(--accent))" }}>
              <span className="text-white font-bold text-[14px]">{(session?.user?.name?.[0] ?? "U").toUpperCase()}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-1)" }}>{session?.user?.name ?? "—"}</p>
            <p className="text-[11px] truncate" style={{ color: "var(--text-3)" }}>{session?.user?.email ?? "—"}</p>
          </div>
        </div>
      </div>

      {/* Plan card */}
      <div className="rounded-[12px] p-4 mb-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <p className="text-[11px] font-semibold uppercase mb-3" style={{ color: "var(--text-3)", letterSpacing: "0.08em" }}>Subscription</p>

        {loading ? (
          <div className="skeleton h-16 rounded-[8px]" />
        ) : (
          <>
            {/* Plan badge row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0"
                  style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
                  <PlanIcon size={14} style={{ color: meta.color }} strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>
                    {planData.label} Plan
                  </p>
                  {planData.plan === "free" && (
                    <p className="text-[10px]" style={{ color: "var(--text-3)" }}>Limited access</p>
                  )}
                </div>
              </div>
              {planData.plan === "free" && (
                <Link href="/pricing"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-[7px] text-[11px] font-semibold"
                  style={{ background: "var(--ai-soft)", border: "1px solid rgba(124,58,237,0.3)", color: "var(--ai-light)" }}>
                  Upgrade <ChevronRight size={10} />
                </Link>
              )}
            </div>

            {/* Saved ads usage */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Bookmark size={11} style={{ color: "var(--text-3)" }} />
                  <span className="text-[11px]" style={{ color: "var(--text-3)" }}>Saved ads</span>
                </div>
                <span className="font-data text-[11px] tabular-nums" style={{ color: "var(--text-2)" }}>
                  {savedCount} / {meta.limit === 9999 ? "∞" : meta.limit}
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${usagePct}%`,
                    background: usagePct >= 90 ? "#F87171" : usagePct >= 70 ? "#FCD34D" : meta.color,
                  }} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Plan comparison */}
      {!loading && planData.plan === "free" && (
        <div className="rounded-[12px] p-4 mb-3"
          style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)" }}>
          <p className="text-[12px] font-semibold mb-2" style={{ color: "var(--ai-light)" }}>Unlock with Starter</p>
          <div className="flex flex-col gap-1.5">
            {[
              "48 ads per page (vs 12 on Free)",
              "Video-only filter",
              "100 saved ads",
              "All AI hook type filters",
            ].map(f => (
              <div key={f} className="flex items-center gap-2">
                <span className="text-[11px]" style={{ color: "var(--text-2)" }}>✓ {f}</span>
              </div>
            ))}
          </div>
          <Link href="/pricing"
            className="mt-3 flex items-center justify-center gap-1.5 px-4 py-2 rounded-[8px] text-[12px] font-semibold"
            style={{ background: "var(--ai-soft)", border: "1px solid rgba(124,58,237,0.3)", color: "var(--ai-light)" }}>
            <Zap size={11} strokeWidth={2.5} />
            View Plans
          </Link>
        </div>
      )}

      {/* Sign out */}
      <div className="rounded-[12px] p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <p className="text-[11px] font-semibold uppercase mb-3" style={{ color: "var(--text-3)", letterSpacing: "0.08em" }}>Account Actions</p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 px-3 py-2 rounded-[8px] text-[12px] font-medium transition-all"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#F87171" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.14)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"; }}
        >
          <LogOut size={12} strokeWidth={1.5} />
          Sign out
        </button>
      </div>
    </div>
  );
}
