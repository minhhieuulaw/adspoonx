# Premium SaaS Dashboard Design Research
**Date:** 2026-03-28 | **Status:** Research Complete

## 1. VISUAL HIERARCHY & CONTENT DENSITY

### Linear/Vercel Approach
- **Dark LCH color space** (not HSL) for perceptually uniform colors—same lightness = same perceived lightness
- **Text hierarchy:** Darker text in light mode, lighter in dark mode for accessibility
- **Breathing room:** Generous whitespace around key metrics (30-40px margins)
- **Typography:** Bold sans-serif (Geist, Inter) paired with reduced visual noise

### Implementation Pattern
```css
/* Dark theme with proper contrast */
.metric-block {
  background: linear-gradient(135deg, #1a1a1a 0%, #242424 100%);
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

.metric-label { color: rgba(255, 255, 255, 0.6); font-size: 12px; }
.metric-value { color: #ffffff; font-size: 32px; font-weight: 600; }
```

---

## 2. FILTER & SIDEBAR DESIGN

### Modern Approaches (2024-2025)
- **Filter pills:** Fully rounded rectangles with v-padding = h-padding/2 (e.g., `padding: 8px 16px`)
- **Collapsible sections:** Accordion pattern with smooth height transitions
- **Smart presets:** 3-4 saved filters above custom filter builder
- **Consistent styling:** All filter pills same color; selected state uses primary accent (e.g., #0ea5e9)

### Code Pattern
```css
.filter-pill {
  padding: 8px 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  background: transparent;
  cursor: pointer;
  transition: all 200ms ease;
}

.filter-pill:hover { background: rgba(255, 255, 255, 0.05); }
.filter-pill--active { background: #0ea5e9; border-color: #0ea5e9; }
```

---

## 3. DATA CARD DESIGN

### Premium Pattern (Ads/Listings)
**Layout:** Thumbnail (16:9 aspect) → Title (max 60 chars) → CTA badge → Meta footer

- **Thumbnail:** High contrast, sharp corners or rounded (8-12px)
- **Badge placement:** Overlaid bottom-right on image
- **CTA button:** Single primary action; secondary actions in dropdown
- **Meta strip:** 2-3 subtle stats (impressions, engagement, status) with icons

### Card Structure
```css
.ad-card {
  background: #0f0f0f;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 150ms ease;
}

.ad-card:hover { border-color: rgba(255, 255, 255, 0.16); }

.ad-card__image { aspect-ratio: 16/9; background-size: cover; }
.ad-card__title { color: #fff; font-size: 14px; margin: 12px; overflow: hidden; }
.ad-card__meta { display: flex; gap: 16px; padding: 8px 12px; color: rgba(255,255,255,0.5); }
```

---

## 4. TABLE & LIST VIEWS

### Premium Table Patterns
- **Row hover:** Subtle background shift (1-2% brightness increase), no motion flicker
- **Inline actions:** Icon buttons revealed on hover, always-visible for critical actions
- **Status indicators:** Color-coded dots (green/yellow/red) with subtle pulse animation
- **Density option:** Compact/normal/spacious toggle (Stripe, Vercel standard)
- **Striping:** Avoid; use subtle borders instead (1px, low opacity)

### Row Implementation
```css
.table-row {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background-color 150ms ease;
}

.table-row:hover { background-color: rgba(255, 255, 255, 0.03); }

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

.status--active { background: #10b981; }
.status--paused { background: #f59e0b; }
.status--inactive { background: #6b7280; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

---

## 5. EMPTY & LOADING STATES

### Skeleton Loading (Best Practice)
- **No shimmer animation required** for premium feel; use subtle pulse instead
- **Structure-aware:** Match actual content layout exactly
- **Dark mode colors:** #1a1a1a base, #252525 skeleton placeholder
- **Never show blank screen:** Skeleton appears instantly during hydration

### Implementation
```css
.skeleton {
  background: #1a1a1a;
  border-radius: 8px;
  animation: pulse-skeleton 2s ease-in-out infinite;
}

@keyframes pulse-skeleton {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Shimmer for cards only (opt-in) */
.skeleton--shimmer {
  background: linear-gradient(90deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%);
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Empty State
- **Illustration-free:** Use whitespace and typography
- **Icon + heading + subtext + CTA**
- **Icon:** 64px, 20% opacity, centered
- **No animations:** Static layout signals emptiness

---

## 6. NAVIGATION & GROUPING

### Sidebar Patterns (Linear/Vercel style)
- **Active state:** Left border accent (3-4px) + background highlight
- **Section labels:** Uppercase, 10px, 40% opacity, 12px margin-bottom
- **Badges:** Pill-shaped count badges, right-aligned, monospace font
- **Collapsible:** Rotate arrow, smooth height transition, remember state

### Sidebar CSS
```css
.nav-item {
  padding: 8px 12px;
  border-left: 3px solid transparent;
  transition: background 150ms, border-color 150ms;
}

.nav-item--active {
  background: rgba(255, 255, 255, 0.1);
  border-color: #0ea5e9;
}

.nav-badge {
  padding: 2px 8px;
  background: rgba(14, 165, 233, 0.2);
  color: #0ea5e9;
  font-size: 11px;
  font-family: monospace;
  border-radius: 10px;
}

.nav-section-label {
  text-transform: uppercase;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  margin: 12px 12px 8px;
  letter-spacing: 0.5px;
}
```

---

## 7. STATS & KPI BLOCKS

### Bento-Grid Pattern (Apple-inspired)
- **2x2 or 3x3 grid** with irregular sizing (e.g., large block + 4 small blocks)
- **Card background:** Subtle gradient or flat dark color
- **Number styling:** Large (28-40px), bold, 100% opacity
- **Trend indicator:** Small ↑/↓ with color (green/red), right of number
- **Timeframe label:** Gray, 12px, below metric

### KPI Block Code
```css
.kpi-block {
  background: linear-gradient(135deg, #1a1a1a 0%, #1f1f1f 100%);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.kpi-block__label { color: rgba(255, 255, 255, 0.6); font-size: 12px; margin-bottom: 8px; }
.kpi-block__value { font-size: 32px; font-weight: 700; color: #fff; }

.kpi-block__trend {
  font-size: 12px;
  font-weight: 600;
  margin-left: 4px;
}

.trend--up { color: #10b981; }
.trend--down { color: #ef4444; }

/* Bento grid layout */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.bento-item:nth-child(1) { grid-column: 1 / 3; grid-row: 1 / 3; }
```

---

## KEY TAKEAWAYS FOR IMPLEMENTATION

1. **LCH color space** beats HSL for dark mode perceptual consistency
2. **Minimal motion:** Pulse > shimmer (unless explicit loading state)
3. **Accent color:** Single primary (#0ea5e9 or similar), use sparingly
4. **Borders > shadows:** Low-opacity lines (rgba 0.08-0.12) feel more premium than drop shadows
5. **Hover states:** Subtle background shift or border lightening, 150ms transition
6. **Typography:** 2-3 font sizes max; bold weight for emphasis
7. **Density:** Always include compact/normal toggle for tables
8. **Empty states:** Icon + text, no illustrations
9. **Badges:** Monospace font weight for count/status badges
10. **Grid spacing:** 16px base unit; multiples of 8px (8, 16, 24, 32, 40)

---

## SOURCES

- [How we redesigned the Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [Linear design: The SaaS design trend](https://blog.logrocket.com/ux-design/linear-design/)
- [Dark Mode | Apple Developer Documentation](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
- [Vercel Dashboard Redesign](https://vercel.com/blog/dashboard-redesign)
- [Card UI Design Best Practices 2026](https://www.alfdesigngroup.com/post/best-practices-to-design-ui-cards-for-your-website)
- [Filter Chips - Material Design 3](https://m3.material.io/components/chips/specs)
- [shadcn/ui Skeleton Component](https://ui.shadcn.com/docs/components/radix/skeleton)
- [Top Dashboard Design Trends for SaaS 2025](https://uitop.design/blog/design/top-dashboard-design-trends/)
