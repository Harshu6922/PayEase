# PayEase Full App Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign all 21 screens of PayEase with a dark glass morphism aesthetic — `#0F0A1E` background, `#7C3AED` purple primary, shadcn/ui + Framer Motion — mobile-first, responsive, professional.

**Architecture:** Stitch MCP generates visual HTML/CSS designs for every screen. Those designs are then translated into Next.js + Tailwind + shadcn/ui + Framer Motion. Shared design tokens in `tailwind.config.ts` + `globals.css`. Reusable primitives (`GlassCard`, `MetricCard`, `StatusBadge`, `WorkerTypeBadge`) built first. Shared layout rewired second. Screens implemented batch by batch — each screen starts with a Stitch generation step.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, Recharts, lucide-react, **Stitch MCP** (visual design generation)

**Stitch Workflow per screen:**
1. `mcp__stitch__generate_screen_from_text` — generate HTML/CSS visual design from prompt
2. `mcp__stitch__get_screen` — retrieve the generated design output
3. Use the Stitch HTML/CSS as the pixel-accurate visual reference when writing Next.js code
4. Translate layout, spacing, colors, and component structure from Stitch into Tailwind classes

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/app/globals.css` | Modify | Dark base styles, remove light theme vars |
| `src/app/layout.tsx` | Modify | JetBrains Mono, dark class, remove DM Sans |
| `tailwind.config.ts` | Modify | Design tokens (colors, fonts) |
| `src/lib/animations.ts` | Create | Shared Framer Motion variants |
| `src/lib/hooks/useCountUp.ts` | Create | Animated number counter hook |
| `src/components/GlassCard.tsx` | Create | Reusable glass morphism card wrapper |
| `src/components/MetricCard.tsx` | Create | KPI card with animated counter + icon |
| `src/components/StatusBadge.tsx` | Create | Paid/Pending/Partial/Present/Absent badges |
| `src/components/WorkerTypeBadge.tsx` | Create | Salaried/Daily/Commission badges |
| `src/components/Sidebar.tsx` | Rewrite | Dark sidebar with nav groups, remove theme toggle |
| `src/components/AppShell.tsx` | Rewrite | Sidebar + bottom tab bar + mobile drawer |
| `src/components/Navbar.tsx` | Rewrite | Mobile top bar (hamburger + logo + avatar) |
| `src/components/TrialBanner.tsx` | Restyle | Dark glass banner |
| `src/components/InstallPrompt.tsx` | Restyle | Dark glass install prompt |
| `src/components/AddEmployeeModal.tsx` | Create | Add employee dialog |
| `src/components/PaymentModal.tsx` | Rewrite | Payment breakdown dialog |
| `src/app/page.tsx` | Rewrite | Landing page (7 sections) |
| `src/app/login/page.tsx` | Rewrite | Google OAuth login |
| `src/app/onboarding/page.tsx` | Rewrite | Company name setup |
| `src/app/dashboard/page.tsx` | Rewrite | Metrics + payroll table |
| `src/app/employees/page.tsx` | Rewrite | Employee grid + search |
| `src/app/daily-attendance/page.tsx` | Rewrite | Daily attendance toggler |
| `src/app/attendance/page.tsx` | Rewrite | Calendar + summary |
| `src/app/work-entries/page.tsx` | Rewrite | Commission work logging |
| `src/app/commission/page.tsx` | Rewrite | Commission items manager |
| `src/app/advances/page.tsx` | Rewrite | Advances per employee |
| `src/app/advance-repayments/page.tsx` | Rewrite | Repayment history table |
| `src/app/payments/page.tsx` | Rewrite | Payments list |
| `src/app/expenses/page.tsx` | Rewrite | Expense tracker |
| `src/app/reports/page.tsx` | Rewrite | PDF/CSV export |
| `src/app/charts/page.tsx` | Rewrite | Recharts analytics |
| `src/app/billing/page.tsx` | Rewrite | Subscription plans |
| `src/app/settings/page.tsx` | Rewrite | Profile/company/viewers/referral |
| `src/app/contact/page.tsx` | Rewrite | Support form |
| `src/app/viewer/page.tsx` | Rewrite | Read-only dashboard |
| `src/app/signup/` | Delete | Replaced by Google OAuth |
| `src/app/attendance/summary/` | Delete | Merged into `/attendance` |

---

## Task 0: Stitch Project + Design System Setup

**Files:** None (Stitch cloud project — save returned IDs for use in all subsequent screen tasks)

- [ ] **Step 1: Create Stitch project**

Call `mcp__stitch__create_project` with:
```json
{ "title": "PayEase Redesign" }
```
**Save the returned `projectId`** — needed for every subsequent Stitch call.

- [ ] **Step 2: Create design system**

Call `mcp__stitch__create_design_system` with:
```json
{
  "designSystem": {
    "displayName": "PayEase Dark",
    "theme": {
      "colorMode": "DARK",
      "customColor": "#7C3AED",
      "overridePrimaryColor": "#7C3AED",
      "overrideSecondaryColor": "#A855F7",
      "overrideNeutralColor": "#1A1035",
      "headlineFont": "INTER",
      "bodyFont": "INTER",
      "roundness": "ROUND_TWELVE",
      "colorVariant": "VIBRANT",
      "designMd": "Dark glass morphism SaaS app. Background: #0F0A1E. Surface cards: bg-white/5 with backdrop-blur and border border-[#7C3AED]/20. Primary: #7C3AED. Accent: #A855F7. Currency values in gold: #D4A847. Success green: #10B981. Warning amber: #F59E0B. Danger red: #EF4444. Muted text: #7B7A8E. All cards use rounded-xl with subtle purple glow on hover. Buttons use whileTap scale animation. Indian payroll SaaS — rupee symbol ₹ on all currency values."
    }
  }
}
```
**Save the returned design system `assetId`** — needed for `apply_design_system` calls.

- [ ] **Step 3: Update design system** (required by Stitch after create)

Call `mcp__stitch__update_design_system` immediately after Step 2 with the same payload to apply it to the project.

- [ ] **Step 4: Record IDs**

Save both values — you'll use them in every screen task:
- `STITCH_PROJECT_ID` = (from Step 1)
- `STITCH_DS_ASSET_ID` = (from Step 2)

---

## Task 1: Install shadcn/ui

**Files:**
- Modify: `components.json` (created by shadcn init)
- Modify: `tailwind.config.ts`
- Create: `src/components/ui/` (shadcn components)

- [ ] **Step 1: Run shadcn init**

```bash
cd C:/Users/Lenovo/.gemini/antigravity/scratch/payroll-app
npx shadcn@latest init
```

When prompted: choose **Dark** theme, **CSS variables** style, default component path `src/components/ui`.

- [ ] **Step 2: Add all required shadcn components**

```bash
npx shadcn@latest add button input dialog tabs switch select textarea badge skeleton sonner
```

- [ ] **Step 3: Verify components exist**

```bash
ls src/components/ui/
```

Expected: `button.tsx`, `input.tsx`, `dialog.tsx`, `tabs.tsx`, `switch.tsx`, `select.tsx`, `textarea.tsx`, `badge.tsx`, `skeleton.tsx`, `sonner.tsx`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: install shadcn/ui with dark theme"
```

---

## Task 2: Design Tokens — Tailwind + Globals

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace `tailwind.config.ts` theme.extend**

Replace the entire file content:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0F0A1E',
        surface: '#1A1035',
        'surface-elevated': '#221445',
        primary: { DEFAULT: '#7C3AED', light: '#A855F7' },
        'rupee-gold': '#D4A847',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        text: { DEFAULT: '#F1F0F5' },
        'text-muted': '#7B7A8E',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 2: Replace `src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #0F0A1E;
  --foreground: #F1F0F5;
}

body {
  background: #0F0A1E;
  color: #F1F0F5;
  font-family: var(--font-inter), sans-serif;
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
  .font-mono-nums {
    font-family: var(--font-jetbrains-mono), 'JetBrains Mono', monospace;
    font-variant-numeric: tabular-nums;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.ts src/app/globals.css
git commit -m "feat: add PayEase dark design tokens to Tailwind"
```

---

## Task 3: Update layout.tsx — Fonts + Dark Mode

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Rewrite `layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import AppShell from '@/components/AppShell'
import { ThemeProvider } from 'next-themes'
import { Suspense } from 'react'
import TrialBanner from '@/components/TrialBanner'
import InstallPrompt from '@/components/InstallPrompt'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'PayEase',
  description: 'Manage employees, attendance, and payroll efficiently',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PayEase',
  },
  other: {
    'theme-color': '#0F0A1E',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans bg-background text-text`}>
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
          <AppShell banner={<Suspense fallback={null}><TrialBanner /></Suspense>}>
            {children}
          </AppShell>
          <InstallPrompt />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Start dev server and verify dark background loads**

```bash
npm run dev
```

Open `http://localhost:3000` — background should be `#0F0A1E` (very dark purple-black). No white flash.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: add JetBrains Mono, force dark mode, remove DM Sans"
```

---

## Task 4: Delete Deprecated Routes

**Files:**
- Delete: `src/app/signup/`
- Delete: `src/app/attendance/summary/`

- [ ] **Step 1: Delete signup route**

```bash
rm -rf C:/Users/Lenovo/.gemini/antigravity/scratch/payroll-app/src/app/signup
```

- [ ] **Step 2: Delete attendance/summary route**

```bash
rm -rf C:/Users/Lenovo/.gemini/antigravity/scratch/payroll-app/src/app/attendance/summary
```

- [ ] **Step 3: Update AppShell auth check** — the existing `AppShell.tsx` has `pathname === '/signup'` in its `isAuthPage` check. Open `src/components/AppShell.tsx` and remove `/signup` from that line. (Full rewrite happens in Task 7, but this prevents a crash now.)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete signup and attendance/summary routes"
```

---

## Task 5: Shared Animation Utilities

**Files:**
- Create: `src/lib/animations.ts`
- Create: `src/lib/hooks/useCountUp.ts`

- [ ] **Step 1: Create `src/lib/animations.ts`**

```ts
import { Variants } from 'framer-motion'

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

export const springScaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 25 },
  },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
}
```

- [ ] **Step 2: Create `src/lib/hooks/useCountUp.ts`**

```ts
'use client'

import { useEffect, useState } from 'react'

export function useCountUp(target: number, duration = 1000): number {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    // Respect prefers-reduced-motion
    if (typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCurrent(target)
      return
    }

    if (target === 0) { setCurrent(0); return }

    const startTime = performance.now()
    let rafId: number

    const tick = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(eased * target))
      if (progress < 1) rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [target, duration])

  return current
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/animations.ts src/lib/hooks/useCountUp.ts
git commit -m "feat: add Framer Motion variants and useCountUp hook"
```

---

## Task 6: Primitive UI Components

**Files:**
- Create: `src/components/GlassCard.tsx`
- Create: `src/components/MetricCard.tsx`
- Create: `src/components/StatusBadge.tsx`
- Create: `src/components/WorkerTypeBadge.tsx`

- [ ] **Step 1: Create `src/components/GlassCard.tsx`**

```tsx
import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export default function GlassCard({ children, className, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-xl',
        'transition-all duration-200',
        'hover:shadow-[0_0_20px_rgba(124,58,237,0.15)] hover:border-[#7C3AED]/50',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Create `src/components/MetricCard.tsx`**

```tsx
'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { useCountUp } from '@/lib/hooks/useCountUp'
import { fadeInUp } from '@/lib/animations'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string
  value: number
  prefix?: string
  suffix?: string
  icon: LucideIcon
  valueClassName?: string
  formatValue?: (n: number) => string
}

export default function MetricCard({
  label, value, prefix = '', suffix = '',
  icon: Icon, valueClassName, formatValue,
}: MetricCardProps) {
  const animated = useCountUp(value)
  const display = formatValue ? formatValue(animated) : `${prefix}${animated.toLocaleString('en-IN')}${suffix}`

  return (
    <motion.div
      variants={fadeInUp}
      className="backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-xl p-4 md:p-6 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#7B7A8E]">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary-light" />
        </div>
      </div>
      <span className={cn('text-2xl font-bold font-mono', valueClassName)}>
        {display}
      </span>
    </motion.div>
  )
}
```

- [ ] **Step 3: Create `src/components/StatusBadge.tsx`**

```tsx
import { cn } from '@/lib/utils'

type Status = 'Paid' | 'Pending' | 'Partial' | 'Present' | 'Absent' | 'Half-Day' | 'OT'

const styles: Record<Status, string> = {
  Paid:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Pending:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Partial:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Present:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Absent:    'bg-red-500/10 text-red-400 border-red-500/20',
  'Half-Day':'bg-amber-500/10 text-amber-400 border-amber-500/20',
  OT:        'bg-blue-500/10 text-blue-400 border-blue-500/20',
}

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
      styles[status]
    )}>
      {status}
    </span>
  )
}
```

- [ ] **Step 4: Create `src/components/WorkerTypeBadge.tsx`**

```tsx
import { cn } from '@/lib/utils'

type WorkerType = 'Salaried' | 'Daily' | 'Commission'

const styles: Record<WorkerType, string> = {
  Salaried:   'bg-violet-500/10 text-violet-300 border-violet-500/20',
  Daily:      'bg-sky-500/10 text-sky-300 border-sky-500/20',
  Commission: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
}

export default function WorkerTypeBadge({ type }: { type: WorkerType }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
      styles[type]
    )}>
      {type}
    </span>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/GlassCard.tsx src/components/MetricCard.tsx src/components/StatusBadge.tsx src/components/WorkerTypeBadge.tsx
git commit -m "feat: add GlassCard, MetricCard, StatusBadge, WorkerTypeBadge primitives"
```

---

## Task 7: Rewrite Sidebar

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Rewrite `src/components/Sidebar.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Users, Banknote, RotateCcw, Receipt, CalendarDays,
  CalendarCheck, ClipboardList, Tag, FileText, TrendingUp, CreditCard,
  Settings, MessageCircle, LogOut, X, WalletCards,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const navigation = [
  {
    group: 'Main',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Employees', href: '/employees', icon: Users },
    ],
  },
  {
    group: 'Payroll',
    items: [
      { name: 'Payments', href: '/payments', icon: WalletCards },
      { name: 'Advances', href: '/advances', icon: Banknote },
      { name: 'Repayments', href: '/advance-repayments', icon: RotateCcw },
      { name: 'Expenses', href: '/expenses', icon: Receipt },
    ],
  },
  {
    group: 'Attendance',
    items: [
      { name: 'Daily', href: '/daily-attendance', icon: CalendarDays },
      { name: 'Calendar', href: '/attendance', icon: CalendarCheck },
    ],
  },
  {
    group: 'Work',
    items: [
      { name: 'Work Entries', href: '/work-entries', icon: ClipboardList },
      { name: 'Commission', href: '/commission', icon: Tag },
    ],
  },
  {
    group: 'Reports',
    items: [
      { name: 'Charts', href: '/charts', icon: TrendingUp },
      { name: 'Reports', href: '/reports', icon: FileText },
    ],
  },
  {
    group: 'Account',
    items: [
      { name: 'Billing', href: '/billing', icon: CreditCard },
      { name: 'Settings', href: '/settings', icon: Settings },
      { name: 'Contact', href: '/contact', icon: MessageCircle },
    ],
  },
]

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex h-full w-60 flex-col bg-[#1A1035] border-r border-[#7C3AED]/10">
      {/* Brand */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-[#7C3AED]/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#A855F7] flex items-center justify-center font-bold text-white text-sm">
            P
          </div>
          <span className="font-bold text-[#F1F0F5] text-sm tracking-tight">PayEase</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#7C3AED]/10 text-[#7B7A8E] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {navigation.map((section) => (
          <div key={section.group}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-[#7B7A8E]">
              {section.group}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive ? 'text-[#A855F7]' : 'text-[#7B7A8E] hover:text-[#F1F0F5] hover:bg-[#7C3AED]/10'
                    }`}
                  >
                    {isActive && (
                      <>
                        <motion.span
                          layoutId="sidebar-active-bg"
                          className="absolute inset-0 rounded-lg bg-[#7C3AED]/10"
                          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                        />
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#7C3AED] rounded-r-full" />
                      </>
                    )}
                    <Icon className="relative h-[18px] w-[18px] flex-shrink-0" />
                    <span className="relative">{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#7C3AED]/10 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#7B7A8E] hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: rewrite Sidebar with dark glass theme, remove theme toggle"
```

---

## Task 8: Rewrite AppShell + Navbar

**Files:**
- Modify: `src/components/AppShell.tsx`
- Modify: `src/components/Navbar.tsx`

- [ ] **Step 1: Rewrite `src/components/Navbar.tsx`**

```tsx
'use client'

import { Menu } from 'lucide-react'

interface NavbarProps {
  onMenuClick: () => void
  companyName?: string
}

export default function Navbar({ onMenuClick, companyName = 'PayEase' }: NavbarProps) {
  return (
    <header className="md:hidden flex items-center justify-between px-4 h-14 bg-[#1A1035] border-b border-[#7C3AED]/10 shrink-0">
      <button
        onClick={onMenuClick}
        className="p-2 rounded-lg text-[#7B7A8E] hover:bg-[#7C3AED]/10 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#7C3AED] to-[#A855F7] flex items-center justify-center font-bold text-white text-xs">
          P
        </div>
        <span className="font-bold text-[#F1F0F5] text-sm">{companyName}</span>
      </div>
      <div className="w-8 h-8 rounded-full bg-[#7C3AED]/20 flex items-center justify-center text-[#A855F7] text-xs font-bold">
        U
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Rewrite `src/components/AppShell.tsx`**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, CalendarDays, WalletCards, Settings,
} from 'lucide-react'
import Link from 'next/link'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

const bottomTabs = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Employees', href: '/employees', icon: Users },
  { name: 'Attendance', href: '/daily-attendance', icon: CalendarDays },
  { name: 'Payroll', href: '/payments', icon: WalletCards },
  { name: 'Settings', href: '/settings', icon: Settings },
]

const PUBLIC_PATHS = ['/', '/login', '/onboarding']

export default function AppShell({
  children,
  banner,
}: {
  children: React.ReactNode
  banner?: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const isPublic = PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/viewer')
  if (isPublic) return <>{children}</>

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="relative z-50 flex h-full w-60 flex-col shadow-2xl"
            >
              <Sidebar onClose={() => setSidebarOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {banner}
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile bottom tab bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#1A1035] border-t border-[#7C3AED]/10 flex">
          {bottomTabs.map((tab) => {
            const isActive = pathname === tab.href ||
              (tab.href !== '/dashboard' && pathname.startsWith(tab.href))
            const Icon = tab.icon
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-[#A855F7]' : 'text-[#7B7A8E]'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-[#7C3AED]' : ''}`} />
                {tab.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify in browser** — navigate to `/dashboard`. Desktop: dark sidebar visible. Mobile (DevTools responsive): bottom tab bar visible, no sidebar.

- [ ] **Step 4: Commit**

```bash
git add src/components/AppShell.tsx src/components/Navbar.tsx
git commit -m "feat: rewrite AppShell and Navbar with dark glass theme + bottom tab bar"
```

---

## Task 9: Restyle TrialBanner + InstallPrompt

**Files:**
- Modify: `src/components/TrialBanner.tsx`
- Modify: `src/components/InstallPrompt.tsx`

- [ ] **Step 1: Read `src/components/TrialBanner.tsx`** to check current content:

```bash
cat src/components/TrialBanner.tsx
```

If it returns null (current state), no visual change is needed — leave as-is. If it renders visible UI, restyle any visible elements to:
- Container: `bg-[#1A1035] border-b border-[#7C3AED]/20 px-4 py-2`
- Text: `text-sm text-[#7B7A8E]`, accent text `text-[#A855F7]`
- CTA button: `bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold px-3 py-1 rounded-lg`

- [ ] **Step 2: Read and restyle `src/components/InstallPrompt.tsx`**

Read the file first:
```bash
cat src/components/InstallPrompt.tsx
```

Then restyle any visible elements to use `bg-[#1A1035] border border-[#7C3AED]/20` glass card style, ghost dismiss button (`text-[#7B7A8E] hover:text-[#F1F0F5]`).

- [ ] **Step 3: Commit**

```bash
git add src/components/TrialBanner.tsx src/components/InstallPrompt.tsx
git commit -m "feat: restyle TrialBanner and InstallPrompt for dark theme"
```

---

## Task 10: Landing Page (`/`)

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Generate landing page in Stitch**

Call `mcp__stitch__generate_screen_from_text` with:
```json
{
  "projectId": "STITCH_PROJECT_ID",
  "deviceType": "DESKTOP",
  "modelId": "GEMINI_3_1_PRO",
  "prompt": "PayEase payroll SaaS landing page. Dark background #0F0A1E. Sticky glass nav: logo 'P' in purple gradient square + 'PayEase' brand name, nav links (Features, How it works, Pricing, Contact), Sign In link + 'Start Free Trial' purple CTA button. Hero section: two large animated radial purple blur orbs, headline 'Payroll, Simplified.' with 'Simplified' in purple gradient text, subheading 'Manage employees, track attendance, and run payroll in minutes', two CTA buttons side by side, small footnote 'No credit card required'. Stats band below hero: dark bg, 3 animated counters (500+ Businesses, ₹2Cr+ Processed Monthly, 14 Day Free Trial). Features section: 6 glass cards in 3-col grid each with purple icon, bold title, description text. How it works section: 3-step vertical timeline with SVG purple connector line, numbered dark squares. Testimonials: 3 glass cards with star ratings and customer quotes. Pricing: 3 plan cards on dark bg, middle 'Growth' plan has purple glow border and 'Most Popular' badge. Final CTA section with large heading. Footer with logo and links."
}
```

- [ ] **Step 2: Get Stitch landing page design**

Call `mcp__stitch__get_screen` with the screen name returned from Step 1. Study the generated HTML/CSS for layout, spacing, and visual details.

- [ ] **Step 3: Rewrite `src/app/page.tsx`** using Stitch output as the visual reference:

```tsx
'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { motion, useScroll, useTransform } from 'framer-motion'
import { fadeInUp, staggerContainer, springScaleIn } from '@/lib/animations'
import { useCountUp } from '@/lib/hooks/useCountUp'
import GlassCard from '@/components/GlassCard'
import {
  Users, CalendarCheck, FileText, Banknote, BarChart2,
  Eye, ArrowRight, Check, Zap,
} from 'lucide-react'

// ── Stats counter component (triggers on scroll) ──────────────────────
function StatCounter({ target, label, prefix = '', suffix = '' }: {
  target: number; label: string; prefix?: string; suffix?: string
}) {
  const count = useCountUp(target, 1500)
  return (
    <motion.div variants={fadeInUp} className="text-center">
      <div className="text-3xl font-bold font-mono text-[#D4A847]">
        {prefix}{count.toLocaleString('en-IN')}{suffix}
      </div>
      <div className="text-sm text-[#7B7A8E] mt-1">{label}</div>
    </motion.div>
  )
}

// ── "How it works" SVG connector ──────────────────────────────────────
function AnimatedConnector() {
  const ref = useRef<SVGSVGElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const pathLength = useTransform(scrollYProgress, [0, 0.6], [0, 1])
  return (
    <svg ref={ref} className="absolute left-5 top-12 h-[calc(100%-3rem)] w-0.5" viewBox="0 0 2 200" preserveAspectRatio="none">
      <motion.path d="M1 0 L1 200" stroke="#7C3AED" strokeWidth="2" fill="none"
        style={{ pathLength }} strokeLinecap="round" />
    </svg>
  )
}

const features = [
  { icon: Users, title: 'All Worker Types', desc: 'Salaried, daily wage, and commission-based employees — all in one place.' },
  { icon: CalendarCheck, title: 'Attendance Tracking', desc: 'Log daily attendance with overtime and deduction calculations automatically.' },
  { icon: Banknote, title: 'Advance Management', desc: 'Track employee advances and auto-deduct from salary during payroll.' },
  { icon: FileText, title: 'Instant PDF Payslips', desc: 'Generate professional payslips and payroll reports with one click.' },
  { icon: Eye, title: 'Viewer Access', desc: 'Give read-only access to your CA, manager, or business partner securely.' },
  { icon: BarChart2, title: 'Payroll Analytics', desc: 'Visual charts for salary trends, attendance patterns, and monthly summaries.' },
]

const testimonials = [
  { quote: 'Payroll used to take me half a day every month. Now it\'s done in 15 minutes.', name: 'Rajesh Verma', role: 'Factory Owner, Ludhiana', initial: 'R' },
  { quote: 'Managing daily wage workers was a nightmare before. PayEase tracks everything automatically.', name: 'Sunita Patel', role: 'Garment Business, Surat', initial: 'S' },
  { quote: 'The PDF payslips are exactly what I needed to share with my CA every month.', name: 'Mohan Das', role: 'Retail Shop, Delhi', initial: 'M' },
]

const plans = [
  { name: 'Starter', price: '₹299', employees: '5 employees', features: ['Payroll processing', 'Attendance tracking', 'PDF payslips', 'Email support'], popular: false },
  { name: 'Growth', price: '₹499', employees: '15 employees', features: ['Everything in Starter', 'Advances & repayments', 'Analytics & charts', 'Viewer access', 'Priority support'], popular: true },
  { name: 'Business', price: '₹999', employees: 'Unlimited', features: ['Everything in Growth', 'Commission workers', 'Expense tracking', 'Custom reports', 'Dedicated support'], popular: false },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-[#F1F0F5]">

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#0F0A1E]/80 border-b border-[#7C3AED]/10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#A855F7] flex items-center justify-center font-bold text-white text-sm">P</div>
            <span className="font-bold text-[#F1F0F5]">PayEase</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'How it works', 'Pricing', 'Contact'].map(link => (
              <a key={link} href={`#${link.toLowerCase().replace(' ', '-')}`} className="text-sm text-[#7B7A8E] hover:text-[#F1F0F5] transition-colors">{link}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-[#7B7A8E] hover:text-[#F1F0F5] transition-colors">Sign in</Link>
            <Link href="/login" className="text-sm font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-4 py-2 rounded-lg transition-colors">
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-10 overflow-hidden">
        {/* Orbs */}
        <motion.div animate={{ y: [0, -30, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-20 left-1/4 w-96 h-96 rounded-full bg-[#7C3AED]/20 blur-3xl pointer-events-none" />
        <motion.div animate={{ y: [0, 20, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-20 right-1/4 w-80 h-80 rounded-full bg-[#A855F7]/15 blur-3xl pointer-events-none" />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="relative text-center max-w-3xl"
        >
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 bg-[#7C3AED]/10 border border-[#7C3AED]/30 text-[#A855F7] text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
            <Zap className="w-3 h-3" /> Built for Indian businesses
          </motion.div>
          <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6">
            Payroll,{' '}
            <span className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] bg-clip-text text-transparent">
              Simplified.
            </span>
          </motion.h1>
          <motion.p variants={fadeInUp} className="text-lg text-[#7B7A8E] max-w-xl mx-auto mb-8 leading-relaxed">
            Manage employees, track attendance, and run payroll in minutes — not hours. Built for factories, shops, and growing Indian businesses.
          </motion.p>
          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
            <motion.div whileTap={{ scale: 0.97 }}>
              <Link href="/login" className="inline-flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold px-6 py-3 rounded-xl transition-colors">
                Start Free Trial <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
            <motion.div whileTap={{ scale: 0.97 }}>
              <a href="#how-it-works" className="inline-flex items-center gap-2 border border-[#7C3AED]/30 text-[#F1F0F5] font-semibold px-6 py-3 rounded-xl hover:bg-[#7C3AED]/10 transition-colors">
                See How It Works
              </a>
            </motion.div>
          </motion.div>
          <motion.p variants={fadeInUp} className="text-xs text-[#7B7A8E]">No credit card required · 14-day free trial</motion.p>
        </motion.div>
      </section>

      {/* ── Stats band ──────────────────────────────────────────────── */}
      <section className="bg-[#0F0A1E] border-y border-[#7C3AED]/10 py-12">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-3xl mx-auto px-4 flex flex-col sm:flex-row justify-center gap-12"
        >
          <StatCounter target={500} label="Businesses" suffix="+" />
          <StatCounter target={2} label="Crore processed monthly" prefix="₹" suffix="Cr+" />
          <StatCounter target={14} label="Day free trial" suffix=" days" />
        </motion.div>
      </section>

      {/* ── Features ────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} className="text-center mb-14">
            <motion.p variants={fadeInUp} className="text-xs font-bold uppercase tracking-widest text-[#7C3AED] mb-3">Features</motion.p>
            <motion.h2 variants={fadeInUp} className="text-4xl font-black tracking-tight mb-4">Everything you need to run payroll</motion.h2>
            <motion.p variants={fadeInUp} className="text-[#7B7A8E] max-w-md mx-auto">One platform for all your payroll needs — no spreadsheets, no manual calculations.</motion.p>
          </motion.div>
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, desc }) => (
              <motion.div key={title} variants={fadeInUp}>
                <GlassCard className="p-6 h-full">
                  <div className="w-10 h-10 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-[#A855F7]" />
                  </div>
                  <h3 className="font-bold text-[#F1F0F5] mb-2">{title}</h3>
                  <p className="text-sm text-[#7B7A8E] leading-relaxed">{desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-4 bg-[#1A1035]/40">
        <div className="max-w-2xl mx-auto">
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-14">
            <motion.p variants={fadeInUp} className="text-xs font-bold uppercase tracking-widest text-[#7C3AED] mb-3">How it works</motion.p>
            <motion.h2 variants={fadeInUp} className="text-4xl font-black tracking-tight">Up and running in minutes</motion.h2>
          </motion.div>
          <div className="relative">
            <AnimatedConnector />
            <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-10 pl-14">
              {[
                { num: '01', title: 'Add Your Employees', desc: 'Set up employee profiles with salary, worker type, and working hours in minutes.' },
                { num: '02', title: 'Log Attendance Daily', desc: 'Mark attendance, overtime, and deductions. Works on mobile too.' },
                { num: '03', title: 'Generate Payslips', desc: 'One click to calculate and export payroll PDFs for the entire team.' },
              ].map((step) => (
                <motion.div key={step.num} variants={fadeInUp} className="flex gap-5 items-start">
                  <div className="w-10 h-10 rounded-xl bg-[#1A1035] border border-[#7C3AED]/30 flex items-center justify-center font-bold text-[#7C3AED] text-sm flex-shrink-0">
                    {step.num}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#F1F0F5] mb-1">{step.title}</h3>
                    <p className="text-sm text-[#7B7A8E] leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-14">
            <motion.p variants={fadeInUp} className="text-xs font-bold uppercase tracking-widest text-[#7C3AED] mb-3">Trusted by businesses</motion.p>
            <motion.h2 variants={fadeInUp} className="text-4xl font-black tracking-tight">What our customers say</motion.h2>
          </motion.div>
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <motion.div key={t.name} variants={fadeInUp}>
                <GlassCard className="p-6 flex flex-col gap-4 h-full">
                  <div className="text-[#D4A847] text-sm tracking-widest">★★★★★</div>
                  <p className="text-sm text-[#F1F0F5] italic leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
                  <div className="flex items-center gap-3 pt-3 border-t border-[#7C3AED]/10">
                    <div className="w-8 h-8 rounded-full bg-[#7C3AED]/20 flex items-center justify-center text-[#A855F7] font-bold text-sm">{t.initial}</div>
                    <div>
                      <div className="text-sm font-semibold text-[#F1F0F5]">{t.name}</div>
                      <div className="text-xs text-[#7B7A8E]">{t.role}</div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-4 bg-[#0F0A1E]">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-14">
            <motion.p variants={fadeInUp} className="text-xs font-bold uppercase tracking-widest text-[#7C3AED] mb-3">Pricing</motion.p>
            <motion.h2 variants={fadeInUp} className="text-4xl font-black tracking-tight">Simple, transparent pricing</motion.h2>
          </motion.div>
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((plan) => (
              <motion.div key={plan.name} variants={fadeInUp} className="relative">
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#7C3AED] text-white text-xs font-bold px-4 py-1 rounded-full z-10">
                    Most Popular
                  </div>
                )}
                <div className={`backdrop-blur-md bg-white/5 rounded-xl p-6 border flex flex-col gap-4 h-full ${
                  plan.popular
                    ? 'border-[#7C3AED]/50 shadow-[0_0_30px_rgba(124,58,237,0.2)]'
                    : 'border-[#7C3AED]/20'
                }`}>
                  <div>
                    <p className="text-sm text-[#7B7A8E] font-medium">{plan.name}</p>
                    <p className={`text-4xl font-black font-mono mt-1 ${plan.popular ? 'text-[#A855F7]' : 'text-[#F1F0F5]'}`}>
                      {plan.price}<span className="text-sm font-normal text-[#7B7A8E]">/mo</span>
                    </p>
                    <p className="text-xs text-[#7B7A8E] mt-1">{plan.employees}</p>
                  </div>
                  <ul className="flex-1 space-y-2.5">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-[#7B7A8E]">
                        <Check className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Link href="/login" className={`block text-center py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      plan.popular
                        ? 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white'
                        : 'bg-[#7C3AED]/10 hover:bg-[#7C3AED]/20 text-[#A855F7] border border-[#7C3AED]/20'
                    }`}>
                      Get Started
                    </Link>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────── */}
      <section className="relative py-32 px-4 overflow-hidden">
        <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-64 bg-[#7C3AED]/15 blur-3xl rounded-full pointer-events-none" />
        <motion.div
          variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="relative text-center max-w-2xl mx-auto"
        >
          <motion.h2 variants={fadeInUp} className="text-5xl font-black tracking-tight mb-4">
            Ready to simplify payroll?
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-[#7B7A8E] mb-8">
            Join 500+ Indian businesses already using PayEase.
          </motion.p>
          <motion.div variants={fadeInUp} whileTap={{ scale: 0.97 }}>
            <Link href="/login" className="inline-flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors">
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
          <p className="text-xs text-[#7B7A8E] mt-4">No credit card required · 14-day free trial</p>
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-[#7C3AED]/10 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#7C3AED] to-[#A855F7] flex items-center justify-center font-bold text-white text-xs">P</div>
            <span className="font-bold text-[#F1F0F5] text-sm">PayEase</span>
          </div>
          <div className="flex gap-6">
            {['Features', 'Pricing', 'Contact'].map(l => (
              <a key={l} href="#" className="text-xs text-[#7B7A8E] hover:text-[#F1F0F5] transition-colors">{l}</a>
            ))}
          </div>
          <p className="text-xs text-[#7B7A8E]">© 2026 PayEase. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser** — `http://localhost:3000`. Dark bg, purple orbs, all sections render. Mobile view: single column.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: rewrite landing page with dark glass morphism design"
```

---

## Task 11: Login + Onboarding Pages

**Files:**
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/onboarding/page.tsx`

- [ ] **Step 1: Generate login + onboarding screens in Stitch** (run both in parallel)

Call `mcp__stitch__generate_screen_from_text` twice:

**Login:**
```json
{
  "projectId": "STITCH_PROJECT_ID",
  "deviceType": "MOBILE",
  "modelId": "GEMINI_3_1_PRO",
  "prompt": "PayEase login screen. Dark background #0F0A1E. Centered glass card (backdrop-blur, bg-white/5, border border-purple/20, rounded-2xl, max-w-sm). Large floating purple blur orb behind card. Inside card: PayEase 'P' logo mark (purple gradient square, 48px), heading 'Sign in to PayEase', tagline 'Your payroll, simplified.', single full-width 'Continue with Google' button with Google logo icon (outline style, dark), footnote 'No credit card required · 14-day free trial' in muted text."
}
```

**Onboarding:**
```json
{
  "projectId": "STITCH_PROJECT_ID",
  "deviceType": "MOBILE",
  "modelId": "GEMINI_3_1_PRO",
  "prompt": "PayEase onboarding screen. Dark background #0F0A1E. Centered glass card (backdrop-blur, bg-white/5, border border-purple/20, rounded-2xl). Purple orb blur in background. Inside: PayEase 'P' logo mark, heading 'Welcome to PayEase', subtitle 'Let us set up your company first.', label 'Company name', dark styled text input with placeholder 'e.g. Verma Industries', full-width 'Get Started' button in purple with arrow icon, disabled state when input empty."
}
```

- [ ] **Step 2: Get both Stitch screens** via `mcp__stitch__get_screen`. Use the generated layouts as visual reference.

- [ ] **Step 3: Read existing `src/app/login/page.tsx`** to understand current Google OAuth handler, then rewrite the UI only (preserve logic):

```tsx
'use client'

import { motion } from 'framer-motion'
import { springScaleIn } from '@/lib/animations'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      {/* Orb */}
      <motion.div
        animate={{ y: [0, -25, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#7C3AED]/20 blur-3xl rounded-full pointer-events-none"
      />

      <motion.div
        variants={springScaleIn}
        initial="hidden"
        animate="visible"
        className="relative w-full max-w-sm"
      >
        <div className="backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-2xl p-8 flex flex-col items-center gap-6">
          {/* Logo */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#A855F7] flex items-center justify-center font-black text-white text-xl">
            P
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#F1F0F5]">Sign in to PayEase</h1>
            <p className="text-sm text-[#7B7A8E] mt-1">Your payroll, simplified.</p>
          </div>

          {/* Google button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white/10 hover:bg-white/15 border border-[#7C3AED]/20 text-[#F1F0F5] font-semibold py-3 px-4 rounded-xl transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </motion.button>

          <p className="text-xs text-[#7B7A8E]">No credit card required · 14-day free trial</p>
        </div>
      </motion.div>
    </div>
  )
}
```

- [ ] **Step 2: Read existing `src/app/onboarding/page.tsx`** first:

```bash
cat src/app/onboarding/page.tsx
```

Preserve the existing `handleSubmit` / company save logic (Supabase insert). Then rewrite the UI around it:

```tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { springScaleIn } from '@/lib/animations'
import { ArrowRight } from 'lucide-react'
// preserve existing onboarding submit logic — import as needed

export default function OnboardingPage() {
  const [company, setCompany] = useState('')
  // preserve existing handleSubmit logic

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <motion.div
        animate={{ y: [0, -25, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-72 bg-[#7C3AED]/20 blur-3xl rounded-full pointer-events-none"
      />
      <motion.div
        variants={springScaleIn}
        initial="hidden"
        animate="visible"
        className="relative w-full max-w-sm"
      >
        <div className="backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-2xl p-8 flex flex-col gap-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#A855F7] flex items-center justify-center font-black text-white text-xl">P</div>
          <div>
            <h1 className="text-2xl font-bold text-[#F1F0F5]">Welcome to PayEase</h1>
            <p className="text-sm text-[#7B7A8E] mt-1">Let&apos;s set up your company first.</p>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#7B7A8E]">Company name</label>
            <input
              value={company}
              onChange={e => setCompany(e.target.value)}
              placeholder="e.g. Verma Industries"
              className="w-full bg-white/5 border border-[#7C3AED]/20 text-[#F1F0F5] placeholder:text-[#7B7A8E]/50 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#7C3AED]/50 transition-colors"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={!company.trim()}
            className="w-full flex items-center justify-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/login/page.tsx src/app/onboarding/page.tsx
git commit -m "feat: rewrite Login and Onboarding pages with dark glass design"
```

---

## Task 12: Dashboard Page

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Generate dashboard in Stitch**

Call `mcp__stitch__generate_screen_from_text` with:
```json
{
  "projectId": "STITCH_PROJECT_ID",
  "deviceType": "DESKTOP",
  "modelId": "GEMINI_3_1_PRO",
  "prompt": "PayEase payroll dashboard. Dark background #0F0A1E. Top bar: left company name in muted text, center month selector with left/right chevron arrows and 'March 2026' label, right user avatar circle. Below: 4 metric cards in a row (glass morphism, backdrop-blur, border purple/20): 'Total Payable' with wallet icon and large gold ₹82,000 value, 'Paid' with checkmark icon and green ₹45,000 value, 'Remaining' with clock icon and purple ₹37,000 value, 'Employees' with users icon and white 12 value. Below metrics: dark glass table with columns Employee (avatar + name), Worker Type (colored badge: Salaried/Daily/Commission), Earned (mono font), Advance (mono muted), Net Payable (mono gold), Status (Paid/Pending/Partial badge), Pay button. 3 sample rows of data."
}
```

- [ ] **Step 2: Also generate mobile dashboard variant**

Call `mcp__stitch__generate_screen_from_text` with:
```json
{
  "projectId": "STITCH_PROJECT_ID",
  "deviceType": "MOBILE",
  "modelId": "GEMINI_3_1_PRO",
  "prompt": "PayEase dashboard mobile view. Dark background #0F0A1E. Month selector row at top. 2x2 grid of metric cards (glass, compact): Total Payable gold, Paid green, Remaining purple, Employees white. Below: stack of employee payroll cards each showing name + type badge + earned/advance/net in a 3-col row + status badge + Record Payment button full width."
}
```

- [ ] **Step 3: Get both Stitch screens** via `mcp__stitch__get_screen`. Use as visual reference for desktop table and mobile card layouts.

- [ ] **Step 4: Read existing `src/app/dashboard/page.tsx`** to understand data fetching pattern (Supabase calls, month state), then rewrite with new design preserving all data logic.

The UI wrapper should be:

```tsx
'use client'
// preserve all existing imports, state, data fetching

import { motion } from 'framer-motion'
import { staggerContainer, fadeInUp } from '@/lib/animations'
import MetricCard from '@/components/MetricCard'
import StatusBadge from '@/components/StatusBadge'
import WorkerTypeBadge from '@/components/WorkerTypeBadge'
import { Wallet, CheckCircle, Clock, Users, ChevronLeft, ChevronRight } from 'lucide-react'

// Inside the component JSX — merge new UI around existing data logic:
return (
  <div className="min-h-screen bg-background">
    {/* Desktop top bar */}
    <header className="hidden md:flex items-center justify-between px-6 py-4 border-b border-[#7C3AED]/10">
      <span className="text-sm text-[#7B7A8E]">{companyName}</span>
      <div className="flex items-center gap-3">
        <motion.button whileTap={{ scale: 0.9 }} onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-[#7C3AED]/10 text-[#7B7A8E] transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </motion.button>
        <span className="font-semibold text-[#F1F0F5] w-36 text-center text-sm">{monthLabel}</span>
        <motion.button whileTap={{ scale: 0.9 }} onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-[#7C3AED]/10 text-[#7B7A8E] transition-colors">
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>
      <div className="w-8 h-8 rounded-full bg-[#7C3AED]/20 flex items-center justify-center text-[#A855F7] text-xs font-bold">U</div>
    </header>
    {/* Mobile month selector */}
    <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[#7C3AED]/10">
      <motion.button whileTap={{ scale: 0.9 }} onClick={prevMonth} className="p-2 rounded-lg hover:bg-[#7C3AED]/10 text-[#7B7A8E]"><ChevronLeft className="w-4 h-4" /></motion.button>
      <span className="font-semibold text-[#F1F0F5] text-sm">{monthLabel}</span>
      <motion.button whileTap={{ scale: 0.9 }} onClick={nextMonth} className="p-2 rounded-lg hover:bg-[#7C3AED]/10 text-[#7B7A8E]"><ChevronRight className="w-4 h-4" /></motion.button>
    </div>
    <div className="p-4 md:p-6 space-y-6">
      {/* Metric cards */}
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Payable" value={totalPayable} icon={Wallet} valueClassName="text-[#D4A847]" formatValue={n => `₹${n.toLocaleString('en-IN')}`} />
        <MetricCard label="Paid" value={paid} icon={CheckCircle} valueClassName="text-[#10B981]" formatValue={n => `₹${n.toLocaleString('en-IN')}`} />
        <MetricCard label="Remaining" value={remaining} icon={Clock} valueClassName="text-[#A855F7]" formatValue={n => `₹${n.toLocaleString('en-IN')}`} />
        <MetricCard label="Employees" value={employeeCount} icon={Users} valueClassName="text-[#F1F0F5]" />
      </motion.div>

      {/* Payroll table — desktop */}
      <div className="hidden md:block backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#7C3AED]/10">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[#7B7A8E]">Employee</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[#7B7A8E]">Type</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[#7B7A8E]">Earned</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[#7B7A8E]">Advance</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[#7B7A8E]">Net Payable</th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[#7B7A8E]">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#7C3AED]/5">
            {employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-[#7C3AED]/5 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#7C3AED]/20 flex items-center justify-center text-[#A855F7] text-xs font-bold flex-shrink-0">
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-[#F1F0F5]">{emp.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3"><WorkerTypeBadge type={emp.workerType} /></td>
                <td className="px-4 py-3 text-right font-mono text-sm text-[#F1F0F5]">₹{emp.earned.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-right font-mono text-sm text-[#7B7A8E]">₹{emp.advance.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-[#D4A847]">₹{emp.netPayable.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-center"><StatusBadge status={emp.paymentStatus} /></td>
                <td className="px-4 py-3">
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => openPayModal(emp)}
                    className="text-xs font-semibold bg-[#7C3AED]/10 hover:bg-[#7C3AED]/20 text-[#A855F7] border border-[#7C3AED]/20 px-3 py-1.5 rounded-lg transition-colors">
                    Pay
                  </motion.button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payroll cards — mobile */}
      <div className="md:hidden space-y-3">
        {employees.map((emp) => (
          <div key={emp.id} className="backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#7C3AED]/20 flex items-center justify-center text-[#A855F7] text-xs font-bold">
                  {emp.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#F1F0F5]">{emp.name}</p>
                  <WorkerTypeBadge type={emp.workerType} />
                </div>
              </div>
              <StatusBadge status={emp.paymentStatus} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center mb-3">
              <div><p className="text-xs text-[#7B7A8E]">Earned</p><p className="text-sm font-mono text-[#F1F0F5]">₹{emp.earned.toLocaleString('en-IN')}</p></div>
              <div><p className="text-xs text-[#7B7A8E]">Advance</p><p className="text-sm font-mono text-[#7B7A8E]">₹{emp.advance.toLocaleString('en-IN')}</p></div>
              <div><p className="text-xs text-[#7B7A8E]">Net</p><p className="text-sm font-mono font-semibold text-[#D4A847]">₹{emp.netPayable.toLocaleString('en-IN')}</p></div>
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => openPayModal(emp)}
              className="w-full py-2 text-xs font-semibold bg-[#7C3AED]/10 hover:bg-[#7C3AED]/20 text-[#A855F7] border border-[#7C3AED]/20 rounded-lg transition-colors">
              Record Payment
            </motion.button>
          </div>
        ))}
      </div>
    </div>
  </div>
)
```

Read the existing file carefully and merge the new UI structure around the existing data logic. Do not remove any Supabase queries or state.

- [ ] **Step 5: Verify in browser** — navigate to `/dashboard`. Metric cards animate on load, dark theme, gold rupee values.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: rewrite Dashboard with dark glass design and animated metric cards"
```

---

## Task 13: Employees Page + AddEmployeeModal

**Files:**
- Modify: `src/app/employees/page.tsx`
- Create: `src/components/AddEmployeeModal.tsx`

- [ ] **Step 1: Generate employees screen + modal in Stitch**

Call `mcp__stitch__generate_screen_from_text` twice:

**Employees list:**
```json
{
  "projectId": "STITCH_PROJECT_ID",
  "deviceType": "DESKTOP",
  "modelId": "GEMINI_3_1_PRO",
  "prompt": "PayEase employees page. Dark background #0F0A1E. Page header 'Employees'. Search input with search icon (dark glass style) + segmented filter control 'All / Salaried / Daily / Commission'. 3-column grid of employee glass cards: each card has avatar circle with initials (purple bg), employee name bold, phone number muted, worker type badge (Salaried=violet, Daily=sky, Commission=orange), join date small muted, 'View' link. Floating purple '+' FAB button bottom-right corner."
}
```

**Add Employee modal:**
```json
{
  "projectId": "STITCH_PROJECT_ID",
  "deviceType": "MOBILE",
  "modelId": "GEMINI_3_1_PRO",
  "prompt": "PayEase Add Employee modal dialog. Dark glass style (bg surface #1A1035, border purple/20, rounded-2xl). Title 'Add Employee'. Form fields: Full Name input, Phone input side by side. Worker Type segmented control (Salaried / Daily / Commission) — selected tab is solid purple. Monthly Salary input + OT Multiplier input side by side. Join Date input. Bottom row: Cancel ghost button + Add Employee solid purple button."
}
```

- [ ] **Step 2: Get both Stitch screens** and use as visual reference.

- [ ] **Step 3: Create `src/components/AddEmployeeModal.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { springScaleIn } from '@/lib/animations'

type WorkerType = 'Salaried' | 'Daily' | 'Commission'

interface AddEmployeeModalProps {
  open: boolean
  onClose: () => void
  onAdd: (data: {
    name: string; phone: string; type: WorkerType;
    salary: string; otMultiplier: string; joinDate: string
  }) => Promise<void>
}

export default function AddEmployeeModal({ open, onClose, onAdd }: AddEmployeeModalProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [type, setType] = useState<WorkerType>('Salaried')
  const [salary, setSalary] = useState('')
  const [otMultiplier, setOtMultiplier] = useState('1.5')
  const [joinDate, setJoinDate] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    await onAdd({ name, phone, type, salary, otMultiplier, joinDate })
    setLoading(false)
    onClose()
  }

  const inputClass = "w-full bg-white/5 border border-[#7C3AED]/20 text-[#F1F0F5] placeholder:text-[#7B7A8E]/50 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#7C3AED]/50 transition-colors"
  const labelClass = "text-xs font-medium text-[#7B7A8E] uppercase tracking-wide"

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1A1035] border border-[#7C3AED]/20 text-[#F1F0F5] max-w-md rounded-2xl p-0 overflow-hidden">
        <motion.div variants={springScaleIn} initial="hidden" animate="visible" className="p-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl font-bold text-[#F1F0F5]">Add Employee</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelClass}>Full Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Rahul Kumar" className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Phone</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210" className={inputClass} />
              </div>
            </div>

            {/* Worker type */}
            <div className="space-y-1.5">
              <label className={labelClass}>Worker Type</label>
              <div className="flex rounded-lg border border-[#7C3AED]/20 overflow-hidden">
                {(['Salaried', 'Daily', 'Commission'] as WorkerType[]).map(t => (
                  <button key={t} onClick={() => setType(t)}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${type === t ? 'bg-[#7C3AED] text-white' : 'text-[#7B7A8E] hover:bg-[#7C3AED]/10'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelClass}>{type === 'Daily' ? 'Daily Rate (₹)' : type === 'Commission' ? 'Base Salary (₹)' : 'Monthly Salary (₹)'}</label>
                <input value={salary} onChange={e => setSalary(e.target.value)} placeholder="15000" className={inputClass} />
              </div>
              {type !== 'Commission' && (
                <div className="space-y-1.5">
                  <label className={labelClass}>OT Multiplier</label>
                  <input value={otMultiplier} onChange={e => setOtMultiplier(e.target.value)} placeholder="1.5" className={inputClass} />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className={labelClass}>Join Date</label>
              <input type="date" value={joinDate} onChange={e => setJoinDate(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#7C3AED]/20 text-[#7B7A8E] hover:text-[#F1F0F5] text-sm font-medium transition-colors">
              Cancel
            </button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={loading || !name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 text-white text-sm font-semibold transition-colors">
              {loading ? 'Adding…' : 'Add Employee'}
            </motion.button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Read existing `src/app/employees/page.tsx`**, preserve data logic, rewrite UI using `GlassCard`, `WorkerTypeBadge`, and `AddEmployeeModal`.

- [ ] **Step 5: Commit**

```bash
git add src/components/AddEmployeeModal.tsx src/app/employees/page.tsx
git commit -m "feat: rewrite Employees page and AddEmployeeModal with dark glass design"
```

---

## Task 14: Daily Attendance + Attendance Calendar

**Files:**
- Modify: `src/app/daily-attendance/page.tsx`
- Modify: `src/app/attendance/page.tsx`

- [ ] **Step 1: Generate both attendance screens in Stitch**

**Daily Attendance:**
```json
{
  "projectId": "STITCH_PROJECT_ID",
  "deviceType": "MOBILE",
  "modelId": "GEMINI_3_1_PRO",
  "prompt": "PayEase daily attendance screen. Dark background #0F0A1E. Date navigation row: left chevron, 'Mon 27 Mar 2026' center, right chevron, 'Today' pill button. 'Mark All Present' ghost button top right. List of employee rows as glass cards: each row has avatar circle with initials, employee name, worker type badge, then a 3-pill attendance toggle (Present=green, Half-Day=amber, Absent=red — one is always selected), and OT hours number input visible only when Present selected. Sticky 'Save Attendance' solid purple button fixed at bottom."
}
```

**Attendance Calendar:**
```json
{
  "projectId": "STITCH_PROJECT_ID",
  "deviceType": "MOBILE",
  "modelId": "GEMINI_3_1_PRO",
  "prompt": "PayEase attendance calendar screen. Dark background #0F0A1E. Employee dropdown selector at top (dark glass style). Month navigation row with arrows. 7-column calendar grid: day cells showing date number + colored dot indicators (green dot=present, red=absent, amber=half-day, blue=OT). Color legend row below calendar with 4 dots and labels. 3 small glass summary cards at bottom: Total Present (green number), Total Absent (red number), Total OT (blue number)."
}
```

- [ ] **Step 2: Get both Stitch screens** and use as visual reference.

- [ ] **Step 3: Read both existing pages** to understand data fetching and state.

- [ ] **Step 4: Rewrite `src/app/daily-attendance/page.tsx`** — preserve all Supabase logic. New UI pattern:

```
Dark page wrapper.
Date header: flex row, ChevronLeft / [date string] / ChevronRight, "Today" pill button on right.
"Mark All Present" ghost button (top right of list header).
Employee list: each row is a GlassCard with p-4:
  - Left: avatar circle (initials, bg-primary/20) + name + WorkerTypeBadge
  - Right: 3-pill toggle (Present/Half/Absent) — active pill = bg-primary text-white, inactive = bg-white/5 text-muted
  - OT input: appears inline after toggle, only when Present
Sticky bottom bar (fixed bottom-20 md:bottom-0): "Save Attendance" full-width primary button.
```

- [ ] **Step 5: Rewrite `src/app/attendance/page.tsx`** — include the summary data that was in the now-deleted `/attendance/summary` route. New UI pattern:

```
Employee Select at top (shadcn Select, dark styled).
Month nav row.
7-column calendar grid: day cells with colored dot indicators.
Legend row: 4 dots + labels.
3 small GlassCards below: Total Present / Total Absent / Total OT (with useCountUp).
```

- [ ] **Step 6: Commit**

```bash
git add src/app/daily-attendance/page.tsx src/app/attendance/page.tsx
git commit -m "feat: rewrite Daily Attendance and Attendance Calendar pages"
```

---

## Task 15: Work Entries + Commission

**Files:**
- Modify: `src/app/work-entries/page.tsx`
- Modify: `src/app/commission/page.tsx`

- [ ] **Step 1: Generate both screens in Stitch**

**Work Entries:**
```json
{
  "projectId": "STITCH_PROJECT_ID",
  "deviceType": "MOBILE",
  "modelId": "GEMINI_3_1_PRO",
  "prompt": "PayEase work entries screen. Dark background #0F0A1E. Date navigation row + employee dropdown selector. List of commission items as glass rows: item name on left, numeric quantity input on right with unit label (e.g. 'pieces'). Sticky 'Save Entries' purple button at bottom."
}
```

**Commission:**
```json
{
  "projectId": "STITCH_PROJECT_ID",
  "deviceType": "DESKTOP",
  "modelId": "GEMINI_3_1_PRO",
  "prompt": "PayEase commission items manager. Dark background #0F0A1E. Header 'Commission Items' with 'Add Item' button top right. List of items as glass rows: item name, rate in monospace font (e.g. ₹12.50/piece), toggle switch for active/inactive, trash delete icon. One expanded inline add-item form at bottom: item name input + rate input + confirm/cancel buttons."
}
```

- [ ] **Step 2: Get both Stitch screens** and use as visual reference.

- [ ] **Step 3: Read both existing pages**, preserve data logic.

- [ ] **Step 4: Rewrite `src/app/work-entries/page.tsx`**:

```
Dark page. Date header + employee Select.
List of commission items: each row GlassCard p-4, item name left, numeric input right.
"Save Entries" button sticky bottom.
```

- [ ] **Step 5: Rewrite `src/app/commission/page.tsx`**:

```
Header row: "Commission Items" h1 + "Add Item" button (top right).
Item list: each row GlassCard p-4 → item name, font-mono rate, shadcn Switch, trash icon.
"Add Item" expands an inline form row (AnimatePresence height animation): item name + rate inputs + confirm/cancel.
```

- [ ] **Step 6: Commit**

```bash
git add src/app/work-entries/page.tsx src/app/commission/page.tsx
git commit -m "feat: rewrite Work Entries and Commission pages"
```

---

## Task 16: Advances + Advance Repayments

**Files:**
- Modify: `src/app/advances/page.tsx`
- Modify: `src/app/advance-repayments/page.tsx`

- [ ] **Step 1: Generate both screens in Stitch**

**Advances:**
```json
{
  "projectId": "STITCH_PROJECT_ID",
  "deviceType": "MOBILE",
  "modelId": "GEMINI_3_1_PRO",
  "prompt": "PayEase advances page. Dark background #0F0A1E. Page header 'Advances'. Grid of employee glass cards: each card shows employee name, large monospace outstanding balance in red if >0 or muted if zero, 'Give Advance' button. One card shows expanded inline form below the button: Amount input, Date input, Note input, Confirm button."
}
```

**Advance Repayments:**
```json
{
  "projectId": "STITCH_PROJECT_ID",
  "deviceType": "DESKTOP",
  "modelId": "GEMINI_3_1_PRO",
  "prompt": "PayEase advance repayments page. Dark background #0F0A1E. Table with glass header row: Employee, Advance Date, Original Amount (monospace), Total Repaid (monospace green), Outstanding (monospace red), History toggle button. One row is expanded showing a nested list of repayment records (date + amount each). Mobile: each advance as a stacked glass card."
}
```

- [ ] **Step 2: Get both Stitch screens** and use as visual reference.

- [ ] **Step 3: Read both existing pages**, preserve data logic.

- [ ] **Step 4: Rewrite `src/app/advances/page.tsx`**:

```
Per-employee GlassCards: name + outstanding balance (font-mono, text-danger if >0, text-muted if 0) + "Give Advance" button.
"Give Advance" expands inline form (AnimatePresence) with amount/date/note inputs + Confirm button.
```

- [ ] **Step 5: Rewrite `src/app/advance-repayments/page.tsx`**:

```
Table (desktop) / cards (mobile):
  Employee | Advance Date | Original (mono) | Repaid (mono) | Outstanding (mono, danger) | "History ▼" toggle
Expanded row shows list of repayment entries.
```

- [ ] **Step 6: Commit**

```bash
git add src/app/advances/page.tsx src/app/advance-repayments/page.tsx
git commit -m "feat: rewrite Advances and Advance Repayments pages"
```

---

## Task 17: Payments + PaymentModal + Expenses

**Files:**
- Modify: `src/app/payments/page.tsx`
- Modify: `src/components/PaymentModal.tsx`
- Modify: `src/app/expenses/page.tsx`

- [ ] **Step 1: Generate all three screens in Stitch**

**Payments list:**
```json
{
  "projectId": "STITCH_PROJECT_ID",
  "deviceType": "DESKTOP",
  "modelId": "GEMINI_3_1_PRO",
  "prompt": "PayEase payments page. Dark background #0F0A1E. Page header 'Payments'. List of employee rows as glass cards: avatar circle with initials, employee name, net payable in large gold monospace font (e.g. ₹14,500), status badge (Paid=green, Pending=amber, Partial=blue), 'Record Payment' button on right."
}
```

**Payment modal:**
```json
{
  "projectId": "STITCH_PROJECT_ID",
  "deviceType": "MOBILE",
  "modelId": "GEMINI_3_1_PRO",
  "prompt": "PayEase payment modal dialog. Dark glass surface #1A1035, border purple/20, rounded-2xl. Title 'Record Payment' + employee name. Breakdown section: rows for Earned Salary, OT Earned, Deductions, Advance Deducted — each label left + monospace amount right in muted text. Horizontal divider. Net Payable label + large gold monospace bold amount (e.g. ₹14,500). Below divider: Amount input pre-filled, Date input, Note textarea optional. 'Record Payment' full-width purple CTA button."
}
```

**Expenses:**
```json
{
  "projectId": "STITCH_PROJECT_ID",
  "deviceType": "MOBILE",
  "modelId": "GEMINI_3_1_PRO",
  "prompt": "PayEase expenses page. Dark background #0F0A1E. Glass summary card at top: 'March 2026 Expenses' label + large gold monospace total amount. 'Add Expense' button top right. List of expense rows: category badge (color-coded: Food=green, Travel=blue, Office=purple, etc.), description text, monospace amount right, date small muted, trash icon. Mobile: card layout."
}
```

- [ ] **Step 2: Get all three Stitch screens** and use as visual reference.

- [ ] **Step 3: Rewrite `src/components/PaymentModal.tsx`** — read existing file first, preserve submit logic:

```tsx
// shadcn Dialog + springScaleIn
// Breakdown rows: Earned / OT / Deductions / Advance Deducted — font-mono text-sm text-muted
// Divider
// Net Payable: text-2xl font-bold font-mono text-[#D4A847]
// Amount input (pre-filled), date input, note textarea
// "Record Payment" full-width primary button
```

- [ ] **Step 4: Rewrite `src/app/payments/page.tsx`** — employee rows with avatar + name + gold mono net payable + StatusBadge + "Record Payment" button opening PaymentModal.

- [ ] **Step 5: Rewrite `src/app/expenses/page.tsx`** — monthly total GlassCard (gold mono), expense list with category badges, "Add Expense" Dialog.

- [ ] **Step 6: Commit**

```bash
git add src/components/PaymentModal.tsx src/app/payments/page.tsx src/app/expenses/page.tsx
git commit -m "feat: rewrite Payments, PaymentModal, and Expenses pages"
```

---

## Task 18: Reports + Charts

**Files:**
- Modify: `src/app/reports/page.tsx`
- Modify: `src/app/charts/page.tsx`

- [ ] **Step 1: Generate both screens in Stitch**

**Reports:**
```json
{
  "projectId": "STITCH_PROJECT_ID",
  "deviceType": "DESKTOP",
  "modelId": "GEMINI_3_1_PRO",
  "prompt": "PayEase reports page. Dark background #0F0A1E. Page header 'Reports'. Two large glass action cards side by side: Left card 'Payslip PDFs' with document icon, month selector dropdown, employee multi-select (or All toggle), 'Download PDF' purple button with spinner state. Right card 'Export Payroll' with table icon, month selector, 'Export CSV' button. Both cards have animated purple border glow on hover."
}
```

**Charts:**
```json
{
  "projectId": "STITCH_PROJECT_ID",
  "deviceType": "DESKTOP",
  "modelId": "GEMINI_3_1_PRO",
  "prompt": "PayEase charts/analytics page. Dark background #0F0A1E. Tab navigation: 'Salary Trends / Attendance / Summary'. Salary Trends tab active: bar chart with purple bars, current month bar highlighted gold, x-axis months, y-axis rupee amounts. Dark chart background, white grid lines subtle. Custom dark tooltip with glass card style. Chart fills most of the page width."
}
```

- [ ] **Step 2: Get both Stitch screens** and use as visual reference.

- [ ] **Step 3: Rewrite `src/app/reports/page.tsx`** — two GlassCards side by side (stacked mobile): Payslip PDFs card + Export Payroll card. Preserve existing PDF generation logic from `@react-pdf/renderer`.

- [ ] **Step 4: Rewrite `src/app/charts/page.tsx`** — shadcn Tabs (Salary Trends / Attendance / Summary). Preserve existing Recharts data. Update chart colors to purple/gold theme:
  - BarChart: `fill="#7C3AED"`, current month `fill="#D4A847"`
  - LineChart: `stroke="#7C3AED"`
  - PieChart: `["#7C3AED", "#10B981", "#F59E0B"]`
  - Custom dark tooltip: `bg-[#1A1035] border border-[#7C3AED]/20 rounded-lg px-3 py-2`

- [ ] **Step 5: Commit**

```bash
git add src/app/reports/page.tsx src/app/charts/page.tsx
git commit -m "feat: rewrite Reports and Charts pages with dark purple theme"
```

---

## Task 19: Billing + Settings + Contact + Viewer

**Files:**
- Modify: `src/app/billing/page.tsx`
- Modify: `src/app/settings/page.tsx`
- Modify: `src/app/contact/page.tsx`
- Modify: `src/app/viewer/page.tsx`

- [ ] **Step 1: Generate all four screens in Stitch**

**Billing:**
```json
{
  "projectId": "STITCH_PROJECT_ID",
  "deviceType": "DESKTOP",
  "modelId": "GEMINI_3_1_PRO",
  "prompt": "PayEase billing page. Dark background #0F0A1E. Page header 'My Plan'. 3 plan cards in a row: Starter ₹299/mo (5 employees), Growth ₹499/mo (15 employees) with purple glow border and 'Most Popular' pill badge at top, Business ₹999/mo (Unlimited). Each card: plan name muted, large monospace price, employee limit, feature checklist with green checkmarks, CTA button (solid purple for popular, ghost for others). Current plan card has 'Current Plan' green badge."
}
```

**Settings:**
```json
{
  "projectId": "STITCH_PROJECT_ID",
  "deviceType": "DESKTOP",
  "modelId": "GEMINI_3_1_PRO",
  "prompt": "PayEase settings page. Dark background #0F0A1E. Page header 'Settings'. Stack of 4 glass section cards: 1) Profile — display name input + Save button. 2) Company — company name input + Save button. 3) Viewers — list of viewer email rows (email + role badge + Remove button) + Add Viewer inline form (email input + role select + Add button). 4) Referral — read-only code input in monospace + Copy button."
}
```

**Contact:**
```json
{
  "projectId": "STITCH_PROJECT_ID",
  "deviceType": "MOBILE",
  "modelId": "GEMINI_3_1_PRO",
  "prompt": "PayEase contact us page. Dark background #0F0A1E. Centered glass card max-w-lg. Heading 'Contact Us', subtitle 'We will get back to you within 24 hours'. Form: Name input, Email input, Message textarea 4 rows, Send Message purple button. Support email below form in muted text with mail icon."
}
```

**Viewer dashboard:**
```json
{
  "projectId": "STITCH_PROJECT_ID",
  "deviceType": "DESKTOP",
  "modelId": "GEMINI_3_1_PRO",
  "prompt": "PayEase viewer dashboard. Dark background #0F0A1E. Amber 'View Only' banner at very top with lock icon and text 'View Only — You have read-only access'. Below: same 4 metric cards as dashboard (Total Payable gold, Paid green, Remaining purple, Employees white). Payroll table without any action buttons or Pay buttons — all columns visible but last column removed. 'Powered by PayEase' small footer note."
}
```

- [ ] **Step 2: Get all four Stitch screens** and use as visual reference.

- [ ] **Step 3: Rewrite `src/app/billing/page.tsx`** — 3 plan GlassCards (same layout as landing pricing), current plan badge (success green), Growth plan glow border. Preserve Razorpay upgrade logic.

- [ ] **Step 4: Rewrite `src/app/settings/page.tsx`** — 4 stacked GlassCards (Profile, Company, Viewers, Referral). Preserve all Supabase save logic. Add shadcn Sonner toast on save. Referral "Copy" button uses `navigator.clipboard.writeText()`.

- [ ] **Step 5: Rewrite `src/app/contact/page.tsx`** — centered GlassCard (max-w-lg). Form: Name, Email, Message Textarea, Submit. On submit: AnimatePresence swaps form for success state (springScaleIn CheckCircle + "Message sent!"). Preserve existing form submit logic.

- [ ] **Step 6: Rewrite `src/app/viewer/page.tsx`** — reuse Dashboard UI structure. Add amber "View Only" banner at very top. Remove all action buttons. Add "Powered by PayEase" footer.

- [ ] **Step 7: Commit**

```bash
git add src/app/billing/page.tsx src/app/settings/page.tsx src/app/contact/page.tsx src/app/viewer/page.tsx
git commit -m "feat: rewrite Billing, Settings, Contact, and Viewer Dashboard pages"
```

---

## Task 20: Final Verification Pass

- [ ] **Step 1: Run dev server and walk all 21 routes**

```bash
npm run dev
```

Check each route in browser:
- [ ] `/` — Landing page, all sections, mobile hamburger nav
- [ ] `/login` — Glass card, Google button
- [ ] `/onboarding` — Company name form
- [ ] `/dashboard` — Metric cards animate, table renders
- [ ] `/employees` — Grid, FAB opens modal
- [ ] `/daily-attendance` — Attendance toggles, sticky save
- [ ] `/attendance` — Calendar grid, summary cards
- [ ] `/work-entries` — Item quantity inputs
- [ ] `/commission` — Items list, add inline
- [ ] `/advances` — Per-employee cards, expand form
- [ ] `/advance-repayments` — Table with history toggle
- [ ] `/payments` — List with PaymentModal
- [ ] `/expenses` — Monthly total + list
- [ ] `/reports` — Two action cards
- [ ] `/charts` — Tabs, Recharts in purple
- [ ] `/billing` — 3 plan cards
- [ ] `/settings` — 4 glass sections
- [ ] `/contact` — Form + success state
- [ ] `/viewer` — View Only banner, read-only

- [ ] **Step 2: Check mobile (DevTools responsive mode)**
  - Bottom tab bar visible on all app pages
  - Sidebar not visible on mobile
  - Cards stack correctly

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Fix any TypeScript or lint errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete PayEase dark glass morphism redesign — all 21 screens"
```
