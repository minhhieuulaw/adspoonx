# Phase 05 — Secondary Pages (Home Dashboard, Saved, Settings)
**Status:** pending
**Files:**
- `app/(dashboard)/home-dashboard/page.tsx`
- `app/(dashboard)/saved/page.tsx`
- `app/(dashboard)/settings/page.tsx`
**Depends on:** Phase 01 (tokens), Phase 03 (AdCard — Saved shares the same card)

**Context links:**
- Scout: `scout/scout-01-codebase.md` §6 Other Dashboard Pages
- Research: `research/researcher-02-saas-patterns.md` §7 Stats & KPI Blocks, Bento-Grid Pattern
- Research: `research/researcher-01-homepage-dna.md` §Component Patterns (Stat Blocks)

---

## Overview
Three secondary pages with lower traffic than Ads but still visible to all users daily:
- **Home Dashboard**: KPI cards, charts, tips carousel, featured stores/niches — bento-grid upgrade
- **Saved**: Reuses AdCard (Phase 03 handles cards) — focus on page wrapper and empty state
- **Settings**: Plan badge, scan balance visual, buy pack UI, upgrade section

---

## Key Insights

### Home Dashboard
- Scout confirms: "KPI cards (animated numbers), stats charts, tips carousel"
- Animated number KPIs already exist — just need card depth + label hierarchy upgrade
- Chart area likely uses Recharts — style touches only (grid line color, axis label color)
- Tips carousel: cards benefit from `--card-deep` + subtle gradient left accent
- Featured stores/niches: same card pattern as Phase 04

### Saved Page
- Reuses `AdCard` component directly → Phase 03 card upgrades apply automatically
- Page-level: just the header section + empty state need attention
- CSV export button: style as secondary outline button

### Settings Page
- Plan badge: promote to gradient pill (matches homepage pricing badge style)
- Scan balance: show as a visual progress-bar-like component, not just a number
- Buy pack cards: `--card-deep` + hover glow
- Upgrade section CTA: full gradient button matching homepage CTA style
- Logout: keep understated (text link, `--text-3` color)

---

## Requirements

### Home Dashboard
1. Page outer wrapper: `animation: page-enter 200ms var(--ease) both` (already class `.page-enter`? confirm)
2. KPI card grid: bento layout — 2 larger KPI cards + 2–3 smaller ones via CSS Grid, `gap: 16px`
3. KPI card: `.premium-card` class + upgrade inner spacing to `padding: 20px 24px`
4. KPI label: `fontSize: "var(--fs-label)"`, `letterSpacing: "var(--ls-label)"`, `color: "var(--text-3)"`, uppercase
5. KPI value: `fontSize: 32`, `fontWeight: 700`, `color: "var(--text-1)"`, `fontFamily: "var(--font-geist-mono)"`
6. KPI trend indicator: `color: "var(--green-light)"` for up, `color: "var(--red-light)"` for down, `fontSize: 12`, `fontWeight: 600`
7. Chart area container: `.premium-card` wrapper, Recharts `CartesianGrid stroke="var(--border)"`, axis tick `fill="var(--text-3)"`
8. Tips carousel cards: `background: var(--card-deep)`, `borderLeft: "3px solid var(--ai)"` accent
9. Featured stores/niches: same card treatment as Phase 04

### Saved Page
10. Page header section: `fontSize: 20`, `fontWeight: 700`, `color: "var(--text-1)"` — ensure not `--text-2`
11. Result count badge: `background: var(--ai-soft)`, `color: "var(--ai-light)"`, `borderRadius: 99`, `padding: "2px 8px"`, monospace
12. CSV export button: `border: "1px solid var(--border)"`, `background: "transparent"`, hover `background: var(--bg-hover)`
13. Empty state: see Phase 06 for skeleton/empty state pattern

### Settings Page
14. Plan badge: `background: linear-gradient(135deg, var(--ai) 0%, #5B21B6 100%)`, `color: white`, `padding: "4px 12px"`, `borderRadius: 99`, `fontSize: 12`, `fontWeight: 700`
15. Scan balance bar:
    - Container: `background: var(--bg-elevated)`, `borderRadius: 99`, `height: 6px`, `overflow: hidden`
    - Fill: `background: linear-gradient(90deg, var(--ai) 0%, var(--ai-light) 100%)`, width = `${usedPct}%`, animated via `width` transition
16. Scan balance label: used/total, monospace, `--text-2` for used, `--text-3` for separator/total
17. Buy pack cards: `.premium-card` + on active/selected: `border: "1px solid var(--border-purple)"`, `boxShadow: "var(--glow-active-item)"`
18. Upgrade section CTA button: `background: linear-gradient(135deg, var(--ai) 0%, #5B21B6 100%)`, `boxShadow: "0 4px 16px rgba(124,58,237,0.35)"`, `borderRadius: 10`, `padding: "10px 24px"`, `fontWeight: 600`, `fontSize: 14`
19. Section dividers in settings: `border-top: 1px solid var(--border)`, `marginTop: 24`, `paddingTop: 24`

---

## Architecture

### Home Dashboard KPI Bento Grid
```
div.bento-grid (CSS Grid, 3 cols, gap-4)
├── KPI card (col-span-2) — primary metric, large
├── KPI card — secondary
├── KPI card — secondary
└── KPI card — secondary
```
Grid CSS (add to globals.css or inline):
```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
/* First KPI card spans 2 cols */
.bento-primary { grid-column: 1 / 3; }
```
Since Tailwind v4 no `@apply` — use inline style or Tailwind grid utilities directly.

Simpler approach without new classes (KISS): use Tailwind `grid grid-cols-3 gap-4` on wrapper, `col-span-2` on first KPI card.

### Settings Scan Balance Visual
```
div (flex, space-between)
├── span "Scan Balance" (label)
└── span "1,240 / 5,000" (monospace, text-2)
div (balance bar container, h-1.5, bg-elevated, rounded-full)
└── div (fill bar, gradient, transition width 600ms ease)
```

---

## Implementation Steps

### home-dashboard/page.tsx

**Step 1 — Read full file first.**

**Step 2 — KPI card wrapper**

Find the KPI cards section. Replace the card wrapper class from `.saas-card` or `.kpi-card` (if used) to `.premium-card`. Or if inline styles:
```jsx
// Before:
style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px" }}
// After:
style={{ background: "var(--card-deep)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px", boxShadow: "var(--glow-ambient)" }}
```

**Step 3 — KPI label + value tokens**

For every KPI label span:
```jsx
style={{ fontSize: "var(--fs-label)", fontWeight: 600, letterSpacing: "var(--ls-label)", color: "var(--text-3)", textTransform: "uppercase", marginBottom: 8 }}
```
For every KPI value span:
```jsx
style={{ fontSize: 32, fontWeight: 700, color: "var(--text-1)", fontFamily: "var(--font-geist-mono)", lineHeight: 1 }}
```

**Step 4 — KPI trend indicator**

```jsx
<span style={{
  fontSize: 12, fontWeight: 600, marginLeft: 6,
  color: trend > 0 ? "var(--green-light)" : "var(--red-light)",
}}>
  {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
</span>
```

**Step 5 — Recharts chart area**

If Recharts is used, find `<CartesianGrid>` and `<XAxis>`/`<YAxis>`:
```jsx
<CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
<XAxis tick={{ fill: "var(--text-3)", fontSize: 11 }} axisLine={false} tickLine={false} />
<YAxis tick={{ fill: "var(--text-3)", fontSize: 11 }} axisLine={false} tickLine={false} />
```

**Step 6 — Tips carousel card accent**

Find tips/carousel card JSX. Add left accent:
```jsx
style={{
  background: "var(--card-deep)",
  borderLeft: "3px solid var(--ai)",
  border: "1px solid var(--border)",
  borderLeft: "3px solid var(--ai)",  // override
  borderRadius: 10,
  padding: "12px 16px",
}}
```

### saved/page.tsx

**Step 7 — Read full file first.**

**Step 8 — Page header**

```jsx
// Title:
style={{ fontSize: 20, fontWeight: 700, color: "var(--text-1)" }}
// Result count:
<span style={{
  background: "var(--ai-soft)", color: "var(--ai-light)",
  borderRadius: 99, padding: "2px 8px",
  fontSize: 11, fontWeight: 600,
  fontFamily: "var(--font-geist-mono)",
}}>
  {count}
</span>
```

**Step 9 — CSV export button**

```jsx
style={{
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-2)",
  borderRadius: 8,
  padding: "6px 14px",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  transition: "background 120ms var(--ease), color 120ms var(--ease)",
}}
onMouseEnter={e => {
  (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
  (e.currentTarget as HTMLElement).style.color = "var(--text-1)";
}}
onMouseLeave={e => {
  (e.currentTarget as HTMLElement).style.background = "transparent";
  (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
}}
```

### settings/page.tsx

**Step 10 — Read full file first.**

**Step 11 — Plan badge**

Find the plan name display (e.g., "Free", "Pro", "Elite"). Wrap in:
```jsx
<span style={{
  background: "linear-gradient(135deg, var(--ai) 0%, #5B21B6 100%)",
  color: "white",
  padding: "4px 12px",
  borderRadius: 99,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
}}>
  {planName}
</span>
```

**Step 12 — Scan balance bar**

After the scan balance label row, add a bar:
```jsx
<div style={{ background: "var(--bg-elevated)", borderRadius: 99, height: 6, overflow: "hidden", marginTop: 8 }}>
  <div style={{
    background: "linear-gradient(90deg, var(--ai) 0%, var(--ai-light) 100%)",
    height: "100%",
    width: `${Math.min(100, (used / total) * 100)}%`,
    borderRadius: 99,
    transition: "width 600ms var(--ease)",
  }} />
</div>
```

**Step 13 — Buy pack cards**

Find pack option cards. Apply:
```jsx
// Base:
style={{ background: "var(--card-deep)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px", cursor: "pointer", transition: "border-color 150ms var(--ease), box-shadow 150ms var(--ease)" }}
// Selected/active:
style={{ borderColor: "var(--border-purple)", boxShadow: "var(--glow-active-item)" }}
```

**Step 14 — Upgrade CTA button**

```jsx
style={{
  background: "linear-gradient(135deg, var(--ai) 0%, #5B21B6 100%)",
  color: "white",
  borderRadius: 10,
  padding: "10px 24px",
  fontSize: 14,
  fontWeight: 600,
  boxShadow: "0 4px 16px rgba(124,58,237,0.35)",
  border: "none",
  cursor: "pointer",
  transition: "opacity 120ms var(--ease), box-shadow 120ms var(--ease)",
}}
onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.9"; }}
onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
```

---

## Before / After Design Description

**Before — Home Dashboard:** KPI cards are flat dark boxes with plain number + label. Chart has default Recharts grey grid lines.
**After — Home Dashboard:** KPI cards have gradient depth, monospace stat values at 32px, uppercase micro-labels, trend arrows in green/red. Charts use `--border` grid lines and `--text-3` axis labels.

**Before — Settings:** Plan name is plain text. Scan balance is a number like "1240 / 5000". Buy packs are uniform plain boxes.
**After — Settings:** Plan is a gradient pill badge. Scan balance has an animated gradient progress bar. Selected buy pack glows with purple border. Upgrade CTA is full gradient button.

---

## Todo List
- [ ] Read full `app/(dashboard)/home-dashboard/page.tsx`
- [ ] Steps 2–6: KPI cards, chart, tips carousel
- [ ] Read full `app/(dashboard)/saved/page.tsx`
- [ ] Steps 8–9: header + export button
- [ ] Read full `app/(dashboard)/settings/page.tsx`
- [ ] Steps 11–14: plan badge, scan bar, buy packs, upgrade CTA
- [ ] Deploy to Coolify staging
- [ ] Screenshot verify all 3 pages at 1440px

---

## Screenshot Verification Checkpoints
1. Home Dashboard: KPI values are large monospace numbers in premium cards
2. Settings: plan badge is gradient pill; scan balance shows colored bar
3. Settings: clicking a buy pack card shows purple border glow
4. Saved: page loads with same premium AdCards from Phase 03

## Risk Assessment
- **Low-Medium** — files unread, scout confirms structure but not full code
- Scan balance bar: requires knowing the variable names for `used` and `total` scan count — read settings page first
- Recharts: if `<CartesianGrid>` or `<XAxis>` aren't present in chart (e.g., recharts removed), skip Steps 5

## Next Steps
Phase 06 — Empty States + Loading Skeletons + Mobile Responsive
