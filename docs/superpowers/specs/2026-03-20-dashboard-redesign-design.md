# Dashboard Redesign — Design Spec
**Date:** 2026-03-20
**Scope:** `/dashboard` page only (first phase of full-app redesign)

---

## Goals

Replace the current indigo-accented dashboard with a "Command Center" design — bold and professional, without being cold. The user sees payroll health and workforce status at a glance.

---

## Design System

### Color Palette
All tokens use the `ps-` prefix to avoid colliding with Tailwind's built-in palettes.

| Token | Hex | Usage |
|-------|-----|-------|
| `ps-slate` | `#1C2333` | Sidebar bg, header band bg, Payment Status widget bg |
| `ps-slate-mid` | `#2D3748` | Avatar circle backgrounds |
| `ps-gold` | `#D4A847` | Hero metric text, active nav indicator, Run Payroll CTA bg |
| `ps-gold-subtle` | `rgba(212,168,71,0.12)` | Active nav item background — inline style only, not a Tailwind token |
| `ps-warm` | `#F7F6F3` | Page body background, secondary action button bg |
| `ps-near-black` | `#1A1F36` | Primary body text, table values, card numbers |
| `ps-border` | `#EDECEA` | Card borders, table row dividers |
| `ps-muted` | `#9CA3AF` | KPI card labels, sub-labels |
| `ps-slate-text` | `#6B7A99` | Sidebar inactive nav items, header meta labels |

Standard Tailwind colors also used:
- `green-500` (`#22C55E`) — attendance bar, "Fully Paid" count
- `red-400` (`#F87171`) — "Unpaid" count (on dark bg)
- `red-500` (`#EF4444`) — expense down-trend label (on light bg)
- `amber-400` / amber tints — badge backgrounds

**Rule:** `red-400` is used for colored text on dark backgrounds (Payment Status widget). `red-500` is used for colored text on light/white backgrounds (expense trend badge).

### Tailwind Config (`tailwind.config.ts`) — additions only
```ts
theme: {
  extend: {
    colors: {
      'ps-slate': { DEFAULT: '#1C2333', mid: '#2D3748' },
      'ps-gold': { DEFAULT: '#D4A847', light: '#E8C96B' },
      'ps-warm': '#F7F6F3',
      'ps-near-black': '#1A1F36',
      'ps-border': '#EDECEA',
      'ps-muted': '#9CA3AF',
      'ps-slate-text': '#6B7A99',
    },
    fontFamily: {
      sans: ['var(--font-inter)', 'sans-serif'],
      display: ['var(--font-dm-sans)', 'sans-serif'],
    },
  },
}
```

### Font Setup (`src/app/layout.tsx`)
Add to existing imports (do not remove existing font setup if any):
```ts
import { Inter, DM_Sans } from 'next/font/google'
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['400', '500', '600', '700', '800'],
})
```
Apply both `inter.variable` and `dmSans.variable` to the `<body>` className alongside any existing classes.

### Typography Scale

| Element | Class | Size | Weight | Color |
|---------|-------|------|--------|-------|
| Hero metric number | `font-display` | 52px | 800 | `ps-gold` |
| Page title | `font-display` | 36px | 800 | white |
| Section title (cards) | `font-display` | 16px | 700 | `ps-near-black` |
| KPI large number | `font-display` | 40px | 800 | `ps-near-black` |
| KPI label | `font-sans` | 12px | 500 | `ps-muted` (all-caps, `letter-spacing: 0.05em`) |
| Table body text | `font-sans` | 13px | 500 | `ps-near-black` |
| Table amount values | `font-display` | 13px | 600 | `ps-near-black` |
| Sidebar nav items | `font-sans` | 14px | 400 inactive / 600 active | `ps-slate-text` / `ps-gold` |
| Sidebar group labels | `font-sans` | 10px | 600 | `ps-slate-text` (all-caps, `letter-spacing: 0.08em`) |
| Badge text | `font-sans` | 11px | 500 | (per badge color) |

### Spacing Rhythm
- Gaps between body rows: `gap-8` (32px)
- Card internal padding: `p-6` (24px)
- Element gaps within cards: `gap-4` (16px)
- Header band padding: `py-8 px-12` (32px / 48px)
- Body padding: `py-9 px-12` (36px / 48px)
- Row 2 column gap: `gap-4` (16px)

---

## Database Schema (Authoritative)

Verified from `sql/schema.sql` and `src/types/index.ts`:

### `employees`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `company_id` | UUID FK | |
| `full_name` | TEXT | |
| `employee_id` | TEXT | Human-readable (e.g. EMP-001) |
| `is_active` | BOOLEAN | Default true |
| `worker_type` | TEXT | `'salaried'` \| `'commission'` \| `'daily'` — exhaustive |
| `monthly_salary` | NUMERIC | |

### `attendance_records`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `company_id` | UUID FK | |
| `employee_id` | UUID FK | |
| `date` | DATE | `'YYYY-MM-DD'` |
| `status` | TEXT | Default `'Present'`; other values possible (e.g. `'Absent'`) |

### `payroll_summaries`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `company_id` | UUID FK | |
| `employee_id` | UUID FK | |
| `month` | INTEGER | 1–12 |
| `year` | INTEGER | e.g. 2026 |
| `final_payable_salary` | NUMERIC | The authoritative payable amount |
| Unique constraint | — | `(employee_id, month, year)` |

### `employee_advances`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `company_id` | UUID FK | |
| `employee_id` | UUID FK | |
| `amount` | NUMERIC | Original advance amount |
| `advance_date` | DATE | |

### `advance_repayments`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `company_id` | UUID FK | |
| `advance_id` | UUID FK | → `employee_advances.id` |
| `employee_id` | UUID FK | |
| `amount` | NUMERIC | Amount repaid in this transaction |
| `repayment_date` | DATE | |

### `payments`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `company_id` | UUID FK | |
| `employee_id` | UUID FK | |
| `month` | TEXT | `'YYYY-MM'` format |
| `amount` | NUMERIC | |
| `payment_date` | DATE | |

> **Note on `expenses` table:** The existing dashboard does not query expenses. If the expenses table exists, use it for the Expenses KPI card. If missing, replace that card with a "Commission Workers" count card (matching the existing dashboard's data set) for this phase.

---

## Data Queries

### `currentMonth` definition
```ts
const today = new Date().toISOString().split('T')[0]        // 'YYYY-MM-DD'
const currentMonthStr = today.slice(0, 7)                   // 'YYYY-MM' — for payments table
const currentMonthInt = parseInt(today.slice(5, 7))         // integer 1-12 — for payroll_summaries
const currentYearInt = parseInt(today.slice(0, 4))          // integer — for payroll_summaries
const prevMonthDate = new Date(new Date().setMonth(new Date().getMonth() - 1))
const prevMonthInt = prevMonthDate.getMonth() + 1
const prevYearInt = prevMonthDate.getFullYear()
```

### Hero Metric — Total Payroll This Month
```ts
// Current month
const { data: currentPayroll } = await supabase
  .from('payroll_summaries')
  .select('final_payable_salary')
  .eq('company_id', companyId)
  .eq('month', currentMonthInt)
  .eq('year', currentYearInt)
const totalPayroll = currentPayroll?.reduce((s, r) => s + r.final_payable_salary, 0) ?? 0

// Previous month (for MoM trend)
const { data: prevPayroll } = await supabase
  .from('payroll_summaries')
  .select('final_payable_salary')
  .eq('company_id', companyId)
  .eq('month', prevMonthInt)
  .eq('year', prevYearInt)
const prevTotal = prevPayroll?.reduce((s, r) => s + r.final_payable_salary, 0) ?? 0

// MoM % = ((totalPayroll - prevTotal) / prevTotal) * 100
// If prevTotal === 0, do not show trend badge (avoid divide-by-zero)
```

### Hero Metric — Pending Payments & Paid Out
```ts
// Fetch all payroll_summaries for current month
const payrollRows = currentPayroll // reuse above

// Fetch all payments for current month
const { data: paymentsData } = await supabase
  .from('payments')
  .select('employee_id, amount')
  .eq('company_id', companyId)
  .eq('month', currentMonthStr)

// Sum payments per employee
const paidByEmployee: Record<string, number> = {}
paymentsData?.forEach(p => {
  paidByEmployee[p.employee_id] = (paidByEmployee[p.employee_id] ?? 0) + p.amount
})

// Classify each employee
let paidOut = 0, pending = 0
payrollRows?.forEach(r => {
  const paid = paidByEmployee[r.employee_id] ?? 0
  if (paid >= r.final_payable_salary) paidOut += r.final_payable_salary
  else {
    paidOut += paid
    pending += (r.final_payable_salary - paid)
  }
})
```

### Payment Status Widget (Fully Paid / Partial / Unpaid counts)
Using the same `payrollRows` and `paidByEmployee` from above:
```ts
let fullyPaid = 0, partial = 0, unpaid = 0
payrollRows?.forEach(r => {
  const paid = paidByEmployee[r.employee_id] ?? 0
  if (paid >= r.final_payable_salary) fullyPaid++
  else if (paid > 0) partial++
  else unpaid++
})
// Stacked bar proportions: by employee count (not salary amount)
```

### KPI Card — Total Employees
Reuse existing queries from current `page.tsx`:
```ts
supabase.from('employees').select('*', { count: 'exact', head: true })
  .eq('company_id', companyId).eq('is_active', true)
// Repeat with .eq('worker_type', 'salaried') / 'commission' / 'daily'
```

### KPI Card — Attendance Today
```ts
// Present count = records in attendance_records with date=today and status='Present'
const { count: presentCount } = await supabase
  .from('attendance_records')
  .select('*', { count: 'exact', head: true })
  .eq('company_id', companyId)
  .eq('date', today)
  .eq('status', 'Present')
// Total = totalEmployees (active) from above
// Attendance rate = presentCount / totalEmployees * 100
```

### KPI Card — Advances Outstanding
```ts
// Total given = sum of employee_advances.amount
// Total repaid = sum of advance_repayments.amount
// Outstanding = totalGiven - totalRepaid
// (repaid_amount NULL is not a column — always use advance_repayments table)
const { data: advances } = await supabase
  .from('employee_advances')
  .select('amount')
  .eq('company_id', companyId)

const { data: repayments } = await supabase
  .from('advance_repayments')
  .select('amount')
  .eq('company_id', companyId)

const totalGiven = advances?.reduce((s, r) => s + r.amount, 0) ?? 0
const totalRepaid = repayments?.reduce((s, r) => s + r.amount, 0) ?? 0
const outstanding = totalGiven - totalRepaid
```
> Remove the "due this month" badge — `advance_repayments` has no `next_deduction_date` column. Show only total outstanding and employee count.

### Employee Overview Table
```ts
const { data: employees } = await supabase
  .from('employees')
  .select('id, full_name, worker_type')
  .eq('company_id', companyId)
  .eq('is_active', true)
  .order('full_name', { ascending: true })
  .limit(5)

// For each employee, fetch attendance count for current month and payroll summary
// Can be done with a single select joining payroll_summaries or with Promise.all
```
- Attendance column: count of `attendance_records` where `employee_id = emp.id` AND `date` starts with `currentMonthStr` AND `status = 'Present'`
- Payable column: `final_payable_salary` from `payroll_summaries` where `employee_id = emp.id` AND `month = currentMonthInt` AND `year = currentYearInt`; show "—" if not found
- Avatar initials: first character of first word + first character of second word from `full_name`; fallback = first two characters of `full_name`

### Auth Session — User Display
```ts
const { data: { user } } = await supabase.auth.getUser()
// Name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Admin'
// Email: user.email ?? ''
// Initials: derived from name (first two words, first char each); fallback = name.slice(0,2).toUpperCase()
```

---

## Layout Architecture

### Shell (`AppShell.tsx`) — no code change
Current implementation uses `flex-row`. Confirm:
- Sidebar: `w-60 flex-shrink-0`
- Main: `flex-1 overflow-auto`

No margin-left offset needed (flex handles it).

### Sidebar (`Sidebar.tsx`) — full restyle
- **Background:** `bg-ps-slate` full height
- **Logo** (`px-7 mb-12`): 32×32 gold square (`bg-ps-gold rounded-lg`) with SVG grid icon + "PayrollOS" in `font-display font-bold text-[17px] text-white`
- **Nav groups** (`px-4 mb-8` each): group label (`text-[10px] font-semibold text-ps-slate-text uppercase tracking-widest px-3 mb-1.5`) + nav items
  - **Overview:** Dashboard, Employees, Attendance
  - **Payroll:** Reports, Advances, Payments, Expenses
  - **Analytics:** Charts, Comparison
- **Active item:** `bg-[rgba(212,168,71,0.12)] rounded-lg relative` + `absolute left-0 w-[3px] h-5 bg-ps-gold rounded-r` indicator + `text-ps-gold font-semibold`
- **Inactive item:** `text-ps-slate-text font-normal`
- **User area** (`mt-auto pt-5 mx-6 border-t border-white/[0.06] flex items-center gap-2.5`):
  - 32px circle `bg-ps-slate-mid rounded-full` with initials `text-[12px] font-semibold text-slate-300`
  - Name `text-[13px] font-medium text-slate-200` + email `text-[11px] text-ps-slate-text`

### Header Band (`dashboard/page.tsx`)
- `bg-ps-slate py-8 px-12`
- **Top row** (`flex justify-between items-start`):
  - Left: month label `text-[11px] font-medium text-ps-slate-text uppercase tracking-widest` + "Dashboard" `font-display text-4xl font-extrabold text-white tracking-tight`
  - Right (`flex items-center gap-3 mt-1.5`):
    - Month picker: `border border-white/[0.08] bg-white/[0.06] rounded-lg px-3.5 py-2 flex items-center gap-1.5` — calendar icon + month label `text-[13px] font-medium text-slate-400` — **decorative only, no filtering** (add a `title="Filtering coming soon"` tooltip)
    - "Run Payroll" CTA: `bg-ps-gold rounded-lg px-4 py-2.5 flex items-center gap-1.5` — plus SVG icon + `text-[13px] font-semibold text-ps-slate` — links to `/reports` via `<Link>`
- **Hero metric row** (`flex items-baseline gap-4 mt-5`):
  - **Total Payroll This Month:** label + `font-display text-[52px] font-extrabold text-ps-gold tracking-tight leading-tight` + MoM badge
    - MoM badge: `bg-green-400/10 rounded text-green-400 text-[11px] font-semibold px-2 py-0.5` if positive; red if negative; hidden if prevTotal === 0
  - Vertical divider: `w-px h-13 bg-white/[0.07] mx-4`
  - **Pending Payments:** label + `font-display text-[32px] font-bold text-white`
  - Vertical divider
  - **Paid Out:** label + `font-display text-[32px] font-bold text-white`
  - Empty state for all: show `₨ —` in muted text when no payroll_summaries exist for current month

### Body (`bg-ps-warm py-9 px-12 flex flex-col gap-8`)

#### KPI Row (`flex flex-row gap-4`)

All cards: `bg-white rounded-2xl border border-ps-border p-6 flex flex-col gap-4 flex-1`

**Card 1 — Total Employees**
- Icon bg: `bg-amber-50 w-8 h-8 rounded-lg` with people SVG in `ps-gold`
- Number: active employee count
- Sub: "Active this month"
- Badges row (`flex flex-wrap gap-2`):
  - Salaried: `bg-indigo-50 text-indigo-700 rounded-md px-2.5 py-1 text-[11px] font-medium` with indigo dot
  - Commission: `bg-amber-50 text-amber-800 rounded-md` with amber dot
  - Daily: `bg-green-50 text-green-800 rounded-md` with green dot
  - Only render badge if count > 0

**Card 2 — Attendance Today**
- Icon bg: `bg-green-50` with checkmark SVG in `green-500`
- Number: `presentCount / totalEmployees` with muted denominator `text-ps-muted text-base font-normal`
- Sub: `Present · ${totalEmployees - presentCount} absent`
- Progress bar: `w-full h-1.5 bg-gray-100 rounded-full overflow-hidden` → fill `bg-green-500` width = `${(presentCount / totalEmployees) * 100}%`
- Caption: `${Math.round((presentCount / totalEmployees) * 100)}% attendance rate`
- Empty state (totalEmployees === 0): show "No employees"

**Card 3 — Advances Outstanding**
- Icon bg: `bg-amber-50` with clock SVG in `ps-gold`
- Number: `₨ {outstanding.toLocaleString('en-IN')}`
- Sub: `Across ${numEmployeesWithAdvances} employees`
- Badge: `bg-amber-50 text-amber-800 rounded-md` — show only if outstanding > 0; text: "No outstanding advances" if zero
- No "due this month" — column doesn't exist in schema

**Card 4 — Expenses This Month** *(if expenses table exists, else Commission Workers card)*
- Icon bg: `bg-red-50` with list SVG in `red-500`
- Number: sum of `expenses.amount` for `month = currentMonthStr`
- Sub: `${count} transactions logged`
- Trend badge: same formula as payroll MoM; red if higher, green if lower; hidden if no previous data
- **Fallback (no expenses table):** show Commission Workers count instead (same as existing dashboard)

#### Bottom Row (`flex flex-row gap-4`)

**Employee Overview** (`flex-[2] bg-white rounded-2xl border border-ps-border overflow-hidden`)
- Header (`flex justify-between items-center px-6 py-5`): "Employee Overview" title + "View all →" `text-ps-gold text-[12px] font-medium` linking to `/employees`
- Column header row (`flex px-6 pb-2.5 border-b border-gray-100`): Employee | Type | Attendance | Payable — all `text-[11px] font-semibold text-ps-muted uppercase tracking-widest`
  - `flex-[2]` | `flex-1 text-center` | `flex-1 text-center` | `flex-1 text-right`
- Rows (`flex items-center px-6 py-3.5 border-b border-gray-50 last:border-0`):
  - Employee col: avatar circle (32px, initials, bg per worker_type) + `full_name`
  - Type col: badge pill per worker_type (same colors as Card 1 badges)
  - Attendance col: `w-12 h-1 bg-gray-100 rounded-full overflow-hidden` mini bar + `${present}/${workingDays}` fraction
  - Payable col: `₨ {amount}` or `—` if no payroll summary
- Empty state: single full-width row "No employees found" `text-ps-muted text-center py-8`

**Right Panel** (`flex-1 flex flex-col gap-4`)

*Quick Actions* (`bg-white rounded-2xl border border-ps-border p-5 flex flex-col gap-3`):
- Title: "Quick Actions" `font-display font-bold text-[15px] text-ps-near-black`
- Primary: `bg-ps-slate rounded-xl px-3.5 py-2.5 flex items-center gap-2.5` — plus SVG in `ps-gold` + "Mark Attendance" `text-white font-semibold text-[13px]` — `<Link href="/attendance">`
- Secondaries (`bg-ps-warm border border-ps-border rounded-xl px-3.5 py-2.5`):
  - Log Work Entry → `/work-entries`
  - Add Expense → `/expenses`
  - View Reports → `/reports`

*Payment Status* (`bg-ps-slate rounded-2xl p-5 flex flex-col gap-3.5`):
- Title: "Payment Status" `font-display font-bold text-[15px] text-white`
- Rows (`flex justify-between items-center`): label `text-[12px] text-ps-slate-text` + count `font-display font-bold text-[14px]`
  - Fully Paid: `text-green-400`
  - Partially Paid: `text-ps-gold`
  - Unpaid: `text-red-400`
- Stacked bar (`w-full h-[5px] bg-white/[0.08] rounded-full overflow-hidden flex`): green | gold | red divs, width proportional to counts; if all zero, hide bar
- Empty state: if no payroll_summaries for current month, show "No payroll data for this month" `text-ps-slate-text text-[12px]` — no progress bar

---

## Loading & Error States

- **Loading:** Each card uses a `loading.tsx` or client component with `useState`. Show gray skeleton rectangles (`animate-pulse bg-gray-200 rounded`) in place of numbers and bars.
- **Error:** Wrap Supabase calls in try/catch. On error, each card shows `"Could not load data"` in `text-ps-muted text-[12px]` — no retry button in this phase.
- **Null values:** Any metric returning `null` or an empty array renders `"—"` in the number slot, not `"₨ 0"`, unless the metric is a count (where 0 is meaningful).

---

## Responsive Behavior

All breakpoints use Tailwind's mobile-first convention (`md:` = `min-width: 768px`).

| Element | Default (< 768px) | `md:` (≥ 768px) | Desktop |
|---------|-------------------|-----------------|---------|
| Sidebar | Hidden | Hidden | Visible (reuse existing AppShell hamburger/mobile menu) |
| Header metrics | Stacked vertically, dividers hidden, one stat per row | Same | Inline with dividers |
| KPI cards | Single column (`flex-col`) | 2×2 grid (`grid grid-cols-2`) | 4-column row (`flex-row`) |
| Row 2 | `flex-col` | `flex-col` | `flex-row` |
| Header band padding | `py-6 px-4` | `py-8 px-8` | `py-8 px-12` |

Responsive sidebar behavior reuses `AppShell.tsx` existing hamburger pattern (already handles show/hide at `md:` breakpoint).

---

## Files to Modify

| File | Change |
|------|--------|
| `src/app/layout.tsx` | Add `next/font/google` imports for Inter + DM Sans; apply variables to `<body>` |
| `tailwind.config.ts` | Add `ps-*` color tokens and `display` font family under `theme.extend` — append only |
| `src/app/globals.css` | **Append** any needed CSS custom properties — do NOT remove or overwrite existing declarations |
| `src/components/Sidebar.tsx` | Full visual restyle per spec; no change to routing logic or active-state detection |
| `src/app/dashboard/page.tsx` | Full rewrite: new layout, all data queries per spec above |
| `src/components/AppShell.tsx` | **No code change** — verify it uses `flex-row` and sidebar has `flex-shrink-0` |

---

## What Is NOT Changing
- All Supabase query logic outside `/dashboard`
- Route structure, authentication, middleware
- Any page other than `/dashboard` (and `Sidebar.tsx`)
- PDF generation, payroll calculation utilities
- Existing Tailwind color classes used in non-dashboard pages (no existing classes are renamed)

---

## Success Criteria

1. Dashboard loads with dark slate header band and gold hero metric
2. Sidebar shows grouped nav (Overview / Payroll / Analytics) with gold active indicator on Dashboard
3. All 4 KPI cards display real data from Supabase
4. Hero metric row sums `final_payable_salary` from `payroll_summaries` for current `month` + `year`
5. Employee overview table shows up to 5 real employees, ordered by `full_name ASC`
6. Quick Actions link to correct routes
7. Payment Status widget derives paid/partial/unpaid from `payroll_summaries` + `payments` tables
8. All empty and loading states render without errors
9. No visual or functional regressions on any other page
10. At `< 768px`: KPI cards stack to single column, sidebar collapses via existing hamburger
11. At `< 768px`: hero metric row stacks vertically with no dividers
