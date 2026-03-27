# Phase 02 — Navigation (Sidebar + Header)
**Status:** pending
**Files:** `components/layout/Sidebar.tsx`, `components/layout/Header.tsx`
**Depends on:** Phase 01 (tokens)

**Context links:**
- Scout: `scout/scout-01-codebase.md` §2 Layout & Navigation
- Research: `research/researcher-01-homepage-dna.md` §Component Patterns (Pill Badges)
- Research: `research/researcher-02-saas-patterns.md` §6 Navigation & Grouping

---

## Overview
Sidebar is currently flat `--bg-surface` background with a left accent bar on active items. Header has basic blur. Neither leverages the gradient surface, glow depth, or glass layer established in Phase 01. This phase adds visual depth without changing navigation structure or routing.

---

## Key Insights
- Sidebar `NavContent` uses `style={{ background: "var(--sidebar-bg)" }}` — change to gradient
- Active nav item uses `var(--active-bg)` (rgba 9%) — needs subtle glow addition
- Active accent bar is `w-0.5 h-5` left strip with `var(--accent)` — good, keep it
- Upgrade CTA block already has `var(--accent-soft)` border — needs gradient bg + stronger glow
- Header: scout confirms fixed 56px, `backdropFilter` likely inline — switch to `.glass-header` class
- Section labels (`text-[10px]`) already use `var(--text-muted)` — correct, only spacing tweak needed
- Logo area: `filter: invert(1)` on white logo — fine, no change needed

---

## Requirements
1. Sidebar background: subtle gradient (`--sidebar-gradient`) instead of flat surface
2. Active nav item: add `--glow-active-item` box-shadow to the row div
3. Active icon color: upgrade from `--text-primary` to `--ai-light` for accent
4. Section label spacing: increase `mb-1.5` → `mb-2`, add `mt-1` padding
5. Upgrade CTA block: gradient bg, stronger glow on hover, icon upgrade
6. Header: apply `.glass-header` class + stronger blur (12px)
7. Mobile drawer backdrop: keep `rgba(0,0,0,0.65)` — already good

---

## Architecture

### Sidebar `NavContent` component
```
aside (gradient bg)
├── Logo area (unchanged)
├── nav.flex-1
│   └── groups
│       ├── section label (text-[10px], --text-muted, ls-label)
│       └── nav items
│           ├── active indicator bar (keep)
│           └── item div
│               ├── Icon (--ai-light when active, --text-muted otherwise)
│               ├── label text (weight 500/400, keep)
│               └── tag badge (keep)
└── Upgrade CTA (gradient bg + border-purple glow)
```

---

## Implementation Steps

### Sidebar.tsx — `NavContent` component

**Step 1 — Sidebar background gradient**

Find (line 41):
```jsx
style={{
  width: 256,
  background: "var(--sidebar-bg)",
  borderRight: "1px solid var(--sidebar-border)",
}}
```
Change to:
```jsx
style={{
  width: 256,
  background: "var(--sidebar-gradient-bg)",
  borderRight: "1px solid var(--sidebar-border)",
}}
```

**Step 2 — Active nav item: add glow + upgrade icon color**

Find (lines 75–85 approximately):
```jsx
<div className="flex items-center gap-3 px-3 py-[7px] rounded-[8px] mb-0.5"
  style={{
    background: isActive ? "var(--active-bg)" : "transparent",
    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
    transition: "background 120ms var(--ease)",
  }}
```
Change to:
```jsx
<div className="flex items-center gap-3 px-3 py-[7px] rounded-[8px] mb-0.5"
  style={{
    background: isActive ? "var(--active-bg)" : "transparent",
    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
    boxShadow: isActive ? "var(--glow-active-item)" : "none",
    transition: "background 120ms var(--ease), box-shadow 200ms var(--ease)",
  }}
```

Find the Icon element (line 84):
```jsx
<Icon size={15} strokeWidth={isActive ? 2 : 1.5}
  style={{ color: isActive ? "var(--text-primary)" : "var(--text-muted)", flexShrink: 0 }} />
```
Change to:
```jsx
<Icon size={15} strokeWidth={isActive ? 2 : 1.5}
  style={{ color: isActive ? "var(--ai-light)" : "var(--text-muted)", flexShrink: 0 }} />
```

**Step 3 — Section label spacing**

Find (line 62–64):
```jsx
<p className="px-2 mb-1.5 text-[10px] font-semibold uppercase"
  style={{ color: "var(--text-muted)", letterSpacing: "0.1em" }}>
```
Change to:
```jsx
<p className="px-2 mb-2 text-[10px] font-semibold uppercase"
  style={{ color: "var(--text-muted)", letterSpacing: "var(--ls-label)" }}>
```

**Step 4 — Upgrade CTA block**

Find (lines 104–119):
```jsx
<Link href="/pricing"
  className="flex items-center gap-3 px-3 py-2.5 rounded-[9px] w-full"
  style={{ background: "var(--accent-soft)", border: "1px solid rgba(124,58,237,0.2)" }}
  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.18)"; }}
  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--accent-soft)"; }}
>
```
Change to:
```jsx
<Link href="/pricing"
  className="flex items-center gap-3 px-3 py-2.5 rounded-[9px] w-full"
  style={{
    background: "linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(124,58,237,0.06) 100%)",
    border: "1px solid var(--border-purple)",
    transition: "background 150ms var(--ease), box-shadow 150ms var(--ease)",
  }}
  onMouseEnter={e => {
    const el = e.currentTarget as HTMLElement;
    el.style.background = "linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(124,58,237,0.12) 100%)";
    el.style.boxShadow = "var(--glow-purple-soft)";
  }}
  onMouseLeave={e => {
    const el = e.currentTarget as HTMLElement;
    el.style.background = "linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(124,58,237,0.06) 100%)";
    el.style.boxShadow = "none";
  }}
>
```

### Header.tsx

**Step 5 — Locate Header component fixed bar**

Find the outermost fixed/sticky div with `backdropFilter`. It likely reads:
```jsx
style={{
  position: "fixed",
  top: 0, left: 256, right: 0,
  height: 56,
  background: "rgba(...)",
  backdropFilter: "blur(8px)",
  borderBottom: "1px solid var(--border)",
  zIndex: 30,
}}
```
Change inline `background` and `backdropFilter` to use token:
```jsx
style={{
  position: "fixed",
  top: 0, left: 256, right: 0,
  height: 56,
  background: "var(--header-glass)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  borderBottom: "1px solid var(--border)",
  zIndex: 30,
}}
```

**Step 6 — Plan badge in Header**

If plan badge exists as a pill, ensure it uses:
```jsx
style={{
  background: "linear-gradient(135deg, var(--ai) 0%, #5B21B6 100%)",
  color: "white",
  fontSize: "10px",
  fontWeight: 600,
  padding: "2px 8px",
  borderRadius: "99px",
}}
```

---

## Before / After Design Description

**Before:** Flat `#13141C` sidebar, active items use white/grey highlight, upgrade CTA is faint purple tint.
**After:** Sidebar has a very subtle dark gradient (top slightly lighter), active items emit a soft purple ambient glow, upgrade CTA has richer gradient bg + glows on hover. Header glass is darker and sharper (blur 12px vs 8px).

---

## Todo List
- [ ] Read full `Sidebar.tsx` before editing
- [ ] Step 1: Sidebar gradient bg
- [ ] Step 2: Active item glow + icon color to `--ai-light`
- [ ] Step 3: Section label spacing + use `--ls-label` token
- [ ] Step 4: Upgrade CTA gradient + hover glow
- [ ] Read full `Header.tsx` before editing
- [ ] Step 5: Header glass bg + blur upgrade to 12px
- [ ] Step 6: Plan badge gradient (if exists)
- [ ] Deploy to Coolify staging
- [ ] Screenshot verify at 1440px: sidebar gradient visible, active item glows, CTA shimmers on hover

---

## Screenshot Verification Checkpoints
1. Desktop sidebar: active "Ads Finder" item shows left purple bar + soft ambient glow behind row
2. Sidebar bottom: Upgrade CTA shows gradient, glows purple on hover
3. Header: glass blur feels deeper/darker than before

## Risk Assessment
- **Low** — only visual properties changed. No state, no routing, no event handlers removed.
- Watch: `--sidebar-gradient-bg` must be defined in Phase 01 before this phase deploys.
- Watch: Header file must be fully read before editing — structure may differ from scout summary.

## Next Steps
Phase 03 — Ads Page (consumes `--glow-focus`, `--border-purple`, `--border-purple-strong`, `--glow-hover`)
