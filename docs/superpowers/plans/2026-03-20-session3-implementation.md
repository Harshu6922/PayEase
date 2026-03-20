# Session 3 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add advance repayment tracking (multi-month, FIFO allocation), recurring expense templates (one-click apply), and overpayment alerts to the payroll app.

**Architecture:** Three independent feature tracks sharing one types update. Advance repayments replace the current same-month advance deduction model. The reports page fetches outstanding advance balances server-side and passes them down through PayrollDashboard into PaymentModal. Expense templates live in a new modal on the expenses page, applied via a button that bulk-inserts using `template_id` for idempotency.

**Tech Stack:** Next.js 14 App Router, Supabase (server + client), Framer Motion, Tailwind CSS, TypeScript

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/types/index.ts` | Modify | Add `AdvanceRepayment`, `ExpenseTemplate`, `OutstandingAdvancesEntry` types |
| `src/app/advances/page.tsx` | Modify | Fetch advances with repayment aggregates via SQL |
| `src/app/advances/components/AdvancesClient.tsx` | **Create** | Redesigned advance list with progress bars + "Log Repayment" buttons |
| `src/app/advances/components/LogRepaymentModal.tsx` | **Create** | Modal to log cash/salary repayment; validates amount ≤ remaining |
| `src/app/reports/page.tsx` | Modify | Fetch outstanding advances per employee; pass `outstandingByEmployee` to PayrollDashboard; remove month-filtered advances query |
| `src/components/PayrollDashboard.tsx` | Modify | Accept `outstandingByEmployee`; remove advance deduction from `calculatePayroll`; update Advances column; add overpaid/settled badges; forward to PaymentModal |
| `src/components/PaymentModal.tsx` | Modify | Add `outstandingAdvances` prop; advance recovery section; FIFO write to `advance_repayments`; overpayment warning |
| `src/app/expenses/components/TemplatesModal.tsx` | **Create** | CRUD modal for expense templates |
| `src/app/expenses/components/ExpensesManager.tsx` | Modify | Add "Manage Templates" + "Apply Templates" buttons and apply logic |

---

## Task 1: Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add new types to `src/types/index.ts`**

Append after the existing `Payment` interface:

```typescript
export interface AdvanceRepayment {
  id: string
  company_id: string
  advance_id: string
  employee_id: string
  amount: number
  repayment_date: string   // 'YYYY-MM-DD'
  method: 'salary_deduction' | 'cash'
  note: string | null
  created_at: string
}

export interface ExpenseTemplate {
  id: string
  company_id: string
  category: string
  description: string
  amount: number
  paid_to: string | null
  note: string | null
  created_at: string
}

// Per-employee outstanding advance data passed from reports page to PaymentModal
export interface OutstandingAdvancesEntry {
  totalOutstanding: number
  advances: { id: string; remaining: number; advance_date: string }[]
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd C:/Users/Lenovo/.gemini/antigravity/scratch/payroll-app && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors (new types don't affect existing code).

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add AdvanceRepayment, ExpenseTemplate, OutstandingAdvancesEntry types"
```

---

## Task 2: Advances Page Redesign

**Files:**
- Modify: `src/app/advances/page.tsx`
- Create: `src/app/advances/components/AdvancesClient.tsx`
- Create: `src/app/advances/components/LogRepaymentModal.tsx`

### Step 2a: LogRepaymentModal

- [ ] **Step 1: Create `src/app/advances/components/LogRepaymentModal.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

interface Props {
  advanceId: string
  employeeId: string
  companyId: string
  remaining: number
  onSaved: () => void
  onClose: () => void
}

const formatRs = (n: number) =>
  'Rs. ' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function LogRepaymentModal({ advanceId, employeeId, companyId, remaining, onSaved, onClose }: Props) {
  const supabase = createClient() as unknown as any
  const today = new Date().toISOString().split('T')[0]

  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [method, setMethod] = useState<'cash' | 'salary_deduction'>('cash')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) { setError('Enter a valid amount.'); return }
    if (amt > remaining) {
      setError(`Amount exceeds outstanding balance of ${formatRs(remaining)}.`)
      return
    }
    setSaving(true)
    const { error: err } = await supabase.from('advance_repayments').insert({
      company_id: companyId,
      advance_id: advanceId,
      employee_id: employeeId,
      amount: amt,
      repayment_date: date,
      method,
      note: note.trim() || null,
    })
    if (err) { setError(err.message); setSaving(false); return }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />
      <motion.div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      >
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Log Repayment</h2>
          <p className="text-xs text-gray-500 mt-0.5">Outstanding: {formatRs(remaining)}</p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Rs.) <span className="text-red-500">*</span></label>
            <input
              type="number" min="0.01" step="0.01" value={amount}
              onChange={e => setAmount(e.target.value)} placeholder="0.00"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
            <input
              type="date" value={date} onChange={e => setDate(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Method <span className="text-red-500">*</span></label>
            <select
              value={method} onChange={e => setMethod(e.target.value as 'cash' | 'salary_deduction')}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none"
            >
              <option value="cash">Cash</option>
              <option value="salary_deduction">Salary Deduction</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note <span className="text-gray-400 font-normal text-xs">(optional)</span></label>
            <input
              type="text" value={note} onChange={e => setNote(e.target.value)}
              placeholder="Any details…"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Log Repayment'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
```

### Step 2b: AdvancesClient

- [ ] **Step 2: Create `src/app/advances/components/AdvancesClient.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import LogRepaymentModal from './LogRepaymentModal'

export interface AdvanceWithBalance {
  id: string
  employee_id: string
  company_id: string
  amount: number
  advance_date: string
  note: string | null
  repaid_total: number
  remaining: number
  employee_name: string
  employee_display_id: string
}

const formatRs = (n: number) =>
  'Rs. ' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const row = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const } } }

export default function AdvancesClient({
  initialAdvances,
  companyId,
}: {
  initialAdvances: AdvanceWithBalance[]
  companyId: string
}) {
  const supabase = createClient() as unknown as any
  const [advances, setAdvances] = useState<AdvanceWithBalance[]>(initialAdvances)
  const [repayingAdvance, setRepayingAdvance] = useState<AdvanceWithBalance | null>(null)
  const [showSettled, setShowSettled] = useState(false)

  const active = advances.filter(a => a.remaining > 0)
  const settled = advances.filter(a => a.remaining <= 0)

  const handleRepaymentSaved = async () => {
    // Refresh advances with new balances
    const { data } = await supabase
      .from('employee_advances')
      .select(`
        id, employee_id, company_id, amount, advance_date, note,
        employees(full_name, employee_id),
        advance_repayments(amount)
      `)
      .eq('company_id', companyId)
      .order('advance_date', { ascending: false })

    if (data) {
      setAdvances(data.map((a: any) => {
        const repaid_total = (a.advance_repayments || []).reduce((s: number, r: any) => s + Number(r.amount), 0)
        return {
          id: a.id,
          employee_id: a.employee_id,
          company_id: a.company_id,
          amount: Number(a.amount),
          advance_date: a.advance_date,
          note: a.note,
          repaid_total,
          remaining: Number(a.amount) - repaid_total,
          employee_name: a.employees?.full_name ?? '—',
          employee_display_id: a.employees?.employee_id ?? '—',
        }
      }))
    }
    setRepayingAdvance(null)
  }

  const AdvanceRow = ({ adv }: { adv: AdvanceWithBalance }) => {
    const pct = Math.min(100, Math.round((adv.repaid_total / adv.amount) * 100))
    const isSettled = adv.remaining <= 0
    return (
      <motion.div variants={row} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors group">
        {/* Employee */}
        <div className="w-44 flex-shrink-0">
          <p className="text-sm font-semibold text-gray-900">{adv.employee_name}</p>
          <p className="text-xs text-gray-400">{adv.employee_display_id}</p>
        </div>
        {/* Date & note */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500">{format(new Date(adv.advance_date + 'T00:00:00'), 'dd MMM yyyy')}</p>
          {adv.note && <p className="text-xs text-gray-400 italic truncate">{adv.note}</p>}
        </div>
        {/* Progress */}
        <div className="w-32 flex-shrink-0">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{formatRs(adv.repaid_total)}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isSettled ? 'bg-green-500' : 'bg-indigo-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        {/* Amounts */}
        <div className="text-right flex-shrink-0 w-28">
          <p className="text-xs text-gray-400">of {formatRs(adv.amount)}</p>
          <p className={`text-sm font-bold ${isSettled ? 'text-green-600' : 'text-gray-900'}`}>
            {isSettled ? 'Settled' : `${formatRs(adv.remaining)} left`}
          </p>
        </div>
        {/* Action */}
        {!isSettled && (
          <button
            onClick={() => setRepayingAdvance(adv)}
            className="flex-shrink-0 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors opacity-0 group-hover:opacity-100"
          >
            Log Repayment
          </button>
        )}
        {isSettled && <div className="w-[110px] flex-shrink-0" />}
      </motion.div>
    )
  }

  return (
    <>
      {/* Active advances */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Active — {active.length} advance{active.length !== 1 ? 's' : ''}
        </div>
        {active.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">No active advances.</div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show">
            {active.map(adv => <AdvanceRow key={adv.id} adv={adv} />)}
          </motion.div>
        )}
      </div>

      {/* Settled section */}
      {settled.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowSettled(s => !s)}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium mb-2"
          >
            {showSettled ? '▾' : '▸'} Settled ({settled.length})
          </button>
          <AnimatePresence>
            {showSettled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl border bg-white shadow-sm overflow-hidden"
              >
                <motion.div variants={container} initial="hidden" animate="show">
                  {settled.map(adv => <AdvanceRow key={adv.id} adv={adv} />)}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Log Repayment Modal */}
      <AnimatePresence>
        {repayingAdvance && (
          <LogRepaymentModal
            advanceId={repayingAdvance.id}
            employeeId={repayingAdvance.employee_id}
            companyId={companyId}
            remaining={repayingAdvance.remaining}
            onSaved={handleRepaymentSaved}
            onClose={() => setRepayingAdvance(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
```

### Step 2c: Update Advances Page

- [ ] **Step 3: Rewrite `src/app/advances/page.tsx`**

Replace the entire file:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AddAdvanceModal from './components/AddAdvanceModal'
import AdvancesClient, { type AdvanceWithBalance } from './components/AdvancesClient'

export default async function AdvancesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('company_id').eq('id', user.id).maybeSingle()
  const companyId = (profileData as any)?.company_id
  if (!companyId) redirect('/login')

  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name, employee_id')
    .eq('is_active', true)
    .order('full_name')

  // Fetch advances with their repayment totals
  const { data: advancesRaw } = await supabase
    .from('employee_advances')
    .select(`
      id, employee_id, company_id, amount, advance_date, note,
      employees(full_name, employee_id),
      advance_repayments(amount)
    `)
    .eq('company_id', companyId)
    .order('advance_date', { ascending: false })

  const advances: AdvanceWithBalance[] = (advancesRaw || []).map((a: any) => {
    const repaid_total = (a.advance_repayments || []).reduce(
      (s: number, r: any) => s + Number(r.amount), 0
    )
    return {
      id: a.id,
      employee_id: a.employee_id,
      company_id: a.company_id,
      amount: Number(a.amount),
      advance_date: a.advance_date,
      note: a.note,
      repaid_total,
      remaining: Number(a.amount) - repaid_total,
      employee_name: a.employees?.full_name ?? '—',
      employee_display_id: a.employees?.employee_id ?? '—',
    }
  })

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Advances</h1>
          <p className="mt-1 text-sm text-gray-500">Record and track salary advances given to employees.</p>
        </div>
        <AddAdvanceModal employees={employees || []} />
      </div>
      <AdvancesClient initialAdvances={advances} companyId={companyId} />
    </div>
  )
}
```

- [ ] **Step 4: Run TypeScript check**

```bash
cd C:/Users/Lenovo/.gemini/antigravity/scratch/payroll-app && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/advances/page.tsx src/app/advances/components/AdvancesClient.tsx src/app/advances/components/LogRepaymentModal.tsx
git commit -m "feat: redesign advances page with repayment tracking and progress bars"
```

---

## Task 3: Reports Page — Outstanding Advances Query

**Files:**
- Modify: `src/app/reports/page.tsx`

The reports page currently fetches advances filtered to the selected month date range (lines 95–101). This must be **replaced** with a query that fetches all outstanding (unrepaid) advances per employee across all months.

- [ ] **Step 1: Replace the advances query in `src/app/reports/page.tsx`**

Remove these lines (approx 95–101):
```typescript
// Fetch Advances for this exact month spread
const { data: advances } = await supabase
  .from('employee_advances')
  .select('employee_id, amount')
  .eq('company_id', companyId)
  .gte('advance_date', startDate)
  .lte('advance_date', endDate)
```

Replace with:
```typescript
// Fetch ALL outstanding (unrepaid) advances per employee
const { data: advancesRaw } = await supabase
  .from('employee_advances')
  .select(`
    id, employee_id, amount, advance_date,
    advance_repayments(amount)
  `)
  .eq('company_id', companyId)

// Build outstandingByEmployee map
const outstandingByEmployee: Record<string, { totalOutstanding: number; advances: { id: string; remaining: number; advance_date: string }[] }> = {}
;(advancesRaw || []).forEach((a: any) => {
  const repaid = (a.advance_repayments || []).reduce((s: number, r: any) => s + Number(r.amount), 0)
  const remaining = Number(a.amount) - repaid
  if (remaining <= 0) return  // settled, skip
  if (!outstandingByEmployee[a.employee_id]) {
    outstandingByEmployee[a.employee_id] = { totalOutstanding: 0, advances: [] }
  }
  outstandingByEmployee[a.employee_id].totalOutstanding += remaining
  outstandingByEmployee[a.employee_id].advances.push({
    id: a.id,
    remaining,
    advance_date: a.advance_date,
  })
  // Sort advances oldest-first for FIFO allocation
  outstandingByEmployee[a.employee_id].advances.sort(
    (x, y) => x.advance_date.localeCompare(y.advance_date)
  )
})
```

- [ ] **Step 2: Update the PayrollDashboard render call**

Change the `advances` prop to `outstandingByEmployee`:

```typescript
// Before:
advances={(advances || []) as any[]}

// After:
outstandingByEmployee={outstandingByEmployee}
```

Also remove the `advances` prop entirely from the call.

- [ ] **Step 3: Run TypeScript check**

```bash
cd C:/Users/Lenovo/.gemini/antigravity/scratch/payroll-app && npx tsc --noEmit 2>&1 | head -30
```

Expected: errors about `advances` prop no longer existing and `outstandingByEmployee` prop not yet defined on PayrollDashboard — these will be fixed in Task 4.

- [ ] **Step 4: Commit (can be staged only — don't run build yet)**

```bash
git add src/app/reports/page.tsx
git commit -m "feat: replace month-advances query with outstanding advances per employee"
```

---

## Task 4: PayrollDashboard + PaymentModal — Advance Recovery & Alerts

**Files:**
- Modify: `src/components/PayrollDashboard.tsx`
- Modify: `src/components/PaymentModal.tsx`

### Step 4a: Update PayrollDashboard

- [ ] **Step 1: Update `PayrollDashboardProps` interface in `PayrollDashboard.tsx`**

Replace:
```typescript
advances: Advance[]
```
With:
```typescript
outstandingByEmployee: Record<string, { totalOutstanding: number; advances: { id: string; remaining: number; advance_date: string }[] }>
```

Remove the `Advance` interface (no longer needed).

- [ ] **Step 2: Update `calculatePayroll` function signature and body**

Remove `advances` from the function parameters and body:

```typescript
// Remove from signature:
advances: Advance[],

// Remove from body (lines ~119–122):
const empAdvances = advances.filter(a => a.employee_id === emp.id)
const total_advances = empAdvances.reduce((sum, adv) => sum + Number(adv.amount), 0)
const final_payable_salary = earned_salary + total_overtime_amount - total_deduction_amount - total_advances

// Replace with:
const total_advances = 0  // advances now tracked via repayments; column shows outstanding balance
const final_payable_salary = earned_salary + total_overtime_amount - total_deduction_amount
```

Keep `total_advances: 0` in the returned row so the table column still exists.

- [ ] **Step 3: Update `useMemo` call for `calculatePayroll` in the component body**

Remove `advances` from the dependency array and call:
```typescript
// Before:
return calculatePayroll(employees, attendance, workEntries, agentRates, dailyAttendance, advances, actualDaysInMonth)
}, [employees, attendance, workEntries, agentRates, dailyAttendance, advances, actualDaysInMonth])

// After:
return calculatePayroll(employees, attendance, workEntries, agentRates, dailyAttendance, actualDaysInMonth)
}, [employees, attendance, workEntries, agentRates, dailyAttendance, actualDaysInMonth])
```

- [ ] **Step 4: Update the Advances column in the table**

Replace the cell:
```typescript
// Before:
<td className="whitespace-nowrap px-6 py-4 text-right text-sm text-orange-500">
  {row.total_advances > 0 ? `-${formatINR(row.total_advances)}` : '-'}
</td>

// After:
<td className="whitespace-nowrap px-6 py-4 text-right text-sm text-orange-500">
  {(() => {
    const outstanding = outstandingByEmployee[row.employee_id]?.totalOutstanding ?? 0
    return outstanding > 0 ? formatINR(outstanding) : '-'
  })()}
</td>
```

- [ ] **Step 5: Add overpaid/settled badges to the Net Payable cell**

`paidByEmployee` is already a `useMemo` in the component that maps `employee_id → total paid this month` from `localPayments`. It is available in scope wherever the table row JSX is rendered.

Find the Net Payable `<td>` cell (around line 546). It contains an IIFE `{(() => { ... })()}`. Replace the entire IIFE body with:

```typescript
const paid = paidByEmployee[row.employee_id] ?? 0
const remaining = row.final_payable_salary - paid
if (row.final_payable_salary < 0) {
  return <span className="text-red-600">Recover ({formatINR(Math.abs(row.final_payable_salary))})</span>
}
if (remaining < 0) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-red-600 font-bold">{formatINR(Math.abs(remaining))}</span>
      <span className="text-[10px] font-semibold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Overpaid</span>
    </span>
  )
}
if (remaining === 0) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-gray-400 line-through">{formatINR(row.final_payable_salary)}</span>
      <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Settled</span>
    </span>
  )
}
return <span className="text-green-600">{formatINR(remaining)}</span>
```

- [ ] **Step 6: Forward `outstandingByEmployee` into `PaymentModal`**

Find the existing `<PaymentModal .../>` call in the JSX (around line 596). **Leave all existing props unchanged.** Add only one new prop:

```typescript
outstandingAdvances={outstandingByEmployee[paymentModal.row.employee_id] ?? { totalOutstanding: 0, advances: [] }}
```

The full call should look like:
```typescript
<PaymentModal
  employee={{
    id: paymentModal.row.employee_id,
    full_name: paymentModal.row.full_name,
    employee_id: paymentModal.row.display_id,
  }}
  month={selectedMonth}
  currentMonthPayable={paymentModal.payable}
  companyId={companyId}
  outstandingAdvances={outstandingByEmployee[paymentModal.row.employee_id] ?? { totalOutstanding: 0, advances: [] }}
  onClose={() => setPaymentModal(null)}
  onPaymentRecorded={async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient() as unknown as any
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('company_id', companyId)
      .eq('month', selectedMonth)
    if (data) setLocalPayments(data)
    router.refresh()
  }}
/>
```

### Step 4b: Update PaymentModal

- [ ] **Step 7: Add `outstandingAdvances` prop to `PaymentModal`**

Add to the props interface:
```typescript
outstandingAdvances: {
  totalOutstanding: number
  advances: { id: string; remaining: number; advance_date: string }[]
}
```

- [ ] **Step 8: Add recovery state variables**

Add after existing `useState` declarations:
```typescript
const [recoveryAmount, setRecoveryAmount] = useState('')
```

- [ ] **Step 9: Add recovery section to the modal UI**

After the "Balance Summary" section and before "Action Buttons", insert:

```typescript
{/* Advance Recovery */}
{outstandingAdvances.totalOutstanding > 0 && (
  <div className="rounded-lg bg-orange-50 border border-orange-100 p-4 space-y-3">
    <p className="text-sm font-semibold text-orange-800">Advance Recovery</p>
    <div className="space-y-1">
      {outstandingAdvances.advances.map(adv => (
        <div key={adv.id} className="flex justify-between text-xs text-orange-700">
          <span>Advance ({format(new Date(adv.advance_date + 'T00:00:00'), 'dd MMM yyyy')})</span>
          <span className="font-semibold">{formatRs(adv.remaining)} outstanding</span>
        </div>
      ))}
    </div>
    <div>
      <label className="block text-xs font-medium text-orange-800 mb-1">
        Recover this month (Rs.) — Total outstanding: {formatRs(outstandingAdvances.totalOutstanding)}
      </label>
      <input
        type="number" min="0" step="0.01"
        max={outstandingAdvances.totalOutstanding}
        value={recoveryAmount}
        onChange={e => setRecoveryAmount(e.target.value)}
        placeholder="0.00"
        className="block w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </div>
  </div>
)}
```

- [ ] **Step 10: Add overpayment warning**

Compute the warning just before the return statement (or inside the JSX):
```typescript
const recovery = parseFloat(recoveryAmount) || 0
const overpaymentAmount = paymentsThisMonth + (mode === 'parts' ? (parseFloat(partialAmount) || 0) : remainingThisMonth) - (currentMonthPayable - recovery)
const isOverpaying = overpaymentAmount > 0
```

Add the warning banner inside the action section, just before the Record Payment button:
```typescript
{isOverpaying && (
  <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2 text-sm text-yellow-800">
    ⚠️ This payment exceeds the remaining net payable by {formatRs(overpaymentAmount)}. Proceed anyway?
  </div>
)}
```

- [ ] **Step 11: Add FIFO advance repayment writes on save**

Update `recordPayment` to also write `advance_repayments` when `recovery > 0`:

```typescript
async function recordPayment(amount: number, date: string, noteText: string) {
  setSaving(true)
  setError(null)
  const recovery = parseFloat(recoveryAmount) || 0

  // 1. Record salary payment
  const { error: err } = await supabase.from('payments').insert({
    company_id: companyId,
    employee_id: employee.id,
    month,
    amount,
    payment_date: date,
    note: noteText || null,
  })
  if (err) { setError(err.message); setSaving(false); return }

  // 2. FIFO advance repayments
  if (recovery > 0) {
    let remaining = recovery
    for (const adv of outstandingAdvances.advances) {
      if (remaining <= 0) break
      const toRepay = Math.min(remaining, adv.remaining)
      await supabase.from('advance_repayments').insert({
        company_id: companyId,
        advance_id: adv.id,
        employee_id: employee.id,
        amount: toRepay,
        repayment_date: date,
        method: 'salary_deduction',
        note: noteText || null,
      })
      remaining -= toRepay
    }
  }

  // Re-fetch payments (existing code)
  const { data } = await supabase
    .from('payments').select('*')
    .eq('employee_id', employee.id)
    .order('payment_date', { ascending: false })
  if (data) setPayments(data)
  setMode(null)
  setPartialAmount('')
  setRecoveryAmount('')
  setNote('')
  setSaving(false)
  onPaymentRecorded()
}
```

- [ ] **Step 12: Run TypeScript check**

```bash
cd C:/Users/Lenovo/.gemini/antigravity/scratch/payroll-app && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 13: Commit**

```bash
git add src/components/PayrollDashboard.tsx src/components/PaymentModal.tsx
git commit -m "feat: advance recovery in PaymentModal, outstanding balance column, overpaid/settled badges"
```

---

## Task 5: Recurring Expense Templates

**Files:**
- Create: `src/app/expenses/components/TemplatesModal.tsx`
- Modify: `src/app/expenses/components/ExpensesManager.tsx`

### Step 5a: Run SQL migration

- [ ] **Step 1: Add `template_id` column to expenses table in Supabase**

Run in Supabase SQL editor:
```sql
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES expense_templates(id) ON DELETE SET NULL;
```

### Step 5b: TemplatesModal

- [ ] **Step 2: Create `src/app/expenses/components/TemplatesModal.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES } from './ExpensesManager'
import type { ExpenseTemplate } from '@/types'

interface Props {
  companyId: string
  initialTemplates: ExpenseTemplate[]
  onClose: () => void
  onChanged: (templates: ExpenseTemplate[]) => void
}

const row = { hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' as const } } }

const emptyForm = { category: 'Other', description: '', amount: '', paid_to: '', note: '' }

export default function TemplatesModal({ companyId, initialTemplates, onClose, onChanged }: Props) {
  const supabase = createClient() as unknown as any
  const [templates, setTemplates] = useState<ExpenseTemplate[]>(initialTemplates)
  const [editing, setEditing] = useState<ExpenseTemplate | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const openAdd = () => { setEditing(null); setForm(emptyForm); setFormOpen(true); setError(null) }
  const openEdit = (t: ExpenseTemplate) => {
    setEditing(t)
    setForm({ category: t.category, description: t.description, amount: String(t.amount), paid_to: t.paid_to ?? '', note: t.note ?? '' })
    setFormOpen(true)
    setError(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.description.trim()) { setError('Description is required.'); return }
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) { setError('Enter a valid amount.'); return }
    setSaving(true)
    const payload = {
      company_id: companyId,
      category: form.category,
      description: form.description.trim(),
      amount,
      paid_to: form.paid_to.trim() || null,
      note: form.note.trim() || null,
    }
    if (editing) {
      const { data, error: err } = await supabase
        .from('expense_templates').update(payload).eq('id', editing.id).select('*').single()
      if (err) { setError(err.message); setSaving(false); return }
      const next = templates.map(t => t.id === editing.id ? data : t)
      setTemplates(next); onChanged(next)
    } else {
      const { data, error: err } = await supabase
        .from('expense_templates').insert(payload).select('*').single()
      if (err) { setError(err.message); setSaving(false); return }
      const next = [...templates, data]
      setTemplates(next); onChanged(next)
    }
    setSaving(false)
    setFormOpen(false)
    setEditing(null)
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    await supabase.from('expense_templates').delete().eq('id', id)
    const next = templates.filter(t => t.id !== id)
    setTemplates(next); onChanged(next)
    setDeleting(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Recurring Templates</h2>
          <div className="flex items-center gap-2">
            <button onClick={openAdd}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add Template
            </button>
            <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {/* Inline form */}
          <AnimatePresence>
            {formOpen && (
              <motion.form
                onSubmit={handleSave}
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-3"
              >
                <p className="text-sm font-semibold text-indigo-800">{editing ? 'Edit Template' : 'New Template'}</p>
                {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                    <select value={form.category} onChange={e => set('category', e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Amount (Rs.) *</label>
                    <input type="number" min="0.01" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)}
                      placeholder="0.00"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description *</label>
                  <input type="text" value={form.description} onChange={e => set('description', e.target.value)}
                    placeholder="e.g. Monthly rent, Maid salary…"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Paid To</label>
                    <input type="text" value={form.paid_to} onChange={e => set('paid_to', e.target.value)}
                      placeholder="Vendor / person"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Note</label>
                    <input type="text" value={form.note} onChange={e => set('note', e.target.value)}
                      placeholder="Optional"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setFormOpen(false)} disabled={saving}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                    {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Template'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Template list */}
          {templates.length === 0 && !formOpen ? (
            <p className="text-center text-sm text-gray-400 py-8">No templates yet. Add one to get started.</p>
          ) : (
            <motion.div className="space-y-2">
              {templates.map(t => (
                <motion.div key={t.id} variants={row}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 group hover:bg-white hover:shadow-sm transition-all">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{t.description}</p>
                    <p className="text-xs text-gray-400">{t.category}{t.paid_to ? ` · ${t.paid_to}` : ''}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                    Rs. {Number(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(t)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(t.id)} disabled={deleting === t.id}
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
```

### Step 5c: Update ExpensesManager

- [ ] **Step 3: Update `src/app/expenses/components/ExpensesManager.tsx`**

Add these imports at the top:
```typescript
import { Settings2, CalendarPlus } from 'lucide-react'
import type { ExpenseTemplate } from '@/types'
import TemplatesModal from './TemplatesModal'
```

Update the component props to accept `initialTemplates`:
```typescript
export default function ExpensesManager({
  month, companyId, initialExpenses, initialTemplates
}: {
  month: string
  companyId: string
  initialExpenses: Expense[]
  initialTemplates: ExpenseTemplate[]
})
```

Add state variables after existing ones:
```typescript
const [templates, setTemplates] = useState<ExpenseTemplate[]>(initialTemplates)
const [templatesOpen, setTemplatesOpen] = useState(false)
const [applying, setApplying] = useState(false)
const [applyResult, setApplyResult] = useState<string | null>(null)
```

Add the "Apply Templates" handler:
```typescript
const handleApplyTemplates = async () => {
  if (templates.length === 0) return
  setApplying(true)
  setApplyResult(null)

  // Determine the date to use:
  // If today is within the selected month, use today. Otherwise use last day of month.
  const [year, mon] = month.split('-').map(Number)
  const today = new Date()
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() + 1 === mon
  const lastDay = new Date(year, mon, 0).getDate()
  const applyDate = isCurrentMonth
    ? today.toISOString().split('T')[0]
    : `${month}-${String(lastDay).padStart(2, '0')}`

  // Fetch which templates already applied this month (by template_id)
  const startDate = `${month}-01`
  const endDate = `${month}-${String(lastDay).padStart(2, '0')}`
  const { data: existing } = await supabase
    .from('expenses')
    .select('template_id')
    .eq('company_id', companyId)
    .gte('date', startDate)
    .lte('date', endDate)
    .not('template_id', 'is', null)

  const appliedTemplateIds = new Set((existing || []).map((e: any) => e.template_id))

  const toInsert = templates.filter(t => !appliedTemplateIds.has(t.id))
  const skipped = templates.length - toInsert.length

  if (toInsert.length > 0) {
    const payload = toInsert.map(t => ({
      company_id: companyId,
      date: applyDate,
      category: t.category,
      description: t.description,
      amount: t.amount,
      paid_to: t.paid_to,
      note: t.note,
      template_id: t.id,
    }))
    const { data: inserted } = await supabase
      .from('expenses').insert(payload).select('*')
    if (inserted) {
      setExpenses(prev =>
        [...prev, ...inserted].sort((a, b) => b.date.localeCompare(a.date))
      )
    }
  }

  setApplyResult(
    `${toInsert.length} added${skipped > 0 ? `, ${skipped} skipped (already applied this month)` : ''}`
  )
  setApplying(false)
}
```

Update the header section to add the two new buttons (before "Add Expense"):
```typescript
{templates.length > 0 && (
  <button
    onClick={handleApplyTemplates}
    disabled={applying}
    className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
  >
    <CalendarPlus className="h-4 w-4" />
    {applying ? 'Applying…' : 'Apply Templates'}
  </button>
)}
<button
  onClick={() => setTemplatesOpen(true)}
  className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
>
  <Settings2 className="h-4 w-4" />
  Templates
</button>
```

Add apply result toast below the header:
```typescript
{applyResult && (
  <div className="mb-4 flex items-center justify-between rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800">
    <span>✓ {applyResult}</span>
    <button onClick={() => setApplyResult(null)} className="text-green-600 hover:text-green-800 font-bold ml-4">×</button>
  </div>
)}
```

Add TemplatesModal to the modals section:
```typescript
<AnimatePresence>
  {templatesOpen && (
    <TemplatesModal
      companyId={companyId}
      initialTemplates={templates}
      onClose={() => setTemplatesOpen(false)}
      onChanged={setTemplates}
    />
  )}
</AnimatePresence>
```

### Step 5d: Update Expenses Page

- [ ] **Step 4: Update `src/app/expenses/page.tsx` to fetch templates**

Add after the expenses query:
```typescript
const { data: templates } = await supabase
  .from('expense_templates')
  .select('*')
  .eq('company_id', companyId)
  .order('created_at', { ascending: true })
```

Pass to ExpensesManager:
```typescript
<ExpensesManager
  key={month}
  month={month}
  companyId={companyId}
  initialExpenses={(expenses || []) as any[]}
  initialTemplates={(templates || []) as any[]}
/>
```

- [ ] **Step 5: Run TypeScript check**

```bash
cd C:/Users/Lenovo/.gemini/antigravity/scratch/payroll-app && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/expenses/components/TemplatesModal.tsx src/app/expenses/components/ExpensesManager.tsx src/app/expenses/page.tsx
git commit -m "feat: recurring expense templates with one-click apply and idempotency"
```

---

## Task 6: Final TypeScript Check & Build

- [ ] **Step 1: Full TypeScript check**

```bash
cd C:/Users/Lenovo/.gemini/antigravity/scratch/payroll-app && npx tsc --noEmit 2>&1
```

Expected: exit code 0, no output.

- [ ] **Step 2: Build check**

```bash
cd C:/Users/Lenovo/.gemini/antigravity/scratch/payroll-app && npx next build 2>&1 | tail -20
```

Expected: "✓ Compiled successfully" with no errors.

- [ ] **Step 3: Final commit if any fixes were made**

```bash
git add -A && git commit -m "fix: resolve any build/type issues from session 3"
```

---

## Acceptance Criteria

- [ ] Advances page shows each advance with a progress bar and remaining balance
- [ ] "Log Repayment" modal blocks saving if amount > remaining
- [ ] Cash repayments logged on advances page update the balance immediately
- [ ] Reports page Advances column shows total outstanding balance (not this month's advances)
- [ ] PaymentModal shows advance recovery section when employee has outstanding advances
- [ ] Saving a payment with recovery > 0 writes FIFO repayment records to `advance_repayments`
- [ ] Net payable cell shows "Overpaid" badge (red) when remaining < 0
- [ ] Net payable cell shows "Settled" badge (green) when remaining = 0
- [ ] Overpayment warning banner appears in PaymentModal when payment would exceed net payable
- [ ] Expenses page shows "Templates" button; CRUD modal works
- [ ] "Apply Templates" creates expenses for current month using today's date (or last day if past month)
- [ ] Applying twice skips already-applied templates (template_id deduplication)
- [ ] TypeScript check passes clean (`tsc --noEmit` exit 0)
