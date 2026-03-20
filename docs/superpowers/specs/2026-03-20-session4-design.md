# Session 4 Design — PWA, Security, Charts, Dark Mode, Multi-user/Roles

**Date:** 2026-03-20
**Status:** Approved

---

## Overview

Five features added to the payroll app:
1. **PWA (installable only)** — manifest + icons, zero server cost
2. **Security** — HTTP security headers + Supabase Row Level Security
3. **Charts** — expense and payroll charts using Recharts
4. **Dark mode** — system preference + manual toggle via next-themes
5. **Multi-user / roles** — Admin + Viewer roles with invite flow

---

## 1. PWA (Installable Only)

**Scope:** Option A — manifest + icons only. No service worker, no offline support. Users can install the app to their home screen; it opens in standalone mode but requires an internet connection.

**Server cost:** Zero — static files served by Next.js, no additional infrastructure.

### Implementation

**`src/app/manifest.ts`** — Next.js 14 App Router native manifest support. Next.js auto-generates `/manifest.webmanifest` and inserts the link tag:

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

**`public/icons/`** — Two PNG icons: `icon-192.png` (192×192) and `icon-512.png` (512×512). Generated from a single source image using the `sharp` npm package (dev dependency only).

**`src/app/apple-icon.png`** — Copy of `icon-192.png` placed here; Next.js auto-links it as the Apple touch icon.

**`src/app/layout.tsx`** — Extend the existing `metadata` export (do NOT add raw JSX meta tags — they conflict with the `metadata` export in Next.js 14 App Router). Also add `suppressHydrationWarning` to `<html>` (required by `next-themes` in Section 4):

```ts
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
```

```tsx
<html lang="en" suppressHydrationWarning>
```

---

## 2. Security

### 2a. HTTP Security Headers

Added in `next.config.mjs` via the `headers()` export. Applied to all routes (`source: '/(.*)'`).

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
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security',  value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ]
  },
}

export default nextConfig
```

Note: `unsafe-inline` and `unsafe-eval` on `script-src` are required by Next.js internals and Framer Motion. This is standard for Next.js apps without a nonce-based CSP.

### 2b. Supabase Row Level Security

Delivered as `docs/superpowers/migrations/session4-rls.sql` — one file to paste into the Supabase SQL editor.

**Existing helper function** (already in schema.sql — do NOT recreate):
```sql
-- get_my_company_id() already exists; use it in all new policies below
```

**Tables confirmed to have `company_id`** (from codebase schema files):
- `employees`, `attendance_records`, `payroll_summaries` — schema.sql
- `work_entries`, `commission_items` — 03-commission.sql
- `employee_advances` — 02-advances.sql
- `daily_attendance` — 04-daily-jobwork.sql

**Tables without SQL files** (created in Session 3 via Supabase SQL editor; schemas inferred from app code):

```sql
-- payments (inferred from PaymentModal.tsx inserts)
-- columns: id uuid PK, company_id uuid, employee_id uuid, month text ('YYYY-MM'),
--          amount numeric, payment_date date, note text, created_at timestamptz

-- advance_repayments (inferred from LogRepaymentModal.tsx and PaymentModal.tsx)
-- columns: id uuid PK, company_id uuid, advance_id uuid FK→employee_advances,
--          employee_id uuid, amount numeric, repayment_date date,
--          method text ('salary_deduction'|'cash'), note text, created_at timestamptz

-- expenses (inferred from ExpenseModal.tsx inserts)
-- columns: id uuid PK, company_id uuid, date date, category text, description text,
--          amount numeric, paid_to text, note text, template_id uuid FK→expense_templates,
--          created_at timestamptz

-- expense_templates (inferred from TemplatesModal.tsx inserts)
-- columns: id uuid PK, company_id uuid, category text, description text,
--          amount numeric, paid_to text, note text, created_at timestamptz
```

**`commission_items`** — Already has RLS enabled with a company policy in 03-commission.sql. No changes needed.

**`agent_item_rates`** — No `company_id` column; uses join through `employees`. The policy pattern must follow the existing join-based approach from 03-commission.sql.

**Migration SQL (session4-rls.sql):**

The migration goes directly to role-aware policies. It does NOT first create generic read/write policies and then replace them — the role-aware versions are canonical from the start.

```sql
-- ════════════════════════════════════════════════════════════
-- SESSION 4 RLS MIGRATION
-- Run in Supabase SQL Editor
-- ════════════════════════════════════════════════════════════

-- ── profiles: role check constraint (column already exists) ──
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'viewer'));

-- ── Add full_name column to profiles (new — needed for settings member list) ──
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- ── Helper: get_my_role() — SECURITY DEFINER to avoid RLS recursion ──
-- Reading `role` from `profiles` inside an RLS policy on `profiles` itself
-- causes infinite recursion. A SECURITY DEFINER function bypasses RLS and
-- reads the row directly, breaking the cycle.
CREATE OR REPLACE FUNCTION get_my_role() RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_catalog;
-- search_path is fixed to prevent search-path injection (Supabase advisory for SECURITY DEFINER functions)

-- get_my_company_id() already exists from schema.sql; no changes needed.

-- ── Pattern for tables with company_id ──
-- For each table below:
--   SELECT: company_id = get_my_company_id()  (all authenticated users)
--   INSERT/UPDATE/DELETE: company_id = get_my_company_id()
--                         AND role = 'admin'

-- ── payments ──
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_read"   ON payments FOR SELECT
  USING (company_id = get_my_company_id());
CREATE POLICY "payments_insert" ON payments FOR INSERT
  WITH CHECK (company_id = get_my_company_id()
    AND get_my_role() = 'admin');
CREATE POLICY "payments_update" ON payments FOR UPDATE
  USING (company_id = get_my_company_id()
    AND get_my_role() = 'admin');
CREATE POLICY "payments_delete" ON payments FOR DELETE
  USING (company_id = get_my_company_id()
    AND get_my_role() = 'admin');

-- ── advance_repayments ──
ALTER TABLE advance_repayments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "advance_repayments_read"   ON advance_repayments FOR SELECT
  USING (company_id = get_my_company_id());
CREATE POLICY "advance_repayments_insert" ON advance_repayments FOR INSERT
  WITH CHECK (company_id = get_my_company_id()
    AND get_my_role() = 'admin');
CREATE POLICY "advance_repayments_update" ON advance_repayments FOR UPDATE
  USING (company_id = get_my_company_id()
    AND get_my_role() = 'admin');
CREATE POLICY "advance_repayments_delete" ON advance_repayments FOR DELETE
  USING (company_id = get_my_company_id()
    AND get_my_role() = 'admin');

-- ── expenses ──
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_read"   ON expenses FOR SELECT
  USING (company_id = get_my_company_id());
CREATE POLICY "expenses_insert" ON expenses FOR INSERT
  WITH CHECK (company_id = get_my_company_id()
    AND get_my_role() = 'admin');
CREATE POLICY "expenses_update" ON expenses FOR UPDATE
  USING (company_id = get_my_company_id()
    AND get_my_role() = 'admin');
CREATE POLICY "expenses_delete" ON expenses FOR DELETE
  USING (company_id = get_my_company_id()
    AND get_my_role() = 'admin');

-- ── expense_templates ──
ALTER TABLE expense_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expense_templates_read"   ON expense_templates FOR SELECT
  USING (company_id = get_my_company_id());
CREATE POLICY "expense_templates_insert" ON expense_templates FOR INSERT
  WITH CHECK (company_id = get_my_company_id()
    AND get_my_role() = 'admin');
CREATE POLICY "expense_templates_update" ON expense_templates FOR UPDATE
  USING (company_id = get_my_company_id()
    AND get_my_role() = 'admin');
CREATE POLICY "expense_templates_delete" ON expense_templates FOR DELETE
  USING (company_id = get_my_company_id()
    AND get_my_role() = 'admin');

-- ── Update existing table policies to add role-based write restriction ──
-- Drop existing permissive ALL policies and replace with split read/write

-- employees
DROP POLICY IF EXISTS "Company admins manage employees" ON employees;
CREATE POLICY "employees_read"   ON employees FOR SELECT
  USING (company_id = get_my_company_id());
CREATE POLICY "employees_insert" ON employees FOR INSERT
  WITH CHECK (company_id = get_my_company_id()
    AND get_my_role() = 'admin');
CREATE POLICY "employees_update" ON employees FOR UPDATE
  USING (company_id = get_my_company_id()
    AND get_my_role() = 'admin');
CREATE POLICY "employees_delete" ON employees FOR DELETE
  USING (company_id = get_my_company_id()
    AND get_my_role() = 'admin');

-- attendance_records
DROP POLICY IF EXISTS "Company admins manage attendance" ON attendance_records;
CREATE POLICY "attendance_read"   ON attendance_records FOR SELECT
  USING (company_id = get_my_company_id());
CREATE POLICY "attendance_insert" ON attendance_records FOR INSERT
  WITH CHECK (company_id = get_my_company_id()
    AND get_my_role() = 'admin');
CREATE POLICY "attendance_update" ON attendance_records FOR UPDATE
  USING (company_id = get_my_company_id()
    AND get_my_role() = 'admin');
CREATE POLICY "attendance_delete" ON attendance_records FOR DELETE
  USING (company_id = get_my_company_id()
    AND get_my_role() = 'admin');

-- payroll_summaries
DROP POLICY IF EXISTS "Company admins manage payroll summaries" ON payroll_summaries;
CREATE POLICY "payroll_read"   ON payroll_summaries FOR SELECT
  USING (company_id = get_my_company_id());
CREATE POLICY "payroll_insert" ON payroll_summaries FOR INSERT
  WITH CHECK (company_id = get_my_company_id()
    AND get_my_role() = 'admin');
CREATE POLICY "payroll_update" ON payroll_summaries FOR UPDATE
  USING (company_id = get_my_company_id()
    AND get_my_role() = 'admin');
CREATE POLICY "payroll_delete" ON payroll_summaries FOR DELETE
  USING (company_id = get_my_company_id()
    AND get_my_role() = 'admin');

-- work_entries
DROP POLICY IF EXISTS "Company admins manage work entries" ON work_entries;
CREATE POLICY "work_entries_read"   ON work_entries FOR SELECT
  USING (company_id = get_my_company_id());
CREATE POLICY "work_entries_insert" ON work_entries FOR INSERT
  WITH CHECK (company_id = get_my_company_id()
    AND get_my_role() = 'admin');
CREATE POLICY "work_entries_update" ON work_entries FOR UPDATE
  USING (company_id = get_my_company_id()
    AND get_my_role() = 'admin');
CREATE POLICY "work_entries_delete" ON work_entries FOR DELETE
  USING (company_id = get_my_company_id()
    AND get_my_role() = 'admin');

-- employee_advances
DROP POLICY IF EXISTS "Company admins manage employee advances" ON employee_advances;
CREATE POLICY "advances_read"   ON employee_advances FOR SELECT
  USING (company_id = get_my_company_id());
CREATE POLICY "advances_insert" ON employee_advances FOR INSERT
  WITH CHECK (company_id = get_my_company_id()
    AND get_my_role() = 'admin');
CREATE POLICY "advances_update" ON employee_advances FOR UPDATE
  USING (company_id = get_my_company_id()
    AND get_my_role() = 'admin');
CREATE POLICY "advances_delete" ON employee_advances FOR DELETE
  USING (company_id = get_my_company_id()
    AND get_my_role() = 'admin');

-- daily_attendance
DROP POLICY IF EXISTS "Company admins manage daily attendance" ON daily_attendance;
CREATE POLICY "daily_attendance_read"   ON daily_attendance FOR SELECT
  USING (company_id = get_my_company_id());
CREATE POLICY "daily_attendance_insert" ON daily_attendance FOR INSERT
  WITH CHECK (company_id = get_my_company_id()
    AND get_my_role() = 'admin');
CREATE POLICY "daily_attendance_update" ON daily_attendance FOR UPDATE
  USING (company_id = get_my_company_id()
    AND get_my_role() = 'admin');
CREATE POLICY "daily_attendance_delete" ON daily_attendance FOR DELETE
  USING (company_id = get_my_company_id()
    AND get_my_role() = 'admin');

-- commission_items
DROP POLICY IF EXISTS "Company admins manage commission items" ON commission_items;
CREATE POLICY "commission_items_read"   ON commission_items FOR SELECT
  USING (company_id = get_my_company_id());
CREATE POLICY "commission_items_insert" ON commission_items FOR INSERT
  WITH CHECK (company_id = get_my_company_id()
    AND get_my_role() = 'admin');
CREATE POLICY "commission_items_update" ON commission_items FOR UPDATE
  USING (company_id = get_my_company_id()
    AND get_my_role() = 'admin');
CREATE POLICY "commission_items_delete" ON commission_items FOR DELETE
  USING (company_id = get_my_company_id()
    AND get_my_role() = 'admin');

-- agent_item_rates (no company_id — join through employees)
DROP POLICY IF EXISTS "Company admins manage agent item rates" ON agent_item_rates;
CREATE POLICY "agent_rates_read"   ON agent_item_rates FOR SELECT
  USING (employee_id IN (
    SELECT id FROM employees WHERE company_id = get_my_company_id()
  ));
CREATE POLICY "agent_rates_insert" ON agent_item_rates FOR INSERT
  WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id())
    AND get_my_role() = 'admin'
  );
CREATE POLICY "agent_rates_update" ON agent_item_rates FOR UPDATE
  USING (
    employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id())
    AND get_my_role() = 'admin'
  );
CREATE POLICY "agent_rates_delete" ON agent_item_rates FOR DELETE
  USING (
    employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id())
    AND get_my_role() = 'admin'
  );

-- companies (read-only; creation handled outside normal auth flow)
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
CREATE POLICY "companies_read" ON companies FOR SELECT
  USING (id = get_my_company_id());
CREATE POLICY "companies_update" ON companies FOR UPDATE
  USING (id = get_my_company_id()
    AND get_my_role() = 'admin');

-- profiles: replace original SELECT-only policy with full CRUD policies
-- NOTE: profiles_read intentionally exposes all company members to each other.
-- This is required so the settings page can list all members' names and roles.
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "profiles_read" ON profiles FOR SELECT
  USING (company_id = get_my_company_id() OR id = auth.uid());
-- No INSERT policy: all profile inserts use the service-role client (bypasses RLS).
-- An INSERT policy here would allow role/company spoofing. Omitting is correct.

-- WITH CHECK uses get_my_role() to prevent role self-promotion without triggering
-- RLS recursion (reading profiles from within a profiles policy would recurse).
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = get_my_role());
-- Only admins can delete other members; cannot delete themselves
CREATE POLICY "profiles_delete_member" ON profiles FOR DELETE
  USING (company_id = get_my_company_id()
    AND get_my_role() = 'admin'
    AND id != auth.uid());
```

---

## 3. Charts

### Data Sources

- **Expenses:** `expenses` table — `amount`, `category`, `date` columns
- **Payroll:** `payroll_summaries` table — `final_payable_salary`, `year`, `month` columns; join `employees` for `worker_type`

### Charts

**Expense charts:**
1. Bar chart — monthly spend totals for last 6 months (x: month label, y: ₹ total)
2. Pie chart — category breakdown for the selected month

**Payroll charts:**
3. Bar chart — monthly salary totals for last 6 months (x: month label, y: ₹ total, summed across all employees)
4. Donut chart — worker type split (salaried / daily / commission) for the selected month (sum of `final_payable_salary` grouped by `worker_type`)

### Data Fetching

`src/app/charts/page.tsx` (server component) computes the 6-month date range in JavaScript:

```ts
// Build last-6-months range
const months: { year: number; month: number; label: string }[] = []
for (let i = 5; i >= 0; i--) {
  const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
  months.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: format(d, 'MMM yyyy') })
}
const oldest = months[0]
```

Two queries:
1. `expenses` — `select('amount, category, date')` filtered by `date >= first day of oldest month AND date <= today`
2. `payroll_summaries` — `select('final_payable_salary, month, year, employees(worker_type)')` filtered by the 6-month year/month pairs using an explicit `or()` filter:

```ts
// date-fns is already installed (see package.json)
const { data: summaries } = await supabase
  .from('payroll_summaries')
  .select('final_payable_salary, month, year, employees(worker_type)')
  .eq('company_id', companyId)
  .or(months.map(m => `and(year.eq.${m.year},month.eq.${m.month})`).join(','))
// Each row shape: { final_payable_salary: number, month: number, year: number, employees: { worker_type: string } }
// Note: employees is a single object (FK to one employee row), not an array
```

This correctly handles windows that span two calendar years (e.g., Aug 2025 → Jan 2026).

**Client-side aggregation** (in `src/app/charts/page.tsx` before passing to `ChartsView`):

```ts
// Bar chart: sum final_payable_salary per month label
const payrollByMonth: Record<string, number> = {}
for (const row of summaries ?? []) {
  const label = months.find(m => m.year === row.year && m.month === row.month)?.label ?? ''
  payrollByMonth[label] = (payrollByMonth[label] ?? 0) + Number(row.final_payable_salary)
}
const payrollBarData = months.map(m => ({ name: m.label, total: payrollByMonth[m.label] ?? 0 }))

// Donut chart: sum final_payable_salary per worker_type for the selected month
// (filtered in ChartsView client-side from the summaries prop)
// Shape passed to ChartsView for donut: { name: string; value: number }[]
// e.g. [{ name: 'salaried', value: 120000 }, { name: 'daily', value: 30000 }]
```

Pass `summaries` (raw array) as a prop to `ChartsView` so it can recompute the donut when the selected month changes on the client.

Aggregation into chart-ready arrays happens in the server component for bar charts. Pass `summaries` as a raw prop to `ChartsView` for the donut chart.

**Empty state:** If no data exists for a chart, pass an empty array. `ChartsView` renders a "No data yet" placeholder for empty datasets instead of a blank chart area.

**Empty state:** If no data exists for a chart, pass an empty array. `ChartsView` renders a "No data yet" placeholder for empty datasets instead of a blank chart area.

**Default selected month for pie/donut charts:** current month (`YYYY-MM` string). Managed as React state in `ChartsView`.

### Architecture

- New page: `src/app/charts/page.tsx` — server component; fetches and aggregates data; passes to `ChartsView`
- New component: `src/app/charts/ChartsView.tsx` — client component; renders all four Recharts charts; month selector (dropdown) for pie/donut charts
- Library: `recharts` (npm install)

**Sidebar:** Add "Charts" link under the Payroll group using the `TrendingUp` icon from lucide-react (not `BarChart2` — that's already used for "Att. Summary").

---

## 4. Dark Mode

### Approach

- `next-themes` library — handles system preference detection, localStorage persistence, hydration-safe class injection, and prevents flash of unstyled content (FOUC). Install: `npm install next-themes`
- Tailwind `darkMode: 'class'` — dark styles applied via `.dark` class on `<html>`

### Implementation

**`tailwind.config.ts`:** Add `darkMode: 'class'`.

**`src/app/layout.tsx`:** Wrap `<AppShell>` (not `<html>`) with `<ThemeProvider>` from next-themes:

```tsx
import { ThemeProvider } from 'next-themes'

// ...

return (
  <html lang="en" suppressHydrationWarning>
    <body className={inter.className}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <AppShell>{children}</AppShell>
      </ThemeProvider>
    </body>
  </html>
)
```

`suppressHydrationWarning` on `<html>` is required — next-themes modifies the `class` attribute client-side, which would otherwise trigger a React hydration mismatch.

**`src/components/Sidebar.tsx`:** Add theme toggle button using `useTheme()`:
- Import `Sun`, `Moon`, `Monitor` icons from lucide-react
- Show Sun when theme is dark, Moon when light, Monitor when system
- Cycles: light → dark → system → light
- Place below nav, above the Sign Out button

### Component Files Requiring `dark:` Variants

Every component that uses hardcoded light colors needs a dark variant. Full list:

**`src/components/`**
- `AppShell.tsx` — layout containers
- `Sidebar.tsx` — nav background, text, active states
- `Navbar.tsx` — header bar
- `PayrollDashboard.tsx` — table, cells, badges, header
- `PaymentModal.tsx` — modal background, inputs, buttons

**`src/app/*/page.tsx` and `components/`** (all pages):
- `dashboard/components/DashboardCards.tsx`
- `employees/page.tsx` + `components/AddEmployeeModal.tsx`, `EditEmployeeModal.tsx`
- `attendance/components/AttendanceManager.tsx`, `BiometricImportModal.tsx`
- `attendance/summary/components/AttendanceSummaryClient.tsx`
- `commission/components/CommissionItemsManager.tsx`, `CommissionItemModal.tsx`, `DeleteConfirmModal.tsx`
- `work-entries/components/WorkerListClient.tsx`
- `daily-attendance/components/DailyAttendanceManager.tsx`
- `advances/components/AdvancesClient.tsx`, `AddAdvanceModal.tsx`, `LogRepaymentModal.tsx`
- `expenses/components/ExpensesManager.tsx`, `ExpenseModal.tsx`, `TemplatesModal.tsx`, `DeleteConfirm.tsx`
- `payments/components/PaymentHistoryClient.tsx`
- `reports/page.tsx`, `reports/components/PayrollComparison.tsx`
- `login/page.tsx`
- `employees/[id]/page.tsx` + components

Note: PDF components (`src/components/pdf/`) use react-pdf/renderer which has its own styling — skip dark mode for PDFs.

---

## 5. Multi-user / Roles

### Schema

`profiles.role` column already exists (schema.sql line 15: `role TEXT NOT NULL DEFAULT 'admin'`). The RLS migration in §2b adds the CHECK constraint (`role IN ('admin', 'viewer')`). No separate schema migration needed.

### Environment Variable

Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`. This key is used server-side only for admin operations (invite, delete user). Never expose it client-side.

### Auth Callback Route

Supabase magic links (including invite links) land on `/auth/callback` by default. This route must exist to exchange the one-time token for a session.

**`src/app/auth/callback/route.ts`** — standard `@supabase/ssr` code exchange:

```ts
import { createServerClient } from '@supabase/ssr'
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
      { cookies: { getAll: () => cookieStore.getAll(), setAll: (ca) => ca.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }
  return NextResponse.redirect(`${origin}/login?error=callback`)
}
```

After the callback succeeds, the user is redirected to `/onboarding` (set via the `next` query param in the invite URL — set `redirectTo: origin + '/auth/callback?next=/onboarding'` in `inviteUserByEmail` options).

### Invite Flow

1. Admin navigates to `/settings` → enters invitee email → clicks "Invite"
2. Server action (in `src/app/settings/actions.ts`):
   - Creates a Supabase client using the **service role key** (`createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)` — not the anon key)
   - Fetches the admin's `company_id` from `profiles` using the **standard `createServerClient` (anon key + session cookie)** — RLS ensures the admin can only read their own profile
   - Calls `supabase.auth.admin.inviteUserByEmail(email, { data: { company_id }, redirectTo: origin + '/auth/callback?next=/onboarding' })`
   - The `data` field goes into `user_metadata` on the invited user's auth record
3. Invitee receives a magic link → clicks → lands on `/auth/callback` → exchanges token → redirects to `/onboarding`
4. `/onboarding` server component:
   - Uses **standard `createServerClient` (anon key)** to call `supabase.auth.getUser()` — session cookie is now set after callback
   - If no session, redirect to `/login`
   - Uses **service-role client** to call `supabase.auth.admin.getUserById(user.id)` to read `user_metadata.company_id` (service role required — anon `getUser()` does not expose `user_metadata` written by invite)
   - If `profiles` row does not exist for this user: inserts `{ id: user.id, company_id: metadata.company_id, role: 'viewer' }` using the service-role client
   - Redirects to `/dashboard`

### Member Management (`/settings` page)

**Data fetching:** Server component uses **standard `createServerClient` (anon key)** to query `profiles` filtered by `company_id` — RLS (`profiles_read` policy) ensures only company members are returned. Uses **service-role client** only for fetching emails from `auth.users`.

**Actions (all server actions, service-role client):**

The `profiles_update_own` RLS policy only allows users to update their own row. Admins updating *other* members' roles must bypass RLS via the service-role client.

- **changeRole(userId, newRole):** Using service-role client: `UPDATE profiles SET role = newRole WHERE id = userId AND company_id = (admin's company_id from session)`. The `company_id` scope prevents an admin from changing roles in another company.
- **removeMember(userId):** Using service-role client: call `supabase.auth.admin.deleteUser(userId)` — this deletes the auth user, which cascades (via FK) to delete the `profiles` row. Do NOT delete the `profiles` row directly.

Note: original company owner profile creation (during initial sign-up) is out of scope for Session 4. It was handled before this migration and is not affected by the absence of a `profiles_insert` RLS policy.

**Settings page UI:**
- Company name display
- Member list: full name (from profiles), email (from auth), role badge, "Make Admin"/"Make Viewer" toggle button, "Remove" button
- "Invite User" section: email input + send button
- All mutation buttons hidden / disabled for viewers (redirect viewers who land on `/settings` to `/dashboard`)

### UI Role Enforcement (Defense in Depth)

All server components that render action buttons must fetch the current user's `role` from `profiles` and pass it to client components. Client components conditionally render write actions:

```tsx
{userRole === 'admin' && <button>Add Employee</button>}
```

Pages requiring the `userRole` prop thread-through:
- `src/app/employees/page.tsx` → `AddEmployeeModal`, `EditEmployeeModal`, `ToggleActiveButton`
- `src/app/attendance/page.tsx` → `AttendanceManager`
- `src/app/daily-attendance/page.tsx` → `DailyAttendanceManager`
- `src/app/advances/page.tsx` → `AdvancesClient` (add advance, log repayment)
- `src/app/expenses/page.tsx` → `ExpensesManager` (add, edit, delete, apply templates)
- `src/app/reports/page.tsx` → `PayrollDashboard` (generate payroll, payment modal)
- `src/app/commission/page.tsx` → `CommissionItemsManager`
- `src/app/work-entries/page.tsx` → `WorkerListClient`

---

## Files to Create / Modify

### New Files
- `src/app/manifest.ts` — PWA manifest
- `public/icons/icon-192.png`, `public/icons/icon-512.png` — PWA icons
- `src/app/apple-icon.png` — iOS touch icon
- `src/app/charts/page.tsx` — charts server component
- `src/app/charts/ChartsView.tsx` — charts client component (Recharts)
- `src/app/settings/page.tsx` — settings server component (admin only)
- `src/app/settings/SettingsClient.tsx` — settings client component (member list, invite)
- `src/app/settings/actions.ts` — server actions (invite, changeRole, removeMember)
- `src/app/onboarding/page.tsx` — new user company assignment + redirect
- `src/app/auth/callback/route.ts` — Supabase magic link code exchange (required for invite flow)
- `docs/superpowers/migrations/session4-rls.sql` — full RLS migration

### Modified Files
- `next.config.mjs` — security headers
- `tailwind.config.ts` — `darkMode: 'class'`
- `src/app/layout.tsx` — metadata extensions (PWA), ThemeProvider, suppressHydrationWarning
- `src/components/Sidebar.tsx` — theme toggle button, Charts nav link (TrendingUp icon), Settings link
- `.env.local.example` — create this file documenting required env vars including `SUPABASE_SERVICE_ROLE_KEY`
- All component files listed in §4 — `dark:` Tailwind variants (full pass)
- All page server components that render action UIs — fetch and thread `userRole` prop

### New Dependencies
- `recharts` — charts (runtime)
- `next-themes` — dark mode (runtime)
- `sharp` — icon generation (devDependency only)
- `date-fns` — already installed (used in charts data processing)

---

## Non-Goals (out of scope for Session 4)

- Offline support / service worker / background sync
- Push notifications
- Role-based field-level visibility (e.g., hiding salary amounts from viewers)
- SSO / OAuth providers
- Granular permissions beyond admin/viewer
- Chart export (PDF/CSV)
- Custom date range for charts (beyond 6-month window)
- Email customization for invite emails
