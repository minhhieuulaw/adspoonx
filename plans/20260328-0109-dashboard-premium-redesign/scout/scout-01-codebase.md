# Codebase Scout Report: Dashboard & Components
**Project:** adspoonX Landing Page  
**Date:** 2026-03-28  
**Focus:** Dashboard pages, shared components, styling architecture

---

## 1. Dashboard Pages Overview
All located in `app/(dashboard)/` with auth-protected layout.

| Page | Component File | Purpose |
|------|---|---|
| `/home-dashboard` | `app/(dashboard)/home-dashboard/page.tsx` | KPI stats, charts, tips carousel, featured stores/niches |
| `/ads` | `app/(dashboard)/ads/page.tsx` | Main ads grid with filter panel, search, presets, sorting |
| `/ads/[id]` | `app/(dashboard)/ads/[id]/page.tsx` | Ad detail page view |
| `/stores` | `app/(dashboard)/stores/page.tsx` | Stores/shops table, sortable, filterable by country/platform |
| `/stores/[pageId]` | `app/(dashboard)/stores/[pageId]/page.tsx` | Store detail view |
| `/saved` | `app/(dashboard)/saved/page.tsx` | Saved ads grid + CSV export |
| `/trending` | `app/(dashboard)/trending/page.tsx` | Trending niches with growth metrics + top stores |
| `/settings` | `app/(dashboard)/settings/page.tsx` | Plan info, scan balance, buy packs, saved count |
| `/admin` | `app/(dashboard)/admin/page.tsx` (guards via email) | AdminDashboard component with stats/charts |

---

## 2. Layout & Navigation

**File:** `app/(dashboard)/layout.tsx`
- Auth guard: redirects unauthenticated users to `/login`
- 3-column layout: Sidebar + Header + Main
- Responsive: sidebar is fixed desktop (256px), overlay on mobile
- Main padding: `p-5` + 56px top for header
- CSS vars: `--content-bg`, `--sidebar-bg`

**File:** `components/layout/Sidebar.tsx`
- Navigation groups: Workspace, Tools, Account
- Active state: left accent bar + bg highlight
- Mobile toggle via custom `toggle-sidebar` event
- Upgrade CTA at bottom with gradient button
- 256px fixed width, styled with CSS vars + inline styles
- Hover states: onMouseEnter/Leave inline styles

**File:** `components/layout/Header.tsx`
- Fixed top header: 56px height, blurred backdrop
- Left side: hamburger + app name (mobile only)
- Right side: notifications, language toggle, plan badge, user menu
- Notifications panel: fetches `/api/stats`, displays 4 contextual types
- Dropdowns: animate with framer-motion, CSS vars for colors

---

## 3. Ads Page Components

### AdCard.tsx (Main Card)
**Location:** `components/ads/AdCard.tsx`  
**Structure:**
- Motion wrapper: fade-in + hover spring animation
- AI Score Ribbon: top-right, gradient based on score tier (hot=red, good=purple, mid=blue)
- Creative wrapper: square aspect ratio, image or video
  - Images: fade-in loader + download button
  - Videos: full player with play/pause, seek, mute, volume, fullscreen, menu (speed 0.5-2x)
  - LIVE badge + days running (bottom-left)
- Footer stats (padding 2.5px):
  - Brand row: avatar + name + save button
  - Stats: language flag, impressions, spend, date (icons + values)
  - Tags: strategy tag (hook color), performance tag (trend color), niche badge
  - Platform icons (10x10px SVGs for FB, IG, etc.)

**Styling:**
- Class `.ad-card`: bg-card, border, hover glow + shadow
- Class `.ad-creative-wrap`: square aspect, skeleton loader
- Class `.ad-tag`: 8px font, custom colors (inline styles)
- Inline styles dominate: colors, backgrounds, transitions
- CSS vars: `--text-1`, `--text-2`, `--text-3`, `--ai-light`, `--green-light`

### AdsFilter.tsx (Filter Panel)
**Location:** `components/ads/AdsFilter.tsx`  
**Key sections:**
- Presets: Top Performers (≥80), Trending (<30d), Evergreen (>90d)
- Platform selector: FB, IG, Messenger, Audience Network, Threads
- Country dropdown: ALL, US, GB, DE, FR, NL, AU, CA
- Status: ACTIVE/INACTIVE/ALL
- Media type: video/image toggle
- Duration: any/new/growing/proven/evergreen
- AI Score tiers: all, weak (0-30), testing (31-50), promising (51-70), winning (71-84), elite (85-99)
- Niche multi-select: 16 categories with emoji icons
- Language: all, en, vi
- Sort: mixed, score, newest, longest

**Styling:**
- All dropdowns: inline styles, framer-motion AnimatePresence
- Badge colors: calculated from palette (e.g., #A78BFA10, #A78BFA25)
- Section dividers: 1px `--border`

### ads/page.tsx (Main Page Logic)
**Location:** `app/(dashboard)/ads/page.tsx`  
**Key features:**
- Filter persistence: localStorage `adspoonx_filters`
- Search history: localStorage `adspoonx_search_history` (max 8)
- Live counters: `useUsersOnline()`, `useNewProductsToday()` (realistic drift)
- Fetches `/api/ads` with filter params, paginates
- Grid layout: container queries `.ads-grid-container`, responsive columns
- Empty states + error handling
- Framer motion stagger animations on card mount

---

## 4. Shared UI Components

**Card.tsx** (`components/ui/Card.tsx`)
- Wrapper: `--bg-card` bg, `--border` border, 10px radius
- Hover effect: translateY(-2px) + stronger border + shadow

Other UI components (Button, Badge, Input, Toast) follow same CSS var + inline pattern.

---

## 5. CSS Token System (globals.css)

**Core Colors:**
- Backgrounds: `--bg-base` (#0D0E14), `--bg-surface` (#13141C), `--bg-card` (#1A1B25), `--bg-elevated` (#21222E)
- Borders: `--border` (rgba 0.09), `--border-strong` (rgba 0.16)
- Accent: `--ai` (#7C3AED), `--ai-light` (#A78BFA), `--ai-soft` (rgba 10%), `--ai-glow` (rgba 25%)
- Status: `--green` (#10B981), `--amber` (#F59E0B), `--red` (#EF4444)
- Text: `--text-1` (93% white), `--text-2` (65%), `--text-3` (40%)

**Motion:**
- `--ease`: cubic-bezier(0.2, 0, 0, 1)
- `--duration`: 120ms

**Component Classes:**
- `.saas-card`, `.ad-card`: border + hover lift + shadow
- `.ad-tag`, `.ad-creative-wrap`: compact chips
- `.ads-grid`: container query grid (230px min-width)
- `.skeleton`, `.skeleton-line`, `.skeleton-circle`: shimmer animations
- `.gradient-text`: purple-blue gradient
- Animations: `page-enter` (fade/slide), `live-pulse`, `ai-shimmer`, `bar-fill`

---

## 6. Other Dashboard Pages

**home-dashboard:** KPI cards (animated numbers), stats charts, tips carousel  
**stores:** Table grid, sort/filter by country/platform/status  
**saved:** Grid of saved ads, CSV export  
**trending:** Niche cards with growth indicators, top stores, country filter  
**settings:** Plan display, scan balance/limits, buy pack UI, logout  
**admin:** Recharts charts, user stats, subscription breakdown, VPS run history  

---

## 7. Styling Pattern Summary

**Inline styles:** 70% (state-driven, conditional colors, hover effects)  
**CSS classes:** 30% (static design, animations, layout)  
**CSS vars:** Everywhere (colors, timing, typography)  
**Responsive:** Tailwind for layout, media queries in CSS  

Example pattern:
```jsx
style={{
  background: isActive ? "var(--active-bg)" : "transparent",
  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
  transition: "all 120ms var(--ease)",
}}
onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--hover-bg)"; }}
```

---

## 8. Component Files Scanned
- Layout: `app/(dashboard)/layout.tsx`, `components/layout/Sidebar.tsx`, `components/layout/Header.tsx`
- Ads: `components/ads/AdCard.tsx`, `components/ads/AdsFilter.tsx`, `components/ads/AdDetailModal.tsx`
- Pages: `app/(dashboard)/ads/page.tsx`, `/home-dashboard/page.tsx`, `/stores/page.tsx`, `/saved/page.tsx`, `/trending/page.tsx`, `/settings/page.tsx`, `/admin/page.tsx`, `/admin/AdminDashboard.tsx`
- UI: `components/ui/Card.tsx`, `components/ui/Button.tsx`, `components/ui/Badge.tsx`, `components/ui/Input.tsx`, `components/ui/Toast.tsx`
- CSS: `app/globals.css`

**Total coverage:** 8 dashboard pages + 14 components + token system
