# Payment Tracking Design

**Date:** 2026-03-19
**Status:** Approved

---

## Overview

A payment tracking system that lets admins record full or partial salary payments for every employee type (salaried, commission, daily). Unpaid balances carry over month-to-month. Payment history shows both advances and salary payments combined.

---

## 1. Database

### New table: `payments`

```sql
CREATE TABLE public.payments (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id   UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id  UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month        TEXT NOT NULL,        -- 'YYYY-MM' — the payroll month this payment is for
  amount       NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins manage payments"
ON public.payments FOR ALL TO authenticated
USING (company_id = get_my_company_id())
WITH CHECK (company_id = get_my_company_id());
```

---

## 2. TypeScript Type

Add to `src/types/index.ts`:

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

---

## 3. Balance Calculation

For any employee on any month:

```
total_owed     = current_month_payable + carry_over_from_all_previous_months
total_paid     = SUM(payments.amount WHERE employee_id = ? AND month <= current_month)
remaining      = total_owed − total_paid
carry_over     = SUM(payable_for_month) − SUM(payments_for_month) for all past months
```

**Note:** The full carry-over formula above is aspirational. The modal UI (section 4) uses a simpler per-month approach for performance reasons — it shows this month's payable vs this month's payments, and the full history lets the admin see any unpaid previous months. Future work could compute true cumulative carry-over.

**Important:** `total_paid` is cumulative across ALL months, not just the current month. This means:
- If an employee was owed Rs. 10,000 in Feb and Rs. 12,000 in March
- And only Rs. 8,000 was paid total
- Then remaining = Rs. 14,000

For the UI, show:
- **This month's payable** — current month calculation only
- **Carry-over** — unpaid from previous months (if any)
- **Total owed** — sum of both
- **Total paid** — all payments ever recorded
- **Remaining** — total owed − total paid

---

## 4. Payment Modal Component

**File:** `src/components/PaymentModal.tsx` (shared across all employee types)

**Props:**
```ts
interface PaymentModalProps {
  employee: { id: string; full_name: string; employee_id: string }
  month: string           // 'YYYY-MM' — current viewing month
  currentMonthPayable: number   // calculated for current month only
  companyId: string
  onClose: () => void
  onPaymentRecorded: () => void  // triggers parent to refresh balances
}
```

**State:**
- `payments: Payment[]` — fetched on mount (all payments for this employee)
- `advances: EmployeeAdvance[]` — fetched on mount (all advances for this employee)
- `partialAmount: string` — input for partial payment
- `paymentDate: string` — defaults to today
- `note: string`
- `saving: boolean`
- `error: string | null`
- `loading: boolean`

**On mount:** fetch all `payments` and `employee_advances` for this employee

**Balance computation (inside modal):**
```ts
// carry_over: need payable for past months — passed in or computed from total_paid vs cumulative
// Simplified: total_owed = currentMonthPayable + (all_previous_unpaid)
// all_previous_unpaid is hard to compute client-side without all past payroll data
// Approach: show currentMonthPayable separately, and let total_paid speak for itself
// remaining = currentMonthPayable - paymentsThisMonth
const paymentsThisMonth = payments
  .filter(p => p.month === month)
  .reduce((sum, p) => sum + Number(p.amount), 0)
const remainingThisMonth = currentMonthPayable - paymentsThisMonth
```

**Note on carry-over:** Full carry-over calculation requires payroll data from all previous months which is expensive to compute client-side. The modal shows:
- This month's payable
- Payments recorded this month
- Remaining for this month
- Full payment history (all months) at the bottom

Cross-month carry-over is shown implicitly in the history — the admin can see unpaid months.

**UI Layout:**
```
[Employee Name] — [Month Label]

This Month's Payable:   Rs. 12,500
Paid This Month:        Rs.  4,000
Remaining This Month:   Rs.  8,500

[Pay in Full]   [Pay in Parts]

  (when Pay in Parts selected):
  Amount: [________]
  Date:   [________]
  Note:   [________]  (optional)
  [Record Payment]

──── Payment History ────────────────────
Mar 10  Advance        Rs.  3,000
Mar 15  Salary (part)  Rs.  4,000  "March partial"
Feb 28  Salary (full)  Rs. 18,000
(advances shown with type "Advance", payments with "Salary")
Sorted newest first.
```

**On "Pay in Full":** amount = remainingThisMonth, submit immediately
**On "Pay in Parts":** show amount input, submit on "Record Payment"

**On save:**
```ts
INSERT INTO payments (company_id, employee_id, month, amount, payment_date, note)
VALUES (?, ?, ?, ?, ?, ?)
```

After save: re-fetch payments, call `onPaymentRecorded()`.

---

## 5. Integration Points

### 5a. Payroll Reports Page (`/reports`) — Salaried workers

**File:** `src/components/PayrollDashboard.tsx`

- Add "Paid" column to the payroll table (last column, replacing or beside PDF)
- Each row: remaining balance amount + "Pay" button
- Fetch all payments for current month on mount (or pass from server)
- Clicking "Pay" opens `<PaymentModal>` with `currentMonthPayable = row.final_payable_salary`
- After payment recorded: update local payment totals to reflect new remaining

### 5b. Work Entries Page — Commission workers

**File:** `src/app/work-entries/[employeeId]/components/WorkEntryManager.tsx`

- Add "Record Payment" button in the header area
- `currentMonthPayable` = sum of all `entry.total_amount` for the selected month (already computed)
- Opens `<PaymentModal>`

### 5c. Daily Attendance Page — Daily workers

**File:** `src/app/daily-attendance/components/DailyAttendanceManager.tsx`

- Add "Record Payment" button per worker in the monthly summary table
- `currentMonthPayable` = worker's total pay from `summaryMap`
- Opens `<PaymentModal>`

---

## 6. Fetching Payments for Balance Display

### Payroll Reports Page
Fetch all payments for the company for the selected month on page load (server side):
```sql
SELECT * FROM payments WHERE company_id = ? AND month = ?
```
Pass to `PayrollDashboard` as `monthPayments: Payment[]`.

### Work Entries / Daily Attendance
Payments fetched inside the modal on open (client side) — no need to pre-fetch.
For balance display on the page itself (before opening modal), show a simple "Pay" button without a pre-computed remaining (the modal computes it).

---

## 7. Files

| File | Change | Purpose |
|---|---|---|
| SQL (manual) | Create | `payments` table + RLS |
| `src/types/index.ts` | Modify | Add `Payment` interface |
| `src/components/PaymentModal.tsx` | Create | Shared payment modal |
| `src/components/PayrollDashboard.tsx` | Modify | Add Paid column + modal trigger |
| `src/app/reports/page.tsx` | Modify | Fetch month payments, pass to dashboard |
| `src/app/work-entries/[employeeId]/components/WorkEntryManager.tsx` | Modify | Add Record Payment button |
| `src/app/daily-attendance/components/DailyAttendanceManager.tsx` | Modify | Add Record Payment per worker in summary |
