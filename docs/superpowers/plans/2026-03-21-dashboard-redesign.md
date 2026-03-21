# Dashboard Redesign — Command Center Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the dashboard and sidebar to a Command Center visual style — always-dark slate sidebar, dark header band with gold hero metric, and restructured KPI cards.

**Architecture:** Three file changes — `layout.tsx` (add DM Sans font), `Sidebar.tsx` (always-dark redesign), `dashboard/page.tsx` + `DashboardCards.tsx` (new layout and data). No new routes, no new data fetching patterns.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS, Framer Motion, Lucide React, next/font/google, Supabase

**Spec:** `docs/superpowers/specs/2026-03-21-dashboard-redesign-design.md`

---

## File Map

| Action | File | What changes |
|---|---|---|
| Modify | `src/app/layout.tsx` | Add DM Sans font alongside Inter |
| Modify | `src/components/Sidebar.tsx` | Always-dark slate, gold active state, correct nav groups |
| Modify | `src/app/dashboard/page.tsx` | Add advances + expenses + employee list queries; new JSX layout |
| Replace | `src/app/dashboard/components/DashboardCards.tsx` | Full rewrite to Command Center layout |

---

## Task 1: Add DM Sans Font

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Add DM Sans import**

In `src/app/layout.tsx`, replace:
```tsx
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'] })
```
With:
```tsx
import { Inter, DM_Sans } from 'next/font/google'
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })
```

- [ ] **Step 2: Apply both font variables to body**

Change `<body className={inter.className}>` to:
```tsx
<body className={`${inter.variable} ${dmSans.variable} font-sans`}>
```

- [ ] **Step 3: Add CSS variables to tailwind config**

In `tailwind.config.ts` (or `tailwind.config.js`), add to `theme.extend.fontFamily`:
```js
fontFamily: {
  sans: ['var(--font-inter)', 'sans-serif'],
  display: ['var(--font-dm-sans)', 'sans-serif'],
},
```

- [ ] **Step 4: Verify dev server starts without error**

```bash
cd C:/Users/Lenovo/.gemini/antigravity/scratch/payroll-app
npm run dev
```
Expected: No font-related errors in console.

- [ ] **Step 5: Commit**
```bash
git add src/app/layout.tsx tailwind.config.ts
git commit -m "feat: add DM Sans font variable for dashboard redesign"
```

---

## Task 2: Redesign Sidebar

**Files:**
- Modify: `src/components/Sidebar.tsx`

**Context:** Current sidebar is `bg-white dark:bg-gray-900`. New sidebar is always `#1C2333`. Framer Motion active animations (`layoutId="sidebar-active-bg"` and `layoutId="sidebar-active-dot"`) are retained. A new 3px gold left bar span is added inside each active link.

- [ ] **Step 1: Replace the outer container class**

Find:
```tsx
<div className="flex h-full w-64 flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
```
Replace with:
```tsx
<div className="flex h-full w-64 flex-col border-r border-white/[0.06]" style={{ backgroundColor: '#1C2333' }}>
```

- [ ] **Step 2: Update brand header**

Find the brand header block (the div containing the logo square and "PayrollApp" span). Replace:
```tsx
<div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-gray-100 dark:border-gray-700">
  <div className="flex items-center gap-2.5">
    <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-content shadow-sm">
      <span className="text-white text-sm font-black">P</span>
    </div>
    <span className="font-bold text-gray-900 dark:text-white text-[15px] tracking-tight">PayrollApp</span>
  </div>
```
With:
```tsx
<div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-white/[0.06]">
  <div className="flex items-center gap-2.5">
    <div className="h-8 w-8 rounded-lg flex items-center justify-center shadow-sm" style={{ backgroundColor: '#D4A847' }}>
      <span className="text-sm font-black" style={{ color: '#1C2333' }}>P</span>
    </div>
    <span className="font-bold text-white text-[15px] tracking-tight">PayrollApp</span>
  </div>
```

- [ ] **Step 3: Update the onClose button**

Find the close button inside the brand header. Replace its className:
```tsx
className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
```
And its icon: `<X className="h-4 w-4" style={{ color: '#6B7A99' }} />`

- [ ] **Step 4: Update nav group label style**

Find:
```tsx
<p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
```
Replace with:
```tsx
<p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#6B7A99', letterSpacing: '0.08em' }}>
```

- [ ] **Step 5: Update active link styles + add 3px left bar**

Find the active link className:
```tsx
className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
  isActive
    ? 'text-indigo-700 dark:text-indigo-400'
    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
}`}
```
Replace with:
```tsx
className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
  isActive
    ? ''
    : 'hover:bg-white/[0.04]'
}`}
style={{ color: isActive ? '#D4A847' : '#6B7A99' }}
```

After the existing `{isActive && <motion.span layoutId="sidebar-active-bg" ... />}` block, add:
```tsx
{isActive && (
  <span
    className="absolute"
    style={{
      left: 0,
      top: '50%',
      transform: 'translateY(-50%)',
      width: '3px',
      height: '20px',
      backgroundColor: '#D4A847',
      borderRadius: '2px',
      zIndex: 1,
    }}
  />
)}
```

- [ ] **Step 6: Update active icon color**

Find:
```tsx
className={`relative h-[18px] w-[18px] flex-shrink-0 transition-colors ${
  isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
}`}
```
Replace with:
```tsx
className="relative h-[18px] w-[18px] flex-shrink-0 transition-colors"
style={{ color: isActive ? '#D4A847' : '#6B7A99' }}
```

- [ ] **Step 7: Update sidebar footer border + theme toggle + sign out**

Find:
```tsx
<div className="border-t border-gray-100 dark:border-gray-700 p-3 space-y-0.5">
```
Replace with:
```tsx
<div className="border-t border-white/[0.06] p-3 space-y-0.5">
```

Theme toggle button — replace className:
```tsx
className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-white/[0.04] transition-all"
style={{ color: '#6B7A99' }}
```
And its icon: `<ThemeIcon className="h-[18px] w-[18px] transition-colors" style={{ color: '#6B7A99' }} />`

Sign Out button — replace className:
```tsx
className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-red-500/10 hover:text-red-400 transition-all"
style={{ color: '#6B7A99' }}
```
And its icon: `<LogOut className="h-[18px] w-[18px] group-hover:text-red-400 transition-colors" style={{ color: '#6B7A99' }} />`

- [ ] **Step 8: Verify sidebar renders correctly**

Open the app in the browser. Check:
- Sidebar is always dark (does not change in light/dark mode)
- Active "Dashboard" item has gold text, gold left bar, and animated background
- All 5 nav groups visible: Overview, Workforce, Commission, Payroll, Account
- Theme toggle and Sign Out present in footer

- [ ] **Step 9: Commit**
```bash
git add src/components/Sidebar.tsx
git commit -m "feat: redesign sidebar to always-dark Command Center style"
```

---

## Task 3: Expand Dashboard Data Fetching

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Context:** Current page fetches employee counts and today's attendance. New design needs: advances total, expenses total, employee list (top 4), and payment counts. All via existing Supabase tables.

- [ ] **Step 1: Add advances + expenses queries to the Promise.all**

In `page.tsx`, extend the `Promise.all` to include:
```tsx
supabase.from('advances').select('amount', { count: 'exact' }).eq('company_id', companyId).eq('status', 'outstanding'),
supabase.from('expenses').select('amount').eq('company_id', companyId).gte('date', `${currentMonth}-01`),
supabase.from('employees').select('id, name, worker_type').eq('company_id', companyId).eq('is_active', true).order('name').limit(4),
```

Destructure as:
```tsx
{ data: advancesData, count: advancesCount },
{ data: expensesData },
{ data: topEmployees },
```

- [ ] **Step 2: Compute derived values**

After the Promise.all:
```tsx
const totalAdvances = advancesData?.reduce((sum, a) => sum + (a.amount ?? 0), 0) ?? 0
const totalExpenses = expensesData?.reduce((sum, e) => sum + (e.amount ?? 0), 0) ?? 0
const currentMonthLabel = new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
```

- [ ] **Step 3: Pass new props to the new dashboard component**

Replace the return JSX (removing old `<DashboardCards>` call) with:
```tsx
return (
  <DashboardNew
    month={currentMonthLabel}
    totalEmployees={totalEmployees ?? 0}
    salaryEmployees={salaryEmployees ?? 0}
    commissionEmployees={commissionEmployees ?? 0}
    dailyEmployees={dailyEmployees ?? 0}
    todaysAttendance={todaysAttendance ?? 0}
    totalAdvances={totalAdvances}
    advancesCount={advancesCount ?? 0}
    totalExpenses={totalExpenses}
    topEmployees={topEmployees ?? []}
  />
)
```

Also update the import:
```tsx
import DashboardNew from './components/DashboardNew'
```

- [ ] **Step 4: Commit**
```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: expand dashboard data fetching for Command Center layout"
```

---

## Task 4: Build DashboardNew Component

**Files:**
- Create: `src/app/dashboard/components/DashboardNew.tsx`
- (Old `DashboardCards.tsx` is left in place until confirmed unused — do not delete yet)

**Context:** This is the full new UI. Uses `font-display` (DM Sans) for numbers, Tailwind for layout, inline styles for the exact design tokens.

- [ ] **Step 1: Create the component file**

Create `src/app/dashboard/components/DashboardNew.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Users, CalendarCheck, Banknote, Receipt,
  ClipboardList, CalendarDays, FileText, WalletCards,
  TrendingUp, Plus,
} from 'lucide-react'

interface Props {
  month: string
  totalEmployees: number
  salaryEmployees: number
  commissionEmployees: number
  dailyEmployees: number
  todaysAttendance: number
  totalAdvances: number
  advancesCount: number
  totalExpenses: number
  topEmployees: { id: string; name: string; worker_type: string }[]
}

const fmt = (n: number) =>
  '₨ ' + n.toLocaleString('en-PK')

const typeColor: Record<string, { bg: string; text: string; label: string }> = {
  salaried:   { bg: '#EEF2FF', text: '#4338CA', label: 'Salaried' },
  commission: { bg: '#FFF8ED', text: '#92400E', label: 'Commission' },
  daily:      { bg: '#F0FDF4', text: '#166534', label: 'Daily' },
}

const initials = (name: string) =>
  name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

export default function DashboardNew({
  month, totalEmployees, salaryEmployees, commissionEmployees,
  dailyEmployees, todaysAttendance, totalAdvances, advancesCount,
  totalExpenses, topEmployees,
}: Props) {
  const attendanceRate = totalEmployees > 0
    ? Math.round((todaysAttendance / totalEmployees) * 100)
    : 0

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#F7F6F3' }}>

      {/* ── Header Band ── */}
      <div className="px-8 pt-8 pb-6" style={{ backgroundColor: '#1C2333' }}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#6B7A99', letterSpacing: '0.1em' }}>
              {month}
            </p>
            <h1 className="font-display text-4xl font-extrabold text-white" style={{ letterSpacing: '-0.5px' }}>
              Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <Link
              href="/reports"
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#D4A847', color: '#1C2333' }}
            >
              <FileText className="h-4 w-4" />
              View Reports
            </Link>
          </div>
        </div>

        {/* Hero metrics */}
        <div className="flex items-center gap-10 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#6B7A99' }}>
              Active Employees
            </p>
            <p className="font-display font-extrabold leading-none" style={{ fontSize: '52px', color: '#D4A847', letterSpacing: '-1.5px' }}>
              {totalEmployees}
            </p>
          </div>
          <div className="w-px h-12 self-center" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#6B7A99' }}>
              Present Today
            </p>
            <p className="font-display font-bold text-white leading-none" style={{ fontSize: '32px', letterSpacing: '-0.5px' }}>
              {todaysAttendance} <span className="text-lg font-normal" style={{ color: '#6B7A99' }}>/ {totalEmployees}</span>
            </p>
          </div>
          <div className="w-px h-12 self-center" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#6B7A99' }}>
              Advances Outstanding
            </p>
            <p className="font-display font-bold text-white leading-none" style={{ fontSize: '32px', letterSpacing: '-0.5px' }}>
              {fmt(totalAdvances)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 p-8 flex flex-col gap-6">

        {/* KPI Cards Row */}
        <motion.div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
        >
          {/* Employees */}
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
            <div className="rounded-2xl p-6 flex flex-col gap-4 border" style={{ backgroundColor: '#fff', borderColor: '#EDECEA' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Total Employees</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F3F0E8' }}>
                  <Users className="h-4 w-4" style={{ color: '#D4A847' }} />
                </div>
              </div>
              <div>
                <p className="font-display font-extrabold leading-none" style={{ fontSize: '40px', color: '#1A1F36', letterSpacing: '-1px' }}>{totalEmployees}</p>
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Active this month</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs font-medium px-2.5 py-1 rounded-md" style={{ backgroundColor: '#EEF2FF', color: '#4338CA' }}>● {salaryEmployees} Salaried</span>
                <span className="text-xs font-medium px-2.5 py-1 rounded-md" style={{ backgroundColor: '#FFF8ED', color: '#92400E' }}>● {commissionEmployees} Commission</span>
                <span className="text-xs font-medium px-2.5 py-1 rounded-md" style={{ backgroundColor: '#F0FDF4', color: '#166534' }}>● {dailyEmployees} Daily</span>
              </div>
            </div>
          </motion.div>

          {/* Attendance */}
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
            <div className="rounded-2xl p-6 flex flex-col gap-4 border" style={{ backgroundColor: '#fff', borderColor: '#EDECEA' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Attendance Today</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F0FDF4' }}>
                  <CalendarCheck className="h-4 w-4" style={{ color: '#22C55E' }} />
                </div>
              </div>
              <div>
                <p className="font-display font-extrabold leading-none" style={{ fontSize: '40px', color: '#1A1F36', letterSpacing: '-1px' }}>
                  {todaysAttendance} <span className="text-xl font-normal" style={{ color: '#9CA3AF' }}>/ {totalEmployees}</span>
                </p>
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Present · {totalEmployees - todaysAttendance} absent</p>
              </div>
              <div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
                  <div className="h-full rounded-full" style={{ width: `${attendanceRate}%`, backgroundColor: '#22C55E' }} />
                </div>
                <p className="text-xs mt-1.5" style={{ color: '#9CA3AF' }}>{attendanceRate}% attendance rate</p>
              </div>
            </div>
          </motion.div>

          {/* Advances */}
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
            <div className="rounded-2xl p-6 flex flex-col gap-4 border" style={{ backgroundColor: '#fff', borderColor: '#EDECEA' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Advances Outstanding</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFF8ED' }}>
                  <Banknote className="h-4 w-4" style={{ color: '#D4A847' }} />
                </div>
              </div>
              <div>
                <p className="font-display font-extrabold leading-none" style={{ fontSize: '36px', color: '#1A1F36', letterSpacing: '-1px' }}>{fmt(totalAdvances)}</p>
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Across {advancesCount} employees</p>
              </div>
              <Link href="/advances" className="text-xs font-medium px-2.5 py-1 rounded-md self-start" style={{ backgroundColor: '#FFF3CD', color: '#92400E' }}>
                View advances →
              </Link>
            </div>
          </motion.div>

          {/* Expenses */}
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
            <div className="rounded-2xl p-6 flex flex-col gap-4 border" style={{ backgroundColor: '#fff', borderColor: '#EDECEA' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Expenses This Month</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FEF2F2' }}>
                  <Receipt className="h-4 w-4" style={{ color: '#EF4444' }} />
                </div>
              </div>
              <div>
                <p className="font-display font-extrabold leading-none" style={{ fontSize: '36px', color: '#1A1F36', letterSpacing: '-1px' }}>{fmt(totalExpenses)}</p>
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>This month</p>
              </div>
              <Link href="/expenses" className="text-xs font-medium px-2.5 py-1 rounded-md self-start" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
                View expenses →
              </Link>
            </div>
          </motion.div>
        </motion.div>

        {/* Bottom Row */}
        <div className="flex gap-4 flex-col lg:flex-row">

          {/* Employee List */}
          <div className="flex-[2] rounded-2xl border overflow-hidden" style={{ backgroundColor: '#fff', borderColor: '#EDECEA' }}>
            <div className="flex items-center justify-between px-6 py-4">
              <h2 className="font-display font-bold text-base" style={{ color: '#1A1F36' }}>Employee Overview</h2>
              <Link href="/employees" className="text-xs font-medium" style={{ color: '#D4A847' }}>View all →</Link>
            </div>
            <div className="flex px-6 pb-2 border-b" style={{ borderColor: '#F3F4F6' }}>
              <span className="flex-[2] text-xs font-semibold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>Employee</span>
              <span className="flex-1 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>Type</span>
            </div>
            {topEmployees.length === 0 && (
              <p className="px-6 py-4 text-sm" style={{ color: '#9CA3AF' }}>No employees found.</p>
            )}
            {topEmployees.map((emp) => {
              const t = typeColor[emp.worker_type] ?? typeColor.salaried
              return (
                <div key={emp.id} className="flex items-center px-6 py-3 border-b last:border-0" style={{ borderColor: '#F9FAFB' }}>
                  <div className="flex-[2] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold" style={{ backgroundColor: t.bg, color: t.text }}>
                      {initials(emp.name)}
                    </div>
                    <span className="text-sm font-medium" style={{ color: '#1A1F36' }}>{emp.name}</span>
                  </div>
                  <div className="flex-1 flex justify-center">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-md" style={{ backgroundColor: t.bg, color: t.text }}>{t.label}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick Actions */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="rounded-2xl border p-5 flex flex-col gap-3" style={{ backgroundColor: '#fff', borderColor: '#EDECEA' }}>
              <h2 className="font-display font-bold text-base" style={{ color: '#1A1F36' }}>Quick Actions</h2>
              <Link href="/attendance" className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: '#1C2333', color: '#fff' }}>
                <CalendarCheck className="h-4 w-4" style={{ color: '#D4A847' }} /> Mark Attendance
              </Link>
              <Link href="/daily-attendance" className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium" style={{ backgroundColor: '#F7F6F3', borderColor: '#EDECEA', color: '#374151' }}>
                <CalendarDays className="h-4 w-4 text-gray-400" /> Daily Attendance
              </Link>
              <Link href="/work-entries" className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium" style={{ backgroundColor: '#F7F6F3', borderColor: '#EDECEA', color: '#374151' }}>
                <ClipboardList className="h-4 w-4 text-gray-400" /> Log Work Entry
              </Link>
              <Link href="/expenses" className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium" style={{ backgroundColor: '#F7F6F3', borderColor: '#EDECEA', color: '#374151' }}>
                <Receipt className="h-4 w-4 text-gray-400" /> Add Expense
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the component renders**

Visit `/dashboard` in the browser. Check:
- Dark header band with employee count in gold
- 4 KPI cards with real data
- Employee list shows top employees
- Quick Actions panel present

- [ ] **Step 3: Remove old DashboardCards import from page.tsx (already replaced in Task 3)**

Confirm `page.tsx` no longer imports `DashboardCards`. The old file can be kept or deleted — it's no longer used.

- [ ] **Step 4: Check responsiveness**

Resize browser to mobile width. Verify:
- KPI cards stack to 1 column
- Bottom row stacks vertically
- Header band text doesn't overflow

- [ ] **Step 5: Commit**
```bash
git add src/app/dashboard/components/DashboardNew.tsx src/app/dashboard/page.tsx
git commit -m "feat: build Command Center dashboard layout with real data"
```

---

## Task 5: Final Polish & Cleanup

- [ ] **Step 1: Update page title metadata**

In `src/app/layout.tsx`, update `theme-color` from `#4f46e5` to `#1C2333`:
```tsx
other: { 'theme-color': '#1C2333' },
```

- [ ] **Step 2: Remove old DashboardCards.tsx if confirmed unused**
```bash
# Only run if DashboardCards is no longer imported anywhere
git rm src/app/dashboard/components/DashboardCards.tsx
```

- [ ] **Step 3: Final visual check**

Open app. Verify end-to-end:
1. Sidebar: always dark, gold active indicator on Dashboard, all 5 groups present
2. Header band: dark, gold hero number, present/absent counts
3. KPI cards: 4 cards with real Supabase data
4. Employee list: shows real employees
5. Quick Actions: all links navigate correctly

- [ ] **Step 4: Final commit**
```bash
git add -A
git commit -m "feat: dashboard Command Center redesign complete"
```
