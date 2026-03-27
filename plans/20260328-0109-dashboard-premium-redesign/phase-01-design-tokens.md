# Phase 01 — Design Tokens
**Status:** pending
**File:** `app/globals.css` only
**Depends on:** nothing (foundation phase)

**Context links:**
- Scout: `scout/scout-01-codebase.md` §5 CSS Token System
- Research: `research/researcher-01-homepage-dna.md` §Color System, §Glass & Depth Effects
- Research: `research/researcher-02-saas-patterns.md` §1 Visual Hierarchy

---

## Overview
The existing `:root` token set covers colors and basic motion but is missing:
- Gradient surface tokens (sidebar, header, cards with subtle depth)
- Glow/shadow depth scale (ambient vs interactive)
- Premium skeleton palette (currently uses raw rgba literals)
- Font-scale tokens for dashboard label hierarchy

This phase adds ~20 new CSS vars and upgrades 3 existing ones. No component files touched.

---

## Key Insights
- Existing vars are correct palette — do NOT change `--bg-base`, `--bg-surface`, `--bg-card`, `--ai`, `--text-*`. Components depend on these.
- Gaps are in the "depth and lighting" layer: gradient backgrounds, multi-stop glows, inner shadow tokens.
- `--sidebar-bg` currently aliases `--bg-surface` (flat). Sidebar needs a subtle gradient to feel premium.
- Skeleton classes use raw rgba literals — centralizing to vars allows a single upgrade point.
- `--ease` at 120ms is correct. Do NOT change duration defaults.

---

## Requirements
1. Add gradient surface tokens (sidebar, header, card-premium)
2. Add glow depth scale (3 tiers: ambient, hover, focus)
3. Add skeleton palette tokens (base + highlight)
4. Add font-scale tokens for dashboard-specific hierarchy
5. Update 3 legacy aliases: `--sidebar-bg`, `--card-bg`, `--elevated-bg`
6. Preserve ALL existing vars — only ADD or alias, never remove

---

## Implementation Steps

### Step 1 — Add new tokens block after existing `:root` vars (after line 69, before closing `}`)

Add this block inside `:root {}`:

```css
/* ── Premium gradient surfaces ── */
--sidebar-gradient:    linear-gradient(180deg, #13141C 0%, #111219 100%);
--header-glass:        rgba(13, 14, 20, 0.82);
--card-premium:        linear-gradient(135deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%);
--card-deep:           linear-gradient(135deg, #1A1B25 0%, #16171F 100%);

/* ── Glow depth scale ── */
--glow-ambient:        0 1px 3px rgba(0,0,0,0.4);
--glow-hover:          0 4px 24px rgba(0,0,0,0.45), 0 0 0 1px rgba(124,58,237,0.08);
--glow-focus:          0 0 0 3px rgba(124,58,237,0.08), 0 8px 32px rgba(0,0,0,0.3);
--glow-active-item:    0 0 12px rgba(124,58,237,0.15);
--glow-purple-soft:    0 0 18px rgba(124,58,237,0.2);

/* ── Border premium scale ── */
--border-purple:       rgba(124,58,237,0.25);
--border-purple-strong: rgba(167,139,250,0.45);
--border-inner:        rgba(255,255,255,0.04);

/* ── Skeleton premium palette ── */
--skeleton-base:       rgba(255,255,255,0.03);
--skeleton-peak:       rgba(255,255,255,0.075);

/* ── Dashboard font scale ── */
--fs-label:            10px;
--fs-chip:             9px;
--fs-stat-value:       28px;
--fs-stat-label:       11px;
--ls-label:            0.1em;
--ls-chip:             0.04em;

/* ── Section heading gradient ── */
--headline-gradient:   linear-gradient(135deg, var(--ai-light) 0%, var(--blue-light) 100%);
```

### Step 2 — Update legacy aliases (lines 51–69) to point to new gradient tokens

Change:
```css
--sidebar-bg:  var(--bg-surface);
```
To:
```css
--sidebar-bg:  var(--bg-surface); /* keep for border/bg fallbacks */
--sidebar-gradient-bg: var(--sidebar-gradient);
```

Note: Do NOT change `--sidebar-bg` itself — components reference it. Add new parallel var.

### Step 3 — Upgrade `.skeleton` class gradient (lines 243–250)

Change:
```css
.skeleton {
  background: linear-gradient(90deg,
    rgba(255,255,255,0.03) 0%,
    rgba(255,255,255,0.07) 40%,
    rgba(255,255,255,0.03) 80%
  );
```
To:
```css
.skeleton {
  background: linear-gradient(90deg,
    var(--skeleton-base) 0%,
    var(--skeleton-peak) 40%,
    var(--skeleton-base) 80%
  );
```

Apply same pattern to `.skeleton-line` and `.skeleton-circle`.

### Step 4 — Add new `.premium-card` component class (after `.saas-card:hover` block)

```css
/* Premium card — gradient depth version */
.premium-card {
  background: var(--card-deep);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--glow-ambient);
  transition:
    border-color var(--duration) var(--ease),
    box-shadow   300ms var(--ease),
    transform    var(--duration) var(--ease);
}
.premium-card:hover {
  border-color: var(--border-purple);
  box-shadow: var(--glow-hover);
  transform: translateY(-1px);
}
```

### Step 5 — Add `.glass-header` component class

```css
/* Glass header surface */
.glass-header {
  background: var(--header-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
}
```

---

## Todo List
- [ ] Open `app/globals.css`
- [ ] Add premium gradient surfaces block inside `:root`
- [ ] Add glow depth scale vars
- [ ] Add border premium vars
- [ ] Add skeleton palette vars
- [ ] Add dashboard font scale vars
- [ ] Add headline gradient var
- [ ] Add `--sidebar-gradient-bg` alias (parallel, not replacing)
- [ ] Upgrade `.skeleton`, `.skeleton-line`, `.skeleton-circle` to use vars
- [ ] Add `.premium-card` component class
- [ ] Add `.glass-header` component class
- [ ] Deploy to Coolify staging
- [ ] Screenshot verify: open DevTools, check `:root` vars exist in computed styles

---

## Success Criteria
- All new CSS vars present in browser DevTools under `:root`
- No existing component visually changes (vars are additive only)
- `.skeleton` still animates with `ai-shimmer` keyframe
- `.premium-card` hover produces subtle purple border + shadow

## Risk Assessment
- **Low risk** — additive only, no component touched
- Watch: If any component hard-codes `rgba(255,255,255,0.03)` exactly matching old skeleton value, it won't auto-update — those must be fixed per-component in later phases

## Next Steps
Phase 02 — Navigation (consumes `--sidebar-gradient-bg`, `--glass-header`, `--glow-active-item`)
