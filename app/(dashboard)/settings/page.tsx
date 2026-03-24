"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { Settings, Zap, Bookmark, LogOut, Crown, ChevronRight, ShoppingCart, RefreshCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface PlanData {
  plan: string;
  label: string;
  scansBalance: number;
  scansTotal: number;
  scansResetAt: string | null;
}

const PLAN_META: Record<string, { color: string; bg: string; border: string; icon: React.ElementType; limit: number }> = {
  free:     { color: "var(--text-muted)",  bg: "rgba(100,100,120,0.08)", border: "rgba(100,100,120,0.15)", icon: Settings, limit: 10  },
  starter:  { color: "#60A5FA",            bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.2)",  icon: Zap,      limit: 100 },
  premium:  { color: "var(--ai-light)",    bg: "rgba(124,58,237,0.08)", border: "rgba(124,58,237,0.2)",  icon: Crown,    limit: 500 },
  business: { color: "#FCD34D",            bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)",  icon: Crown,    limit: 9999 },
};

const SCAN_PACKS = [
  { id: "pack_500",   label: "500 Scans",    price: "$9"  },
  { id: "pack_2000",  label: "2,000 Scans",  price: "$29" },
  { id: "pack_10000", label: "10,000 Scans", price: "$99" },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const [planData, setPlanData] = useState<PlanData>({ plan: "free", label: "Free", scansBalance: 0, scansTotal: 50, scansResetAt: null });
  const [savedCount, setSavedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [buyingPack, setBuyingPack] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/me/plan").then(r => r.json() as Promise<PlanData>),
      fetch("/api/saved").then(r => r.json() as Promise<unknown[]>),
    ]).then(([p, s]) => {
      setPlanData(p);
      setSavedCount(Array.isArray(s) ? s.length : 0);
    }).catch(() => null).finally(() => setLoading(false));
  }, []);

  async function handleBuyPack(packId: string) {
    setBuyingPack(packId);
    try {
      const res = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json() as { checkoutUrl?: string; error?: string };
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch { /* silent */ }
    finally { setBuyingPack(null); }
  }

  const meta = PLAN_META[planData.plan] ?? PLAN_META.free;
  const PlanIcon = meta.icon;
  const usagePct = Math.min(100, Math.round((savedCount / meta.limit) * 100));
  const scansPct = Math.min(100, Math.round((planData.scansBalance / (planData.scansTotal || 1)) * 100));
  const resetDate = planData.scansResetAt ? new Date(planData.scansResetAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;

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
            <div className="mb-4">
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

            {/* Scans usage */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Zap size={11} style={{ color: "var(--text-3)" }} />
                  <span className="text-[11px]" style={{ color: "var(--text-3)" }}>Scans remaining</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-data text-[11px] tabular-nums" style={{ color: "var(--text-2)" }}>
                    {planData.scansBalance.toLocaleString()} / {planData.scansTotal.toLocaleString()}
                  </span>
                  {resetDate && (
                    <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "var(--text-3)" }}>
                      <RefreshCw size={9} />
                      {resetDate}
                    </span>
                  )}
                </div>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${scansPct}%`,
                    background: scansPct <= 10 ? "#F87171" : scansPct <= 30 ? "#FCD34D" : "#34D399",
                  }} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Buy more scans */}
      <div className="rounded-[12px] p-4 mb-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <p className="text-[11px] font-semibold uppercase mb-1" style={{ color: "var(--text-3)", letterSpacing: "0.08em" }}>Buy more Scans</p>
        <p className="text-[11px] mb-3" style={{ color: "var(--text-3)" }}>
          One-time purchase — Scans never expire and stack on top of your monthly allocation.
        </p>
        <div className="flex flex-col gap-2">
          {SCAN_PACKS.map(pack => (
            <button
              key={pack.id}
              onClick={() => handleBuyPack(pack.id)}
              disabled={buyingPack === pack.id}
              className="flex items-center justify-between px-3 py-2.5 rounded-[8px] text-[12px] font-medium transition-all disabled:opacity-60"
              style={{ background: "var(--bg-hover)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <Zap size={12} className="text-orange-400" />
                <span style={{ color: "var(--text-1)" }}>{pack.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold" style={{ color: "var(--text-2)" }}>{pack.price}</span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-[10px] font-semibold"
                  style={{ background: "rgba(251,146,60,0.12)", color: "#fb923c" }}>
                  <ShoppingCart size={9} />
                  {buyingPack === pack.id ? "Loading…" : "Buy"}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Plan upgrade prompt for free users */}
      {!loading && planData.plan === "free" && (
        <div className="rounded-[12px] p-4 mb-3"
          style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)" }}>
          <p className="text-[12px] font-semibold mb-2" style={{ color: "var(--ai-light)" }}>Unlock with Starter</p>
          <div className="flex flex-col gap-1.5">
            {[
              "500 Scans per month (vs 50 on Free)",
              "Save up to 100 ads",
              "Video-only filter",
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
