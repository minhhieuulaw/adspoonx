# Phase 04 — Stores + Trending Pages
**Status:** pending
**Files:**
- `app/(dashboard)/stores/page.tsx`
- `app/(dashboard)/trending/page.tsx`
**Depends on:** Phase 01 (tokens)

**Context links:**
- Scout: `scout/scout-01-codebase.md` §6 Other Dashboard Pages
- Research: `research/researcher-02-saas-patterns.md` §4 Table & List Views, §7 Stats & KPI Blocks
- Research: `research/researcher-01-homepage-dna.md` §Card Architecture

---

## Overview
Two structurally different pages:
- **Stores**: Table/grid of store entries — focus on premium row hover, inline avatar, status dot, rank number styling
- **Trending**: Niche cards with growth metrics — focus on gradient border variants (hot/rising/evergreen), improved stats grid layout

No state, API calls, sort/filter handlers, or routing touched.

---

## Key Insights

### Stores Page
- Scout: "Table grid, sort/filter by country/platform/status" — likely a flex/grid layout, not an HTML `<table>`
- Row hover should be `rgba(255,255,255,0.03)` (ultra-subtle, per Linear pattern)
- Status dot should match existing `--green`/`--amber`/`--red` tokens + pulse animation
- Store avatar: deterministic color from store name (same `avatarColor()` pattern as AdCard)
- Country flag + platform badge inline — needs consistent spacing
- Rank number column: monospace, `--text-3` color, right-aligned

### Trending Page
- Niche cards: 3 variant types need distinct gradient borders (hot=red-orange, rising=purple, evergreen=green)
- Growth % number: should be large (`--fs-stat-value`), monospace, colored by growth direction
- Top stores list within each niche card: compact rows, avatar + name + metric
- Country filter buttons: standard filter pill treatment (same pattern as Phase 03)

---

## Requirements

### Stores Page
1. Row container: `background: var(--card-deep)` per row, `border-bottom: 1px solid var(--border-inner)`
2. Row hover: `background: rgba(255,255,255,0.03)` — ultra subtle, no transform
3. Status dot: 8px circle, pulse animation via `.live-dot` class on active, `--green` color
4. Store avatar: if missing, add deterministic initial avatar using `avatarColor()` pattern
5. Rank number: `fontFamily: "var(--font-geist-mono)"`, `color: "var(--text-3)"`, `fontSize: "13px"`
6. Table header row: `background: var(--bg-elevated)`, `fontSize: "var(--fs-label)"`, `letterSpacing: "var(--ls-label)"`, `color: "var(--text-3)"`, uppercase
7. Sort indicator arrow: `color: "var(--ai-light)"` on active column
8. Wrap the entire table in `.premium-card` container (from Phase 01)

### Trending Page
9. Niche card base: `background: var(--card-deep)`, `border-radius: 14px`, `border: 1px solid var(--border)`
10. Hot niche variant: `borderTop: "2px solid var(--red)"` + title badge `background: rgba(239,68,68,0.15)`
11. Rising niche variant: `borderTop: "2px solid var(--ai)"` + badge `background: rgba(124,58,237,0.15)`
12. Evergreen niche variant: `borderTop: "2px solid var(--green)"` + badge `background: rgba(16,185,129,0.15)`
13. Growth percentage: `fontSize: "var(--fs-stat-value)"`, `fontFamily: "var(--font-geist-mono)"`, color per direction (`--green` up, `--red` down)
14. Stats grid inside card: 3-column flex, each stat: label (`--text-3`, `--fs-label`) + value (`--text-1`, `font-weight: 700`)
15. Top stores rows inside card: `border-top: 1px solid var(--border-inner)`, subtle `--bg-hover` on row hover
16. Country filter pills: same pill chip pattern as Phase 03 — `border-radius: 20px`, active = `background: var(--ai-soft)`, `border: 1px solid var(--border-purple)`

---

## Implementation Steps

### stores/page.tsx

**Step 1 — Read full file first** — stores page structure is unknown beyond scout summary.

**Step 2 — Wrap table/list in premium-card**

Locate the outermost container of the store list. Wrap it:
```jsx
<div className="premium-card" style={{ overflow: "hidden" }}>
  {/* existing table/list content */}
</div>
```

**Step 3 — Table header row**

Find the header row (column labels). Change its container style:
```jsx
style={{
  background: "var(--bg-elevated)",
  borderBottom: "1px solid var(--border)",
  padding: "8px 16px",
}}
```
For each header label span/th:
```jsx
style={{
  fontSize: "var(--fs-label)",
  fontWeight: 600,
  letterSpacing: "var(--ls-label)",
  color: "var(--text-3)",
  textTransform: "uppercase",
}}
```

**Step 4 — Store row hover**

For each store row div/tr, change hover handler:
```jsx
onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
```
Row base style:
```jsx
style={{
  borderBottom: "1px solid var(--border-inner)",
  transition: "background 120ms var(--ease)",
  padding: "10px 16px",
}}
```

**Step 5 — Status dot**

For active store status indicator:
```jsx
<span
  className="live-dot"
  style={{
    display: "inline-block",
    width: 8, height: 8,
    borderRadius: "50%",
    background: status === "active" ? "var(--green)" : status === "paused" ? "var(--amber)" : "var(--text-3)",
    flexShrink: 0,
  }}
/>
```
Active status gets `.live-dot` class for pulse. Others: static, no class.

**Step 6 — Rank number**

```jsx
<span style={{ fontFamily: "var(--font-geist-mono)", color: "var(--text-3)", fontSize: 13, minWidth: 28, textAlign: "right" }}>
  #{rank}
</span>
```

**Step 7 — Sort indicator active column**

Find sort arrow icon on active column header. Change color:
```jsx
style={{ color: "var(--ai-light)" }}
```

### trending/page.tsx

**Step 8 — Read full file first.**

**Step 9 — Niche card base**

Find each niche card container. Change:
```jsx
style={{
  background: "var(--card-deep)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  overflow: "hidden",
  transition: "border-color 200ms var(--ease), box-shadow 200ms var(--ease)",
}}
```
Add hover handlers:
```jsx
onMouseEnter={e => {
  const el = e.currentTarget as HTMLElement;
  el.style.borderColor = "var(--border-purple)";
  el.style.boxShadow = "var(--glow-hover)";
}}
onMouseLeave={e => {
  const el = e.currentTarget as HTMLElement;
  el.style.borderColor = "var(--border)";
  el.style.boxShadow = "none";
}}
```

**Step 10 — Niche card variant border tops**

After identifying variant type (hot/rising/evergreen), apply top-border accent:

```jsx
// Determine at render time from niche.variant or growth rate threshold
const variantBorderColor =
  variant === "hot"       ? "var(--red)"   :
  variant === "rising"    ? "var(--ai)"    :
  variant === "evergreen" ? "var(--green)" : "var(--border)";

// Add to card container style:
borderTop: `2px solid ${variantBorderColor}`,
```

**Step 11 — Variant badge inside card header**

```jsx
const variantBadgeBg =
  variant === "hot"       ? "rgba(239,68,68,0.15)"   :
  variant === "rising"    ? "rgba(124,58,237,0.15)"   :
  variant === "evergreen" ? "rgba(16,185,129,0.15)"   : "var(--ai-soft)";
const variantBadgeColor =
  variant === "hot"       ? "var(--red-light)"   :
  variant === "rising"    ? "var(--ai-light)"    :
  variant === "evergreen" ? "var(--green-light)" : "var(--ai-light)";

<span style={{
  background: variantBadgeBg,
  color: variantBadgeColor,
  fontSize: "var(--fs-chip)",
  fontWeight: 600,
  padding: "2px 8px",
  borderRadius: 99,
}}>
  {variant}
</span>
```

**Step 12 — Growth % display**

Find the growth percentage element:
```jsx
<span style={{
  fontFamily: "var(--font-geist-mono)",
  fontSize: "var(--fs-stat-value)",
  fontWeight: 700,
  color: growthPct >= 0 ? "var(--green-light)" : "var(--red-light)",
  lineHeight: 1,
}}>
  {growthPct >= 0 ? "+" : ""}{growthPct}%
</span>
```

**Step 13 — Stats grid inside card**

Each stat block (3 columns):
```jsx
// Stat label:
style={{ fontSize: "var(--fs-label)", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "var(--ls-label)", marginBottom: 2 }}
// Stat value:
style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}
```

**Step 14 — Top stores rows inside card**

```jsx
// Row container:
style={{ borderTop: "1px solid var(--border-inner)", padding: "6px 0", display: "flex", alignItems: "center", gap: 8 }}
// Row hover:
onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
```

---

## Before / After Design Description

**Before — Stores:** Flat table rows, status dots may be plain colored circles without pulse, headers are plain text at standard size.
**After — Stores:** Table wrapped in premium-card, header has uppercase micro-labels, rows have ultra-subtle hover, status dots pulse on active, rank numbers are monospace and muted.

**Before — Trending:** Cards are uniform flat dark, niche type not visually differentiated.
**After — Trending:** Cards have top-border accent in variant color (red/purple/green), growth % is large monospace, badge shows variant with matching color tint.

---

## Todo List
- [ ] Read full `app/(dashboard)/stores/page.tsx`
- [ ] Steps 2–7: stores table/list upgrades
- [ ] Read full `app/(dashboard)/trending/page.tsx`
- [ ] Steps 9–14: trending card upgrades
- [ ] Deploy to Coolify staging
- [ ] Screenshot verify: stores table row hover, trending card top-border variants, growth % large

---

## Screenshot Verification Checkpoints
1. Stores: hover a row — ultra-subtle bg shift, no transform flicker
2. Stores: active store has green pulsing dot
3. Trending: 3 cards side-by-side — each has distinct top-border color
4. Trending: growth % is large monospace number in green or red

## Risk Assessment
- **Medium** — both page files unread; structure may differ from scout summary. Step 1 and 8 (full read) are mandatory.
- Trending variant field: if niche data doesn't have an explicit `variant` field, derive it from growth rate thresholds (e.g., >50% = hot, 20–50% = rising, <20% = evergreen).

## Next Steps
Phase 05 — Secondary Pages (Home Dashboard, Saved, Settings)
