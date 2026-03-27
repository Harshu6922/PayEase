# PayEase Full App Redesign — Design Spec
**Date:** 2026-03-26
**Scope:** Complete redesign of all 21 screens — landing page, dashboard, and all inner app screens
**Stack:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, Recharts
**Existing deps (already installed):** framer-motion, recharts, lucide-react, tailwind-merge, clsx, @react-pdf/renderer, @supabase/supabase-js, razorpay, date-fns, next-themes
**To install:** shadcn/ui, JetBrains Mono font

---

## 1. Design System

### Color Tokens
| Token | Value | Use |
|---|---|---|
| `background` | `#0F0A1E` | App background |
| `surface` | `#1A1035` | Card/panel base |
| `surface-elevated` | `#221445` | Modals, dropdowns |
| `primary` | `#7C3AED` | Buttons, badges, accents |
| `primary-light` | `#A855F7` | Highlights, icons |
| `text` | `#F1F0F5` | Primary text |
| `text-muted` | `#7B7A8E` | Labels, metadata |
| `success` | `#10B981` | Paid, present badges |
| `warning` | `#F59E0B` | Pending, half-day |
| `danger` | `#EF4444` | Absent, overdue |
| `rupee-gold` | `#D4A847` | ₹ currency values only |

### Glass Morphism Card Recipe
Use `primary` token values throughout — do NOT use raw `border-purple-500` (which is `#A855F7`, not `#7C3AED`):
- `backdrop-blur-md`
- `bg-white/5`
- `border border-[#7C3AED]/20`
- Hover: `shadow-[0_0_20px_rgba(124,58,237,0.15)] border-[#7C3AED]/50`
- Transition: `transition-all duration-200`

As a reusable Tailwind class string in `GlassCard.tsx`:
```
className="backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-xl transition-all duration-200 hover:shadow-[0_0_20px_rgba(124,58,237,0.15)] hover:border-[#7C3AED]/50"
```

### Typography
- **UI text:** Inter (already configured via `--font-inter`)
- **Numbers/currency:** JetBrains Mono (add via next/font/google as `--font-jetbrains-mono`)
- **Scale:** text-xs (labels), text-sm (body), text-base (card values), text-2xl+ (hero/metrics)
- **Remove:** DM Sans (`--font-dm-sans`) is currently loaded in `layout.tsx` and mapped to `font-display` in Tailwind. Remove the DM Sans import from `layout.tsx` and remove `font-display` from `tailwind.config.ts` — it is not used in the redesign.

### Spacing
- Base unit: 4px
- Cards: `p-4` (mobile), `p-6` (desktop)
- Gaps: `gap-4` (tight), `gap-6` (standard)

### Tailwind Config Extensions (replace existing theme.extend)
```ts
colors: {
  background: '#0F0A1E',
  surface: '#1A1035',
  'surface-elevated': '#221445',
  primary: { DEFAULT: '#7C3AED', light: '#A855F7' },
  'rupee-gold': '#D4A847',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  text: { DEFAULT: '#F1F0F5' },   // used as text-text or set via globals.css body rule
  'text-muted': '#7B7A8E',
},
fontFamily: {
  sans: ['var(--font-inter)', 'sans-serif'],
  mono: ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'monospace'],
},
```

### Animation System

#### Framer Motion variant objects (define in `src/lib/animations.ts`)
```ts
export const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

export const springScaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } },
}

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
}
```

#### `useCountUp` hook (define in `src/lib/hooks/useCountUp.ts`)
Custom hook — counts a number from 0 to `target` over `duration` ms on mount. Respects `prefers-reduced-motion` (if reduced motion, returns target immediately). Signature:
```ts
function useCountUp(target: number, duration?: number): number
// duration defaults to 1000ms
// returns current animated value (integer)
```

#### Animation behavior by context
| Context | Behavior |
|---|---|
| Landing hero | `fadeInUp` stagger via `staggerContainer`, floating orbs (Framer Motion `animate={{ y: [0, -20, 0] }}` infinite, duration 6s) |
| Page transitions | `AnimatePresence` + `fadeIn` variant, 200ms |
| Metric cards | `useCountUp` number counter on mount |
| Modals | `springScaleIn` variant on Dialog content |
| Buttons | `whileTap: { scale: 0.97 }` on all primary buttons |
| Skeleton loaders | Tailwind `animate-pulse` |
| Scroll reveals | `whileInView` + `fadeInUp`, `viewport: { once: true, margin: "-50px" }` |
| "How it works" SVG line | SVG path with `stroke-dashoffset` animated via Framer Motion `useScroll`+`useTransform`. Stroke color: `#7C3AED`. Path length: full connector. Duration: tied to scroll position, completes when section exits viewport. |

---

## 2. Theme Strategy

**Force dark mode — remove `next-themes` light/dark switching entirely.**

The redesign is dark-only. Steps:
1. In `layout.tsx`: add `className="dark"` to the `<html>` tag (hardcoded).
2. In `ThemeProvider` (if kept): set `defaultTheme="dark"` and `forcedTheme="dark"`.
3. Remove the theme-cycle button from `Sidebar.tsx` (currently exists).
4. The existing `@media (prefers-color-scheme: dark)` block in `globals.css` can be removed — we hardcode dark via the `dark` class on `<html>`.

**`TrialBanner.tsx` and `InstallPrompt.tsx`:**
Both components are rendered in `layout.tsx` and currently have light/dark styles. Restyle both to match the dark glass design system:
- `TrialBanner`: glass card style (`bg-[#1A1035] border border-[#7C3AED]/20`), purple accent text, "Upgrade" CTA in primary purple
- `InstallPrompt`: same glass card style, dismiss button as ghost

---

## 3. Route Changes

### Routes to delete
- `src/app/signup/` — **delete entirely**. The app uses Google OAuth only (`/login`). There is no manual signup flow.

### Routes to merge
- `src/app/attendance/summary/` — **merge into `/attendance`**. The Attendance Calendar page (`/attendance`) will include the summary row (total present/absent/OT) that was previously a separate screen. Delete `src/app/attendance/summary/` after merging.

---

## 4. Shared Layout Components

### `AppShell.tsx` (rewrite)
- **Desktop:** Fixed left sidebar (240px wide) + main content area
- **Mobile:** Hidden sidebar, fixed bottom tab bar (5 tabs) + full-screen nav drawer triggered by hamburger

**Sidebar nav groups (desktop):**
```
[Logo: PayEase mark]

Main
  Dashboard          /dashboard
  Employees          /employees

Payroll
  Payments           /payments
  Advances           /advances
  Repayments         /advance-repayments
  Expenses           /expenses

Attendance
  Daily              /daily-attendance
  Calendar           /attendance

Work
  Work Entries       /work-entries
  Commission         /commission

Reports
  Charts             /charts
  Reports            /reports

Account
  Billing            /billing
  Settings           /settings
  Contact            /contact
```

**Mobile bottom tab bar (5 tabs):**
1. Dashboard — `/dashboard`
2. Employees — `/employees`
3. Attendance — `/daily-attendance`
4. Payroll — `/payments`
5. Settings — `/settings`

Secondary routes (Advances, Commission, etc.) accessible via hamburger drawer that slides in from left.

### `Sidebar.tsx` (rewrite)
- `w-60 bg-[#1A1035] border-r border-[#7C3AED]/10 h-screen fixed`
- Logo mark: 32px square, purple gradient bg, white "P", rounded-lg
- Group labels: text-xs uppercase tracking-widest text-muted
- Nav item default: `text-sm text-[#7B7A8E] hover:text-[#F1F0F5] hover:bg-[#7C3AED]/10 rounded-lg px-3 py-2`
- Nav item active: `bg-[#7C3AED]/10 text-[#A855F7] border-l-2 border-[#7C3AED]`
- Remove the theme-cycle button entirely

### `Navbar.tsx` (rewrite)
- **Scope:** Rendered by `AppShell` for all authenticated screens on mobile. Replaces the existing inline mobile header in `AppShell.tsx`.
- Content: hamburger icon (left), company name (center), user avatar (right)
- `bg-[#1A1035] border-b border-[#7C3AED]/10 h-14 px-4`

---

## 5. Screens

### 5.1 Landing Page (`/`)
**Sections:**
1. **Nav:** Glass nav bar (`backdrop-blur-md bg-[#0F0A1E]/80 border-b border-[#7C3AED]/10`), logo, links (Features, How it works, Pricing, Contact), Sign In + "Start Free Trial" CTA. Sticky.
2. **Hero:** Full-viewport, `bg-background`. Two animated radial purple orbs (`animate={{ y: [0,-30,0] }}` infinite, 6s + 8s). Large headline "Payroll, Simplified." with `text-primary` gradient span on "Simplified". Sub-copy targeting Indian businesses. "Start Free Trial →" primary CTA + "See How It Works" secondary. Animated dashboard screenshot below (fadeInUp, slight 3D perspective tilt via `rotateX`).
3. **Stats band:** Dark bg, 3 `useCountUp` animated counters (500+ businesses, ₹2Cr+ monthly, 14-day trial) — trigger on scroll via `whileInView`.
4. **Features:** 6 glass cards grid (3 cols desktop, 2 tablet, 1 mobile), `staggerContainer` + `fadeInUp` on scroll, hover lifts with purple glow.
5. **How it works:** 3-step vertical timeline. SVG connector line animates via `useScroll`+`useTransform` — stroke is `#7C3AED`, `stroke-dashoffset` maps from full path length (hidden) to 0 (fully drawn) as user scrolls the section into view. Steps use `fadeInUp` stagger.
6. **Testimonials:** 3 glass cards, `staggerContainer` on scroll.
7. **Pricing:** 3 plan cards on `bg-[#0F0A1E]`, Growth has `border-[#7C3AED]/50 shadow-[0_0_30px_rgba(124,58,237,0.2)]` + "Most Popular" pill badge.
8. **Final CTA:** Dark gradient section, large headline + CTA.
9. **Footer:** Logo, links, copyright.

**Mobile:** Single-column, hamburger nav drawer slides in from right.

### 5.2 Login (`/login`)
- Full-screen `bg-background`, centered glass card
- 1 slow-floating purple orb behind card (blur-3xl, opacity-30)
- PayEase logo mark (40px) + "Sign in to PayEase" heading + tagline
- "Continue with Google" button (shadcn Button variant=outline, white Google SVG icon, full-width)
- "No credit card required · 14-day free trial" footnote (text-muted, text-xs)
- Card uses `springScaleIn` on mount via `motion.div`

### 5.3 Onboarding (`/onboarding`)
- Full-screen `bg-background`, centered content, same orb bg as login
- "Welcome to PayEase" heading (no emoji — keep professional)
- "What's your company name?" label + shadcn Input
- "Get Started →" primary button (full-width on mobile)
- `springScaleIn` on content container

### 5.4 Dashboard (`/dashboard`)
- **Top bar:** On mobile, rendered by `Navbar.tsx` (via AppShell). On desktop, rendered as an inline `<header>` block at the top of `dashboard/page.tsx` — no separate component needed. Desktop top bar: `flex items-center justify-between px-6 py-4 border-b border-[#7C3AED]/10`. Left: company name (`text-text-muted text-sm`). Center: month selector (← [Month Year] →, `text-[#F1F0F5] font-semibold`). Right: user avatar circle (`w-8 h-8 rounded-full bg-primary/20 text-primary-light text-sm`). Month selector arrows are icon buttons with `whileTap: { scale: 0.9 }`.
- **Metric cards (4):** 2×2 on mobile, 4-in-row on desktop, `staggerContainer` on mount
  - Total Payable — `rupee-gold` value, Wallet icon
  - Paid — `success` value, CheckCircle icon
  - Remaining — `primary` value, Clock icon
  - Employees — white value, Users icon
  - Each card: glass card + `useCountUp` animated number
- **Payroll table:** columns: Name, Worker Type badge, Earned (mono), Advances (mono), Net Payable (mono, gold), Status badge, "Pay" button
- Mobile: table collapses to scrollable employee cards with swipe gesture

### 5.5 Employees (`/employees`)
- Search bar (shadcn Input with search icon) + segmented filter (All / Salaried / Daily / Commission)
- Employee grid: 3 cols desktop, 2 tablet, 1 mobile. Each card: avatar circle (initials, `bg-primary/20 text-primary-light`), name, phone, badge, join date, "View →" link
- Floating "+" FAB: `fixed bottom-6 right-6`, `bg-primary rounded-full w-14 h-14`, `whileHover: { scale: 1.1 }`, opens Add Employee Modal

### 5.6 Add Employee Modal (`AddEmployeeModal.tsx`)
- shadcn Dialog, `springScaleIn` on content
- Fields: Full Name (Input), Phone (Input), Worker Type (shadcn Tabs: Salaried/Daily/Commission — tab selection changes subsequent field labels), Salary or Daily Rate (Input), OT Multiplier (Input, hidden for Commission type), Join Date (Input type=date)
- Footer: "Cancel" (ghost button) + "Add Employee" (primary button)
- Lives in `src/components/AddEmployeeModal.tsx`

### 5.7 Daily Attendance (`/daily-attendance`)
- Date header: ← [date] → + "Today" pill shortcut
- "Mark All Present" button (top right, ghost style)
- Employee rows (list): avatar, name, worker type badge | 3-pill toggle (Present / Half / Absent) | OT hours Input (visible only when Present)
- Sticky "Save Attendance" primary button at bottom (full-width mobile)

### 5.8 Attendance Calendar (`/attendance`)
- Dropdown: employee selector (shadcn Select)
- Month nav: ← [Month Year] →
- Calendar grid: 7-col, day cells with colored dot indicators: green=present, red=absent, amber=half-day, blue dot for OT
- Legend: 4 colored dots with labels
- Summary cards below (glass, small): Total Present, Total Absent, Total OT
- Mobile: full-width single-column calendar

### 5.9 Work Entries (`/work-entries`)
- Date header + employee selector (shadcn Select)
- Item list: item name (left), numeric Input for quantity (right)
- "Save Entries" primary button (bottom)

### 5.10 Commission (`/commission`)
- "Commission Items" heading + "Add Item" button (top right)
- Item rows: item name, `font-mono` rate, shadcn Switch (active toggle), trash icon button
- "Add Item" opens inline expandable row: item name Input + rate Input + confirm/cancel

### 5.11 Advances (`/advances`)
- Employee cards (glass): name, outstanding balance (large `font-mono`, `text-danger` if >0, `text-muted` if 0), "Give Advance" button
- "Give Advance" expands inline form: amount Input, date Input, note Input → "Confirm" button
- Balance number uses `useCountUp` when updated

### 5.12 Advance Repayments (`/advance-repayments`)
- Table: Employee, Advance Date, Original Amount (mono), Total Repaid (mono), Outstanding (mono, danger), "History ▼" toggle button
- Expanded row: list of repayment entries per advance with date + amount
- Mobile: card layout (each advance as a stacked card)

### 5.13 Payments (`/payments`)
- Employee rows: avatar, name | Net Payable (gold mono) | Status badge | "Record Payment →" button
- Each row click / button click → opens Payment Modal

### 5.14 Payment Modal (`PaymentModal.tsx`)
- shadcn Dialog, `springScaleIn`
- Breakdown section: rows for Earned Salary, OT Earned, Deductions, Advance Deducted — each `font-mono text-sm`. Divider line. **Net Payable** (large, `text-rupee-gold font-mono font-bold text-2xl`)
- Amount Input (pre-filled with net payable), Date Input, Note Textarea (optional)
- "Record Payment" primary CTA (full-width)
- Lives in `src/components/PaymentModal.tsx` (rewrite existing file)

### 5.15 Expenses (`/expenses`)
- Monthly total glass card at top: "March 2026 Expenses — ₹XX,XXX" (gold mono value)
- "Add Expense" button opens shadcn Dialog: category Select, amount Input, date Input, note Textarea
- Expense list: category badge (color-coded by type), description, `font-mono` amount, date, trash icon
- Mobile: card list

### 5.16 Reports (`/reports`)
- Two action glass cards side-by-side (stacked on mobile):
  1. "Payslip PDFs" — month selector + employee multi-select (or "All") + "Download PDF" button (shows spinner while generating via `@react-pdf/renderer`)
  2. "Export Payroll" — month selector + "Export CSV" button
- Cards have animated border on hover via `animate` with `borderColor` keyframes

### 5.17 Charts (`/charts`)
- shadcn Tabs: Salary Trends / Attendance / Summary
- **Salary Trends:** Recharts BarChart, `fill="#7C3AED"`, current month bar `fill="#D4A847"`, animated on mount via `isAnimationActive`
- **Attendance:** Recharts LineChart, `stroke="#7C3AED"`, area fill `#7C3AED/20`
- **Summary:** Recharts PieChart (donut), colors: `["#7C3AED", "#10B981", "#F59E0B"]`, legend below
- All charts: dark bg, custom tooltip with glass card style

### 5.18 Billing (`/billing`)
- 3 plan cards (glass): Starter ₹299/mo, Growth ₹499/mo, Business ₹999/mo
- Growth card: `border-[#7C3AED]/50 shadow-[0_0_30px_rgba(124,58,237,0.2)]` + "Most Popular" pill
- Current plan card: "Current Plan" badge (success green)
- Feature list per plan (checkmarks in `text-success`)
- Upgrade/Downgrade CTA → Razorpay integration

### 5.19 Settings (`/settings`)
- Page layout: stack of glass card sections
  1. **Profile** — Full Name Input + "Save" button + shadcn Sonner toast on save
  2. **Company** — Company Name Input + "Save" button + toast
  3. **Viewers** — list of viewers (email + role badge + "Remove" button). "Add Viewer" inline: email Input + role Select (Viewer/Admin) + "Add" confirm
  4. **Referral** — referral code in mono Input (read-only) + "Copy" button (copies to clipboard, shows "Copied!" toast)

### 5.20 Contact Us (`/contact`)
- Centered glass card (max-w-lg)
- Form: Name Input, Email Input, Message Textarea (4 rows), "Send Message" primary button
- Support email below form (text-muted + mailto link)
- On submit: card transitions to success state (`springScaleIn` of checkmark + "Message sent!" text)

### 5.21 Viewer Dashboard (`/viewer`)
- Identical layout to Dashboard (5.4) with modifications:
  - Top banner: `bg-warning/10 border-b border-warning/30` with Lock icon + "View Only — You have read-only access" text
  - All "Pay", "Record", "Add" action buttons removed
  - Metric cards visible and populated (read-only)
  - Payroll table visible, no action column
  - "Powered by PayEase" in footer

---

## 6. Implementation Plan

### Phase 1 — Foundation
1. Install shadcn/ui: `npx shadcn@latest init` (choose dark theme, CSS variables)
2. Add shadcn components: `npx shadcn@latest add button input dialog tabs switch select textarea badge skeleton sonner`
3. Update `tailwind.config.ts` — replace `theme.extend` with design tokens (Section 1)
4. Update `globals.css` — remove `@media (prefers-color-scheme: dark)` block, set `body { background: #0F0A1E; color: #F1F0F5; }`
5. Update `layout.tsx`:
   - Add `className="dark"` to `<html>` tag
   - Set `forcedTheme="dark"` on `ThemeProvider` (or remove `ThemeProvider` and hardcode)
   - Remove `DM_Sans` import, remove `font-display` variable
   - Add `JetBrains_Mono` via `next/font/google` as `--font-jetbrains-mono`
6. Create `src/lib/animations.ts` with exported Framer Motion variants (see Section 1)
7. Create `src/lib/hooks/useCountUp.ts` (see Section 1)
8. Delete `src/app/signup/` directory
9. Delete `src/app/attendance/summary/` directory

### Phase 2 — Shared Components
1. Rewrite `AppShell.tsx` — sidebar (desktop) + bottom tab bar + hamburger drawer (mobile)
2. Rewrite `Sidebar.tsx` — glass sidebar with nav groups + active states, remove theme toggle
3. Rewrite `Navbar.tsx` — mobile top bar, rendered by AppShell on all authenticated screens
4. Restyle `TrialBanner.tsx` — glass dark style
5. Restyle `InstallPrompt.tsx` — glass dark style
6. Create `src/components/GlassCard.tsx` — reusable wrapper
7. Create `src/components/MetricCard.tsx` — glass card + useCountUp + icon
8. Create `src/components/StatusBadge.tsx` — Paid/Pending/Partial/Present/Absent
9. Create `src/components/WorkerTypeBadge.tsx` — Salaried/Daily/Commission

### Phase 3 — Screens (Stitch-guided, in batches)
**Batch A — Public:** `/` (Landing), `/login`, `/onboarding`
**Batch B — Core:** `/dashboard`, `/employees`, `AddEmployeeModal.tsx`
**Batch C — Attendance:** `/daily-attendance`, `/attendance`
**Batch D — Work/Finance:** `/work-entries`, `/commission`, `/advances`, `/advance-repayments`
**Batch E — Payroll:** `/payments`, `PaymentModal.tsx`, `/expenses`
**Batch F — Reports/Admin:** `/reports`, `/charts`, `/billing`, `/settings`, `/contact`, `/viewer`

---

## 7. File Structure Changes

```
src/
  app/
    globals.css                    ← update (remove light theme, add dark tokens)
    layout.tsx                     ← add dark class, JetBrains Mono, remove DM Sans
    page.tsx                       ← Landing page (full rewrite)
    login/page.tsx                 ← Login screen (rewrite)
    onboarding/page.tsx            ← Onboarding (rewrite)
    dashboard/page.tsx             ← Dashboard (rewrite)
    employees/page.tsx             ← Employees list (rewrite)
    daily-attendance/page.tsx      ← Daily Attendance (rewrite)
    attendance/page.tsx            ← Attendance Calendar (rewrite)
    work-entries/page.tsx          ← Work Entries (rewrite)
    commission/page.tsx            ← Commission (rewrite)
    advances/page.tsx              ← Advances (rewrite)
    advance-repayments/page.tsx    ← Repayments (rewrite)
    payments/page.tsx              ← Payments (rewrite)
    expenses/page.tsx              ← Expenses (rewrite)
    reports/page.tsx               ← Reports (rewrite)
    charts/page.tsx                ← Charts (rewrite)
    billing/page.tsx               ← Billing (rewrite)
    settings/page.tsx              ← Settings (rewrite)
    contact/page.tsx               ← Contact (rewrite)
    viewer/page.tsx                ← Viewer Dashboard (rewrite)
    signup/                        ← DELETE (Google OAuth only)
    attendance/summary/            ← DELETE (merged into /attendance)
  components/
    AppShell.tsx                   ← rewrite
    Sidebar.tsx                    ← rewrite
    Navbar.tsx                     ← rewrite
    TrialBanner.tsx                ← restyle
    InstallPrompt.tsx              ← restyle
    GlassCard.tsx                  ← new
    MetricCard.tsx                 ← new
    StatusBadge.tsx                ← new
    WorkerTypeBadge.tsx            ← new
    AddEmployeeModal.tsx           ← new
    PaymentModal.tsx               ← rewrite
  lib/
    animations.ts                  ← new: Framer Motion variants
    hooks/
      useCountUp.ts                ← new: animated counter hook
```

---

## 8. Dependencies to Add

```bash
npx shadcn@latest init
npx shadcn@latest add button input dialog tabs switch select textarea badge skeleton sonner
```

No additional npm packages needed beyond shadcn. All other required packages are already installed:
- framer-motion, recharts, lucide-react, tailwind-merge, clsx
- @react-pdf/renderer (used in Reports screen for PDF generation)
- @supabase/supabase-js, razorpay, date-fns, next-themes
