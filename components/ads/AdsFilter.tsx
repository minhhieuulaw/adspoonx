"use client";

import { useState } from "react";
import { ChevronDown, Globe, SlidersHorizontal } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const COUNTRY_CODES = ["VN", "US", "TH", "ID", "PH", "MY", "SG", "GB", "AU", "CA"] as const;

export const PRESETS = [
  { id: "top",          label: "Top Performers", icon: "🏆", desc: "AI Score ≥ 80" },
  { id: "trending",     label: "Trending",       icon: "🚀", desc: "Active, < 30 days" },
  { id: "evergreen",    label: "Evergreen",      icon: "🌲", desc: "> 90 days + proven" },
  { id: "fomo",         label: "FOMO",           icon: "⚡", desc: "Urgency hook" },
  { id: "social_proof", label: "Social Proof",   icon: "🛡️", desc: "Trust-based copy" },
  { id: "ugc",          label: "UGC Style",      icon: "🎥", desc: "Authentic content" },
] as const;

export type PresetId = typeof PRESETS[number]["id"] | null;

const PLATFORMS = [
  { id: "facebook",         label: "Facebook",         short: "FB", color: "#60A5FA" },
  { id: "instagram",        label: "Instagram",        short: "IG", color: "#F472B6" },
  { id: "messenger",        label: "Messenger",        short: "MS", color: "#38BDF8" },
  { id: "audience_network", label: "Audience Network", short: "AN", color: "#A78BFA" },
] as const;

const SORT_OPTIONS = [
  { id: "score",    label: "AI Score" },
  { id: "newest",   label: "Newest First" },
  { id: "longest",  label: "Longest Running" },
  { id: "audience", label: "Biggest Audience" },
] as const;

export interface FilterValues {
  country: string;
  status: "ACTIVE" | "INACTIVE" | "ALL";
  mediaType: "video" | "image" | null;
  preset: PresetId;
  platforms: string[];
  sortBy: "score" | "newest" | "longest" | "audience";
  dropshipping: "all" | "dropshipping" | "brand";
  duration: "any" | "new" | "growing" | "proven" | "evergreen";
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
    || values.dropshipping !== "all" || values.duration !== "any" || values.mediaType !== null;

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
    onChange({ ...values, preset: null, platforms: [], sortBy: "score", dropshipping: "all", duration: "any", mediaType: null });
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

        {/* Status */}
        <FilterSection label="Status">
          <div
            className="flex items-center p-0.5 rounded-[8px] gap-0.5 w-full"
            style={{ background: "var(--bg-hover)", border: "1px solid var(--border)" }}
          >
            {statusOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => onChange({ ...values, status: opt.value })}
                className="flex-1 py-1.5 rounded-[6px] text-[11px] font-medium"
                style={
                  values.status === opt.value
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

        {/* Country */}
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

        {/* Platform */}
        <FilterSection label="Platform">
          <div className="flex flex-col gap-1">
            {PLATFORMS.map(p => {
              const isOn = values.platforms.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => togglePlatform(p.id)}
                  className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-[7px] text-[11px] font-medium"
                  style={{
                    background: isOn ? `${p.color}12` : "transparent",
                    border:     `1px solid ${isOn ? `${p.color}35` : "transparent"}`,
                    color:      isOn ? p.color : "var(--text-2)",
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
                    className="text-[9px] font-bold px-1.5 py-[2px] rounded-[4px]"
                    style={{
                      background: isOn ? `${p.color}20` : "var(--bg-hover)",
                      color:      isOn ? p.color : "var(--text-3)",
                      border:     `1px solid ${isOn ? `${p.color}35` : "var(--border)"}`,
                      minWidth: 24,
                      textAlign: "center",
                    }}
                  >
                    {p.short}
                  </span>
                  {p.label}
                  {isOn && (
                    <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: p.color }} />
                  )}
                </button>
              );
            })}
          </div>
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

        {/* Country */}
        <div className="relative">
          <button
            onClick={() => { setShowCountryDrop(v => !v); setShowSortDrop(false); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[7px] text-[12px] font-medium"
            style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-2)" }}
          >
            <Globe size={12} style={{ color: "var(--text-3)" }} />
            {getCountryLabel(values.country)}
            <ChevronDown size={11} style={{ color: "var(--text-3)" }} />
          </button>
          {showCountryDrop && (
            <div className="absolute top-full left-0 mt-1 w-44 rounded-[10px] py-1 z-20"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
              {COUNTRY_CODES.map(code => (
                <button key={code} onClick={() => { onChange({ ...values, country: code }); setShowCountryDrop(false); }}
                  className="w-full text-left px-3 py-1.5 text-[12px]"
                  style={{ color: values.country === code ? "var(--ai-light)" : "var(--text-2)", fontWeight: values.country === code ? 500 : 400 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                  {getCountryLabel(code)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center p-0.5 rounded-[8px] gap-0.5"
          style={{ background: "var(--bg-hover)", border: "1px solid var(--border)" }}>
          {statusOptions.map(opt => (
            <button key={opt.value} onClick={() => onChange({ ...values, status: opt.value })}
              className="px-3 py-1 rounded-[6px] text-[11px] font-medium"
              style={values.status === opt.value ? { background: "var(--bg-active)", color: "var(--text-1)" } : { color: "var(--text-3)" }}>
              {opt.label}
            </button>
          ))}
        </div>

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
                className="text-[10px] font-bold px-2 py-1 rounded-[5px]"
                style={{
                  color:      isOn ? p.color : "var(--text-3)",
                  background: isOn ? `${p.color}18` : "var(--bg-hover)",
                  border:     `1px solid ${isOn ? `${p.color}40` : "var(--border)"}`,
                  transition: "all 120ms var(--ease)",
                }}>
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
