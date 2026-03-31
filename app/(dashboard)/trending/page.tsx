"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  FlaskConical, TrendingUp, Shield, Zap, AlertTriangle, RefreshCw,
  Search, ChevronDown, ArrowUpRight, ArrowDownRight,
  Target, Lightbulb, Users, Globe, BarChart3, Sparkles,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

interface ResearchKeyword {
  id: string;
  keyword: string;
  niche: string | null;
  adCount: number;
  activeAds: number;
  growthRate: number;
  avgDaysRunning: number;
  opportunityScore: number;
  beginnerScore: number;
  evergreenScore: number;
  testNowScore: number;
  growthScore: number;
  stabilityScore: number;
  geoCount: number;
  signal: "go" | "wait" | "risk";
  aiVerdict: string | null;
}

interface NicheCluster {
  id: string;
  niche: string;
  keywordCount: number;
  avgOpportunity: number;
  avgGrowth: number;
  signal: string;
  beginnerSafe: boolean;
  aiSummary: string | null;
  aiHook: string | null;
  aiHeadline: string | null;
  aiPainPoint: string | null;
}

interface ResearchData {
  keywords: ResearchKeyword[];
  clusters: NicheCluster[];
  topMovers: ResearchKeyword[];
  stats: { total: number; rising: number; stable: number; beginnerNiches: number; seasonal: number };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function signalIcon(signal: string) {
  if (signal === "go") return { emoji: "🟢", label: "GO", color: "#34D399", bg: "rgba(52,211,153,0.1)" };
  if (signal === "risk") return { emoji: "🔴", label: "RISK", color: "#F87171", bg: "rgba(248,113,113,0.1)" };
  return { emoji: "🟡", label: "WAIT", color: "#FCD34D", bg: "rgba(252,211,77,0.1)" };
}

function fmtGrowth(rate: number) {
  if (rate > 0) return `+${rate.toFixed(0)}%`;
  if (rate < 0) return `${rate.toFixed(0)}%`;
  return "0%";
}

function MiniSparkline({ score, color }: { score: number; color: string }) {
  const bars = useMemo(() => {
    const seed = score * 7 + 13;
    return Array.from({ length: 7 }, (_, i) => Math.max(8, (score / 100) * 60 + ((seed * (i + 1) * 11) % 30)));
  }, [score]);
  return (
    <div className="flex items-end gap-[2px]" style={{ height: 20 }}>
      {bars.map((h, i) => (
        <div key={i} className="rounded-sm" style={{ flex: 1, height: `${h}%`, background: i === 6 ? color : `${color}40`, minWidth: 3 }} />
      ))}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function DeepResearchPage() {
  const [data, setData] = useState<ResearchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "go" | "wait" | "risk">("all");
  const [sort, setSort] = useState<string>("opportunityScore");
  const [searchQ, setSearchQ] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/research");
      if (r.ok) setData(await r.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetch("/api/research", { method: "POST" });
      await fetchData();
    } catch { /* silent */ }
    finally { setRefreshing(false); }
  }, [fetchData]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredKeywords = useMemo(() => {
    if (!data) return [];
    let kws = [...data.keywords];
    if (filter !== "all") kws = kws.filter(k => k.signal === filter);
    if (searchQ) {
      const q = searchQ.toLowerCase();
      kws = kws.filter(k => k.keyword.toLowerCase().includes(q) || k.niche?.toLowerCase().includes(q));
    }
    kws.sort((a, b) => {
      const av = (a as unknown as Record<string, number>)[sort] ?? 0;
      const bv = (b as unknown as Record<string, number>)[sort] ?? 0;
      return bv - av;
    });
    return kws;
  }, [data, filter, sort, searchQ]);

  const hiddenGems = useMemo(() => {
    if (!data) return [];
    return [...data.keywords]
      .filter(k => k.opportunityScore >= 40 && k.adCount < 50)
      .sort((a, b) => b.opportunityScore - a.opportunityScore)
      .slice(0, 6);
  }, [data]);

  const beginnerNiches = useMemo(() => {
    if (!data) return [];
    return data.clusters.filter(c => c.beginnerSafe).sort((a, b) => b.avgOpportunity - a.avgOpportunity).slice(0, 5);
  }, [data]);

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-[12px] flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.22), rgba(99,102,241,0.14))", border: "1px solid rgba(124,58,237,0.22)", boxShadow: "0 0 16px rgba(124,58,237,0.12)" }}>
            <FlaskConical size={20} style={{ color: "#A78BFA" }} />
          </div>
          <div>
            <h1 className="text-[22px] font-bold leading-tight" style={{ color: "var(--text-1)", letterSpacing: "-0.025em" }}>Deep Research</h1>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--text-3)" }}>AI-powered keyword & niche intelligence for dropshipping</p>
          </div>
        </div>
        <button onClick={handleRefresh} disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-50"
          style={{ background: "rgba(124,58,237,0.12)", color: "#A78BFA", border: "1px solid rgba(124,58,237,0.25)" }}>
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Analyzing..." : "Refresh Data"}
        </button>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-xl skeleton" />)}
        </div>
      )}

      {/* ── Empty — first time ── */}
      {!loading && (!data || data.stats.total === 0) && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(99,102,241,0.08))", border: "1px solid rgba(124,58,237,0.2)" }}>
            <FlaskConical size={28} style={{ color: "#A78BFA" }} />
          </div>
          <h2 className="text-[18px] font-bold mb-2" style={{ color: "var(--text-1)" }}>Initialize Deep Research</h2>
          <p className="text-[13px] mb-5 max-w-md" style={{ color: "var(--text-3)" }}>
            Analyze 60+ dropshipping keywords from your ads database. Generate opportunity scores, niche clusters, and beginner recommendations.
          </p>
          <button onClick={handleRefresh} disabled={refreshing}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-bold transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)", color: "#fff", boxShadow: "0 4px 20px rgba(124,58,237,0.3)" }}>
            <Sparkles size={15} />
            {refreshing ? "Analyzing keywords..." : "Start Analysis"}
          </button>
        </div>
      )}

      {/* ── Main content ── */}
      {!loading && data && data.stats.total > 0 && (
        <div className="space-y-6">

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Tracked", value: data.stats.total, icon: BarChart3, color: "#A78BFA" },
              { label: "Rising", value: data.stats.rising, icon: TrendingUp, color: "#34D399" },
              { label: "Stable", value: data.stats.stable, icon: Shield, color: "#60A5FA" },
              { label: "Beginner Niches", value: data.stats.beginnerNiches, icon: Users, color: "#FCD34D" },
              { label: "High Risk", value: data.stats.seasonal, icon: AlertTriangle, color: "#F87171" },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl p-4 flex items-center gap-3"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}15` }}>
                  <stat.icon size={16} style={{ color: stat.color }} />
                </div>
                <div>
                  <p className="text-[22px] font-bold leading-none" style={{ color: "var(--text-1)" }}>{stat.value}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Market Pulse */}
          {data.topMovers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap size={14} style={{ color: "#FCD34D" }} />
                <h2 className="text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Market Pulse — Top Movers</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {data.topMovers.map(kw => {
                  const s = signalIcon(kw.signal);
                  return (
                    <div key={kw.id} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${s.color}20` }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                        <span className="text-[12px] font-bold tabular-nums" style={{ color: kw.growthRate > 0 ? "#34D399" : "#F87171" }}>
                          {fmtGrowth(kw.growthRate)}
                        </span>
                      </div>
                      <p className="text-[13px] font-semibold truncate mt-1" style={{ color: "var(--text-1)" }}>{kw.keyword}</p>
                      <p className="text-[10px]" style={{ color: "var(--text-3)" }}>{kw.niche}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Keyword Rankings Table */}
          <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 size={14} style={{ color: "#A78BFA" }} />
                <h2 className="text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Keyword Rankings</h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
                  <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search..."
                    className="pl-8 pr-3 py-1.5 rounded-lg text-[11px] outline-none w-36"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-1)" }} />
                </div>
                {(["all", "go", "wait", "risk"] as const).map(f => {
                  const s = f === "all" ? { color: "#A78BFA", bg: "rgba(124,58,237,0.1)" } : signalIcon(f);
                  return (
                    <button key={f} onClick={() => setFilter(f)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase"
                      style={{
                        background: filter === f ? s.bg : "transparent",
                        color: filter === f ? s.color : "var(--text-3)",
                        border: `1px solid ${filter === f ? `${s.color}30` : "rgba(255,255,255,0.06)"}`,
                      }}>
                      {f === "all" ? "All" : f}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: 0, minWidth: 800 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    {[
                      { key: "keyword", label: "Keyword", w: "auto" },
                      { key: "niche", label: "Niche", w: "120px" },
                      { key: "growthRate", label: "Growth", w: "70px" },
                      { key: "opportunityScore", label: "Score", w: "70px" },
                      { key: "signal", label: "Signal", w: "70px" },
                      { key: "aiVerdict", label: "AI Verdict", w: "180px" },
                    ].map(col => (
                      <th key={col.key} className="px-4 py-3 text-left" style={{ width: col.w }}>
                        <button onClick={() => setSort(col.key)}
                          className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1"
                          style={{ color: sort === col.key ? "#A78BFA" : "rgba(255,255,255,0.4)" }}>
                          {col.label}
                          {sort === col.key && <ChevronDown size={8} />}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredKeywords.slice(0, 50).map((kw, i) => {
                    const s = signalIcon(kw.signal);
                    return (
                      <motion.tr key={kw.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }}
                        className="store-table-row" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <MiniSparkline score={kw.opportunityScore} color={s.color} />
                            <span className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>{kw.keyword}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[11px] px-2 py-0.5 rounded" style={{ background: "rgba(167,139,250,0.08)", color: "#A78BFA" }}>{kw.niche ?? "—"}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[12px] font-bold tabular-nums flex items-center gap-0.5"
                            style={{ color: kw.growthRate > 0 ? "#34D399" : kw.growthRate < 0 ? "#F87171" : "var(--text-3)" }}>
                            {kw.growthRate > 0 ? <ArrowUpRight size={10} /> : kw.growthRate < 0 ? <ArrowDownRight size={10} /> : null}
                            {fmtGrowth(kw.growthRate)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[14px] font-bold tabular-nums" style={{ color: s.color }}>{kw.opportunityScore}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[10px] font-bold px-2 py-1 rounded-md" style={{ background: s.bg, color: s.color }}>
                            {s.emoji} {s.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[11px]" style={{ color: "var(--text-2)" }}>{kw.aiVerdict ?? "—"}</span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredKeywords.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-[13px]" style={{ color: "var(--text-3)" }}>No keywords match this filter</p>
                </div>
              )}
            </div>
          </div>

          {/* Hidden Gems */}
          {hiddenGems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target size={14} style={{ color: "#FCD34D" }} />
                <h2 className="text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Hidden Gems — High Potential, Low Competition</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {hiddenGems.map(kw => {
                  const s = signalIcon(kw.signal);
                  return (
                    <div key={kw.id} className="rounded-xl p-4" style={{ background: "rgba(252,211,77,0.03)", border: "1px solid rgba(252,211,77,0.1)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[14px] font-bold" style={{ color: "var(--text-1)" }}>{kw.keyword}</span>
                        <span className="text-[11px] font-bold" style={{ color: s.color }}>{kw.opportunityScore}</span>
                      </div>
                      <p className="text-[10px] mb-1" style={{ color: "var(--text-3)" }}>{kw.niche} · {kw.adCount} ads · {kw.geoCount} markets</p>
                      <p className="text-[11px]" style={{ color: "#FCD34D" }}>{kw.aiVerdict}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Niche Clusters */}
          {data.clusters.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Globe size={14} style={{ color: "#60A5FA" }} />
                <h2 className="text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--text-2)" }}>AI Niche Clusters</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.clusters.slice(0, 9).map(c => {
                  const s = signalIcon(c.signal);
                  return (
                    <div key={c.id} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${s.color}15` }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[14px] font-bold" style={{ color: "var(--text-1)" }}>{c.niche}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                      </div>
                      <div className="flex items-center gap-3 mb-2 text-[10px]" style={{ color: "var(--text-3)" }}>
                        <span>{c.keywordCount} keywords</span>
                        <span>Opp: {c.avgOpportunity}</span>
                        <span style={{ color: c.avgGrowth > 0 ? "#34D399" : "var(--text-3)" }}>{fmtGrowth(c.avgGrowth)}</span>
                      </div>
                      {c.beginnerSafe && (
                        <div className="flex items-center gap-1.5 mt-2 px-2 py-1.5 rounded-lg"
                          style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.12)" }}>
                          <Shield size={10} style={{ color: "#34D399" }} />
                          <span className="text-[10px] font-semibold" style={{ color: "#34D399" }}>Safe for beginners</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Beginner Safe Bets */}
          {beginnerNiches.length > 0 && (
            <div className="rounded-xl p-5" style={{ background: "linear-gradient(135deg, rgba(52,211,153,0.04), rgba(52,211,153,0.01))", border: "1px solid rgba(52,211,153,0.12)" }}>
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb size={14} style={{ color: "#34D399" }} />
                <h2 className="text-[13px] font-bold uppercase tracking-wider" style={{ color: "#34D399" }}>
                  Beginner Safe Bets — Where you won't lose your first $500
                </h2>
              </div>
              <div className="space-y-3">
                {beginnerNiches.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-4 p-3 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <span className="text-[20px] font-black w-8 text-center" style={{ color: "#34D399" }}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold" style={{ color: "var(--text-1)" }}>{c.niche}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(52,211,153,0.1)", color: "#34D399" }}>🟢 SAFE</span>
                      </div>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>
                        {c.keywordCount} keywords · Opportunity: {c.avgOpportunity}/100 · Growth: {fmtGrowth(c.avgGrowth)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-[18px] font-bold tabular-nums" style={{ color: "#34D399" }}>{c.avgOpportunity}</span>
                      <p className="text-[9px]" style={{ color: "var(--text-3)" }}>score</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
