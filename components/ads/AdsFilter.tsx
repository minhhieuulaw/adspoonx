"use client";

import { useState } from "react";
import { ChevronDown, Globe, SlidersHorizontal } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { LANGUAGE_OPTIONS, type AdLanguage } from "@/lib/detect-language";

// Only show countries that actually exist in our database
const COUNTRY_CODES = ["US"] as const;

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
  { id: "Fitness & Wellness",      icon: "💪", short: "Fitness" },
  { id: "Supplements & Nutrition", icon: "💊", short: "Supplements" },
  { id: "Food & Beverage",         icon: "🍕", short: "Food" },
  { id: "Electronics & Tech",      icon: "📱", short: "Tech" },
  { id: "Home & Living",           icon: "🏠", short: "Home" },
  { id: "Baby & Kids",             icon: "🍼", short: "Kids" },
  { id: "Jewelry & Accessories",   icon: "💎", short: "Jewelry" },
  { id: "Pet Supplies",            icon: "🐾", short: "Pets" },
  { id: "Sports & Outdoors",       icon: "⚽", short: "Sports" },
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
  sortBy: "score" | "newest" | "longest";
  dropshipping: "all" | "dropshipping" | "brand";
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

const EXTRA_COUNTRIES: Record<string, string> = {
  SG: "Singapore", GB: "United Kingdom", AU: "Australia", CA: "Canada",
};

// ── Section wrapper for vertical sidebar ──────────────────────────────────────

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-3)", letterSpacing: "0.09em" }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--border)" }} />;
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
          background: count > 0 ? "rgba(124,58,237,0.06)" : "var(--bg-hover)",
          border: `1px solid ${count > 0 ? "rgba(124,58,237,0.25)" : "var(--border)"}`,
          color: count > 0 ? "var(--text-1)" : "var(--text-2)",
          transition: "all 120ms var(--ease)",
        }}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {count === 0 ? (
            <span>All Platforms</span>
          ) : (
            <div className="flex items-center gap-1 flex-wrap">
              {selectedPlatforms.map(p => (
                <span key={p.id} className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-[1px] rounded-[4px]"
                  style={{ background: `${p.color}18`, color: p.color, border: `1px solid ${p.color}30` }}>
                  <span className="text-[10px]">{p.icon}</span>
                  {p.short}
                </span>
              ))}
            </div>
          )}
        </div>
        <ChevronDown size={12} style={{
          color: "var(--text-3)",
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
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            }}>
            {PLATFORMS.map(p => {
              const isOn = selected.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => onToggle(p.id)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-[11px] font-medium"
                  style={{
                    background: isOn ? `${p.color}10` : "transparent",
                    color: isOn ? p.color : "var(--text-2)",
                    transition: "all 100ms ease",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = isOn ? `${p.color}15` : "var(--bg-hover)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isOn ? `${p.color}10` : "transparent"; }}
                >
                  {/* Modern icon */}
                  <span className="text-[14px] flex-shrink-0">{p.icon}</span>
                  {/* Label */}
                  <span className="flex-1 text-left">{p.label}</span>
                  {/* Checkbox indicator */}
                  <div className="w-4 h-4 rounded-[4px] flex items-center justify-center flex-shrink-0"
                    style={{
                      background: isOn ? p.color : "transparent",
                      border: `1.5px solid ${isOn ? p.color : "var(--text-3)"}`,
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

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdsFilter({
  values, onChange, totalResults, filteredResults, loading, vertical = false,
}: AdsFilterProps) {
  const { t } = useLanguage();
  const [showCountryDrop, setShowCountryDrop] = useState(false);
  const [showSortDrop, setShowSortDrop]       = useState(false);

  const getCountryLabel = (code: string) =>
    (t.filter.countries as Record<string, string>)[code] ?? EXTRA_COUNTRIES[code] ?? code;

  const activeSort   = SORT_OPTIONS.find(s => s.id === values.sortBy) ?? SORT_OPTIONS[0];
  const hasFilters   = values.preset !== null || values.platforms.length > 0 || values.sortBy !== "score"
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
    onChange({ ...values, preset: null, platforms: [], sortBy: "score", dropshipping: "all", duration: "any", mediaType: null, aiScore: "all", niche: null, language: "all" });
  }

  const statusOptions = [
    { value: "ACTIVE"   as const, label: t.filter.active },
    { value: "INACTIVE" as const, label: t.filter.inactive },
    { value: "ALL"      as const, label: t.filter.all },
  ];

  // ── VERTICAL (sidebar) layout ────────────────────────────────────────────────
  if (vertical) {
    return (
      <div className="flex flex-col gap-3 px-3 py-3">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal size={12} style={{ color: "var(--ai-light)" }} />
            <span className="text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>Filters</span>
          </div>
          {hasFilters && (
            <button
              onClick={clearAll}
              className="text-[10px] font-medium px-2 py-0.5 rounded-[5px]"
              style={{ color: "var(--ai-light)", background: "var(--ai-soft)", border: "1px solid rgba(124,58,237,0.25)" }}
            >
              Clear
            </button>
          )}
        </div>

        <Divider />

        {/* ★ AI Score Tier — top priority filter */}
        <div
          className="rounded-[10px] p-2.5"
          style={{
            background: values.aiScore === "elite"
              ? "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(167,139,250,0.08))"
              : values.aiScore !== "all"
                ? "rgba(255,255,255,0.02)"
                : "transparent",
            border: values.aiScore !== "all" ? "1px solid rgba(124,58,237,0.2)" : "1px solid transparent",
            transition: "all 200ms var(--ease)",
          }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[11px]" style={{ lineHeight: 1 }}>
              {values.aiScore === "elite" ? "🔥" : "✦"}
            </span>
            <span
              className="text-[10px] font-bold uppercase"
              style={{
                letterSpacing: "0.09em",
                background: "linear-gradient(135deg, var(--ai-light), var(--ai))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              AI Score
            </span>
            {values.aiScore !== "all" && (
              <span
                className="ml-auto text-[8px] font-semibold px-1.5 py-0.5 rounded-[4px]"
                style={{
                  color: AI_SCORE_TIERS.find(t => t.id === values.aiScore)?.color,
                  background: AI_SCORE_TIERS.find(t => t.id === values.aiScore)?.bg,
                  border: `1px solid ${AI_SCORE_TIERS.find(t => t.id === values.aiScore)?.border}`,
                }}
              >
                {AI_SCORE_TIERS.find(t => t.id === values.aiScore)?.range}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            {AI_SCORE_TIERS.filter(t => t.id !== "all").map(tier => {
              const isOn = values.aiScore === tier.id;
              const isElite = tier.id === "elite";
              return (
                <button
                  key={tier.id}
                  onClick={() => onChange({ ...values, aiScore: isOn ? "all" : tier.id })}
                  className="flex items-center gap-2 w-full px-2 py-[6px] rounded-[6px] text-left"
                  style={{
                    background: isOn ? tier.bg : "transparent",
                    border: `1px solid ${isOn ? tier.border : "transparent"}`,
                    transition: "all 120ms var(--ease)",
                  }}
                  onMouseEnter={e => {
                    if (!isOn) (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
                  }}
                  onMouseLeave={e => {
                    if (!isOn) (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <span
                    className="text-[10px] w-4 text-center flex-shrink-0"
                    style={{ color: isOn ? tier.color : "var(--text-3)" }}
                  >
                    {tier.icon}
                  </span>
                  <span
                    className="text-[10px] font-semibold flex-1"
                    style={{ color: isOn ? tier.color : "var(--text-2)" }}
                  >
                    {tier.label}
                  </span>
                  <span
                    className="text-[9px] font-mono tabular-nums"
                    style={{ color: isOn ? tier.color : "var(--text-3)", opacity: 0.7 }}
                  >
                    {tier.range}
                  </span>
                  {isElite && (
                    <span
                      className="text-[7px] font-bold px-1 py-[1px] rounded-[3px] flex-shrink-0"
                      style={{
                        background: "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(167,139,250,0.15))",
                        color: "#A78BFA",
                        border: "1px solid rgba(167,139,250,0.3)",
                      }}
                    >
                      PRO
                    </span>
                  )}
                  {isOn && (
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: tier.color, flexShrink: 0 }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <Divider />

        {/* Result count */}
        <div className="text-[11px] tabular-nums" style={{ color: "var(--text-3)" }}>
          {loading ? (
            <span className="animate-pulse">Loading…</span>
          ) : filteredResults !== undefined && totalResults !== undefined ? (
            filteredResults === totalResults
              ? `${totalResults} ads found`
              : `${filteredResults} of ${totalResults} ads`
          ) : null}
        </div>

        <Divider />

        {/* Smart Presets */}
        <FilterSection label="Smart Presets">
          <div className="flex flex-col gap-1">
            {PRESETS.map((preset) => {
              const isActive = values.preset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => togglePreset(preset.id)}
                  className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-[7px] text-left"
                  style={{
                    background: isActive ? "rgba(124,58,237,0.15)" : "transparent",
                    border:     `1px solid ${isActive ? "rgba(124,58,237,0.4)" : "transparent"}`,
                    transition: "all 120ms var(--ease)",
                  }}
                  onMouseEnter={e => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
                  }}
                  onMouseLeave={e => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <span style={{ fontSize: 13, lineHeight: 1 }}>{preset.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium" style={{ color: isActive ? "var(--ai-light)" : "var(--text-2)" }}>
                      {preset.label}
                    </p>
                    <p className="text-[9px]" style={{ color: "var(--text-3)" }}>{preset.desc}</p>
                  </div>
                  {isActive && (
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ai-light)", flexShrink: 0 }} />
                  )}
                </button>
              );
            })}
          </div>
        </FilterSection>

        <Divider />

        {/* Status — hidden: 99.7% active, only 41 inactive ads */}

        {/* Country — only show when multiple countries exist */}
        {COUNTRY_CODES.length > 1 && (
          <>
            <FilterSection label="Country">
              <div className="relative">
                <button
                  onClick={() => { setShowCountryDrop(v => !v); setShowSortDrop(false); }}
                  className="flex items-center gap-1.5 w-full px-2.5 py-1.5 rounded-[7px] text-[11px] font-medium"
                  style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-2)" }}
                >
                  <Globe size={12} style={{ color: "var(--text-3)" }} />
                  <span className="flex-1 text-left">{getCountryLabel(values.country)}</span>
                  <ChevronDown size={11} style={{ color: "var(--text-3)", transform: showCountryDrop ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
                </button>
                {showCountryDrop && (
                  <div
                    className="absolute top-full left-0 right-0 mt-1 rounded-[10px] py-1 z-20"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
                  >
                    {COUNTRY_CODES.map(code => (
                      <button
                        key={code}
                        onClick={() => { onChange({ ...values, country: code }); setShowCountryDrop(false); }}
                        className="w-full text-left px-3 py-1.5 text-[12px]"
                        style={{
                          color:      values.country === code ? "var(--ai-light)" : "var(--text-2)",
                          fontWeight: values.country === code ? 500 : 400,
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        {getCountryLabel(code)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </FilterSection>
            <Divider />
          </>
        )}


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
            className="flex items-center p-0.5 rounded-[8px] gap-0.5 w-full"
            style={{ background: "var(--bg-hover)", border: "1px solid var(--border)" }}
          >
            {([{ value: null, label: "All" }, { value: "video", label: "🎬 Video" }, { value: "image", label: "🖼 Image" }] as const).map(opt => (
              <button
                key={String(opt.value)}
                onClick={() => onChange({ ...values, mediaType: opt.value })}
                className="flex-1 py-1.5 rounded-[6px] text-[10px] font-medium"
                style={
                  values.mediaType === opt.value
                    ? { background: "var(--bg-active)", color: "var(--text-1)" }
                    : { color: "var(--text-3)" }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </FilterSection>

        <Divider />

        {/* Language */}
        <FilterSection label="Language">
          <div className="flex flex-col gap-0.5 max-h-[180px] overflow-y-auto no-scrollbar">
            {LANGUAGE_OPTIONS.map(l => {
              const isOn = values.language === l.id;
              return (
                <button
                  key={l.id}
                  onClick={() => onChange({ ...values, language: isOn ? "all" : l.id as AdLanguage | "all" })}
                  className="flex items-center gap-1.5 w-full px-2 py-[5px] rounded-[6px] text-left"
                  style={{
                    background: isOn ? "rgba(124,58,237,0.12)" : "transparent",
                    border: `1px solid ${isOn ? "rgba(124,58,237,0.3)" : "transparent"}`,
                    transition: "all 120ms var(--ease)",
                  }}
                  onMouseEnter={e => { if (!isOn) (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
                  onMouseLeave={e => { if (!isOn) (e.currentTarget as HTMLElement).style.background = isOn ? "rgba(124,58,237,0.12)" : "transparent"; }}
                >
                  <span style={{ fontSize: 12, lineHeight: 1 }}>{l.flag}</span>
                  <span className="text-[10px] font-medium flex-1" style={{ color: isOn ? "var(--ai-light)" : "var(--text-2)" }}>
                    {l.label}
                  </span>
                  {isOn && l.id !== "all" && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--ai-light)", flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </FilterSection>

        <Divider />

        {/* Niche / Industry */}
        <FilterSection label="Niche">
          <div className="flex flex-col gap-0.5 max-h-[200px] overflow-y-auto no-scrollbar">
            {NICHE_OPTIONS.map(n => {
              const isOn = values.niche === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => onChange({ ...values, niche: isOn ? null : n.id })}
                  className="flex items-center gap-1.5 w-full px-2 py-[5px] rounded-[6px] text-left"
                  style={{
                    background: isOn ? "rgba(124,58,237,0.12)" : "transparent",
                    border: `1px solid ${isOn ? "rgba(124,58,237,0.3)" : "transparent"}`,
                    transition: "all 120ms var(--ease)",
                  }}
                  onMouseEnter={e => { if (!isOn) (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
                  onMouseLeave={e => { if (!isOn) (e.currentTarget as HTMLElement).style.background = isOn ? "rgba(124,58,237,0.12)" : "transparent"; }}
                >
                  <span style={{ fontSize: 11, lineHeight: 1 }}>{n.icon}</span>
                  <span className="text-[10px] font-medium flex-1" style={{ color: isOn ? "var(--ai-light)" : "var(--text-2)" }}>
                    {n.short}
                  </span>
                  {isOn && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--ai-light)", flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </FilterSection>

        <Divider />

        {/* Duration buckets */}
        <FilterSection label="Duration">
          <div className="grid grid-cols-2 gap-1">
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
                  className="py-1.5 px-2 rounded-[6px] text-[10px] font-medium text-center"
                  style={{
                    background: isOn ? "rgba(124,58,237,0.15)" : "var(--bg-hover)",
                    border:     `1px solid ${isOn ? "rgba(124,58,237,0.4)" : "var(--border)"}`,
                    color:      isOn ? "var(--ai-light)" : "var(--text-2)",
                    transition: "all 120ms var(--ease)",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </FilterSection>

        <Divider />

        {/* Ad type: dropshipping vs brand */}
        <FilterSection label="Ad Type">
          <div
            className="flex items-center p-0.5 rounded-[8px] gap-0.5 w-full"
            style={{ background: "var(--bg-hover)", border: "1px solid var(--border)" }}
          >
            {([{ id: "all", label: "All" }, { id: "dropshipping", label: "DS" }, { id: "brand", label: "Brand" }] as const).map(opt => (
              <button
                key={opt.id}
                onClick={() => onChange({ ...values, dropshipping: opt.id })}
                className="flex-1 py-1.5 rounded-[6px] text-[10px] font-medium"
                style={
                  values.dropshipping === opt.id
                    ? { background: "var(--bg-active)", color: "var(--text-1)" }
                    : { color: "var(--text-3)" }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </FilterSection>

        <Divider />

        {/* Sort */}
        <FilterSection label="Sort By">
          <div className="relative">
            <button
              onClick={() => { setShowSortDrop(v => !v); setShowCountryDrop(false); }}
              className="flex items-center gap-1.5 w-full px-2.5 py-1.5 rounded-[7px] text-[11px] font-medium"
              style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-2)" }}
            >
              <span className="flex-1 text-left">{activeSort.label}</span>
              <ChevronDown size={11} style={{ color: "var(--text-3)", transform: showSortDrop ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
            </button>
            {showSortDrop && (
              <div
                className="absolute top-full left-0 right-0 mt-1 rounded-[10px] py-1 z-20"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
              >
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { onChange({ ...values, sortBy: opt.id as FilterValues["sortBy"] }); setShowSortDrop(false); }}
                    className="w-full text-left px-3 py-1.5 text-[12px]"
                    style={{
                      color:      values.sortBy === opt.id ? "var(--ai-light)" : "var(--text-2)",
                      fontWeight: values.sortBy === opt.id ? 500 : 400,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
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
              className="flex items-center gap-1.5 flex-shrink-0 px-3 py-1.5 rounded-[8px] text-[12px] font-medium"
              style={{
                background: isActive ? "rgba(124,58,237,0.18)" : "var(--bg-hover)",
                border:     `1px solid ${isActive ? "rgba(124,58,237,0.45)" : "var(--border)"}`,
                color:      isActive ? "var(--ai-light)" : "var(--text-2)",
                transition: "all 120ms var(--ease)",
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)"; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
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
            style={{ color: "var(--text-3)", border: "1px solid var(--border)", background: "transparent" }}
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
        <div className="flex items-center p-0.5 rounded-[8px] gap-0.5"
          style={{ background: "var(--bg-hover)", border: "1px solid var(--border)" }}>
          {([{ value: null, label: "All" }, { value: "video", label: "🎬 Video" }, { value: "image", label: "🖼 Image" }] as const).map(opt => (
            <button key={String(opt.value)}
              onClick={() => onChange({ ...values, mediaType: opt.value })}
              className="px-2.5 py-1 rounded-[6px] text-[11px] font-medium"
              style={values.mediaType === opt.value
                ? { background: "var(--bg-active)", color: "var(--text-1)" }
                : { color: "var(--text-3)" }}>
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
                className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-[5px]"
                style={{
                  color:      isOn ? p.color : "var(--text-3)",
                  background: isOn ? `${p.color}18` : "var(--bg-hover)",
                  border:     `1px solid ${isOn ? `${p.color}40` : "var(--border)"}`,
                  transition: "all 120ms var(--ease)",
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
            style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-2)" }}
          >
            <span className="text-[10px]" style={{ color: "var(--text-3)" }}>Sort:</span>
            {activeSort.label}
            <ChevronDown size={11} style={{ color: "var(--text-3)" }} />
          </button>
          {showSortDrop && (
            <div className="absolute top-full right-0 mt-1 w-48 rounded-[10px] py-1 z-20"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
              {SORT_OPTIONS.map(opt => (
                <button key={opt.id}
                  onClick={() => { onChange({ ...values, sortBy: opt.id as FilterValues["sortBy"] }); setShowSortDrop(false); }}
                  className="w-full text-left px-3 py-1.5 text-[12px]"
                  style={{ color: values.sortBy === opt.id ? "var(--ai-light)" : "var(--text-2)", fontWeight: values.sortBy === opt.id ? 500 : 400 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Result count */}
        {loading ? (
          <span className="text-[11px] animate-pulse" style={{ color: "var(--text-3)" }}>Loading…</span>
        ) : filteredResults !== undefined && totalResults !== undefined ? (
          <span className="text-[11px] tabular-nums" style={{ color: "var(--text-3)" }}>
            {filteredResults === totalResults ? `${totalResults} ads` : `${filteredResults} / ${totalResults} ads`}
          </span>
        ) : null}
      </div>
    </div>
  );
}
