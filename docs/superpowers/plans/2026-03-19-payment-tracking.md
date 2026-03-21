# Payment Tracking Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full/partial payment recording with history for all employee types (salaried, commission, daily), with remaining balance displayed per employee.

**Architecture:** A shared `PaymentModal` client component handles recording payments and showing history for any employee type. Each of the three pages (reports, work-entries, daily-attendance) gets a "Pay" button that opens the modal with the employee's current month payable. A new `payments` DB table stores all payment records.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (client + server), Tailwind CSS, date-fns

---

## Task 1: DB Migration (manual)

Run the following SQL in the Supabase SQL editor. Do **not** skip the RLS policy — it guards all payment reads/writes to the authenticated user's company.

- [ ] Open the Supabase dashboard → SQL editor
- [ ] Paste and run the SQL below

```sql
-- 1. Create the payments table
CREATE TABLE public.payments (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id   UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id  UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month        TEXT NOT NULL,        -- 'YYYY-MM' — the payroll month this payment covers
  amount       NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 3. Policy: authenticated users can only touch payments belonging to their company
CREATE POLICY "Company admins manage payments"
ON public.payments FOR ALL TO authenticated
USING  (company_id = get_my_company_id())
WITH CHECK (company_id = get_my_company_id());
```

> **Assumption:** `get_my_company_id()` already exists in the database (it is used by other tables such as `employee_advances`). If it does not exist, create it before running the above:
> ```sql
> CREATE OR REPLACE FUNCTION public.get_my_company_id()
> RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
>   SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
> $$;
> ```

---

## Task 2: TypeScript type

**File:** `src/types/index.ts`

- [ ] Open `src/types/index.ts`
- [ ] Append the `Payment` interface after the closing brace of the `DailyAttendance` interface (currently the last interface in the file, ending at line 124)

```ts
export interface Payment {
  id: string;
  company_id: string;
  employee_id: string;
  month: string;        // 'YYYY-MM'
  amount: number;
  payment_date: string; // 'YYYY-MM-DD'
  note: string | null;
  created_at: string;
}
```

Exact edit — add after line 124 (`}`):

```ts
// existing last line stays unchanged, add below:

export interface Payment {
  id: string;
  company_id: string;
  employee_id: string;
  month: string;        // 'YYYY-MM'
  amount: number;
  payment_date: string; // 'YYYY-MM-DD'
  note: string | null;
  created_at: string;
}
```

---

## Task 3: PaymentModal component

**File:** `src/components/PaymentModal.tsx` (new file)

- [ ] Create `src/components/PaymentModal.tsx` with the complete code below

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import type { Payment, EmployeeAdvance } from '@/types'

interface PaymentModalProps {
  employee: { id: string; full_name: string; employee_id: string }
  month: string                  // 'YYYY-MM'
  currentMonthPayable: number    // calculated for current month only
  companyId: string
  onClose: () => void
  onPaymentRecorded: () => void  // triggers parent to refresh balances
}

type Mode = 'idle' | 'partial'

// Combined history item for display
interface HistoryItem {
  date: string
  label: string
  amount: number
  note: string | null
  type: 'payment' | 'advance'
}

export default function PaymentModal({
  employee,
  month,
  currentMonthPayable,
  companyId,
  onClose,
  onPaymentRecorded,
}: PaymentModalProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [advances, setAdvances] = useState<EmployeeAdvance[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<Mode>('idle')
  const [partialAmount, setPartialAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Fetch payments + advances for this employee (all time) ──────────────────
  const fetchHistory = useCallback(async () => {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any
    const [{ data: paymentsData }, { data: advancesData }] = await Promise.all([
      supabase
        .from('payments')
        .select('*')
        .eq('company_id', companyId)
        .eq('employee_id', employee.id)
        .order('payment_date', { ascending: false }),
      supabase
        .from('employee_advances')
        .select('*')
        .eq('company_id', companyId)
        .eq('employee_id', employee.id)
        .order('advance_date', { ascending: false }),
    ])
    setPayments(paymentsData ?? [])
    setAdvances(advancesData ?? [])
    setLoading(false)
  }, [companyId, employee.id])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  // ── Balance computation ─────────────────────────────────────────────────────
  const paymentsThisMonth = payments
    .filter(p => p.month === month)
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const remainingThisMonth = currentMonthPayable - paymentsThisMonth

  // ── Payment history: merge payments + advances, sort by date desc ───────────
  const history: HistoryItem[] = [
    ...payments.map(p => ({
      date: p.payment_date,
      label: 'Salary payment',
      amount: Number(p.amount),
      note: p.note,
      type: 'payment' as const,
    })),
    ...advances.map(a => ({
      date: a.advance_date,
      label: 'Advance',
      amount: Number(a.amount),
      note: a.note ?? null,
      type: 'advance' as const,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  // ── Save helpers ────────────────────────────────────────────────────────────
  const savePayment = async (amount: number, date: string, noteText: string) => {
    setSaving(true)
    setError(null)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as unknown as any
      const { error: insertError } = await supabase.from('payments').insert({
        company_id: companyId,
        employee_id: employee.id,
        month,
        amount,
        payment_date: date,
        note: noteText.trim() || null,
      })
      if (insertError) throw new Error(insertError.message)
      await fetchHistory()
      onPaymentRecorded()
      setMode('idle')
      setPartialAmount('')
      setNote('')
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setSaving(false)
    }
  }

  const handlePayInFull = async () => {
    const amount = Math.max(0, remainingThisMonth)
    if (amount <= 0) {
      setError('Nothing remaining to pay for this month.')
      return
    }
    await savePayment(amount, paymentDate, note)
  }

  const handlePartialSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(partialAmount)
    if (isNaN(amount) || amount <= 0) {
      setError('Enter a valid amount greater than 0.')
      return
    }
    await savePayment(amount, paymentDate, note)
  }

  // ── Format helpers ──────────────────────────────────────────────────────────
  const fmtINR = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

  const fmtDate = (dateStr: string) => {
    try { return format(new Date(dateStr + 'T00:00:00'), 'MMM d, yyyy') } catch { return dateStr }
  }

  const monthLabel = (() => {
    try {
      const [y, m] = month.split('-')
      return format(new Date(parseInt(y), parseInt(m) - 1, 1), 'MMMM yyyy')
    } catch { return month }
  })()

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* ── Header ── */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{employee.full_name}</h2>
            <p className="text-sm text-gray-400">{employee.employee_id} · {monthLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-4"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Balance summary */}
          <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">This Month</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{fmtINR(currentMonthPayable)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Paid</p>
              <p className="text-lg font-bold text-green-600 mt-1">{fmtINR(paymentsThisMonth)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Remaining</p>
              <p className={`text-lg font-bold mt-1 ${remainingThisMonth <= 0 ? 'text-gray-400' : 'text-red-600'}`}>
                {fmtINR(Math.max(0, remainingThisMonth))}
              </p>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Action buttons / partial form */}
          {mode === 'idle' ? (
            <div className="flex gap-3">
              <button
                onClick={handlePayInFull}
                disabled={saving || remainingThisMonth <= 0}
                className="flex-1 rounded-lg bg-green-600 text-white py-2.5 text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : `Pay in Full (${fmtINR(Math.max(0, remainingThisMonth))})`}
              </button>
              <button
                onClick={() => { setMode('partial'); setError(null) }}
                disabled={saving}
                className="flex-1 rounded-lg border border-gray-300 bg-white text-gray-700 py-2.5 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Pay in Parts
              </button>
            </div>
          ) : (
            <form onSubmit={handlePartialSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Rs.)</label>
                <input
                  type="number"
                  value={partialAmount}
                  onChange={e => setPartialAmount(e.target.value)}
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 5000"
                  autoFocus
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="e.g. March partial"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-indigo-600 text-white py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Record Payment'}
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('idle'); setError(null) }}
                  disabled={saving}
                  className="flex-1 rounded-lg border border-gray-300 bg-white text-gray-700 py-2.5 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Payment history */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Payment History</h3>
            {loading ? (
              <p className="text-sm text-gray-400 text-center py-4">Loading history…</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No payments or advances recorded yet.</p>
            ) : (
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                {history.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {fmtDate(item.date)}
                        {item.note ? ` · ${item.note}` : ''}
                      </p>
                    </div>
                    <span className={`ml-4 text-sm font-semibold whitespace-nowrap ${item.type === 'advance' ? 'text-orange-600' : 'text-green-600'}`}>
                      {fmtINR(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
        {/* end scrollable body */}

      </div>
    </div>
  )
}
```

---

## Task 4: Integrate into PayrollDashboard (salaried)

Two files change: the server page pre-fetches payments, and the client dashboard component gains a Pay column.

### 4a. `src/app/reports/page.tsx` — fetch month payments server-side

- [ ] Open `src/app/reports/page.tsx`
- [ ] Add the import for the `Payment` type at the top of the file (after the existing imports):

```ts
import type { Payment } from '@/types'
```

- [ ] After the `advances` fetch block (currently ending around line 73), add a payments fetch:

```ts
  // Fetch payments for this month (for remaining-balance display in PayrollDashboard)
  const { data: monthPayments } = await supabase
    .from('payments')
    .select('*')
    .eq('company_id', companyId)
    .eq('month', selectedMonthStr)
```

- [ ] Pass `monthPayments` and `companyId` to `<PayrollDashboard>` in the return statement. Change:

```tsx
      <PayrollDashboard
        initialMonth={selectedMonthStr}
        employees={(employees || []) as any[]}
        attendance={(attendance || []) as any[]}
        advances={(advances || []) as any[]}
        companyName={companyName}
        generateAction={generatePayrollAction}
      />
```

to:

```tsx
      <PayrollDashboard
        initialMonth={selectedMonthStr}
        employees={(employees || []) as any[]}
        attendance={(attendance || []) as any[]}
        advances={(advances || []) as any[]}
        companyName={companyName}
        generateAction={generatePayrollAction}
        monthPayments={(monthPayments || []) as Payment[]}
        companyId={companyId}
      />
```

### 4b. `src/components/PayrollDashboard.tsx` — Pay column + modal

- [ ] Open `src/components/PayrollDashboard.tsx`

**Step 1 — Add imports.** At the top, add:

```ts
import type { Payment } from '@/types'
import PaymentModal from '@/components/PaymentModal'
```

**Step 2 — Extend `PayrollDashboardProps`.** Add two new optional fields:

```ts
interface PayrollDashboardProps {
  initialMonth: string
  employees: Employee[]
  attendance: AttendanceRecord[]
  advances: Advance[]
  generateAction: (data: any) => Promise<void>
  companyName: string
  monthPayments?: Payment[]   // ← ADD
  companyId?: string          // ← ADD
}
```

**Step 3 — Destructure the new props** in the function signature:

```ts
export default function PayrollDashboard({
  initialMonth,
  employees,
  attendance,
  advances,
  generateAction,
  companyName,
  monthPayments = [],   // ← ADD
  companyId = '',       // ← ADD
}: PayrollDashboardProps) {
```

**Step 4 — Add `payingEmployee` state.** After the existing `useState` calls (around line 134), add:

```ts
  const [payingEmployee, setPayingEmployee] = useState<{ id: string; full_name: string; employee_id: string } | null>(null)
```

**Step 5 — Add a `remainingForEmployee` helper.** After the `pdfTotalNetPayout` useMemo (around line 165), add:

```ts
  const getRemaining = (employeeId: string, payable: number): number => {
    const paid = monthPayments
      .filter(p => p.employee_id === employeeId)
      .reduce((sum, p) => sum + Number(p.amount), 0)
    return Math.max(0, payable - paid)
  }
```

**Step 6 — Add "Pay" column header** in the `<thead>`. The current last `<th>` is the PDF column:

```tsx
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">PDF</th>
```

Change it to:

```tsx
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">PDF</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pay</th>
```

**Step 7 — Add the `colSpan` on the empty-state row.** The current empty-state cell has `colSpan={8}`. Change it to `colSpan={9}`:

```tsx
                <td colSpan={9} className="px-6 py-8 text-center text-sm text-gray-500">
```

**Step 8 — Add "Pay" cell to each row.** The current last `<td>` in each row is the PDF button. After it, add:

```tsx
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    {companyId && row.final_payable_salary > 0 && (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-xs text-gray-400">
                          {getRemaining(row.employee_id, row.final_payable_salary) === 0
                            ? 'Paid'
                            : `Rem: ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(getRemaining(row.employee_id, row.final_payable_salary))}`
                          }
                        </span>
                        {getRemaining(row.employee_id, row.final_payable_salary) > 0 && (
                          <button
                            onClick={() => setPayingEmployee({
                              id: row.employee_id,
                              full_name: row.full_name,
                              employee_id: row.display_id,
                            })}
                            className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold"
                          >
                            Pay
                          </button>
                        )}
                      </div>
                    )}
                  </td>
```

**Step 9 — Mount the modal.** At the very end of the component's JSX, just before the closing `</>`, add:

```tsx
      {payingEmployee && companyId && (
        <PaymentModal
          employee={payingEmployee}
          month={selectedMonth}
          currentMonthPayable={
            computedPayroll.rows.find(r => r.employee_id === payingEmployee.id)?.final_payable_salary ?? 0
          }
          companyId={companyId}
          onClose={() => setPayingEmployee(null)}
          onPaymentRecorded={() => {
            setPayingEmployee(null)
            router.refresh()
          }}
        />
      )}
```

---

## Task 5: Integrate into WorkEntryManager (commission)

**File:** `src/app/work-entries/[employeeId]/components/WorkEntryManager.tsx`

- [ ] Open `WorkEntryManager.tsx`

**Step 1 — Add import for `PaymentModal`** after existing imports:

```ts
import PaymentModal from '@/components/PaymentModal'
```

**Step 2 — Add `isPaymentOpen` state** after the existing `useState` declarations (after `isDownloading`):

```ts
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
```

**Step 3 — Compute `monthTotal`** after the `entriesByDate` useMemo:

```ts
  const monthTotal = entries.reduce((sum, e) => sum + Number(e.total_amount), 0)
```

**Step 4 — Add "Record Payment" button** in the header area. The current header has a single `+ Log Day` button:

```tsx
        <button
          onClick={openAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          + Log Day
        </button>
```

Change it to a button group:

```tsx
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaymentOpen(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            Record Payment
          </button>
          <button
            onClick={openAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            + Log Day
          </button>
        </div>
```

**Step 5 — Mount `PaymentModal`** at the end of the return, just before the closing `</div>` of the root element. Place it after the `{isModalOpen && ...}` block:

```tsx
      {isPaymentOpen && (
        <PaymentModal
          employee={{
            id: employee.id,
            full_name: employee.full_name,
            employee_id: employee.employee_id,
          }}
          month={month}
          currentMonthPayable={monthTotal}
          companyId={companyId}
          onClose={() => setIsPaymentOpen(false)}
          onPaymentRecorded={() => setIsPaymentOpen(false)}
        />
      )}
```

---

## Task 6: Integrate into DailyAttendanceManager (daily)

**File:** `src/app/daily-attendance/components/DailyAttendanceManager.tsx`

- [ ] Open `DailyAttendanceManager.tsx`

**Step 1 — Add import for `PaymentModal`** after existing imports:

```ts
import PaymentModal from '@/components/PaymentModal'
```

**Step 2 — Add `payingWorker` state** after the existing `useState` declarations (after `saving`):

```ts
  const [payingWorker, setPayingWorker] = useState<Employee | null>(null)
```

**Step 3 — Add "Pay" column header** in the monthly summary table's `<thead>`. The current last `<th>` is "Total Pay":

```tsx
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Total Pay</th>
```

Change it to:

```tsx
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Total Pay</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Pay</th>
```

**Step 4 — Add "Pay" cell per worker row** in the monthly summary table. The current last `<td>` in each worker row shows total pay:

```tsx
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">Rs. {s.pay.toLocaleString()}</td>
```

Change it to:

```tsx
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">Rs. {s.pay.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">
                          {s.pay > 0 && (
                            <button
                              onClick={() => setPayingWorker(worker)}
                              className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold"
                            >
                              Pay
                            </button>
                          )}
                        </td>
```

**Step 5 — Extend the totals footer row** to add an empty cell for the new column. The current last `<td>` in the totals row ends with `totalPay`:

```tsx
                    <td className="px-4 py-3 text-right font-bold text-gray-900">Rs. {totalPay.toLocaleString()}</td>
```

Change it to:

```tsx
                    <td className="px-4 py-3 text-right font-bold text-gray-900">Rs. {totalPay.toLocaleString()}</td>
                    <td className="px-4 py-3"></td>
```

**Step 6 — Derive `currentMonthStr`** for the modal. Add this computed value after the `monthLabel` line (around line 159):

```ts
  const currentMonthStr = `${year}-${String(month).padStart(2, '0')}`
```

**Step 7 — Mount `PaymentModal`** at the end of the component, just before the final closing `</div>` of the root element (after the `{editingCell && ...}` block):

```tsx
      {payingWorker && (
        <PaymentModal
          employee={{
            id: payingWorker.id,
            full_name: payingWorker.full_name,
            employee_id: payingWorker.employee_id,
          }}
          month={currentMonthStr}
          currentMonthPayable={summaryMap.get(payingWorker.id)?.pay ?? 0}
          companyId={companyId}
          onClose={() => setPayingWorker(null)}
          onPaymentRecorded={() => setPayingWorker(null)}
        />
      )}
```

---

## Verification Checklist

After implementing all tasks, confirm the following:

- [ ] Supabase SQL editor shows the `payments` table with the correct columns and RLS enabled
- [ ] `src/types/index.ts` exports `Payment`
- [ ] `src/components/PaymentModal.tsx` exists and compiles without TypeScript errors
- [ ] `/reports` page: each employee row has a "Pay" column; clicking "Pay" opens the modal; after recording, the remaining balance updates
- [ ] `/work-entries/[employeeId]` page: header shows "Record Payment" button; modal opens with the correct month total
- [ ] `/daily-attendance` page: monthly summary table has a "Pay" button per worker; modal opens with correct pay value
- [ ] Modal: "Pay in Full" records `remainingThisMonth` and immediately re-fetches history
- [ ] Modal: "Pay in Parts" form validates amount > 0 before submitting
- [ ] Modal history shows both salary payments and advances, sorted newest first
- [ ] Supabase RLS prevents cross-company data leaks (manual check: confirm policy exists)

---

## Notes & Concerns

1. **`router.refresh()` in PayrollDashboard** — After a payment is recorded in the PayrollDashboard modal, `router.refresh()` is called. This re-runs the server page, which re-fetches `monthPayments` from Supabase and passes the updated array to the dashboard. This is correct for the server-component pattern used in `src/app/reports/page.tsx`.

2. **Balance in DailyAttendanceManager and WorkEntryManager** — These two pages do not pre-fetch payments from the server. The balance display (remaining/paid) is only available inside the modal after it opens and fetches its own data. There is no per-row remaining amount shown on the page itself before the modal is opened. This is intentional per the spec ("show a simple 'Pay' button without a pre-computed remaining").

3. **`companyId` in `PayrollDashboardProps`** — The prop is typed as `companyId?: string` (optional) to remain backward-compatible with any existing usages that do not pass it. The Pay column only renders when `companyId` is truthy.

4. **RLS assumption** — The plan assumes `get_my_company_id()` SQL function already exists. If it does not, the migration step documents the fallback DDL to create it first.

5. **`EmployeeAdvance.advance_date`** — The `EmployeeAdvance` interface in `src/types/index.ts` includes `advance_date: string` (line 63). The modal uses this field to populate history. No type change is needed for advances.

6. **No carry-over computation** — Per the spec, the modal shows only the current-month payable vs current-month payments. Full cross-month carry-over is deferred and requires querying all past payroll calculations, which is out of scope for this plan.
