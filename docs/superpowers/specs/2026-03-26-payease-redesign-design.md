# PayEase Full App Redesign — Design Spec
**Date:** 2026-03-26
**Scope:** Complete redesign of all 21 screens — landing page, dashboard, and all inner app screens
**Stack:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, Recharts
**Existing deps (already installed):** framer-motion, recharts, lucide-react, tailwind-merge, clsx
**To install:** shadcn/ui, JetBrains Mono font

---

## 1. Design System

### Color Tokens
| Token | Value | Use |
|---|---|---|
| `background` | `#0F0A1E` | App background |
| `surface` | `#1A1035` | Card/panel base |
| `surface-elevated` | `#221445` | Modals, dropdowns |
| `border` | `rgba(124,58,237,0.2)` | Default borders |
| `border-glow` | `rgba(124,58,237,0.5)` | Hover/active borders |
| `primary` | `#7C3AED` | Buttons, badges, accents |
| `primary-light` | `#A855F7` | Highlights, icons |
| `text` | `#F1F0F5` | Primary text |
| `text-muted` | `#7B7A8E` | Labels, metadata |
| `success` | `#10B981` | Paid, present badges |
| `warning` | `#F59E0B` | Pending, half-day |
| `danger` | `#EF4444` | Absent, overdue |
| `rupee-gold` | `#D4A847` | ₹ currency values only |

### Glass Morphism Card Recipe
- `backdrop-blur-md`
- `bg-white/5`
- `border border-purple-500/20`
- Hover: `shadow-[0_0_20px_rgba(124,58,237,0.15)] border-purple-500/50`
- Transition: `transition-all duration-200`

### Typography
- **UI text:** Inter (already configured via `--font-inter`)
- **Numbers/currency:** JetBrains Mono (add via next/font)
- **Scale:** text-xs (labels), text-sm (body), text-base (card values), text-2xl+ (hero/metrics)

### Spacing
- Base unit: 4px
- Cards: `p-4` (mobile), `p-6` (desktop)
- Gaps: `gap-4` (tight), `gap-6` (standard)

### Tailwind Config Extensions (to add)
```ts
colors: {
  background: '#0F0A1E',
  surface: '#1A1035',
  'surface-elevated': '#221445',
  primary: { DEFAULT: '#7C3AED', light: '#A855F7' },
  'rupee-gold': '#D4A847',
}
fontFamily: {
  mono: ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'monospace'],
}
```

### Animation System
| Context | Behavior |
|---|---|
| Landing hero | `fadeInUp` stagger, floating orbs (slow infinite y-motion), animated gradient |
| Page transitions | `AnimatePresence` fadeIn 200ms |
| Metric cards | `useCountUp` number counter on mount |
| Modals | Spring scale-in: `type:"spring", stiffness:300, damping:25` |
| Buttons | `whileTap: { scale: 0.97 }` |
| Skeleton loaders | Shimmer via `animate-pulse` or custom shimmer keyframe |
| Scroll reveals | `whileInView` fadeInUp with `viewport: { once: true }` |

---

## 2. Shared Layout Components

### `AppShell.tsx` (rewrite)
- Dark sidebar (desktop) + bottom nav (mobile)
- Sidebar: PayEase logo, nav items with active purple highlight + left border indicator
- Nav items: Dashboard, Employees, Attendance, Payroll, Reports, Settings
- Mobile: fixed bottom tab bar (5 primary tabs), hamburger for secondary screens

### `Sidebar.tsx` (rewrite)
- `bg-surface border-r border-purple-500/10`
- Logo mark: purple gradient square with "P"
- Nav item active state: `bg-purple-500/10 border-l-2 border-purple-500 text-primary-light`

### `Navbar.tsx` (rewrite)
- Top bar on mobile
- Company name + month selector + user avatar

---

## 3. Screens

### 3.1 Landing Page (`/`)
**Sections:**
1. **Nav:** Glass nav bar, logo, links (Features, How it works, Pricing, Contact), Sign In + "Start Free Trial" CTA
2. **Hero:** Full-viewport, `#0F0A1E` bg, 2 animated radial purple orbs (Framer Motion infinite y-float). Large headline "Payroll, Simplified." with purple gradient span. Sub-copy targeting Indian businesses. "Start Free Trial →" primary CTA + "See How It Works" secondary. Animated dashboard screenshot fades in below with slight perspective tilt.
3. **Stats band:** Dark bg, 3 animated counters (500+ businesses, ₹2Cr+ monthly, 14-day trial) — trigger on scroll enter
4. **Features:** 6 glass cards grid (3 cols desktop, 2 cols tablet, 1 col mobile), hover lifts with purple glow
5. **How it works:** 3-step vertical timeline, connector line draws on scroll via SVG stroke-dashoffset animation
6. **Testimonials:** 3 glass cards
7. **Pricing:** 3 plan cards on dark bg, Growth plan has purple glow border + "Most Popular" badge
8. **Final CTA:** Dark gradient section, large headline + CTA button
9. **Footer:** Logo, links, copyright

**Mobile:** Single-column, hamburger nav drawer

### 3.2 Login (`/login`)
- Centered glass card on `#0F0A1E` bg
- Animated purple orb behind card (blur, slow float)
- PayEase logo mark + "Sign in to PayEase"
- Single "Continue with Google" button (shadcn Button variant=outline, Google SVG icon)
- "No credit card required · 14-day free trial" footnote
- Card: spring scale-in on mount

### 3.3 Onboarding (`/onboarding`)
- Full-screen dark bg, centered content
- "Welcome to PayEase 👋" heading
- "What's your company name?" label + shadcn Input
- "Get Started →" primary button
- Subtle animated bg (same orb pattern as login)

### 3.4 Dashboard (`/dashboard`)
- **Top bar:** Month selector (← March 2026 →), company name (left), avatar (right)
- **Metric cards (4):** 2×2 grid on mobile, 4-in-row on desktop
  - Total Payable (rupee-gold value, wallet icon)
  - Paid (success green, checkmark icon)
  - Remaining (primary purple, clock icon)
  - Employees (white, users icon)
  - Each: glass card, number counts up on mount with `useCountUp`
- **Payroll table:** Name, worker type badge, earned (mono font), advances (mono), net payable (mono, gold), status badge (Paid/Pending/Partial), "Pay" action button
- Mobile: table becomes swipeable card list

### 3.5 Employees (`/employees`)
- Search input + worker type filter (All / Salaried / Daily / Commission) as segmented control
- Employee cards grid (3 cols desktop, 2 tablet, 1 mobile): avatar initials circle (purple bg), name, phone, worker type badge, join date, "View →" link
- Floating "+" FAB (bottom-right, mobile + desktop), opens Add Employee Modal

### 3.6 Add Employee Modal
- shadcn Dialog, spring scale-in
- Fields: Full Name (Input), Phone (Input), Worker Type (Tabs/SegmentedControl: Salaried/Daily/Commission), Salary or Daily Rate (Input, label changes by type), OT Multiplier (Input, shown for Salaried/Daily), Join Date (Input type=date)
- Footer: "Cancel" (ghost) + "Add Employee" (primary)

### 3.7 Daily Attendance (`/daily-attendance`)
- Date header with ← → navigation + "Today" pill
- "Mark All Present" quick action button (top right)
- Employee rows: avatar initials, name, worker type badge, then 3-way toggle (Present / Half / Absent) as pill group, OT hours Input (shown only when Present)
- Sticky "Save Attendance" button at bottom

### 3.8 Attendance Calendar (`/attendance`)
- Employee selector dropdown (top)
- Month navigation (← →)
- Calendar grid: each day cell has colored dot(s): green=present, red=absent, amber=half-day, blue=OT indicator
- Legend row below calendar
- Summary row: Total Present, Absent, OT days (glass cards, small)
- Mobile: full-width calendar, dots stack

### 3.9 Work Entries (`/work-entries`)
- Date header + employee selector
- List of commission items: item name (left), quantity Input (right), unit label
- "Save Entries" primary button (bottom)

### 3.10 Commission (`/commission`)
- "Commission Items" heading
- List rows: item name, rate per unit (mono), active toggle (shadcn Switch), delete icon
- "Add Item" button → inline new row form: item name Input + rate Input + "Add" confirm

### 3.11 Advances (`/advances`)
- Per-employee cards: name, outstanding balance (large, danger red or muted if zero), "Give Advance" button
- Give Advance inline form (expand on button click): amount, date, note → "Confirm" button
- Outstanding balance animates on update

### 3.12 Advance Repayments (`/advance-repayments`)
- Table: Employee, Advance Date, Original Amount, Total Repaid, Outstanding, "History" toggle
- Expanded history: list of repayment records per advance
- Mobile: card-based layout

### 3.13 Payments (`/payments`)
- Employee list rows: name, net payable (gold, mono), status badge, "Record Payment →" button
- Clicking opens Payment Modal

### 3.14 Payment Modal
- shadcn Dialog, spring scale-in
- Breakdown table: Earned Salary, OT Earned, Deductions, Advance Deducted → **Net Payable** (large, gold, mono font, bold)
- Amount Input (pre-filled), Date Input, Note Input (optional)
- "Record Payment" primary CTA

### 3.15 Expenses (`/expenses`)
- "Add Expense" button (top right) → shadcn Dialog form: category, amount, date, note
- Monthly total summary card at top (glass, gold amount)
- Expense list: category badge (color-coded), description, amount (mono), date, delete icon
- Mobile: card list

### 3.16 Reports (`/reports`)
- Two primary action cards (glass):
  1. "Generate Payslips" — employee multi-select or "All", month selector, "Download PDF" button with loading spinner
  2. "Export Full Payroll" — month selector, "Export CSV/PDF" button
- Both cards have subtle animated border on hover

### 3.17 Charts (`/charts`)
- Tab navigation: Salary Trends / Attendance / Summary
- **Salary Trends tab:** Bar chart (monthly totals, purple bars, gold highlight current month), animated on mount
- **Attendance tab:** Line chart (attendance % over months, purple line, green fill)
- **Summary tab:** Donut chart (Paid vs Pending vs Remaining, purple/green/amber), legend below
- All Recharts with custom purple/gold theme

### 3.18 Billing (`/billing`)
- 3 plan cards (Starter ₹299/mo, Growth ₹499/mo, Business ₹999/mo)
- Current plan: purple glow border + "Current Plan" badge
- Growth: "Most Popular" badge
- Feature list per plan with checkmarks
- Upgrade CTA button (Razorpay integration)
- Glass cards on dark bg

### 3.19 Settings (`/settings`)
- Sections as glass cards:
  1. **Profile** — display name Input, Save button
  2. **Company** — company name Input, Save button
  3. **Viewers** — list of viewer emails + role, "Add Viewer" inline form (email + role select), remove button per viewer
  4. **Referral** — referral code display + "Copy" button (clipboard API, toast on copy)
- shadcn Toast for save confirmations

### 3.20 Contact Us (`/contact`)
- Glass card, centered
- Form: Name, Email, Message (Textarea), Submit button
- Support email shown below form
- Submit shows success state with animation

### 3.21 Viewer Dashboard (`/viewer`)
- Same layout as Dashboard but:
  - "View Only" banner at top (amber/purple subtle bg, lock icon)
  - All action buttons hidden/disabled
  - "Powered by PayEase" footer note
  - Read-only metric cards + payroll table (no Pay buttons)

---

## 4. Implementation Approach

### Phase 1 — Foundation (do first)
1. Install shadcn/ui: `npx shadcn@latest init`
2. Add shadcn components: Button, Input, Dialog, Tabs, Switch, Select, Textarea, Badge, Skeleton, Toast/Sonner
3. Update `tailwind.config.ts` with design tokens
4. Update `globals.css` with CSS custom properties for design tokens
5. Add JetBrains Mono via `next/font/google`
6. Update `layout.tsx` to set dark background + font variables

### Phase 2 — Shared Components
1. Rewrite `AppShell.tsx` — sidebar (desktop) + bottom nav (mobile)
2. Rewrite `Sidebar.tsx` — glass sidebar with active states
3. Rewrite `Navbar.tsx` — mobile top bar
4. Create `GlassCard.tsx` — reusable glass morphism card wrapper
5. Create `MetricCard.tsx` — animated counter card
6. Create `StatusBadge.tsx` — Paid/Pending/Partial/Present/Absent badges
7. Create `WorkerTypeBadge.tsx` — Salaried/Daily/Commission badges

### Phase 3 — Screen-by-Screen (Stitch-guided)
For each screen: generate Stitch design → implement as Next.js page + components.

**Batch A — Public:** Landing page, Login, Onboarding
**Batch B — Core:** Dashboard, Employees, Add Employee Modal
**Batch C — Attendance:** Daily Attendance, Attendance Calendar
**Batch D — Work/Finance:** Work Entries, Commission, Advances, Advance Repayments
**Batch E — Payroll:** Payments, Payment Modal, Expenses
**Batch F — Reports/Admin:** Reports, Charts, Billing, Settings, Contact, Viewer Dashboard

---

## 5. File Structure Changes

```
src/
  app/
    globals.css          ← update with design tokens
    layout.tsx           ← add fonts, dark class, bg-background
    page.tsx             ← Landing page (full rewrite)
    login/page.tsx       ← Login screen
    onboarding/page.tsx  ← Onboarding screen
    dashboard/page.tsx   ← Dashboard (rewrite)
    employees/page.tsx   ← Employees list (rewrite)
    ... (all existing routes rewritten)
  components/
    AppShell.tsx         ← rewrite
    Sidebar.tsx          ← rewrite
    Navbar.tsx           ← rewrite
    GlassCard.tsx        ← new
    MetricCard.tsx       ← new
    StatusBadge.tsx      ← new
    WorkerTypeBadge.tsx  ← new
    PaymentModal.tsx     ← rewrite
    ... (other existing components rewritten)
  lib/
    fonts.ts             ← new: JetBrains Mono + Inter setup
    animations.ts        ← new: shared Framer Motion variants
```

---

## 6. Dependencies to Add

```bash
npx shadcn@latest init
npx shadcn@latest add button input dialog tabs switch select textarea badge skeleton sonner
```

No additional npm packages needed beyond shadcn (framer-motion, recharts, lucide-react already installed).
