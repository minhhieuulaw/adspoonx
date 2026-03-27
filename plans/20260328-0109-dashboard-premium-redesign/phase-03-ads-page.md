# Phase 03 — Ads Finder Page (Flagship)
**Status:** pending
**Files:**
- `app/(dashboard)/ads/page.tsx`
- `components/ads/AdsFilter.tsx`
- `components/ads/AdCard.tsx`
**Depends on:** Phase 01 (tokens), Phase 02 (navigation)

**Context links:**
- Scout: `scout/scout-01-codebase.md` §3 Ads Page Components
- Research: `research/researcher-01-homepage-dna.md` §Card Architecture, §Gradient Lighting, §Component Patterns
- Research: `research/researcher-02-saas-patterns.md` §2 Filter & Sidebar Design, §3 Data Card Design

---

## Overview
The Ads Finder is the flagship page and highest-priority redesign target. Three distinct sub-scopes:
1. **Search/command bar** — glassmorphism pill, purple glow on focus
2. **Filter panel (AdsFilter)** — premium chip system, preset cards with gradient accents
3. **Ad grid (AdCard)** — card depth, footer stat hierarchy, creative overlay refinement

All changes are visual-only. Filter state, localStorage persistence, pagination, and save logic are untouched.

---

## Key Insights
- `.command-bar` class already has focus glow defined in globals.css — it just needs the background upgraded from `rgba(255,255,255,0.04)` to a richer glass surface
- `.ad-card` hover glow already targets `rgba(124,58,237,0.25)` — reinforce with `--border-purple` token
- Stats bar (users online, new products) renders as inline pills — needs visual grouping upgrade
- AdsFilter presets (Top Performers, Trending, Evergreen) are plain buttons — promote to gradient-bordered cards
- AdCard footer: very compact at 2.5px padding — already correct for density, only color refinements needed
- Grid uses `.ads-grid-container` container queries — do NOT change. Column behavior is correct.
- The stagger animation on cards (`delay: index * 0.05`) is already good — keep exactly

---

## Requirements

### Command Bar
1. Upgrade background from `rgba(255,255,255,0.04)` to `rgba(255,255,255,0.055)` (slightly more visible glass)
2. `border-radius` from `12px` → `14px` (softer pill feel)
3. Focus glow: already defined via `.command-bar:focus-within` — verify it uses `--glow-focus` token (may need to update literal to var)
4. History dropdown: add `backdrop-filter: blur(12px)` to the dropdown panel

### Stats Bar (users online / new products today)
5. Wrap stat pills in a shared `rounded-xl` container with `border: 1px solid var(--border)` and `background: var(--card-deep)`
6. Stat values: use `font-family: var(--font-geist-mono)` and `--fs-stat-value` sizing

### Filter Panel (AdsFilter.tsx)
7. Preset cards: add gradient left-border accent per preset type:
   - Top Performers: `borderLeft: "3px solid var(--ai)"` + `background: var(--card-deep)`
   - Trending: `borderLeft: "3px solid var(--green)"` + same bg
   - Evergreen: `borderLeft: "3px solid var(--amber)"` + same bg
8. Filter section dividers: change from `1px var(--border)` to match `--border-inner` (slightly more subtle)
9. Active filter chips: ensure `background: rgba(124,58,237,0.15)` + `border: 1px solid var(--border-purple)` (may already be close)
10. Platform toggle buttons: on active, add `boxShadow: "0 0 8px rgba(124,58,237,0.2)"` glow
11. Niche multi-select badges: ensure `backdrop-filter: blur(4px)` on selected state

### Ad Card (AdCard.tsx)
12. Card background: change `background: var(--bg-card)` (flat) to `background: var(--card-deep)` (gradient)
13. Hover shadow: replace literal `"0 8px 28px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.08)"` with `var(--glow-hover)`
14. AI Score ribbon: on hot tier (≥85), add `--glow-purple-soft` glow to the ribbon badge
15. Creative wrapper: add overlay gradient on hover — `linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(59,130,246,0.05) 100%)`
16. Brand avatar: ensure `avatarColor()` palette colors are used as `background`, with `text-white` initial
17. Footer stats row: stat icons use `--text-muted`, values use `--text-2` (verify not hard-coded grey)
18. Strategy/performance tags: verify `.ad-tag` class is applied — use `--fs-chip` for font-size token

---

## Architecture

### Command Bar region (ads/page.tsx)
```
div.command-bar (glassmorphism, border-radius 14px)
├── Search icon (--text-muted)
├── input (--text-1, placeholder --text-3)
├── kbd hint (⌘K)
├── Filter toggle button
└── History dropdown (blur backdrop panel)
```

### Stats bar region (ads/page.tsx)
```
div.premium-card (card-deep bg, border)
└── flex row
    ├── stat: users online (mono font, live-dot pulse)
    └── stat: new products today (mono font)
```

### AdCard structure (AdCard.tsx)
```
motion.div (spring hover, fade-in entrance)
├── div.ad-card (card-deep bg, glow-hover on hover)
│   ├── AI Score ribbon (top-right, glow on hot tier)
│   ├── div.ad-creative-wrap
│   │   ├── img or video player
│   │   ├── overlay gradient (on hover via state)
│   │   └── LIVE badge + days-running (bottom-left)
│   └── footer (px-2.5 py-2)
│       ├── brand row: avatar + name + save button
│       ├── stats row: flag, impressions, spend, date
│       ├── tags row: strategy, performance, niche
│       └── platform icons row
```

---

## Implementation Steps

### ads/page.tsx — Command Bar

**Step 1 — Command bar background upgrade**

Locate the div with `className="command-bar"` inline style. Find:
```jsx
// If background is set inline alongside className:
style={{ background: "rgba(255,255,255,0.04)", ... }}
```
Change `rgba(255,255,255,0.04)` → `rgba(255,255,255,0.055)`.
If no inline background (relying on CSS class), find the `.command-bar` rule in `globals.css` and update there.

**Step 2 — Command bar border-radius**

In `.command-bar` CSS class (globals.css line 176):
```css
border-radius: 12px;
```
Change to:
```css
border-radius: 14px;
```

**Step 3 — Focus glow via token**

In `.command-bar:focus-within` (globals.css line 178–181):
```css
border-color: rgba(124,58,237,0.45);
box-shadow: 0 0 0 3px rgba(124,58,237,0.08), 0 8px 32px rgba(0,0,0,0.3);
```
Change to:
```css
border-color: var(--border-purple-strong);
box-shadow: var(--glow-focus);
```

**Step 4 — Stats bar: wrap in premium-card container**

Locate the stats bar JSX (users online + new products today). It renders as individual pill-like spans. Wrap the outer container:
```jsx
<div className="premium-card" style={{ display: "flex", alignItems: "center", gap: 0, padding: "6px 16px" }}>
  {/* existing stat pills — change their value span styles: */}
  {/* value: fontFamily: "var(--font-geist-mono)", fontWeight: 700 */}
  {/* label: fontSize: "var(--fs-stat-label)", color: "var(--text-3)" */}
</div>
```

### AdsFilter.tsx — Preset Cards

**Step 5 — Preset button upgrades**

Locate the 3 preset buttons (Top Performers, Trending, Evergreen). Each is likely a `<button>` or `<div>` with an `onClick`. Add gradient left-border + premium-card-like background:

Top Performers preset:
```jsx
style={{
  borderLeft: "3px solid var(--ai)",
  background: "var(--card-deep)",
  border: "1px solid var(--border)",
  borderLeft: "3px solid var(--ai)",  // override left
  borderRadius: "8px",
  padding: "8px 12px",
  // ... keep existing onClick
}}
```

Trending preset: `borderLeft: "3px solid var(--green)"`
Evergreen preset: `borderLeft: "3px solid var(--amber)"`

Note: CSS shorthand conflicts — use separate `borderLeft` as inline style override on top of existing `border`. In JSX inline styles, the later key wins in object literals, so `{ border: "1px solid var(--border)", borderLeft: "3px solid var(--ai)" }` correctly produces left-only accent.

**Step 6 — Platform toggle active glow**

Locate platform toggle buttons (FB, IG, Messenger, etc.). Find the active style:
```jsx
style={{
  background: "rgba(124,58,237,0.15)",
  border: "1px solid rgba(124,58,237,0.35)",
  // ...
}}
```
Add:
```jsx
boxShadow: "0 0 8px rgba(124,58,237,0.2)",
```

**Step 7 — Filter section dividers**

Locate `borderBottom: "1px solid var(--border)"` on section dividers. Change to:
```jsx
borderBottom: "1px solid var(--border-inner)",
```

### AdCard.tsx — Card Depth

**Step 8 — Card background gradient**

In `.ad-card` CSS class (globals.css line 132–133):
```css
background: var(--bg-card);
```
Change to:
```css
background: var(--card-deep);
```

Or if set inline in `AdCard.tsx`:
```jsx
// Find style on the card root div or motion.div
style={{ background: "var(--bg-card)", ... }}
// Change to:
style={{ background: "var(--card-deep)", ... }}
```

**Step 9 — Hover glow via token**

In `.ad-card:hover` (globals.css line 139–141):
```css
box-shadow: 0 8px 28px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.08);
```
Change to:
```css
box-shadow: var(--glow-hover);
```

**Step 10 — AI Score ribbon hot-tier glow**

Find the AI score ribbon/badge element. Locate the tier check for score ≥ 85 (hot tier). Add:
```jsx
// Inside the hot-tier condition:
boxShadow: score >= 85 ? "var(--glow-purple-soft)" : "none",
```

**Step 11 — Footer stat icons and values**

In the footer stats row, verify each stat's icon color:
```jsx
// Icon:
style={{ color: "var(--text-muted)" }}  // correct if already set
// Value span:
style={{ color: "var(--text-2)", fontSize: 11 }}  // ensure not hard-coded #aaa or similar
```

---

## Before / After Design Description

**Before:** Flat `#1A1B25` cards with grey borders, command bar nearly invisible, preset buttons look like plain text links, filter chips are inconsistent.

**After:** Cards have subtle dark gradient depth, glow purple on hover. Command bar is a clearly defined glass pill, glows purple on focus. Preset cards have colored left-border accents (purple/green/amber). Platform toggles glow on selection. Page feels premium and product-grade.

---

## Todo List
- [ ] Read full `app/(dashboard)/ads/page.tsx` (all lines) before editing
- [ ] Read full `components/ads/AdsFilter.tsx` before editing
- [ ] Read full `components/ads/AdCard.tsx` before editing
- [ ] Step 1–3: Command bar glass + glow upgrades
- [ ] Step 4: Stats bar premium-card wrapper
- [ ] Step 5: Preset cards gradient left-border accents
- [ ] Step 6: Platform toggle active glow
- [ ] Step 7: Filter section divider subtle upgrade
- [ ] Step 8–9: AdCard background + hover glow via token
- [ ] Step 10: Hot-tier ribbon glow
- [ ] Step 11: Footer stat icon/value color audit
- [ ] Deploy to Coolify staging
- [ ] Screenshot verify: 1440px — command bar focus glow, preset cards colorful, ad cards depth

---

## Screenshot Verification Checkpoints
1. Command bar: click into search — purple ring glow appears around the pill
2. Filter panel: 3 preset buttons show distinct left-border colors (purple/green/amber)
3. Ad card on hover: subtle translateY + purple border glow
4. AI Score ribbon at ≥85: soft purple glow around badge

## Risk Assessment
- **Medium** — three component files touched. Risk of inline style key conflicts (border + borderLeft).
- Mitigation: test preset card border shorthand in isolation before full deploy.
- Watch: AdCard uses Framer Motion spring on `y` transform — do NOT add CSS `transform: translateY()` to `.ad-card` hover as it conflicts with FM. The `box-shadow` and `border-color` are safe on `.ad-card:hover` since FM handles transform separately.

## Next Steps
Phase 04 — Stores + Trending (consumes `--card-deep`, `--border-purple`, `--glow-hover`, status color tokens)
