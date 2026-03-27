# Dashboard Premium Redesign — Master Plan
**Project:** adspoonX
**Date:** 2026-03-28
**Goal:** Elevate all dashboard pages from generic dark UI to match homepage premium DNA — dark luxury, Apple depth, glassmorphism lighting, strong visual hierarchy.

---

## Context
- **Token system:** `app/globals.css` — CSS vars already aligned with homepage palette. Gaps: no gradient surface tokens, no glow-on-hover depth vars, no premium skeleton palette.
- **Styling mechanism:** 70% inline styles (state-driven), 30% CSS classes. No `@apply`. All new tokens must be CSS vars consumed via `style={{}}`.
- **Motion:** Framer Motion installed. Existing stagger patterns on AdCard are correct — extend, don't replace.
- **No new deps** — Framer Motion, Lucide, Tailwind v4 already present.

---

## Tech Stack
| Layer | Tool |
|---|---|
| Framework | Next.js 15 App Router |
| Styling | Tailwind v4 (no @apply) + inline styles + CSS vars |
| Motion | Framer Motion |
| Icons | Lucide React |
| Deploy | Coolify (staging per phase) |

---

## Critical Constraints
1. Inline styles are the PRIMARY styling mechanism — CSS class changes alone won't work
2. Tailwind v4: no `@apply` for custom classes
3. Zero changes to API calls, state, hooks, localStorage keys, data flow
4. Each phase independently deployable and screenshot-verifiable on Coolify staging
5. No new npm dependencies

---

## Phases

| # | Phase | Scope | Status | File |
|---|---|---|---|---|
| 1 | Design Tokens | `globals.css` — add premium vars | pending | [phase-01-design-tokens.md](phase-01-design-tokens.md) |
| 2 | Navigation | Sidebar + Header upgrade | pending | [phase-02-navigation.md](phase-02-navigation.md) |
| 3 | Ads Page | Flagship page — search, filters, grid | pending | [phase-03-ads-page.md](phase-03-ads-page.md) |
| 4 | Stores + Trending | Table rows, niche cards | pending | [phase-04-stores-trending.md](phase-04-stores-trending.md) |
| 5 | Secondary Pages | Home dashboard, Saved, Settings | pending | [phase-05-secondary-pages.md](phase-05-secondary-pages.md) |
| 6 | States + Mobile | Skeletons, empty states, responsive | pending | [phase-06-states-mobile.md](phase-06-states-mobile.md) |

**Phase order is strict** — Phase 1 (tokens) must land before all others. Phase 2 before 3+.

---

## Success Criteria (overall)
- Dashboard feels visually continuous with the homepage — same palette, depth, motion DNA
- No regressions: all filters, search, pagination, save/export, admin routes work as before
- Lighthouse performance delta < 3 points (no new layout shifts from glow effects)
- All pages pass screenshot review on 1440px desktop + 375px mobile
