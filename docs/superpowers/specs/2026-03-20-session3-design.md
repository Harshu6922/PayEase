# Session 3 Design — Advance Repayment Tracking, Recurring Expenses, Overpayment Alerts

**Date:** 2026-03-20
**Status:** Approved

---

## Overview

Three features added to the payroll app:
1. **Advance repayment tracking** — multi-month, with cash and salary-deduction support
2. **Recurring expense templates** — one-click apply per month
3. **Overpayment alerts** — warning in PaymentModal + visual flag on reports page

---

## 1. Database Schema

Two new tables (already created in Supabase) plus one column added to `expenses`:

```sql
-- Tracks each repayment event against a specific advance
CREATE TABLE advance_repayments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),  -- denormalised for query efficiency; must match employee_advances.company_id (enforced at application level)
  advance_id uuid NOT NULL REFERENCES employee_advances(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id),
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  repayment_date date NOT NULL,
  method text NOT NULL CHECK (method IN ('salary_deduction', 'cash')),
  note text,
  created_at timestamptz DEFAULT now()
);

-- Monthly expense templates (applied per month on demand)
CREATE TABLE expense_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  category text NOT NULL,
  description text NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  paid_to text,
  note text,
  created_at timestamptz DEFAULT now()
);

-- Add template_id to expenses for reliable idempotency tracking
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES expense_templates(id) ON DELETE SET NULL;
```

Outstanding balance per advance = `advance.amount − SUM(advance_repayments.amount WHERE advance_id = advance.id)`. Computed at query time, no stored column.

`company_id` on `advance_repayments` is accepted denormalization. Application must always write it matching `employee_advances.company_id`.

---

## 2. Advance Repayment Tracking

### Advances Page (`/advances`)

Redesigned from a plain table to a card/row list showing:
- Employee name + ID
- Original advance amount and date
- Remaining balance (outstanding)
- Visual progress bar: recovered / total
- "Log Repayment" button per row

**Log Repayment modal fields:**
- Amount (required, numeric) — **capped at the remaining balance**; if the user enters more, show an inline error: "Amount exceeds outstanding balance of ₹X" and block save
- Date (required, defaults to today)
- Method: `salary_deduction` | `cash` (required)
- Note (optional)

Fully settled advances (balance = 0) are shown in a collapsed "Settled" section or visually dimmed.

Server-side query: `employee_advances` left-joined with `advance_repayments` aggregated by `advance_id` to compute `repaid_total` and `remaining_balance = advance.amount − repaid_total`.

### Advances data flow to PaymentModal

The **reports page server component** (`src/app/reports/page.tsx`) fetches outstanding advance balances:

```sql
SELECT
  ea.employee_id,
  ea.id AS advance_id,
  ea.advance_date,
  ea.amount AS original,
  COALESCE(SUM(ar.amount), 0) AS repaid
FROM employee_advances ea
LEFT JOIN advance_repayments ar ON ar.advance_id = ea.id
WHERE ea.company_id = $companyId
GROUP BY ea.employee_id, ea.id, ea.advance_date, ea.amount
HAVING ea.amount > COALESCE(SUM(ar.amount), 0)  -- only active (unsettled) advances
```

The page aggregates this into a map `outstandingByEmployee: Record<string, { totalOutstanding: number, advances: { id, remaining, advance_date }[] }>` and passes it as a prop to `PayrollDashboard`, which forwards the per-employee entry into `PaymentModal`.

### Reports Page / PaymentModal — advance column + recovery

- **Old behavior removed**: The advances column no longer deducts `this month's employee_advances`. The old per-month advance deduction from `employee_advances` is **replaced entirely** by the new recovery input.
- The "Advances" column on the payroll table now shows `outstandingByEmployee[employeeId].totalOutstanding` (sum of all remaining balances across active advances).
- Net payable = `earned − (recovery_entered_this_month)`. The recovery entered in PaymentModal is what reduces net payable, not a blanket deduction of this month's advances.

**PaymentModal — new "Advance Recovery" section:**
- Shows each active advance: date given, original amount, remaining balance
- Single input: "Recover this month (₹)" — defaults to 0
- Allocation rule: when saving, distribute the recovery amount across advances in **ascending `advance_date` order** (oldest first), writing one `advance_repayments` record per advance until the total recovery amount is exhausted
- Example: employee has ₹3,000 outstanding on advance A and ₹2,000 on advance B. User enters ₹4,000 recovery → write ₹3,000 against A (clears it), write ₹1,000 against B.

**PaymentModal props additions:**
```ts
outstandingAdvances: {
  totalOutstanding: number
  advances: { id: string; remaining: number; advance_date: string }[]
}
```

On save, two (or more) writes:
1. `payments` table — salary payment (existing)
2. One `advance_repayments` record per advance touched, method: `'salary_deduction'` (only if recovery > 0)

---

## 3. Recurring Expense Templates

### Expenses Page (`/expenses`) — additions

**"Manage Templates" button** in the header:
- Opens a modal listing all company templates (add / edit / delete)
- Template fields: category, description, amount, paid-to (optional), note (optional)
- No separate page; managed entirely in modal

**"Apply Templates" button** (shown only if templates exist for the company):
- Bulk-inserts all templates as expenses for the currently selected month
- **Date used**: if today falls within the selected month, use today. Otherwise (e.g., processing a past/future month), use the **last day** of the selected month
- **Skip logic**: check if an expense already exists for the month with the same `template_id`. If yes, skip that template. This uses `template_id` FK on the `expenses` table — reliable regardless of description/amount edits
- After apply: show a summary toast — "3 added, 1 skipped (already applied this month)"
- Operation is idempotent — safe to click multiple times

When inserting from a template, set `expenses.template_id = template.id` so future apply operations can detect it.

---

## 4. Overpayment Alerts

### PaymentModal

- Before saving, compute: `existing_payments_this_month + new_amount`
- If this exceeds `net_payable` (earned − recovery entered): show a yellow inline warning banner
  > "This payment exceeds the remaining net payable by ₹X. Proceed anyway?"
- Save button remains enabled — warning only, not a hard block

### Reports Page

- Employee rows where `net_payable_after_payments < 0`: red tint on net payable cell + "Overpaid" badge
- Employee rows where `net_payable_after_payments === 0`: green "Settled" badge
- Derived from existing `remainingTotals` computation — no new data fetching required

---

## Files to Create / Modify

### New files
- `src/app/advances/components/AdvancesClient.tsx` — redesigned advances list with repayment support
- `src/app/advances/components/LogRepaymentModal.tsx` — modal for logging cash or salary repayment (validates amount ≤ remaining)
- `src/app/expenses/components/TemplatesModal.tsx` — CRUD modal for expense templates

### Modified files
- `src/app/advances/page.tsx` — fetch advances with repayment aggregates; pass to AdvancesClient
- `src/app/reports/page.tsx` — fetch outstanding advance balances per employee; pass to PayrollDashboard
- `src/components/PaymentModal.tsx` — add `outstandingAdvances` prop; advance recovery input; FIFO allocation on save; overpayment warning
- `src/app/expenses/components/ExpensesManager.tsx` — add "Manage Templates" + "Apply Templates" buttons; apply date logic; template_id-based skip detection
- `src/components/PayrollDashboard.tsx` — receive `outstandingByEmployee` prop; update advances column; overpaid/settled badges; forward to PaymentModal
- `src/types/index.ts` — add `AdvanceRepayment`, `ExpenseTemplate` types; add `outstandingAdvances` shape

---

## Non-Goals (out of scope for Session 3)

- Advance repayment schedule / installment auto-calculation
- Email or push notifications for low balance
- Template scheduling (e.g., skip certain months)
- Partial template application (apply only some templates)
