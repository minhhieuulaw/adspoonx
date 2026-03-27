# Phase 06 — Empty States, Loading Skeletons, Mobile Responsive
**Status:** pending
**Files:** (cross-cutting — multiple pages and components)
- `app/globals.css` (skeleton palette, shimmer upgrade)
- `app/(dashboard)/ads/page.tsx` (empty state + skeleton)
- `app/(dashboard)/stores/page.tsx` (skeleton rows)
- `app/(dashboard)/saved/page.tsx` (empty state)
- `app/(dashboard)/trending/page.tsx` (skeleton cards)
- `components/layout/Sidebar.tsx` (mobile drawer — already good, minor)
- `app/(dashboard)/layout.tsx` (mobile main padding)
**Depends on:** Phase 01 (skeleton tokens), all previous phases

**Context links:**
- Scout: `scout/scout-01-codebase.md` §5 CSS Token System (skeleton classes), §2 Layout
- Research: `research/researcher-02-saas-patterns.md` §5 Empty & Loading States
- Research: `research/researcher-01-homepage-dna.md` §Animation & Motion

---

## Overview
Cross-cutting polish pass across all pages. Three areas:
1. **Skeleton shimmer** — already exists but uses raw rgba literals. Phase 01 tokens centralized these. Verify skeletons use new tokens and produce correct shimmer on premium card backgrounds.
2. **Empty states** — icon + headline + subtext + CTA. No illustrations. Consistent across all pages.
3. **Mobile responsive** — sidebar drawer (already solid), card grid breakpoints, touch targets, stats bar stacking.

---

## Key Insights
- Skeleton classes (`.skeleton`, `.skeleton-line`, `.skeleton-circle`) are already in globals.css with shimmer animation. Phase 01 upgrades them to token-based. This phase verifies they render correctly on `--card-deep` backgrounds (gradient on gradient may need slight opacity tweak).
- Empty states: scout confirms they exist but doesn't detail their content. Standardize across pages.
- Mobile: layout uses `p-5` main padding and 56px header offset — already correct. Issue: on small screens (<375px), the stats bar pills in ads page may overflow. Card grid container queries handle column count automatically — no change needed there.
- Touch targets: all interactive elements should be minimum 44px tall on mobile. Nav items are `py-[7px]` + 15px icon + 13px text ≈ 36px row — needs `py-2.5` on mobile (done by layout, not Sidebar change).
- Mobile sidebar: spring animation is already solid. The `backdrop: rgba(0,0,0,0.65) blur(4px)` is correct.

---

## Requirements

### Skeleton Upgrade
1. Confirm `.skeleton` in globals.css uses `var(--skeleton-base)` and `var(--skeleton-peak)` (Phase 01 change)
2. Ad grid skeleton: ensure skeleton cards use `.ad-card` border-radius (12px) matching real cards
3. Skeleton shimmer speed: 1.8s is correct — do NOT change
4. Skeleton colors on `--card-deep` background: contrast check. `--skeleton-peak` at `rgba(255,255,255,0.075)` should be visible on `#16171F` (card-deep darkest) — confirmed sufficient.

### Empty States — Standard Pattern
All empty states must follow this exact structure:

```jsx
<div style={{
  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  padding: "64px 24px", gap: 16, textAlign: "center",
}}>
  <div style={{
    width: 48, height: 48, borderRadius: 12,
    background: "var(--ai-soft)",
    display: "flex", alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  }}>
    <{Icon} size={22} style={{ color: "var(--ai-light)", opacity: 0.7 }} />
  </div>
  <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-1)", margin: 0 }}>
    {headline}
  </p>
  <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0, maxWidth: 280 }}>
    {subtext}
  </p>
  {cta && (
    <button style={{
      marginTop: 8,
      background: "linear-gradient(135deg, var(--ai) 0%, #5B21B6 100%)",
      color: "white", borderRadius: 9, padding: "8px 20px",
      fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
    }}>
      {cta}
    </button>
  )}
</div>
```

Per page empty state content:
| Page | Icon | Headline | Subtext | CTA |
|---|---|---|---|---|
| Ads | `Search` | "No ads found" | "Try adjusting your filters or search term" | "Clear filters" |
| Saved | `Bookmark` | "No saved ads yet" | "Click the bookmark on any ad to save it here" | null |
| Stores | `Store` | "No stores found" | "Try a different country or platform filter" | "Clear filters" |
| Trending | `TrendingUp` | "No trending niches" | "Check back later as we update trends daily" | null |

### Mobile Responsive

5. Stats bar (ads page): on `<640px`, stack the two stat pills vertically (`flexDirection: "column"`) or reduce to text-only compact display. Add a Tailwind breakpoint class or JS `window.innerWidth` check (avoid new dependency — use CSS approach via media query in globals.css).

6. Add to globals.css (mobile overrides section):
```css
@media (max-width: 639px) {
  .ads-stats-bar {
    flex-direction: column;
    gap: 4px;
    padding: 8px 12px;
  }
}
```
Add `className="ads-stats-bar"` to the stats bar wrapper in ads page.

7. Filter panel on mobile: ensure it appears as a bottom sheet or has clear dismiss target. If already slide-in drawer — confirm close button is 44×44px touch target.

8. Ad card grid on mobile: container queries handle column count. Verify `minmax(230px, 1fr)` works at 375px screen width — with sidebar hidden, available width is 375px minus content padding (20px×2 = 40px) = 335px → 1 column at 230px min. Correct — no change needed.

9. Nav items mobile touch targets: in `NavContent`, nav item rows are currently `py-[7px]` ≈ 14px padding = ~36px total height. Change to `py-2.5` (10px × 2 = 20px padding = ~42px total). Only change for mobile — use Tailwind responsive class:
```jsx
className="flex items-center gap-3 px-3 py-[7px] md:py-[7px] py-2.5 rounded-[8px] mb-0.5"
```
Wait — Tailwind v4 mobile-first: default `py-2.5` applies mobile, `md:py-[7px]` applies desktop:
```jsx
className="flex items-center gap-3 px-3 py-2.5 md:py-[7px] rounded-[8px] mb-0.5"
```

---

## Implementation Steps

### globals.css

**Step 1 — Verify skeleton token upgrade (from Phase 01)**

Confirm `.skeleton` gradient reads:
```css
background: linear-gradient(90deg,
  var(--skeleton-base) 0%,
  var(--skeleton-peak) 40%,
  var(--skeleton-base) 80%
);
```
If not (Phase 01 not yet deployed), apply now.

**Step 2 — Add mobile stats bar override**

Append to end of globals.css:
```css
/* ── Mobile overrides ── */
@media (max-width: 639px) {
  .ads-stats-bar { flex-direction: column; gap: 4px; padding: 8px 12px; }
}
```

### ads/page.tsx — Empty State + Skeleton

**Step 3 — Locate empty state JSX**

Find the empty state condition block (when `ads.length === 0` and not loading). Replace with standard pattern:
- Icon: `Search`
- Headline: "No ads found"
- Subtext: "Try adjusting your filters or search term"
- CTA: "Clear filters" (calls existing `handleClearFilters` or equivalent handler)

**Step 4 — Skeleton grid**

Find the loading skeleton grid. Ensure each skeleton card uses:
```jsx
<div className="ad-card skeleton" style={{ borderRadius: 12, height: 320 }} />
```
Or if multi-element skeleton:
```jsx
<div className="ad-card" style={{ background: "var(--card-deep)", borderRadius: 12, overflow: "hidden" }}>
  <div className="skeleton" style={{ aspectRatio: "1/1", width: "100%" }} />
  <div style={{ padding: "10px" }}>
    <div className="skeleton-line" style={{ width: "60%", marginBottom: 8 }} />
    <div className="skeleton-line" style={{ width: "40%" }} />
  </div>
</div>
```

**Step 5 — Stats bar mobile class**

Add `className="ads-stats-bar"` to the stats bar wrapper div (identified in Phase 03 Step 4).

### saved/page.tsx — Empty State

**Step 6 — Replace or add empty state**

When `savedAds.length === 0`:
- Icon: `Bookmark`
- Headline: "No saved ads yet"
- Subtext: "Click the bookmark on any ad to save it here"
- CTA: null

### stores/page.tsx — Skeleton Rows

**Step 7 — Loading skeleton rows**

When stores are loading, show 5 skeleton rows matching the premium row structure from Phase 04:
```jsx
{Array.from({ length: 5 }).map((_, i) => (
  <div key={i} style={{ borderBottom: "1px solid var(--border-inner)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12 }}>
    <div className="skeleton-circle" style={{ width: 32, height: 32, flexShrink: 0 }} />
    <div style={{ flex: 1 }}>
      <div className="skeleton-line" style={{ width: "45%", marginBottom: 6 }} />
      <div className="skeleton-line" style={{ width: "25%" }} />
    </div>
    <div className="skeleton-line" style={{ width: 60 }} />
  </div>
))}
```

### trending/page.tsx — Skeleton Cards

**Step 8 — Niche card skeletons**

When trending data loads, show 4 skeleton niche cards:
```jsx
<div style={{ background: "var(--card-deep)", borderRadius: 14, border: "1px solid var(--border)", padding: 20, overflow: "hidden" }}>
  <div className="skeleton-line" style={{ width: "50%", height: 16, marginBottom: 12 }} />
  <div className="skeleton" style={{ height: 48, marginBottom: 12 }} />
  <div className="skeleton-line" style={{ width: "70%" }} />
</div>
```

### Sidebar.tsx — Mobile Touch Target

**Step 9 — Nav item touch target**

Change nav item className:
```jsx
// Before:
className="flex items-center gap-3 px-3 py-[7px] rounded-[8px] mb-0.5"
// After:
className="flex items-center gap-3 px-3 py-2.5 md:py-[7px] rounded-[8px] mb-0.5"
```

---

## Before / After Design Description

**Before:** Loading states are inconsistent — some pages show blank, some have basic skeleton with raw rgba literals. Empty states are minimal or missing. Mobile touch targets are slightly small.

**After:** Every page has a structured loading skeleton that visually matches its real content layout. All empty states follow the same icon + headline + subtext + optional CTA pattern. Mobile nav items are properly tap-able at 44px height. Stats bar on mobile collapses gracefully.

---

## Todo List
- [ ] Step 1: Verify skeleton token upgrade from Phase 01 in globals.css
- [ ] Step 2: Add `.ads-stats-bar` mobile media query to globals.css
- [ ] Read ads/page.tsx — locate empty state + skeleton + stats bar
- [ ] Steps 3–5: ads page empty state, skeleton, stats bar class
- [ ] Read saved/page.tsx — locate empty state
- [ ] Step 6: saved empty state
- [ ] Read stores/page.tsx — locate loading state
- [ ] Step 7: stores skeleton rows
- [ ] Read trending/page.tsx — locate loading state
- [ ] Step 8: trending skeleton cards
- [ ] Step 9: Sidebar nav touch target className change
- [ ] Deploy to Coolify staging
- [ ] Test at 375px mobile viewport: sidebar drawer, ad card single column, stats bar stacked
- [ ] Test all empty states by clearing filters / removing saved ads

---

## Screenshot Verification Checkpoints
1. Ads page loading: skeleton cards have shimmer on dark gradient background
2. Ads page empty: purple icon square + headline + "Clear filters" CTA
3. Saved page empty: bookmark icon + headline, no CTA
4. Mobile (375px): nav items are easy to tap, stats bar stacks vertically
5. Mobile (375px): ad card grid shows 1 column correctly

## Risk Assessment
- **Low** — mostly additive (empty states) or already-planned token upgrades (skeletons)
- Touch target change (Step 9) may shift desktop nav item height slightly at `md:py-[7px]`. Verify desktop sidebar height unchanged.
- Media query for `.ads-stats-bar` requires that className is added in Step 5 — that step depends on Phase 03 Step 4 structure.

## Unresolved Questions
- If trending page has no explicit loading state (data always available on mount), Step 8 may not apply.
- Some empty states may already exist with acceptable content — in that case, apply style tokens only (don't replace text copy).

## Next Steps
Redesign complete. Final QA pass: deploy all phases to staging, full-page screenshots at 1440px + 375px, compare with homepage design reference.
