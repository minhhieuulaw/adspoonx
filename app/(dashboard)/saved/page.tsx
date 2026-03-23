"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, Download, X, Brain } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { FbAd } from "@/lib/facebook-ads";
import AdCard from "@/components/ads/AdCard";
import AdDetailModal from "@/components/ads/AdDetailModal";

interface SavedEntry {
  id: string;
  adId: string;
  adData: FbAd;
  createdAt: string;
}

function exportCSV(entries: SavedEntry[]) {
  const rows = [
    ["Ad ID", "Page Name", "Body Text", "Title", "Platform", "Country", "Active", "Start Date", "Ad Library URL"],
    ...entries.map(e => {
      const ad = e.adData;
      return [
        ad.id ?? "",
        ad.page_name ?? "",
        (ad.ad_creative_bodies?.[0] ?? "").replace(/,/g, ";").replace(/\n/g, " "),
        (ad.ad_creative_link_titles?.[0] ?? "").replace(/,/g, ";"),
        (ad.publisher_platforms ?? []).join("|"),
        ad.country ?? "",
        ad.is_active === false ? "Inactive" : "Active",
        ad.ad_delivery_start_time ? new Date(ad.ad_delivery_start_time).toLocaleDateString() : "",
        ad.ad_snapshot_url ?? "",
      ];
    }),
  ];
  const csv  = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `adspoonx-saved-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SavedPage() {
  const { t } = useLanguage();
  const [saved, setSaved]       = useState<SavedEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [planLimit, setPlanLimit] = useState(10);
  const [selectedAd, setSelectedAd] = useState<FbAd | null>(null);

  useEffect(() => {
    Promise.all([
      axios.get<SavedEntry[]>("/api/saved"),
      fetch("/api/me/plan").then(r => r.json()) as Promise<{ plan: string }>,
    ]).then(([res, planData]) => {
      setSaved(res.data);
      const limits: Record<string, number> = { free: 10, starter: 100, premium: 500, business: 9999 };
      setPlanLimit(limits[planData.plan] ?? 10);
    }).catch(() => null).finally(() => setLoading(false));
  }, []);

  function handleUnsave(adId: string) {
    setSaved(prev => prev.filter(e => e.adId !== adId));
  }

  const usagePct = Math.min(100, Math.round((saved.length / planLimit) * 100));

  if (loading) {
    return (
      <div className="page-enter">
        <div className="flex items-center gap-2 mb-6">
          <Bookmark size={15} style={{ color: "var(--ai-light)" }} />
          <h1 className="font-display text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>Saved Ads</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 340, borderRadius: 12 }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bookmark size={15} style={{ color: "var(--ai-light)" }} />
          <h1 className="font-display text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>Saved Ads</h1>
        </div>

        {saved.length > 0 && (
          <button
            onClick={() => exportCSV(saved)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[11px] font-medium"
            style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-2)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
          >
            <Download size={11} strokeWidth={1.5} />
            Export CSV
          </button>
        )}
      </div>

      {/* Usage bar */}
      <div className="rounded-[10px] px-4 py-3 mb-4 flex items-center gap-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px]" style={{ color: "var(--text-3)" }}>
              {saved.length} of {planLimit === 9999 ? "∞" : planLimit} saved ads used
            </span>
            {usagePct >= 80 && (
              <span className="text-[10px] font-medium" style={{ color: "#FCD34D" }}>
                Almost full
              </span>
            )}
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${usagePct}%`,
                background: usagePct >= 90 ? "#F87171" : usagePct >= 70 ? "#FCD34D" : "var(--ai-light)",
              }} />
          </div>
        </div>
        {usagePct >= 80 && (
          <a href="/pricing"
            className="flex-shrink-0 px-2.5 py-1.5 rounded-[6px] text-[10px] font-semibold"
            style={{ background: "var(--ai-soft)", border: "1px solid rgba(124,58,237,0.25)", color: "var(--ai-light)" }}>
            Upgrade
          </a>
        )}
      </div>

      {/* Empty state */}
      {saved.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-[12px] flex items-center justify-center mb-4"
            style={{ background: "var(--ai-soft)", border: "1px solid rgba(124,58,237,0.25)" }}>
            <Brain size={24} style={{ color: "var(--ai-light)" }} />
          </div>
          <p className="text-[14px] font-medium mb-1" style={{ color: "var(--text-2)" }}>{t.saved.pageTitle}</p>
          <p className="text-[12px]" style={{ color: "var(--text-3)" }}>Click the bookmark icon on any ad to save it here.</p>
          <a href="/ads"
            className="mt-4 px-4 py-2 rounded-[8px] text-[12px] font-semibold"
            style={{ background: "var(--ai-soft)", border: "1px solid rgba(124,58,237,0.3)", color: "var(--ai-light)" }}>
            Browse Ads →
          </a>
        </motion.div>
      )}

      {/* Grid */}
      <AnimatePresence>
        {saved.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {saved.map((entry, i) => (
              <div key={entry.id} className="relative group">
                <AdCard ad={entry.adData} index={i} onSelect={setSelectedAd} />
                {/* Quick unsave overlay button */}
                <button
                  onClick={async () => {
                    await axios.post("/api/saved", { adId: entry.adId, adData: entry.adData });
                    handleUnsave(entry.adId);
                  }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  style={{ background: "rgba(0,0,0,0.6)", color: "#fff", backdropFilter: "blur(4px)" }}
                  title="Remove from saved"
                >
                  <X size={10} strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AdDetailModal ad={selectedAd} onClose={() => setSelectedAd(null)} />
    </div>
  );
}
