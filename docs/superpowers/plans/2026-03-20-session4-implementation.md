# Session 4 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PWA installability, HTTP security headers, Supabase RLS, expense/payroll charts, dark mode, and multi-user role management to the payroll app.

**Architecture:** Five independent features implemented sequentially. Security SQL migration runs first (no code changes). PWA adds static files + metadata. Charts is a new isolated page using Recharts. Dark mode threads `dark:` Tailwind variants through all components via `next-themes`. Multi-user adds invite flow, settings page, and role-based UI enforcement.

**Tech Stack:** Next.js 14 App Router, Supabase (`@supabase/ssr` v0.3 — uses `get/set/remove` cookie API), Tailwind CSS, `next-themes`, `recharts`, `sharp` (dev), `date-fns` (already installed), lucide-react icons.

**No test framework in this project.** Each task uses `npm run build` to verify TypeScript correctness and manual browser checks.

---

## File Map

**New files:**
- `docs/superpowers/migrations/session4-rls.sql` — full RLS migration (run in Supabase SQL editor)
- `scripts/generate-icons.mjs` — one-off script to generate PWA icons
- `public/icons/icon-192.png`, `public/icons/icon-512.png` — PWA icons
- `src/app/apple-icon.png` — iOS touch icon
- `src/app/manifest.ts` — PWA manifest
- `src/app/charts/page.tsx` — charts server component
- `src/app/charts/ChartsView.tsx` — charts client component (Recharts)
- `src/app/auth/callback/route.ts` — Supabase magic link code exchange
- `src/app/onboarding/page.tsx` — new user company assignment
- `src/app/settings/page.tsx` — settings server component
- `src/app/settings/SettingsClient.tsx` — settings client component
- `src/app/settings/actions.ts` — server actions (invite, changeRole, removeMember)
- `.env.local.example` — env var documentation

**Modified files:**
- `next.config.mjs` — add security headers
- `tailwind.config.ts` — add `darkMode: 'class'`
- `src/app/layout.tsx` — ThemeProvider, suppressHydrationWarning, PWA metadata
- `src/middleware.ts` — exclude `/auth/callback` from auth guard
- `src/components/AppShell.tsx` — dark mode bg
- `src/components/Sidebar.tsx` — dark mode + theme toggle button + Charts/Settings links
- `src/components/PayrollDashboard.tsx` — dark mode
- `src/components/PaymentModal.tsx` — dark mode
- All feature page components (see Task 10–11) — dark mode `dark:` variants
- All page server components that render write actions — fetch + thread `userRole`

---

## Task 1: Security SQL Migration File

**Files:**
- Create: `docs/superpowers/migrations/session4-rls.sql`

- [ ] Create the migrations directory and SQL file:

```sql
-- ════════════════════════════════════════════════════════════
-- SESSION 4 RLS MIGRATION
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ════════════════════════════════════════════════════════════

-- ── 1. profiles: add CHECK constraint + full_name column ──
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'viewer'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- ── 2. Helper: get_my_role() — SECURITY DEFINER to avoid RLS recursion ──
-- Reading `role` from `profiles` inside a profiles RLS policy causes infinite
-- recursion. SECURITY DEFINER bypasses RLS and reads the row directly.
CREATE OR REPLACE FUNCTION get_my_role() RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_catalog;

-- ── 3. New tables: enable RLS + role-aware policies ──

-- payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_read"   ON payments FOR SELECT USING (company_id = get_my_company_id());
CREATE POLICY "payments_insert" ON payments FOR INSERT WITH CHECK (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "payments_update" ON payments FOR UPDATE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "payments_delete" ON payments FOR DELETE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');

-- advance_repayments
ALTER TABLE advance_repayments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "advance_repayments_read"   ON advance_repayments FOR SELECT USING (company_id = get_my_company_id());
CREATE POLICY "advance_repayments_insert" ON advance_repayments FOR INSERT WITH CHECK (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "advance_repayments_update" ON advance_repayments FOR UPDATE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "advance_repayments_delete" ON advance_repayments FOR DELETE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');

-- expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_read"   ON expenses FOR SELECT USING (company_id = get_my_company_id());
CREATE POLICY "expenses_insert" ON expenses FOR INSERT WITH CHECK (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "expenses_update" ON expenses FOR UPDATE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "expenses_delete" ON expenses FOR DELETE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');

-- expense_templates
ALTER TABLE expense_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expense_templates_read"   ON expense_templates FOR SELECT USING (company_id = get_my_company_id());
CREATE POLICY "expense_templates_insert" ON expense_templates FOR INSERT WITH CHECK (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "expense_templates_update" ON expense_templates FOR UPDATE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "expense_templates_delete" ON expense_templates FOR DELETE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');

-- ── 4. Existing tables: replace permissive ALL policies with split role-aware ones ──

-- employees
DROP POLICY IF EXISTS "Company admins manage employees" ON employees;
CREATE POLICY "employees_read"   ON employees FOR SELECT USING (company_id = get_my_company_id());
CREATE POLICY "employees_insert" ON employees FOR INSERT WITH CHECK (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "employees_update" ON employees FOR UPDATE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "employees_delete" ON employees FOR DELETE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');

-- attendance_records
DROP POLICY IF EXISTS "Company admins manage attendance" ON attendance_records;
CREATE POLICY "attendance_read"   ON attendance_records FOR SELECT USING (company_id = get_my_company_id());
CREATE POLICY "attendance_insert" ON attendance_records FOR INSERT WITH CHECK (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "attendance_update" ON attendance_records FOR UPDATE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "attendance_delete" ON attendance_records FOR DELETE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');

-- payroll_summaries
DROP POLICY IF EXISTS "Company admins manage payroll summaries" ON payroll_summaries;
CREATE POLICY "payroll_read"   ON payroll_summaries FOR SELECT USING (company_id = get_my_company_id());
CREATE POLICY "payroll_insert" ON payroll_summaries FOR INSERT WITH CHECK (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "payroll_update" ON payroll_summaries FOR UPDATE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "payroll_delete" ON payroll_summaries FOR DELETE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');

-- work_entries
DROP POLICY IF EXISTS "Company admins manage work entries" ON work_entries;
CREATE POLICY "work_entries_read"   ON work_entries FOR SELECT USING (company_id = get_my_company_id());
CREATE POLICY "work_entries_insert" ON work_entries FOR INSERT WITH CHECK (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "work_entries_update" ON work_entries FOR UPDATE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "work_entries_delete" ON work_entries FOR DELETE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');

-- employee_advances
DROP POLICY IF EXISTS "Company admins manage employee advances" ON employee_advances;
CREATE POLICY "advances_read"   ON employee_advances FOR SELECT USING (company_id = get_my_company_id());
CREATE POLICY "advances_insert" ON employee_advances FOR INSERT WITH CHECK (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "advances_update" ON employee_advances FOR UPDATE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "advances_delete" ON employee_advances FOR DELETE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');

-- daily_attendance
DROP POLICY IF EXISTS "Company admins manage daily attendance" ON daily_attendance;
CREATE POLICY "daily_attendance_read"   ON daily_attendance FOR SELECT USING (company_id = get_my_company_id());
CREATE POLICY "daily_attendance_insert" ON daily_attendance FOR INSERT WITH CHECK (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "daily_attendance_update" ON daily_attendance FOR UPDATE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "daily_attendance_delete" ON daily_attendance FOR DELETE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');

-- commission_items
DROP POLICY IF EXISTS "Company admins manage commission items" ON commission_items;
CREATE POLICY "commission_items_read"   ON commission_items FOR SELECT USING (company_id = get_my_company_id());
CREATE POLICY "commission_items_insert" ON commission_items FOR INSERT WITH CHECK (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "commission_items_update" ON commission_items FOR UPDATE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "commission_items_delete" ON commission_items FOR DELETE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');

-- agent_item_rates (no company_id column — join through employees)
DROP POLICY IF EXISTS "Company admins manage agent item rates" ON agent_item_rates;
CREATE POLICY "agent_rates_read"   ON agent_item_rates FOR SELECT
  USING (employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id()));
CREATE POLICY "agent_rates_insert" ON agent_item_rates FOR INSERT
  WITH CHECK (employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id()) AND get_my_role() = 'admin');
CREATE POLICY "agent_rates_update" ON agent_item_rates FOR UPDATE
  USING (employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id()) AND get_my_role() = 'admin');
CREATE POLICY "agent_rates_delete" ON agent_item_rates FOR DELETE
  USING (employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id()) AND get_my_role() = 'admin');

-- ── 5. companies ──
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
CREATE POLICY "companies_read"   ON companies FOR SELECT USING (id = get_my_company_id());
CREATE POLICY "companies_update" ON companies FOR UPDATE USING (id = get_my_company_id() AND get_my_role() = 'admin');

-- ── 6. profiles ──
-- profiles_read intentionally exposes all company members to each other
-- (required for the settings member list). The OR id = auth.uid() arm
-- covers the onboarding path where company_id is not yet set.
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "profiles_read" ON profiles FOR SELECT
  USING (company_id = get_my_company_id() OR id = auth.uid());

-- No INSERT policy: all profile inserts use the service-role client which bypasses RLS.
-- An INSERT policy would allow role/company spoofing.

-- WITH CHECK uses get_my_role() to prevent self-promotion without triggering recursion.
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = get_my_role());

-- Only admins can delete other members; cannot delete themselves.
CREATE POLICY "profiles_delete_member" ON profiles FOR DELETE
  USING (company_id = get_my_company_id() AND get_my_role() = 'admin' AND id != auth.uid());
```

- [ ] **Run the migration** — open Supabase Dashboard → SQL Editor → New Query → paste the full SQL above → Run. Verify no errors in the results panel.

- [ ] **Verify RLS is enabled** — in Supabase Dashboard → Table Editor → click any table → confirm "RLS enabled" badge appears.

- [ ] Commit:

```bash
git add docs/superpowers/migrations/session4-rls.sql
git commit -m "feat: add Session 4 RLS migration SQL"
```

---

## Task 2: HTTP Security Headers

**Files:**
- Modify: `next.config.mjs`

- [ ] Replace `next.config.mjs` with:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "connect-src 'self' *.supabase.co",
              "img-src 'self' data: blob:",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          { key: 'X-Frame-Options',          value: 'DENY' },
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ]
  },
}

export default nextConfig
```

- [ ] Verify: `npm run build` — should complete with no errors.

- [ ] Commit:

```bash
git add next.config.mjs
git commit -m "feat: add HTTP security headers"
```

---

## Task 3: PWA — Generate Icons

**Files:**
- Create: `scripts/generate-icons.mjs`
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png`, `src/app/apple-icon.png`

- [ ] Install sharp as a dev dependency:

```bash
npm install --save-dev sharp
```

- [ ] Create `scripts/generate-icons.mjs`:

```js
import sharp from 'sharp'
import { mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

await mkdir(join(root, 'public/icons'), { recursive: true })

// Indigo square with rounded corners and a bold 'P'
const svg = Buffer.from(`
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="80" fill="#4f46e5"/>
  <text x="256" y="370" font-family="Arial,sans-serif" font-size="320" font-weight="900"
        fill="white" text-anchor="middle">P</text>
</svg>`)

await sharp(svg).resize(192, 192).png().toFile(join(root, 'public/icons/icon-192.png'))
await sharp(svg).resize(512, 512).png().toFile(join(root, 'public/icons/icon-512.png'))
await sharp(svg).resize(180, 180).png().toFile(join(root, 'src/app/apple-icon.png'))
console.log('✓ Icons generated: public/icons/icon-192.png, public/icons/icon-512.png, src/app/apple-icon.png')
```

- [ ] Run the script:

```bash
node scripts/generate-icons.mjs
```

Expected output: `✓ Icons generated: public/icons/icon-192.png, public/icons/icon-512.png, src/app/apple-icon.png`

- [ ] Verify the files exist:

```bash
ls public/icons/
# should list: icon-192.png  icon-512.png
ls src/app/apple-icon.png
```

- [ ] Commit:

```bash
git add scripts/generate-icons.mjs public/icons/ src/app/apple-icon.png
git commit -m "feat: add PWA icons"
```

---

## Task 4: PWA — Manifest + Layout Metadata

**Files:**
- Create: `src/app/manifest.ts`
- Modify: `src/app/layout.tsx`

- [ ] Create `src/app/manifest.ts`:

```ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PayrollApp',
    short_name: 'PayrollApp',
    description: 'Payroll management for your company',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#4f46e5',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
```

- [ ] Update `src/app/layout.tsx` — extend the metadata export and add `suppressHydrationWarning`:

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AppShell from '@/components/AppShell'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PayrollApp',
  description: 'Manage employees, attendance, and payroll efficiently',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PayrollApp',
  },
  other: {
    'theme-color': '#4f46e5',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
```

Note: `suppressHydrationWarning` is required by `next-themes` (Task 7) — adding it now prevents a future hydration error.

- [ ] Verify: `npm run build` — no errors. Visit `/manifest.webmanifest` in dev server to confirm it returns JSON.

- [ ] Commit:

```bash
git add src/app/manifest.ts src/app/layout.tsx
git commit -m "feat: add PWA manifest and iOS meta tags"
```

---

## Task 5: Charts Page

**Files:**
- Create: `src/app/charts/page.tsx`
- Create: `src/app/charts/ChartsView.tsx`

- [ ] Install recharts:

```bash
npm install recharts
```

- [ ] Create `src/app/charts/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import ChartsView from './ChartsView'

export default async function ChartsPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const companyId = (profileData as any)?.company_id
  if (!companyId) return <div className="p-8 text-red-600">No company associated with this profile.</div>

  // Build last-6-months range (handles year boundaries correctly)
  const today = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(today, 5 - i)
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: format(d, 'MMM yyyy'),
    }
  })

  const startDate = format(startOfMonth(subMonths(today, 5)), 'yyyy-MM-dd')
  const endDate = format(endOfMonth(today), 'yyyy-MM-dd')

  // Fetch expenses for last 6 months
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, category, date')
    .eq('company_id', companyId)
    .gte('date', startDate)
    .lte('date', endDate)

  // Fetch payroll summaries — employees(worker_type) is a FK embed returning a single object
  const { data: summaries } = await supabase
    .from('payroll_summaries')
    .select('final_payable_salary, month, year, employees(worker_type)')
    .eq('company_id', companyId)
    .or(months.map(m => `and(year.eq.${m.year},month.eq.${m.month})`).join(','))

  // Aggregate expense bar chart: total per month
  const expenseByMonth: Record<string, number> = {}
  for (const e of (expenses ?? []) as any[]) {
    const d = new Date(e.date)
    const label = format(d, 'MMM yyyy')
    expenseByMonth[label] = (expenseByMonth[label] ?? 0) + Number(e.amount)
  }
  const expenseBarData = months.map(m => ({ name: m.label, total: expenseByMonth[m.label] ?? 0 }))

  // Aggregate payroll bar chart: total per month summed across all employees
  const payrollByMonth: Record<string, number> = {}
  for (const row of (summaries ?? []) as any[]) {
    const label = months.find(m => m.year === row.year && m.month === row.month)?.label ?? ''
    if (label) payrollByMonth[label] = (payrollByMonth[label] ?? 0) + Number(row.final_payable_salary)
  }
  const payrollBarData = months.map(m => ({ name: m.label, total: payrollByMonth[m.label] ?? 0 }))

  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Charts</h1>
      <ChartsView
        expenseBarData={expenseBarData}
        expenseRawData={(expenses ?? []) as any[]}
        payrollBarData={payrollBarData}
        summariesRaw={(summaries ?? []) as any[]}
        months={months}
        defaultMonth={currentMonthStr}
      />
    </div>
  )
}
```

- [ ] Create `src/app/charts/ChartsView.tsx`:

```tsx
'use client'

import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const COLORS = ['#4f46e5', '#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']
const formatRs = (v: number) => '₹' + Number(v).toLocaleString('en-IN')

interface Props {
  expenseBarData: { name: string; total: number }[]
  expenseRawData: { amount: number; category: string; date: string }[]
  payrollBarData: { name: string; total: number }[]
  summariesRaw: { final_payable_salary: number; month: number; year: number; employees: { worker_type: string } | null }[]
  months: { year: number; month: number; label: string }[]
  defaultMonth: string  // 'YYYY-MM'
}

export default function ChartsView({
  expenseBarData, expenseRawData, payrollBarData, summariesRaw, months, defaultMonth,
}: Props) {
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth)
  const [selYear, selMonthNum] = selectedMonth.split('-').map(Number)

  const selectedLabel = months.find(
    m => m.year === selYear && m.month === selMonthNum
  )?.label ?? selectedMonth

  // Expense pie for selected month
  const expensePieData = (() => {
    const filtered = expenseRawData.filter(e => {
      const d = new Date(e.date)
      return d.getFullYear() === selYear && d.getMonth() + 1 === selMonthNum
    })
    const byCategory: Record<string, number> = {}
    for (const e of filtered) {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + Number(e.amount)
    }
    return Object.entries(byCategory).map(([name, value]) => ({ name, value }))
  })()

  // Payroll donut for selected month — group by worker_type
  const payrollDonutData = (() => {
    const filtered = summariesRaw.filter(s => s.year === selYear && s.month === selMonthNum)
    const byType: Record<string, number> = {}
    for (const s of filtered) {
      const wt = s.employees?.worker_type ?? 'salaried'
      byType[wt] = (byType[wt] ?? 0) + Number(s.final_payable_salary)
    }
    return Object.entries(byType).map(([name, value]) => ({ name, value }))
  })()

  const monthOptions = months.map(m => ({
    value: `${m.year}-${String(m.month).padStart(2, '0')}`,
    label: m.label,
  }))

  const cardCls = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6'
  const titleCls = 'text-base font-semibold text-gray-900 dark:text-white mb-4'
  const emptyState = (msg: string) => (
    <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-sm">{msg}</div>
  )

  return (
    <div className="space-y-6">
      {/* Month selector for pie/donut charts */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Month:</label>
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {monthOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Bar — last 6 months */}
        <div className={cardCls}>
          <h2 className={titleCls}>Monthly Expenses (Last 6 Months)</h2>
          {expenseBarData.every(d => d.total === 0) ? emptyState('No expense data yet') : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={expenseBarData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => '₹' + (v / 1000).toFixed(0) + 'k'} tick={{ fontSize: 11 }} width={55} />
                <Tooltip formatter={(v: number) => [formatRs(v), 'Total']} />
                <Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Expense Pie — selected month */}
        <div className={cardCls}>
          <h2 className={titleCls}>Expense Breakdown — {selectedLabel}</h2>
          {expensePieData.length === 0 ? emptyState('No expenses for this month') : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={expensePieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {expensePieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [formatRs(v), 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Payroll Bar — last 6 months */}
        <div className={cardCls}>
          <h2 className={titleCls}>Monthly Payroll (Last 6 Months)</h2>
          {payrollBarData.every(d => d.total === 0) ? emptyState('No payroll data yet') : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={payrollBarData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => '₹' + (v / 1000).toFixed(0) + 'k'} tick={{ fontSize: 11 }} width={55} />
                <Tooltip formatter={(v: number) => [formatRs(v), 'Total']} />
                <Bar dataKey="total" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Payroll Donut — selected month by worker type */}
        <div className={cardCls}>
          <h2 className={titleCls}>Payroll by Worker Type — {selectedLabel}</h2>
          {payrollDonutData.length === 0 ? emptyState('No payroll data for this month') : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={payrollDonutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {payrollDonutData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [formatRs(v), 'Amount']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] Verify: `npm run build` — no TypeScript errors.

- [ ] Commit:

```bash
git add src/app/charts/ package.json package-lock.json
git commit -m "feat: add charts page with expense and payroll charts"
```

---

## Task 6: Charts — Sidebar Link

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] In `src/components/Sidebar.tsx`, add `TrendingUp` to the lucide-react import:

```tsx
import {
  Users, CalendarCheck, FileText, LayoutDashboard, LogOut, Banknote,
  Tag, CalendarDays, ClipboardList, WalletCards, Receipt, X, BarChart2,
  TrendingUp, Settings,
} from 'lucide-react'
```

- [ ] Add Charts link to the Payroll group (after Expenses) and Settings link as a new group. Update the `navigation` array:

```tsx
const navigation = [
  {
    group: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    group: 'Workforce',
    items: [
      { name: 'Employees', href: '/employees', icon: Users },
      { name: 'Attendance', href: '/attendance', icon: CalendarCheck },
      { name: 'Att. Summary', href: '/attendance/summary', icon: BarChart2 },
      { name: 'Daily Attendance', href: '/daily-attendance', icon: CalendarDays },
      { name: 'Advances', href: '/advances', icon: Banknote },
    ],
  },
  {
    group: 'Commission',
    items: [
      { name: 'Commission Items', href: '/commission', icon: Tag },
      { name: 'Work Entries', href: '/work-entries', icon: ClipboardList },
    ],
  },
  {
    group: 'Payroll',
    items: [
      { name: 'Reports', href: '/reports', icon: FileText },
      { name: 'Payment History', href: '/payments', icon: WalletCards },
      { name: 'Expenses', href: '/expenses', icon: Receipt },
      { name: 'Charts', href: '/charts', icon: TrendingUp },
    ],
  },
  {
    group: 'Account',
    items: [
      { name: 'Settings', href: '/settings', icon: Settings },
    ],
  },
]
```

- [ ] Verify: `npm run build` — no errors. Check sidebar renders Charts and Settings links.

- [ ] Commit:

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: add Charts and Settings links to sidebar"
```

---

## Task 7: Dark Mode — Infrastructure

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `src/app/layout.tsx`

- [ ] Install next-themes:

```bash
npm install next-themes
```

- [ ] Update `tailwind.config.ts` — add `darkMode: 'class'`:

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
    extend: {},
  },
  plugins: [],
};
export default config;
```

- [ ] Update `src/app/layout.tsx` — wrap AppShell with ThemeProvider:

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AppShell from '@/components/AppShell'
import { ThemeProvider } from 'next-themes'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PayrollApp',
  description: 'Manage employees, attendance, and payroll efficiently',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PayrollApp',
  },
  other: {
    'theme-color': '#4f46e5',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

- [ ] Verify: `npm run build` — no errors.

- [ ] Commit:

```bash
git add tailwind.config.ts src/app/layout.tsx package.json package-lock.json
git commit -m "feat: add dark mode infrastructure (next-themes, tailwind darkMode: class)"
```

---

## Task 8: Dark Mode — Sidebar, AppShell, Navbar

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/components/Navbar.tsx`

- [ ] Update `src/components/Sidebar.tsx` — add dark mode classes and theme toggle button. Import `useTheme` from `next-themes` and `Sun`, `Moon`, `Monitor` from lucide-react:

```tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { motion } from 'framer-motion'
import {
  Users, CalendarCheck, FileText, LayoutDashboard, LogOut, Banknote,
  Tag, CalendarDays, ClipboardList, WalletCards, Receipt, X, BarChart2,
  TrendingUp, Settings, Sun, Moon, Monitor,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const navigation = [
  {
    group: 'Overview',
    items: [{ name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    group: 'Workforce',
    items: [
      { name: 'Employees', href: '/employees', icon: Users },
      { name: 'Attendance', href: '/attendance', icon: CalendarCheck },
      { name: 'Att. Summary', href: '/attendance/summary', icon: BarChart2 },
      { name: 'Daily Attendance', href: '/daily-attendance', icon: CalendarDays },
      { name: 'Advances', href: '/advances', icon: Banknote },
    ],
  },
  {
    group: 'Commission',
    items: [
      { name: 'Commission Items', href: '/commission', icon: Tag },
      { name: 'Work Entries', href: '/work-entries', icon: ClipboardList },
    ],
  },
  {
    group: 'Payroll',
    items: [
      { name: 'Reports', href: '/reports', icon: FileText },
      { name: 'Payment History', href: '/payments', icon: WalletCards },
      { name: 'Expenses', href: '/expenses', icon: Receipt },
      { name: 'Charts', href: '/charts', icon: TrendingUp },
    ],
  },
  {
    group: 'Account',
    items: [{ name: 'Settings', href: '/settings', icon: Settings }],
  },
]

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor

  return (
    <div className="flex h-full w-64 flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      {/* Brand header */}
      <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
            <span className="text-white text-sm font-black">P</span>
          </div>
          <span className="font-bold text-gray-900 dark:text-white text-[15px] tracking-tight">PayrollApp</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {navigation.map((section) => (
          <div key={section.group}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {section.group}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-indigo-700 dark:text-indigo-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active-bg"
                        className="absolute inset-0 rounded-lg bg-indigo-50 dark:bg-indigo-900/30"
                        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                      />
                    )}
                    <Icon
                      className={`relative h-[18px] w-[18px] flex-shrink-0 transition-colors ${
                        isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                      }`}
                    />
                    <span className="relative">{item.name}</span>
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active-dot"
                        className="relative ml-auto h-1.5 w-1.5 rounded-full bg-indigo-500"
                        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                      />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-100 dark:border-gray-700 p-3 space-y-0.5">
        {/* Theme toggle */}
        <button
          onClick={cycleTheme}
          className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-white transition-all"
          title={`Theme: ${theme ?? 'system'}`}
        >
          <ThemeIcon className="h-[18px] w-[18px] text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
          <span className="capitalize">{theme ?? 'System'} theme</span>
        </button>
        {/* Sign out */}
        <button
          onClick={handleLogout}
          className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all"
        >
          <LogOut className="h-[18px] w-[18px] text-gray-400 group-hover:text-red-500 transition-colors" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
```

- [ ] Update `src/components/AppShell.tsx` — add dark mode to containers:

Replace:
```tsx
<div className="flex h-screen overflow-hidden bg-gray-50">
```
With:
```tsx
<div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
```

Replace:
```tsx
<header className="md:hidden flex items-center gap-3 px-4 h-14 bg-white border-b border-gray-200 shrink-0">
```
With:
```tsx
<header className="md:hidden flex items-center gap-3 px-4 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shrink-0">
```

Replace:
```tsx
<span className="font-bold text-gray-900 text-sm tracking-tight">PayrollApp</span>
```
With:
```tsx
<span className="font-bold text-gray-900 dark:text-white text-sm tracking-tight">PayrollApp</span>
```

- [ ] Update `src/components/Navbar.tsx` — it uses `bg-gray-900` for the nav bar which is already dark, so minimal changes needed. Add dark variants to any light-colored elements:
  - The nav background `bg-gray-900` is fine as-is.
  - Mobile menu background `bg-gray-800` is fine as-is.
  - No text colors need changes (already using gray-300/white/gray-400 on the dark background).
  - If there are any `bg-white` or light gray elements (check the file), add `dark:` variants per the mapping in Task 9.

- [ ] Verify: `npm run build`. Open app in browser, click theme toggle — page should switch between light/dark/system.

- [ ] Commit:

```bash
git add src/components/Sidebar.tsx src/components/AppShell.tsx src/components/Navbar.tsx
git commit -m "feat: dark mode for sidebar, app shell, and navbar; add theme toggle"
```

---

## Task 9: Dark Mode — Shared Components (PayrollDashboard, PaymentModal)

**Context:** These are the most complex shared components. Apply the dark mode color mapping below throughout each file. Read the current file first, then apply.

**Dark mode color mapping:**
| Light | Dark |
|-------|------|
| `bg-white` (page/modal bg) | `dark:bg-gray-900` (pages) / `dark:bg-gray-800` (cards/modals) |
| `bg-gray-50` (table headers, sidebar) | `dark:bg-gray-800` |
| `bg-gray-100` | `dark:bg-gray-700` |
| `text-gray-900` | `dark:text-white` |
| `text-gray-700` | `dark:text-gray-300` |
| `text-gray-600` | `dark:text-gray-400` |
| `text-gray-500` | `dark:text-gray-400` |
| `text-gray-400` | `dark:text-gray-500` |
| `border-gray-200` | `dark:border-gray-700` |
| `border-gray-300` | `dark:border-gray-600` |
| `ring-gray-300` | `dark:ring-gray-600` |
| `divide-gray-200` | `dark:divide-gray-700` |
| Inputs: `bg-white text-gray-900 border-gray-300` | add `dark:bg-gray-700 dark:text-white dark:border-gray-600` |
| Selects | same as inputs |
| Table header row `bg-gray-50` | `dark:bg-gray-800` |
| Table odd rows `odd:bg-gray-50` | add `dark:odd:bg-gray-800/40` |
| Fixed dark overlays (backdrop) | already dark — leave as-is |

**Files:**
- Modify: `src/components/PayrollDashboard.tsx`
- Modify: `src/components/PaymentModal.tsx`

- [ ] Read `src/components/PayrollDashboard.tsx` (it is large — ~700 lines). Apply the mapping above to all hardcoded light-color classes. Key areas: page heading, month navigation, table container, table header cells, table row cells, badges (Overpaid/Settled — add `dark:` variants for their colors too), Generate Payroll button, modal backdrop.

- [ ] Read `src/components/PaymentModal.tsx`. Apply the mapping above. Key areas: modal backdrop (`bg-black/40` — leave as-is), modal container (`bg-white` → `dark:bg-gray-800`), all text, input fields, the orange advance recovery section, buttons.

- [ ] Verify: `npm run build` — no errors.

- [ ] Commit:

```bash
git add src/components/PayrollDashboard.tsx src/components/PaymentModal.tsx
git commit -m "feat: dark mode for PayrollDashboard and PaymentModal"
```

---

## Task 10: Dark Mode — Feature Page Components (Batch 1)

**Files to update** (apply the same dark mode mapping from Task 9 to each file):

- `src/app/dashboard/components/DashboardCards.tsx`
- `src/app/employees/page.tsx`
- `src/app/employees/components/AddEmployeeModal.tsx`
- `src/app/employees/components/EditEmployeeModal.tsx`
- `src/app/employees/components/ToggleActiveButton.tsx`
- `src/app/employees/[id]/page.tsx`
- `src/app/employees/[id]/components/CommissionRatesSection.tsx`
- `src/app/employees/[id]/components/SetRateModal.tsx`
- `src/app/attendance/components/AttendanceManager.tsx`
- `src/app/attendance/components/BiometricImportModal.tsx`
- `src/app/attendance/summary/components/AttendanceSummaryClient.tsx`
- `src/app/advances/components/AdvancesClient.tsx`
- `src/app/advances/components/AddAdvanceModal.tsx`
- `src/app/advances/components/LogRepaymentModal.tsx`

- [ ] Read each file and apply the dark mode mapping. Focus on: page containers, headings, tables, modals, inputs, buttons with light backgrounds, cards.

- [ ] Verify: `npm run build` — no errors.

- [ ] Commit:

```bash
git add src/app/dashboard/ src/app/employees/ src/app/attendance/ src/app/advances/
git commit -m "feat: dark mode for dashboard, employees, attendance, advances"
```

---

## Task 11: Dark Mode — Feature Page Components (Batch 2)

**Files to update:**

- `src/app/expenses/components/ExpensesManager.tsx`
- `src/app/expenses/components/ExpenseModal.tsx`
- `src/app/expenses/components/TemplatesModal.tsx`
- `src/app/expenses/components/DeleteConfirm.tsx`
- `src/app/commission/components/CommissionItemsManager.tsx`
- `src/app/commission/components/CommissionItemModal.tsx`
- `src/app/commission/components/DeleteConfirmModal.tsx`
- `src/app/work-entries/components/WorkerListClient.tsx`
- `src/app/daily-attendance/components/DailyAttendanceManager.tsx`
- `src/app/payments/components/PaymentHistoryClient.tsx`
- `src/app/reports/page.tsx`
- `src/app/reports/components/PayrollComparison.tsx`
- `src/app/login/page.tsx`

- [ ] Read each file and apply the dark mode mapping from Task 9.

- [ ] `src/app/login/page.tsx` specifically: the outer div uses `bg-gray-50` (→ `dark:bg-gray-900`) and the card uses `bg-white shadow-md` (→ `dark:bg-gray-800 dark:shadow-none`). Inputs and heading also need dark variants.

- [ ] Verify: `npm run build` — no errors.

- [ ] Commit:

```bash
git add src/app/expenses/ src/app/commission/ src/app/work-entries/ src/app/daily-attendance/ src/app/payments/ src/app/reports/ src/app/login/
git commit -m "feat: dark mode for expenses, commission, work-entries, daily-attendance, payments, reports, login"
```

---

## Task 12: Middleware — Exclude `/auth/callback`

**Files:**
- Modify: `src/middleware.ts`

The middleware currently redirects all unauthenticated requests to `/login`. The `/auth/callback` route exchanges a magic link token BEFORE the session is established — it must be excluded from the auth guard.

- [ ] Update `src/middleware.ts`:

```ts
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] Verify: `npm run build` — no errors.

- [ ] Commit:

```bash
git add src/middleware.ts
git commit -m "fix: exclude /auth/callback from auth middleware guard"
```

---

## Task 13: Auth Callback Route

**Files:**
- Create: `src/app/auth/callback/route.ts`

> ⚠️ **WARNING:** The design spec (`2026-03-20-session4-design.md`) contains a cookie snippet using `getAll/setAll`. **Do not use that snippet.** It is the `@supabase/ssr` v0.4+ API. This project uses v0.3, which requires the `get/set/remove` API shown below. The code in this task is the correct version.

This is the landing route for Supabase magic links (invite emails). It exchanges the one-time code for a session using the project's existing `@supabase/ssr` v0.3 cookie API (`get/set/remove` — NOT `getAll/setAll`).

- [ ] Create `src/app/auth/callback/route.ts`:

```ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/onboarding'

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/login?error=callback_failed`)
}
```

- [ ] Verify: `npm run build` — no errors.

- [ ] Commit:

```bash
git add src/app/auth/
git commit -m "feat: add Supabase auth callback route for invite flow"
```

---

## Task 14: Onboarding Page

**Files:**
- Create: `src/app/onboarding/page.tsx`
- Create: `.env.local.example`

The onboarding page runs after a new invited user clicks their magic link. It reads `company_id` from the user's auth metadata (set by the invite) and inserts a `profiles` row.

- [ ] Create `src/app/onboarding/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

export default async function OnboardingPage() {
  const supabase = await createClient()

  // Get session (established by /auth/callback before redirect here)
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) redirect('/login')

  // Check if profile already exists (idempotent — safe to visit multiple times)
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, company_id')
    .eq('id', user.id)
    .maybeSingle()

  if (existing?.company_id) {
    // Profile already set up — go to dashboard
    redirect('/dashboard')
  }

  // Read company_id from invite metadata — requires service role (anon getUser()
  // does not expose user_metadata set by inviteUserByEmail)
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: { user: adminUser }, error: adminErr } = await adminClient.auth.admin.getUserById(user.id)
  if (adminErr || !adminUser) redirect('/login?error=onboarding_failed')

  const companyId = adminUser.user_metadata?.company_id
  if (!companyId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Invite error</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            This invite link is missing company information. Please ask your admin to resend the invite.
          </p>
        </div>
      </div>
    )
  }

  // Insert profile with viewer role via service role client (bypasses RLS — no INSERT policy on profiles)
  const { error: insertErr } = await adminClient
    .from('profiles')
    .insert({ id: user.id, company_id: companyId, role: 'viewer' })

  if (insertErr) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Setup failed</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">{insertErr.message}</p>
        </div>
      </div>
    )
  }

  redirect('/dashboard')
}
```

- [ ] Create `.env.local.example`:

```
# Supabase (public — safe to expose in client)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Supabase service role — SERVER-SIDE ONLY. NEVER expose to client.
# Required for: inviting users, reading auth user metadata, deleting auth users.
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` to your actual `.env.local` (get it from Supabase Dashboard → Project Settings → API → service_role key).

- [ ] Verify: `npm run build` — no errors.

- [ ] Commit:

```bash
git add src/app/onboarding/ .env.local.example
git commit -m "feat: add onboarding page for invited users"
```

---

## Task 15: Settings Page, Client, and Actions

**Files:**
- Create: `src/app/settings/page.tsx`
- Create: `src/app/settings/SettingsClient.tsx`
- Create: `src/app/settings/actions.ts`

- [ ] Create `src/app/settings/actions.ts`:

```ts
'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// companyId is fetched from the session server-side (not accepted as a parameter)
// to prevent a malicious client from inviting users into a different company.
export async function inviteUser(email: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!(profile as any)?.company_id) return { error: 'No company found' }
  if ((profile as any).role !== 'admin') return { error: 'Only admins can invite users' }

  const adminClient = getAdminClient()
  const origin = headers().get('origin') ?? ''
  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { company_id: (profile as any).company_id },
    redirectTo: `${origin}/auth/callback?next=/onboarding`,
  })
  if (error) return { error: error.message }
  return { error: null }
}

export async function changeRole(userId: string, newRole: 'admin' | 'viewer', companyId: string): Promise<{ error: string | null }> {
  // Must use service-role client: profiles_update_own RLS only allows self-updates.
  // Admins updating other members' roles must bypass RLS.
  const adminClient = getAdminClient()
  const { error } = await adminClient
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)
    .eq('company_id', companyId)
  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { error: null }
}

export async function removeMember(userId: string): Promise<{ error: string | null }> {
  // Deleting the auth user cascades to profiles via FK.
  // Do NOT delete profiles row directly.
  const adminClient = getAdminClient()
  const { error } = await adminClient.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { error: null }
}
```

- [ ] Create `src/app/settings/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('company_id, role, full_name')
    .eq('id', user.id)
    .single()

  const profile = profileData as any
  if (!profile?.company_id) return <div className="p-8 text-red-600">No company associated with this profile.</div>

  // Viewers cannot access settings
  if (profile.role !== 'admin') redirect('/dashboard')

  const { data: companyData } = await supabase
    .from('companies')
    .select('name')
    .eq('id', profile.company_id)
    .maybeSingle()

  // Fetch all profiles in company (anon client + RLS is fine — profiles_read allows this)
  const { data: members } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('company_id', profile.company_id)

  // Get emails from auth.users — requires service role client
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
  const emailMap: Record<string, string> = {}
  for (const au of authUsers ?? []) {
    emailMap[au.id] = au.email ?? ''
  }

  const membersWithEmail = ((members ?? []) as any[]).map(m => ({
    ...m,
    email: emailMap[m.id] ?? '',
  }))

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <SettingsClient
        companyName={(companyData as any)?.name ?? 'My Company'}
        companyId={profile.company_id}
        currentUserId={user.id}
        members={membersWithEmail}
      />
    </div>
  )
}
```

- [ ] Create `src/app/settings/SettingsClient.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import { inviteUser, changeRole, removeMember } from './actions'

interface Member {
  id: string
  full_name: string | null
  role: 'admin' | 'viewer'
  email: string
}

interface Props {
  companyName: string
  companyId: string
  currentUserId: string
  members: Member[]
}

export default function SettingsClient({ companyName, companyId, currentUserId, members: initialMembers }: Props) {
  const [members, setMembers] = useState(initialMembers)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteStatus, setInviteStatus] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviteStatus(null)
    setActionError(null)
    startTransition(async () => {
      const { error } = await inviteUser(inviteEmail.trim())
      if (error) {
        setActionError(error)
      } else {
        setInviteStatus(`Invite sent to ${inviteEmail.trim()}`)
        setInviteEmail('')
      }
    })
  }

  const handleChangeRole = async (userId: string, newRole: 'admin' | 'viewer') => {
    setActionError(null)
    startTransition(async () => {
      const { error } = await changeRole(userId, newRole, companyId)
      if (error) {
        setActionError(error)
      } else {
        setMembers(prev => prev.map(m => m.id === userId ? { ...m, role: newRole } : m))
      }
    })
  }

  const handleRemove = async (userId: string) => {
    if (!confirm('Remove this member? They will lose access immediately.')) return
    setActionError(null)
    startTransition(async () => {
      const { error } = await removeMember(userId)
      if (error) {
        setActionError(error)
      } else {
        setMembers(prev => prev.filter(m => m.id !== userId))
      }
    })
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Company: {companyName}</p>
      </div>

      {actionError && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {actionError}
        </div>
      )}

      {/* Members */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Team Members</h2>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {members.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">No members yet.</div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {members.map(member => (
                <li key={member.id} className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {member.full_name ?? '(no name)'}
                      {member.id === currentUserId && (
                        <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      member.role === 'admin'
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {member.role}
                    </span>
                    {member.id !== currentUserId && (
                      <>
                        <button
                          onClick={() => handleChangeRole(member.id, member.role === 'admin' ? 'viewer' : 'admin')}
                          disabled={isPending}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
                        >
                          Make {member.role === 'admin' ? 'Viewer' : 'Admin'}
                        </button>
                        <button
                          onClick={() => handleRemove(member.id)}
                          disabled={isPending}
                          className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Invite */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Invite User</h2>
        <form onSubmit={handleInvite} className="flex gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="colleague@example.com"
            required
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
          <button
            type="submit"
            disabled={isPending || !inviteEmail.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Sending…' : 'Send Invite'}
          </button>
        </form>
        {inviteStatus && (
          <p className="mt-2 text-sm text-green-600 dark:text-green-400">{inviteStatus}</p>
        )}
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Invited users receive an email link and join as Viewers. You can promote them to Admin after they accept.
        </p>
      </section>
    </div>
  )
}
```

- [ ] Verify: `npm run build` — no TypeScript errors.

- [ ] Commit:

```bash
git add src/app/settings/
git commit -m "feat: add settings page with member management and invite"
```

---

## Task 16: Thread `userRole` Through Page Server Components

**Goal:** All pages that render write actions (add/edit/delete buttons) must fetch the current user's role and pass it to client components. Viewers see read-only UI.

**Pattern for each server page component** — add `role` to the existing profile select, then pass `userRole` as a prop:

```tsx
// In the existing profile fetch, add 'role':
const { data: profileData } = await supabase
  .from('profiles')
  .select('company_id, role')   // <-- add 'role'
  .eq('id', user.id)
  .single()

const profile = profileData as any
const companyId = profile?.company_id
const userRole: 'admin' | 'viewer' = profile?.role ?? 'viewer'  // <-- extract role
```

Then pass `userRole` to the client component and wrap write actions:

```tsx
// In client components — wrap all mutation buttons:
{userRole === 'admin' && (
  <button onClick={...}>Add Employee</button>
)}
```

**Files to update:**

- [ ] `src/app/employees/page.tsx` — add `role` to profile select; pass `userRole` to page; in `AddEmployeeModal` call site, conditionally render based on `userRole === 'admin'`; similarly for Edit and ToggleActive buttons.

- [ ] `src/app/attendance/page.tsx` — pass `userRole` to `AttendanceManager`; in AttendanceManager, wrap "Add Record", "Edit", "Delete" buttons.

- [ ] `src/app/daily-attendance/page.tsx` — pass `userRole` to `DailyAttendanceManager`; wrap write buttons.

- [ ] `src/app/advances/page.tsx` — pass `userRole` to `AdvancesClient`; wrap "Add Advance" and "Log Repayment" buttons.

- [ ] `src/app/expenses/page.tsx` — pass `userRole` to `ExpensesManager`; wrap "Add Expense", "Edit", "Delete", "Apply Templates", "Manage Templates" buttons.

- [ ] `src/app/reports/page.tsx` — pass `userRole` to `PayrollDashboard`; in PayrollDashboard, wrap "Generate Payroll" button and "Pay" button (PaymentModal trigger).

- [ ] `src/app/commission/page.tsx` — pass `userRole` to `CommissionItemsManager`; wrap "Add Item", "Edit", "Delete" buttons.

- [ ] `src/app/work-entries/page.tsx` — pass `userRole` to `WorkerListClient`; wrap "Add Entry", "Edit", "Delete" actions.

- [ ] Verify: `npm run build` — no TypeScript errors. Log in as a viewer (if you have a test account) and verify write buttons are hidden. RLS provides the backend enforcement — this is defense-in-depth on the UI layer.

- [ ] Commit:

```bash
git add src/app/employees/ src/app/attendance/ src/app/daily-attendance/ src/app/advances/ src/app/expenses/ src/app/reports/ src/app/commission/ src/app/work-entries/
git commit -m "feat: thread userRole through all page components for viewer read-only UI"
```

---

## Final Verification

- [ ] Run full build: `npm run build` — must complete with zero errors.
- [ ] Start dev server: `npm run dev`
- [ ] Verify PWA: open Chrome DevTools → Application → Manifest — confirm manifest loaded, icons present, "Add to Home Screen" available.
- [ ] Verify security headers: `curl -I http://localhost:3000` — confirm `x-frame-options: DENY`, `x-content-type-options: nosniff` present.
- [ ] Verify dark mode: click theme toggle in sidebar — all pages should switch correctly.
- [ ] Verify charts: navigate to `/charts` — four charts render (or empty state if no data).
- [ ] Verify settings: navigate to `/settings` — member list and invite form visible.
- [ ] Verify RLS: go to Supabase Dashboard → Table Editor → any table — confirm RLS enabled badge.
