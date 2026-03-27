# AdspoonX Homepage Design DNA Extract

## Color System

**Base Palette** (Dark SaaS)
- `--bg-base`: `#0D0E14` (charcoal navy, section background)
- `--bg-surface`: `#13141C` (sidebar/navbar surface)
- `--bg-card`: `#1A1B25` (card containers)
- `--bg-elevated`: `#21222E` (elevated UI elements)
- `--bg-hover`: `rgba(255, 255, 255, 0.05)`
- `--bg-active`: `rgba(255, 255, 255, 0.09)`

**Accent: AI Purple** (primary identity)
- `--ai`: `#7C3AED` (main CTA gradient anchor)
- `--ai-hover`: `#8B5CF6` (interactive state)
- `--ai-light`: `#A78BFA` (text/icon accent)
- `--ai-glow`: `rgba(124, 58, 237, 0.25)` (shadow/glow)
- `--ai-soft`: `rgba(124, 58, 237, 0.10)` (background tint)

**Secondary: Blue**
- `--blue`: `#3B82F6`
- `--blue-light`: `#60A5FA`

**Status Colors**
- `--green`: `#10B981` (real-time pulse)
- `--green-light`: `#34D399`
- `--amber`: `#F59E0B` (star rating)
- `--red`: `#EF4444` (error/premium highlight)

**Typography**
- `--text-1`: `rgba(255, 255, 255, 0.93)` (primary text)
- `--text-2`: `rgba(255, 255, 255, 0.65)` (secondary)
- `--text-3`: `rgba(255, 255, 255, 0.40)` (muted/hint)

**Borders**
- `--border`: `rgba(255, 255, 255, 0.09)`
- `--border-strong`: `rgba(255, 255, 255, 0.16)`

---

## Typography

**Font Families**
- Display: `var(--font-geist-sans)`, fallback `-apple-system`
- Monospace/Data: `'Geist Mono'`, `'JetBrains Mono'`
- Base Letter Spacing: `-0.01em`

**Scale**
- H1 Hero: `5xl–7xl` (60–84px), `font-extrabold`, `leading-[1.1]`, `tracking-tight`
- H2 Section: `4xl–5xl` (40–48px), `font-bold`, `leading-tight`
- H3 Cards: `text-base`, `font-semibold`
- Body: `text-lg–xl`, `leading-relaxed`
- Small Labels: `text-xs`, `font-semibold`, `uppercase`, `tracking-widest` (0.18em)
- Data/Stats: `text-lg`, `font-bold`, monospace family

---

## Spacing Rhythm

**Section Padding**
- Hero: `pt-32 pb-0 px-6` (top focus)
- Features: `py-24 px-6`
- Pricing: `py-24 px-6`
- Features grid gap: `gap-3` (12px)

**Component Padding**
- Cards: `p-6` (24px) – large cards, `p-2.5` (10px) – ad cards
- Badge: `px-4 py-1.5` (pill shape)
- Buttons: `px-6 py-3` (CTA), `px-2 py-0.5` (small badge)
- Stats bar: `px-5 py-2` per stat, `divide-x` separators

**Gaps**
- CTA group: `gap-3` (12px)
- Icon + text: `gap-2` (8px)

---

## Card Architecture

**Standard Card**
- `border-radius: 12–24px` (rounded-xl to rounded-2xl)
- `background: var(--bg-card)`
- `border: 1px solid var(--border)`
- Transition: `border-color, box-shadow, transform` @ 120ms cubic-bezier(0.2,0,0,1)

**Hover State**
- Border → `rgba(124,58,237,0.25)` (ai-light transparency)
- Shadow: `0 4px 24px rgba(0,0,0,0.45)` + `0 0 0 1px rgba(124,58,237,0.08)`
- Transform: `translateY(-1px)`

**Ad Card (Compact)**
- `border-radius: rounded-xl` (12px)
- Shadow default: `0 1px 2px rgba(0,0,0,0.3)`
- Highlight border: `rgba(167,139,250,0.45)`
- Highlight glow: `0 0 18px rgba(124,58,237,0.2)`

**Feature Cards (Bento)**
- `backdrop-filter: blur(6px)`
- Background: `rgba(255,255,255,0.025)` or gradient (pricing premium)
- Hover glow: `0 0 28px rgba(124,58,237,0.12), 0 4px 24px rgba(0,0,0,0.3)`

---

## Glass & Depth Effects

**Blur Layers**
- Badge/badge-filter: `blur(8px)`
- Feature cards: `backdrop-filter: blur(6px); WebkitBackdropFilter: blur(6px)`
- Product chrome URL bar: `backdrop-filter: blur(4px)`

**Orb/Glow Background**
- Central orb (Hero): `radial-gradient(circle, rgba(124,58,237,0.22)→transparent)`, `blur(1px)`, 700x700px
- Side glows: `blur(40px)`, positioned at corners, 280–320px radius
- Grid pattern underlay: `48px × 48px`, masked with `radial-gradient(ellipse 80% 60%)`

**Shadow Depth**
- Browser frame: `0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.12), inset 0 1px 0 rgba(255,255,255,0.06)`
- Command bar focus: `0 0 0 3px rgba(124,58,237,0.08), 0 8px 32px rgba(0,0,0,0.3)`

---

## Gradient Lighting

**Headline Gradient**
- Direction: `135deg`
- Stops: `var(--ai-light) 0% → var(--blue-light) 100%`
- Clip: `-webkit-text-fill-color: transparent`, `background-clip: text`

**CTA Button Gradient**
- Direction: `135deg`
- Stops: `var(--ai) 0% → #5B21B6 100%`

**Ad Card Creative Overlay**
- Direction: `135deg`
- Gradient: `rgba(124,58,237,0.12) → rgba(59,130,246,0.08) → rgba(16,185,129,0.06)`

**Pricing Premium Badge**
- Direction: `90deg`
- Stops: `#fb923c → #ef4444` (orange-red)

**Shimmer Sweep**
- `linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.04) 50%, transparent 60%)`
- Animation: `shimmer 2.4s infinite` (translateX -100% → 200%)

---

## Animation & Motion

**Ease Curve** (Standard)
- `--ease: cubic-bezier(0.2, 0, 0, 1)` (spring-like exit)
- `--duration: 120ms`

**Motion Library**: Framer Motion

**Entrance Animations**
- Hero elements: `{ opacity: 0, y: 20–24 }`, `duration: 0.5–0.8s`, cascading `delay: 0.1–0.6s`
- Ad cards: `{ opacity: 0, y: 12 }`, `duration: 0.5s`, staggered delay per card
- Feature cards: `{ opacity: 0, y: 24 }`, whileInView + once: true, `delay: i * 0.07s`

**Hover/Interactive**
- Panel buttons: `scale(1.07)` @ 120ms
- Cards: `borderColor`, `boxShadow`, `y: -2` @ 300ms
- Shimmer: 2.4s infinite loop
- Ping (pulse dot): `scale(2), opacity: 0` @ 75–100%, `cubic-bezier(0,0,0.2,1)`

**Live Indicators**
- Ping pulse: 1.4s infinite
- Live dot flash: 2.5s ease infinite (0.7 opacity at 0%, 0.5 at 50%)
- Score sparkle: 2s ease infinite (text-shadow glow pulse)

---

## Component Patterns

**Pill Badges**
- Structure: `flex items-center gap-2 px-4 py-1.5 rounded-full`
- Size: `text-xs font-semibold`
- Colors: `background: rgba(124,58,237,0.15)`, `border: 1px solid rgba(124,58,237,0.35)`
- Pulse dot inside: animated ping at `h-2 w-2`

**CTA Buttons**
- Primary: `px-6 py-3 rounded-xl font-semibold text-sm`
- Gradient bg + glow shadow
- State: `hover:opacity-90 active:scale-[0.98]`
- Secondary (outline): `border: 1px solid var(--border)`, `hover:bg-white/5`

**Stat Blocks**
- Container: `rounded-2xl px-2 py-1 divide-x` (border-divide)
- Per stat: `flex flex-col items-center px-5 py-2`
- Value: `text-lg font-bold`, monospace family
- Label: `text-[10px] mt-0.5 uppercase tracking-wide`

**Small Tags/Chips**
- AI Score badge: `px-2 py-0.5 rounded-full text-[10px] font-bold`, blur(8px) backdrop
- CTA tag: `px-2 py-0.5 rounded text-[9px] font-semibold`
- Colors vary: purple for highlighted, muted for neutral

**Feature Icons**
- Container: `w-10 h-10 rounded-xl flex items-center justify-center`
- Background: tinted per feature color (e.g., `rgba(124,58,237,0.2)`)
- Icon size: `size-20` (Lucide icons)

**Trust Signal**
- Star rating: `★★★★★` literal character, color `#FBBF24`
- Text: `text-xs`, secondary text color

---

## Key Design Decisions

1. **Charcoal navy base** (`#0D0E14`), not pure black — reduces eye strain on dark SaaS
2. **Single accent (purple)** — consistent identity without rainbow
3. **Minimal borders** — subtle `rgba(255,255,255,0.09)` creates sophistication
4. **Staggered animations** — each element has unique delay for organic entrance
5. **Backdrop blur + low opacity** — glass morphism without obstruction
6. **Gradient text on headlines** — premium perception on key messaging
7. **No ambient glow by default** — clutter-free, glow only on interaction
8. **Container queries for ads grid** — responsive `minmax(230px, 1fr)` auto-fill

---

## File Locations

- Colors/tokens: `app/globals.css` (`:root`)
- Hero section: `components/marketing/HeroSection.tsx`
- Features grid: `components/marketing/FeaturesSection.tsx`
- Pricing cards: `components/marketing/PricingSection.tsx`

*Last updated: 2026-03-28*
