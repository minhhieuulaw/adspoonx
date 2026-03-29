"use client";

import { useState } from "react";
import { ChevronDown, Globe, SlidersHorizontal, Trophy, TrendingUp, Leaf } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { LANGUAGE_OPTIONS, type AdLanguage } from "@/lib/detect-language";
import { COUNTRY_FILTER_OPTIONS, COUNTRY_INFO as COUNTRY_DATA } from "@/lib/countries";

const COUNTRY_CODES = COUNTRY_FILTER_OPTIONS;

export const PRESETS = [
  { id: "top",          label: "Top Performers", icon: "🏆", desc: "AI Score ≥ 80" },
  { id: "trending",     label: "Trending",       icon: "🚀", desc: "Active, < 30 days" },
  { id: "evergreen",    label: "Evergreen",      icon: "🌲", desc: "> 90 days + proven" },
] as const;

export type PresetId = typeof PRESETS[number]["id"] | null;

const PLATFORMS = [
  { id: "facebook",         label: "Facebook",         short: "FB", color: "#60A5FA", icon: "📘" },
  { id: "instagram",        label: "Instagram",        short: "IG", color: "#F472B6", icon: "📸" },
  { id: "messenger",        label: "Messenger",        short: "MS", color: "#38BDF8", icon: "💬" },
  { id: "audience_network", label: "Audience Network", short: "AN", color: "#A78BFA", icon: "📡" },
  { id: "threads",          label: "Threads",          short: "TH", color: "#E5E7EB", icon: "🔗" },
] as const;

const SORT_OPTIONS = [
  { id: "mixed",    label: "Mixed" },
  { id: "score",    label: "AI Score" },
  { id: "newest",   label: "Newest First" },
  { id: "longest",  label: "Longest Running" },
] as const;

export type AIScoreTier = "all" | "weak" | "testing" | "promising" | "winning" | "elite";

export const AI_SCORE_TIERS: Array<{ id: AIScoreTier; label: string; range: string; min: number; max: number; color: string; bg: string; border: string; icon: string }> = [
  { id: "all",       label: "All Scores",  range: "",        min: 0,  max: 99, color: "var(--text-2)",  bg: "transparent",              border: "transparent",              icon: "" },
  { id: "weak",      label: "Weak",        range: "0–30",    min: 0,  max: 30, color: "#94A3B8",        bg: "rgba(148,163,184,0.10)",   border: "rgba(148,163,184,0.25)",   icon: "○" },
  { id: "testing",   label: "Testing",     range: "31–50",   min: 31, max: 50, color: "#60A5FA",        bg: "rgba(96,165,250,0.10)",    border: "rgba(96,165,250,0.25)",    icon: "◐" },
  { id: "promising", label: "Promising",   range: "51–70",   min: 51, max: 70, color: "#FCD34D",        bg: "rgba(252,211,77,0.10)",    border: "rgba(252,211,77,0.25)",    icon: "◉" },
  { id: "winning",   label: "Winning",     range: "71–84",   min: 71, max: 84, color: "#34D399",        bg: "rgba(52,211,153,0.10)",    border: "rgba(52,211,153,0.25)",    icon: "★" },
  { id: "elite",     label: "Elite",       range: "85–99",   min: 85, max: 99, color: "#A78BFA",        bg: "rgba(167,139,250,0.12)",   border: "rgba(167,139,250,0.35)",   icon: "🔥" },
];

export const NICHE_OPTIONS = [
  { id: "Fashion & Apparel",       icon: "👗", short: "Fashion" },
  { id: "Health & Beauty",         icon: "💄", short: "Beauty" },
  { id: "Hair Care",               icon: "💇", short: "Hair" },
  { id: "Fitness & Wellness",      icon: "💪", short: "Fitness" },
  { id: "Supplements & Nutrition", icon: "💊", short: "Supplements" },
  { id: "Food & Beverage",         icon: "🍕", short: "Food" },
  { id: "Electronics & Tech",      icon: "📱", short: "Tech" },
  { id: "Home & Living",           icon: "🏠", short: "Home" },
  { id: "Home Appliances",         icon: "🔌", short: "Appliances" },
  { id: "Baby & Kids",             icon: "🍼", short: "Kids" },
  { id: "Jewelry & Accessories",   icon: "💎", short: "Jewelry" },
  { id: "Bags & Luggage",          icon: "👜", short: "Bags" },
  { id: "Pet Supplies",            icon: "🐾", short: "Pets" },
  { id: "Sports & Outdoors",       icon: "⚽", short: "Sports" },
  { id: "Automotive",              icon: "🚗", short: "Auto" },
  { id: "Education & Courses",     icon: "📚", short: "Education" },
  { id: "Entertainment & Media",   icon: "🎬", short: "Entertainment" },
  { id: "Finance & Insurance",     icon: "💰", short: "Finance" },
  { id: "E-commerce",              icon: "🛒", short: "E-commerce" },
  { id: "Other",                   icon: "📦", short: "Other" },
] as const;

export interface FilterValues {
  country: string;
  status: "ACTIVE" | "INACTIVE" | "ALL";
  mediaType: "video" | "image" | null;
  preset: PresetId;
  platforms: string[];
  sortBy: "mixed" | "score" | "newest" | "longest";
  dropshipping?: string;
  duration: "any" | "new" | "growing" | "proven" | "evergreen";
  aiScore: AIScoreTier;
  niche: string | null;
  language: AdLanguage | "all";
}

interface AdsFilterProps {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  totalResults?: number;
  filteredResults?: number;
  loading?: boolean;
  vertical?: boolean;
}

// Country info imported from lib/countries.ts as COUNTRY_DATA
const COUNTRY_INFO = COUNTRY_DATA;

// ── Section wrapper for vertical sidebar ──────────────────────────────────────

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {/* Glowing accent bar */}
        <div style={{
          width: 2,
          height: 12,
          borderRadius: 2,
          background: "linear-gradient(180deg, #C4B5FD, #7C3AED, #4C1D95)",
          boxShadow: "0 0 6px rgba(167,139,250,0.55), 0 0 12px rgba(124,58,237,0.25)",
          flexShrink: 0,
        }} />
        <p className="text-[10px] font-bold uppercase" style={{
          color: "rgba(196,181,253,0.80)",
          letterSpacing: "0.14em",
        }}>
          {label}
        </p>
      </div>
      {children}
    </div>
  );
}

function Divider() {
  return (
    <div style={{
      height: 1,
      background: "linear-gradient(90deg, transparent, rgba(124,58,237,0.18) 30%, rgba(255,255,255,0.06) 60%, transparent)",
    }} />
  );
}

// ── Platform dropdown multi-select ────────────────────────────────────────────

function PlatformDropdown({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const count = selected.length;
  const selectedPlatforms = PLATFORMS.filter(p => selected.includes(p.id));

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full px-2.5 py-2 rounded-[8px] text-[11px] font-medium"
        style={{
          background: count > 0
            ? "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(167,139,250,0.06))"
            : "rgba(255,255,255,0.035)",
          border: `1px solid ${count > 0 ? "rgba(124,58,237,0.35)" : "rgba(255,255,255,0.08)"}`,
          color: count > 0 ? "var(--text-1)" : "var(--text-2)",
          boxShadow: count > 0 ? "0 0 12px rgba(124,58,237,0.12)" : "none",
          transition: "all 150ms ease",
        }}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {count === 0 ? (
            <span>All Platforms</span>
          ) : (
            <div className="flex items-center gap-1 flex-wrap">
              {selectedPlatforms.map(p => (
                <span key={p.id} className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-[1px] rounded-[4px]"
                  style={{ background: `${p.color}18`, color: p.color, border: `1px solid ${p.color}35` }}>
                  <span className="text-[10px]">{p.icon}</span>
                  {p.short}
                </span>
              ))}
            </div>
          )}
        </div>
        <ChevronDown size={12} style={{
          color: "rgba(167,139,250,0.60)",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 150ms ease",
          flexShrink: 0,
        }} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-[10px] overflow-hidden py-1"
            style={{
              background: "linear-gradient(160deg, #1E1F3A 0%, #161728 100%)",
              border: "1px solid rgba(124,58,237,0.20)",
              boxShadow: "0 20px 48px rgba(0,0,0,0.80), 0 0 0 1px rgba(255,255,255,0.04) inset",
              backdropFilter: "blur(16px)",
            }}>
            {PLATFORMS.map(p => {
              const isOn = selected.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => onToggle(p.id)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-[11px] font-medium"
                  style={{
                    background: isOn ? `${p.color}12` : "transparent",
                    color: isOn ? p.color : "var(--text-2)",
                    transition: "all 100ms ease",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = isOn ? `${p.color}1A` : "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isOn ? `${p.color}12` : "transparent"; }}
                >
                  <span className="text-[14px] flex-shrink-0">{p.icon}</span>
                  <span className="flex-1 text-left">{p.label}</span>
                  <div className="w-4 h-4 rounded-[4px] flex items-center justify-center flex-shrink-0"
                    style={{
                      background: isOn ? p.color : "transparent",
                      border: `1.5px solid ${isOn ? p.color : "rgba(255,255,255,0.20)"}`,
                      transition: "all 100ms ease",
                    }}>
                    {isOn && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Language dropdown (single-select) ─────────────────────────────────────────

function LanguageDropdown({ selected, onSelect }: { selected: AdLanguage | "all"; onSelect: (id: AdLanguage | "all") => void }) {
  const [open, setOpen] = useState(false);
  const current = LANGUAGE_OPTIONS.find(l => l.id === selected) ?? LANGUAGE_OPTIONS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full px-2.5 py-2 rounded-[8px] text-[11px] font-medium"
        style={{
          background: selected !== "all"
            ? "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(167,139,250,0.06))"
            : "rgba(255,255,255,0.035)",
          border: `1px solid ${selected !== "all" ? "rgba(124,58,237,0.35)" : "rgba(255,255,255,0.08)"}`,
          color: selected !== "all" ? "var(--text-1)" : "var(--text-2)",
          boxShadow: selected !== "all" ? "0 0 12px rgba(124,58,237,0.12)" : "none",
          transition: "all 150ms ease",
        }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[13px]">{current.flag}</span>
          <span>{current.label}</span>
        </div>
        <ChevronDown size={12} style={{
          color: "rgba(167,139,250,0.60)",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 150ms ease",
          flexShrink: 0,
        }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-[10px] overflow-hidden py-1 max-h-[240px] overflow-y-auto no-scrollbar"
            style={{
              background: "linear-gradient(160deg, #1E1F3A 0%, #161728 100%)",
              border: "1px solid rgba(124,58,237,0.20)",
              boxShadow: "0 20px 48px rgba(0,0,0,0.80), 0 0 0 1px rgba(255,255,255,0.04) inset",
              backdropFilter: "blur(16px)",
            }}>
            {LANGUAGE_OPTIONS.map(l => {
              const isOn = selected === l.id;
              return (
                <button
                  key={l.id}
                  onClick={() => { onSelect(l.id); setOpen(false); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-[11px] font-medium"
                  style={{
                    background: isOn ? "rgba(124,58,237,0.14)" : "transparent",
                    color: isOn ? "#C4B5FD" : "var(--text-2)",
                    transition: "all 100ms ease",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = isOn ? "rgba(124,58,237,0.20)" : "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isOn ? "rgba(124,58,237,0.14)" : "transparent"; }}
                >
                  <span className="text-[14px] flex-shrink-0">{l.flag}</span>
                  <span className="flex-1 text-left">{l.label}</span>
                  {isOn && l.id !== "all" && (
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
                      background: "#A78BFA",
                      boxShadow: "0 0 5px rgba(167,139,250,0.8)",
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Niche dropdown (single-select) ────────────────────────────────────────────

function NicheDropdown({ selected, onSelect }: { selected: string | null; onSelect: (id: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const current = selected ? NICHE_OPTIONS.find(n => n.id === selected) : null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full px-2.5 py-2 rounded-[8px] text-[11px] font-medium"
        style={{
          background: selected
            ? "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(167,139,250,0.06))"
            : "rgba(255,255,255,0.035)",
          border: `1px solid ${selected ? "rgba(124,58,237,0.35)" : "rgba(255,255,255,0.08)"}`,
          color: selected ? "var(--text-1)" : "var(--text-2)",
          boxShadow: selected ? "0 0 12px rgba(124,58,237,0.12)" : "none",
          transition: "all 150ms ease",
        }}
      >
        <div className="flex items-center gap-1.5">
          {current ? (
            <>
              <span className="text-[13px]">{current.icon}</span>
              <span>{current.short}</span>
            </>
          ) : (
            <span>All Niches</span>
          )}
        </div>
        <ChevronDown size={12} style={{
          color: "rgba(167,139,250,0.60)",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 150ms ease",
          flexShrink: 0,
        }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-[10px] overflow-hidden py-1 max-h-[280px] overflow-y-auto no-scrollbar"
            style={{
              background: "linear-gradient(160deg, #1E1F3A 0%, #161728 100%)",
              border: "1px solid rgba(124,58,237,0.20)",
              boxShadow: "0 20px 48px rgba(0,0,0,0.80), 0 0 0 1px rgba(255,255,255,0.04) inset",
              backdropFilter: "blur(16px)",
            }}>
            {/* All option */}
            <button
              onClick={() => { onSelect(null); setOpen(false); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-[11px] font-medium"
              style={{
                background: !selected ? "rgba(124,58,237,0.14)" : "transparent",
                color: !selected ? "#C4B5FD" : "var(--text-2)",
                transition: "all 100ms ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = !selected ? "rgba(124,58,237,0.20)" : "rgba(255,255,255,0.04)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = !selected ? "rgba(124,58,237,0.14)" : "transparent"; }}
            >
              <span className="text-[14px] flex-shrink-0">🔍</span>
              <span className="flex-1 text-left">All Niches</span>
            </button>
            {NICHE_OPTIONS.map(n => {
              const isOn = selected === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => { onSelect(isOn ? null : n.id); setOpen(false); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-[11px] font-medium"
                  style={{
                    background: isOn ? "rgba(124,58,237,0.14)" : "transparent",
                    color: isOn ? "#C4B5FD" : "var(--text-2)",
                    transition: "all 100ms ease",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = isOn ? "rgba(124,58,237,0.20)" : "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isOn ? "rgba(124,58,237,0.14)" : "transparent"; }}
                >
                  <span className="text-[14px] flex-shrink-0">{n.icon}</span>
                  <span className="flex-1 text-left">{n.short}</span>
                  {isOn && (
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
                      background: "#A78BFA",
                      boxShadow: "0 0 5px rgba(167,139,250,0.8)",
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdsFilter({
  values, onChange, totalResults, filteredResults, loading, vertical = false,
}: AdsFilterProps) {
  const { t } = useLanguage();
  const [showCountryDrop, setShowCountryDrop] = useState(false);
  const [showSortDrop, setShowSortDrop]       = useState(false);

  const getCountryLabel = (code: string) => {
    const info = COUNTRY_INFO[code];
    return info ? `${info.flag} ${info.label}` : code;
  };

  const activeSort   = SORT_OPTIONS.find(s => s.id === values.sortBy) ?? SORT_OPTIONS[0];
  const hasFilters   = values.preset !== null || values.platforms.length > 0 || values.sortBy !== "mixed"
    || values.dropshipping !== "all" || values.duration !== "any" || values.mediaType !== null || values.aiScore !== "all"
    || values.niche !== null || values.language !== "all";

  function togglePlatform(id: string) {
    const next = values.platforms.includes(id)
      ? values.platforms.filter(p => p !== id)
      : [...values.platforms, id];
    onChange({ ...values, platforms: next });
  }

  function togglePreset(id: PresetId) {
    onChange({ ...values, preset: values.preset === id ? null : id });
  }

  function clearAll() {
    onChange({ ...values, preset: null, platforms: [], sortBy: "mixed", dropshipping: "all", duration: "any", mediaType: null, aiScore: "all", niche: null, language: "all" });
  }

  const statusOptions = [
    { value: "ACTIVE"   as const, label: t.filter.active },
    { value: "INACTIVE" as const, label: t.filter.inactive },
    { value: "ALL"      as const, label: t.filter.all },
  ];

  // ── VERTICAL (sidebar) layout ────────────────────────────────────────────────
  if (vertical) {
    return (
      <div className="flex flex-col gap-4 px-4 py-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(167,139,250,0.12))",
                border: "1px solid rgba(124,58,237,0.35)",
                boxShadow: "0 0 12px rgba(124,58,237,0.20)",
              }}>
              <SlidersHorizontal size={12} style={{ color: "#C4B5FD" }} strokeWidth={2} />
            </div>
            <span className="text-[13px] font-bold" style={{
              background: "linear-gradient(135deg, #fff 30%, #C4B5FD)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-0.02em",
            }}>Filters</span>
          </div>
          {hasFilters && (
            <button
              onClick={clearAll}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-[6px]"
              style={{
                color: "#C4B5FD",
                background: "rgba(124,58,237,0.12)",
                border: "1px solid rgba(124,58,237,0.30)",
                transition: "all 120ms ease",
              }}
            >
              Clear all
            </button>
          )}
        </div>

        <Divider />

        {/* ★ AI Score Tier — top priority filter */}
        <div
          className="rounded-[12px] p-3"
          style={{
            background: values.aiScore !== "all"
              ? "linear-gradient(135deg, rgba(124,58,237,0.14), rgba(167,139,250,0.06))"
              : "rgba(255,255,255,0.025)",
            border: `1px solid ${values.aiScore !== "all" ? "rgba(124,58,237,0.30)" : "rgba(255,255,255,0.07)"}`,
            boxShadow: values.aiScore !== "all" ? "0 0 20px rgba(124,58,237,0.12)" : "none",
            transition: "all 200ms ease",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-[6px] flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, rgba(167,139,250,0.20), rgba(124,58,237,0.10))",
                border: "1px solid rgba(167,139,250,0.30)",
                boxShadow: "0 0 8px rgba(167,139,250,0.20)",
              }}>
              <SlidersHorizontal size={11} style={{ color: "#C4B5FD" }} strokeWidth={2} />
            </div>
            <span
              className="text-[10px] font-bold uppercase flex-1"
              style={{
                letterSpacing: "0.12em",
                background: "linear-gradient(135deg, #fff 20%, #C4B5FD)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              AI Score
            </span>
            {values.aiScore !== "all" && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-[4px]"
                style={{
                  color: AI_SCORE_TIERS.find(t => t.id === values.aiScore)?.color,
                  background: AI_SCORE_TIERS.find(t => t.id === values.aiScore)?.bg,
                  border: `1px solid ${AI_SCORE_TIERS.find(t => t.id === values.aiScore)?.border}`,
                  boxShadow: `0 0 8px ${AI_SCORE_TIERS.find(t => t.id === values.aiScore)?.color}30`,
                }}
              >
                {AI_SCORE_TIERS.find(t => t.id === values.aiScore)?.range}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            {AI_SCORE_TIERS.filter(t => t.id !== "all").map(tier => {
              const isOn = values.aiScore === tier.id;
              const isElite = tier.id === "elite";
              const fillPct = tier.id === "weak" ? 18 : tier.id === "testing" ? 36 : tier.id === "promising" ? 58 : tier.id === "winning" ? 78 : 100;
              return (
                <button
                  key={tier.id}
                  onClick={() => onChange({ ...values, aiScore: isOn ? "all" : tier.id })}
                  className="relative overflow-hidden flex items-center gap-2.5 w-full px-3 py-2.5 rounded-[9px] text-left"
                  style={{
                    background: isOn
                      ? `linear-gradient(135deg, ${tier.bg}, rgba(255,255,255,0.01))`
                      : "rgba(255,255,255,0.025)",
                    border: `1px solid ${isOn ? tier.border : "rgba(255,255,255,0.06)"}`,
                    boxShadow: isOn ? `0 2px 16px ${tier.color}28, 0 0 0 1px ${tier.color}10 inset` : "none",
                    transition: "all 160ms ease",
                  }}
                  onMouseEnter={e => {
                    if (!isOn) {
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.045)";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isOn) {
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.025)";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)";
                    }
                  }}
                >
                  {/* Bottom strength bar */}
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, height: 2,
                    width: isOn ? `${fillPct}%` : "0%",
                    background: `linear-gradient(90deg, ${tier.color}CC, ${tier.color}20)`,
                    borderRadius: "0 0 0 9px",
                    transition: "width 380ms cubic-bezier(0.34,1.56,0.64,1)",
                  }} />
                  {/* Color dot with glow */}
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                    background: tier.color,
                    boxShadow: isOn ? `0 0 10px ${tier.color}CC, 0 0 20px ${tier.color}40` : "none",
                    opacity: isOn ? 1 : 0.40,
                    transition: "all 160ms ease",
                  }} />
                  {/* Label */}
                  <span className="text-[11px] font-semibold flex-1" style={{
                    color: isOn ? tier.color : "rgba(255,255,255,0.45)",
                  }}>
                    {tier.label}
                  </span>
                  {/* Range badge */}
                  <span className="text-[9px] font-mono tabular-nums" style={{
                    color: isOn ? `${tier.color}DD` : "rgba(255,255,255,0.22)",
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {tier.range || "0–99"}
                  </span>
                  {isElite && (
                    <span className="text-[7px] font-bold px-1.5 py-[2px] rounded-[4px] flex-shrink-0"
                      style={{
                        background: "linear-gradient(135deg, rgba(124,58,237,0.40), rgba(167,139,250,0.20))",
                        color: "#C4B5FD",
                        border: "1px solid rgba(167,139,250,0.40)",
                        letterSpacing: "0.06em",
                      }}>
                      PRO
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <Divider />

        {/* Result count */}
        <div className="flex items-center gap-1.5 text-[11px] tabular-nums" style={{ color: "rgba(255,255,255,0.30)" }}>
          {loading ? (
            <span className="animate-pulse">Loading…</span>
          ) : filteredResults !== undefined && totalResults !== undefined ? (
            <>
              <span style={{ color: "rgba(167,139,250,0.70)", fontWeight: 600 }}>
                {filteredResults === totalResults ? totalResults : filteredResults}
              </span>
              <span>{filteredResults === totalResults ? "ads found" : `of ${totalResults} ads`}</span>
            </>
          ) : null}
        </div>

        <Divider />

        {/* Smart Presets */}
        <FilterSection label="Smart Presets">
          <div className="flex flex-col gap-1.5">
            {PRESETS.map((preset) => {
              const isActive = values.preset === preset.id;
              const color   = preset.id === "top" ? "#A78BFA" : preset.id === "trending" ? "#34D399" : "#F59E0B";
              const iconBg  = preset.id === "top" ? "rgba(167,139,250,0.15)" : preset.id === "trending" ? "rgba(52,211,153,0.15)" : "rgba(245,158,11,0.15)";
              const iconBorder = preset.id === "top" ? "rgba(167,139,250,0.32)" : preset.id === "trending" ? "rgba(52,211,153,0.32)" : "rgba(245,158,11,0.32)";
              const cardBg  = preset.id === "top" ? "linear-gradient(135deg, rgba(167,139,250,0.10), rgba(124,58,237,0.04))" : preset.id === "trending" ? "linear-gradient(135deg, rgba(52,211,153,0.10), rgba(16,185,129,0.04))" : "linear-gradient(135deg, rgba(245,158,11,0.10), rgba(217,119,6,0.04))";
              const PresetIcon = preset.id === "top" ? Trophy : preset.id === "trending" ? TrendingUp : Leaf;
              return (
                <button
                  key={preset.id}
                  onClick={() => togglePreset(preset.id)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[10px] text-left"
                  style={{
                    background: isActive ? cardBg : "rgba(255,255,255,0.025)",
                    border: `1px solid ${isActive ? iconBorder : "rgba(255,255,255,0.06)"}`,
                    boxShadow: isActive ? `0 4px 20px ${color}22, 0 0 0 1px ${color}10 inset` : "none",
                    transition: "all 160ms ease",
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.045)";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.10)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.025)";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)";
                    }
                  }}
                >
                  <div className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0"
                    style={{
                      background: isActive ? iconBg : "rgba(255,255,255,0.04)",
                      border: `1px solid ${isActive ? iconBorder : "rgba(255,255,255,0.07)"}`,
                      boxShadow: isActive ? `0 0 12px ${color}30` : "none",
                      transition: "all 160ms ease",
                    }}>
                    <PresetIcon size={14} style={{ color: isActive ? color : "rgba(255,255,255,0.30)" }} strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold" style={{ color: isActive ? color : "rgba(255,255,255,0.60)" }}>
                      {preset.label}
                    </p>
                    <p className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.28)" }}>{preset.desc}</p>
                  </div>
                  {isActive && (
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: color, flexShrink: 0,
                      boxShadow: `0 0 8px ${color}CC, 0 0 16px ${color}55`,
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </FilterSection>

        <Divider />

        {/* Country */}
        <FilterSection label="Country">
          <div className="relative">
            <button
              onClick={() => { setShowCountryDrop(v => !v); setShowSortDrop(false); }}
              className="flex items-center gap-2 w-full px-2.5 py-2 rounded-[8px] text-[11px] font-medium"
              style={{
                background: values.country !== "US"
                  ? "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(167,139,250,0.06))"
                  : "rgba(255,255,255,0.035)",
                border: `1px solid ${values.country !== "US" ? "rgba(124,58,237,0.35)" : "rgba(255,255,255,0.08)"}`,
                color: values.country !== "US" ? "var(--text-1)" : "var(--text-2)",
                boxShadow: values.country !== "US" ? "0 0 12px rgba(124,58,237,0.12)" : "none",
                transition: "all 150ms ease",
              }}
            >
              <span className="text-[14px] flex-shrink-0">{COUNTRY_INFO[values.country]?.flag ?? "🌐"}</span>
              <span className="flex-1 text-left">{COUNTRY_INFO[values.country]?.label ?? values.country}</span>
              <ChevronDown size={12} style={{
                color: "rgba(167,139,250,0.60)",
                transform: showCountryDrop ? "rotate(180deg)" : "none",
                transition: "transform 150ms",
                flexShrink: 0,
              }} />
            </button>
            {showCountryDrop && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowCountryDrop(false)} />
                <div
                  className="absolute top-full left-0 right-0 mt-1 rounded-[10px] py-1 z-20 max-h-[280px] overflow-y-auto no-scrollbar"
                  style={{
                    background: "linear-gradient(160deg, #1E1F3A 0%, #161728 100%)",
                    border: "1px solid rgba(124,58,237,0.20)",
                    boxShadow: "0 20px 48px rgba(0,0,0,0.80), 0 0 0 1px rgba(255,255,255,0.04) inset",
                    backdropFilter: "blur(16px)",
                  }}
                >
                  {COUNTRY_CODES.map(code => {
                    const isOn = values.country === code;
                    const info = COUNTRY_INFO[code];
                    return (
                      <button
                        key={code}
                        onClick={() => { onChange({ ...values, country: code }); setShowCountryDrop(false); }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-[11px] font-medium"
                        style={{
                          background: isOn ? "rgba(124,58,237,0.14)" : "transparent",
                          color: isOn ? "#C4B5FD" : "var(--text-2)",
                          transition: "all 100ms ease",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = isOn ? "rgba(124,58,237,0.20)" : "rgba(255,255,255,0.04)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = isOn ? "rgba(124,58,237,0.14)" : "transparent"; }}
                      >
                        <span className="text-[14px] flex-shrink-0">{info?.flag ?? "🌐"}</span>
                        <span className="flex-1 text-left">{info?.label ?? code}</span>
                        {isOn && (
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
                            background: "#A78BFA",
                            boxShadow: "0 0 5px rgba(167,139,250,0.8)",
                          }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
                )}
              </div>
            </FilterSection>

        <Divider />

        {/* Platform — dropdown multi-select */}
        <FilterSection label="Platform">
          <PlatformDropdown
            selected={values.platforms}
            onToggle={(id) => togglePlatform(id)}
          />
        </FilterSection>

        <Divider />

        {/* Media type */}
        <FilterSection label="Media Type">
          <div
            className="flex items-center p-[3px] rounded-[9px] gap-[3px] w-full"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(8px)",
            }}
          >
            {([{ value: null, label: "All" }, { value: "video", label: "🎬 Video" }, { value: "image", label: "🖼 Image" }] as const).map(opt => (
              <button
                key={String(opt.value)}
                onClick={() => onChange({ ...values, mediaType: opt.value })}
                className="flex-1 py-1.5 rounded-[7px] text-[10px] font-semibold"
                style={
                  values.mediaType === opt.value
                    ? {
                        background: "linear-gradient(135deg, rgba(124,58,237,0.35), rgba(91,33,182,0.25))",
                        color: "#E9D5FF",
                        border: "1px solid rgba(124,58,237,0.40)",
                        boxShadow: "0 2px 8px rgba(124,58,237,0.25)",
                      }
                    : {
                        color: "rgba(255,255,255,0.35)",
                        border: "1px solid transparent",
                      }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </FilterSection>

        <Divider />

        {/* Language — dropdown */}
        <FilterSection label="Language">
          <LanguageDropdown
            selected={values.language}
            onSelect={(id) => onChange({ ...values, language: id })}
          />
        </FilterSection>

        <Divider />

        {/* Niche — dropdown */}
        <FilterSection label="Niche">
          <NicheDropdown
            selected={values.niche}
            onSelect={(id) => onChange({ ...values, niche: id })}
          />
        </FilterSection>

        <Divider />

        {/* Duration buckets */}
        <FilterSection label="Duration">
          <div className="grid grid-cols-2 gap-1.5">
            {([
              { id: "any",      label: "Any" },
              { id: "new",      label: "0–14d" },
              { id: "growing",  label: "15–60d" },
              { id: "proven",   label: "60–180d" },
              { id: "evergreen",label: "180d+" },
            ] as const).map(opt => {
              const isOn = values.duration === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => onChange({ ...values, duration: opt.id })}
                  className="py-1.5 px-2 rounded-[7px] text-[10px] font-semibold text-center"
                  style={{
                    background: isOn
                      ? "linear-gradient(135deg, rgba(124,58,237,0.22), rgba(167,139,250,0.10))"
                      : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isOn ? "rgba(124,58,237,0.45)" : "rgba(255,255,255,0.07)"}`,
                    color: isOn ? "#C4B5FD" : "rgba(255,255,255,0.35)",
                    boxShadow: isOn ? "0 0 10px rgba(124,58,237,0.18)" : "none",
                    transition: "all 130ms ease",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </FilterSection>

        <Divider />

        {/* Sort */}
        <FilterSection label="Sort By">
          <div className="relative">
            <button
              onClick={() => { setShowSortDrop(v => !v); setShowCountryDrop(false); }}
              className="flex items-center gap-1.5 w-full px-2.5 py-2 rounded-[8px] text-[11px] font-medium"
              style={{
                background: "rgba(255,255,255,0.035)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "var(--text-2)",
                transition: "all 120ms ease",
              }}
            >
              <span className="flex-1 text-left">{activeSort.label}</span>
              <ChevronDown size={11} style={{
                color: "rgba(167,139,250,0.60)",
                transform: showSortDrop ? "rotate(180deg)" : "none",
                transition: "transform 150ms",
              }} />
            </button>
            {showSortDrop && (
              <div
                className="absolute top-full left-0 right-0 mt-1 rounded-[10px] py-1 z-20"
                style={{
                  background: "linear-gradient(160deg, #1E1F3A 0%, #161728 100%)",
                  border: "1px solid rgba(124,58,237,0.20)",
                  boxShadow: "0 20px 48px rgba(0,0,0,0.80), 0 0 0 1px rgba(255,255,255,0.04) inset",
                  backdropFilter: "blur(16px)",
                }}
              >
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { onChange({ ...values, sortBy: opt.id as FilterValues["sortBy"] }); setShowSortDrop(false); }}
                    className="w-full text-left px-3 py-2 text-[11px]"
                    style={{
                      color:      values.sortBy === opt.id ? "#C4B5FD" : "var(--text-2)",
                      fontWeight: values.sortBy === opt.id ? 600 : 400,
                      background: "transparent",
                      transition: "all 100ms ease",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </FilterSection>

      </div>
    );
  }

  // ── HORIZONTAL (top bar) layout ──────────────────────────────────────────────
  return (
    <div className="mb-5 flex flex-col gap-2.5">

      {/* Preset pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {PRESETS.map((preset) => {
          const isActive = values.preset === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => togglePreset(preset.id)}
              title={preset.desc}
              className="flex items-center gap-1.5 flex-shrink-0 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold"
              style={{
                background: isActive
                  ? "linear-gradient(135deg, rgba(124,58,237,0.22), rgba(167,139,250,0.10))"
                  : "rgba(255,255,255,0.04)",
                border:     `1px solid ${isActive ? "rgba(124,58,237,0.50)" : "rgba(255,255,255,0.08)"}`,
                color:      isActive ? "#C4B5FD" : "rgba(255,255,255,0.50)",
                boxShadow:  isActive ? "0 2px 14px rgba(124,58,237,0.25)" : "none",
                transition: "all 140ms ease",
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)";
                  (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.70)";
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                  (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.50)";
                }
              }}
            >
              <span style={{ fontSize: 13 }}>{preset.icon}</span>
              {preset.label}
            </button>
          );
        })}
        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 flex-shrink-0 px-2.5 py-1.5 rounded-[8px] text-[11px] font-medium"
            style={{
              color: "rgba(255,255,255,0.35)",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "transparent",
              transition: "all 120ms ease",
            }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">

        {/* Country — hidden: only US data available */}
        {/* Status — hidden: 99.7% active */}

        {/* Media type toggle */}
        <div className="flex items-center p-[3px] rounded-[8px] gap-[3px]"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
          {([{ value: null, label: "All" }, { value: "video", label: "🎬 Video" }, { value: "image", label: "🖼 Image" }] as const).map(opt => (
            <button key={String(opt.value)}
              onClick={() => onChange({ ...values, mediaType: opt.value })}
              className="px-2.5 py-1 rounded-[6px] text-[11px] font-semibold"
              style={values.mediaType === opt.value
                ? {
                    background: "linear-gradient(135deg, rgba(124,58,237,0.35), rgba(91,33,182,0.25))",
                    color: "#E9D5FF",
                    border: "1px solid rgba(124,58,237,0.40)",
                    boxShadow: "0 1px 6px rgba(124,58,237,0.20)",
                  }
                : {
                    color: "rgba(255,255,255,0.35)",
                    border: "1px solid transparent",
                  }}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Platform pills */}
        <div className="flex items-center gap-1">
          {PLATFORMS.map(p => {
            const isOn = values.platforms.includes(p.id);
            return (
              <button key={p.id} onClick={() => togglePlatform(p.id)}
                className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-[6px]"
                style={{
                  color:      isOn ? p.color : "rgba(255,255,255,0.35)",
                  background: isOn ? `${p.color}18` : "rgba(255,255,255,0.03)",
                  border:     `1px solid ${isOn ? `${p.color}45` : "rgba(255,255,255,0.08)"}`,
                  boxShadow:  isOn ? `0 0 8px ${p.color}30` : "none",
                  transition: "all 130ms ease",
                }}>
                <span className="text-[11px]">{p.icon}</span>
                {p.short}
              </button>
            );
          })}
        </div>

        {/* Sort */}
        <div className="relative ml-auto">
          <button
            onClick={() => { setShowSortDrop(v => !v); setShowCountryDrop(false); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[7px] text-[12px] font-medium"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              color: "rgba(255,255,255,0.55)",
              transition: "all 120ms ease",
            }}
          >
            <span className="text-[10px]" style={{ color: "rgba(167,139,250,0.55)" }}>Sort:</span>
            {activeSort.label}
            <ChevronDown size={11} style={{ color: "rgba(167,139,250,0.55)" }} />
          </button>
          {showSortDrop && (
            <div className="absolute top-full right-0 mt-1 w-48 rounded-[10px] py-1 z-20"
              style={{
                background: "linear-gradient(160deg, #1E1F3A 0%, #161728 100%)",
                border: "1px solid rgba(124,58,237,0.20)",
                boxShadow: "0 20px 48px rgba(0,0,0,0.80), 0 0 0 1px rgba(255,255,255,0.04) inset",
                backdropFilter: "blur(16px)",
              }}>
              {SORT_OPTIONS.map(opt => (
                <button key={opt.id}
                  onClick={() => { onChange({ ...values, sortBy: opt.id as FilterValues["sortBy"] }); setShowSortDrop(false); }}
                  className="w-full text-left px-3 py-2 text-[11px]"
                  style={{
                    color: values.sortBy === opt.id ? "#C4B5FD" : "var(--text-2)",
                    fontWeight: values.sortBy === opt.id ? 600 : 400,
                    background: "transparent",
                    transition: "all 100ms ease",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Result count */}
        {loading ? (
          <span className="text-[11px] animate-pulse" style={{ color: "rgba(255,255,255,0.28)" }}>Loading…</span>
        ) : filteredResults !== undefined && totalResults !== undefined ? (
          <span className="text-[11px] tabular-nums" style={{ color: "rgba(255,255,255,0.28)" }}>
            {filteredResults === totalResults ? `${totalResults} ads` : `${filteredResults} / ${totalResults} ads`}
          </span>
        ) : null}
      </div>
    </div>
  );
}
