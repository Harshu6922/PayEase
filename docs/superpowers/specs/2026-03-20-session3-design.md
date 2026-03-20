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

Two new tables (already created in Supabase):

```sql
-- Tracks each repayment event against a specific advance
CREATE TABLE advance_repayments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
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
```

Outstanding balance per advance = `advance.amount − SUM(advance_repayments.amount)`. Computed at query time, no stored column.

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
- Amount (required, numeric)
- Date (required, defaults to today)
- Method: `salary_deduction` | `cash` (required)
- Note (optional)

Fully settled advances (balance = 0) are shown in a collapsed "Settled" section or visually dimmed.

Server-side query: `employee_advances` joined with `advance_repayments` aggregated by `advance_id` to compute `repaid_total` and `remaining_balance`.

### Reports Page / PaymentModal

- The "Advances" column on the payroll table shows **outstanding balance** (sum of remaining across all active advances for that employee), not just this month's advances
- PaymentModal gains an **"Advance Recovery"** section:
  - Shows outstanding balance
  - Input: "Recover this month (₹)" — defaults to 0, user can enter any amount ≤ outstanding balance
- On save, two writes:
  1. `payments` table — salary payment record (existing behavior)
  2. `advance_repayments` table — one record with `method: 'salary_deduction'` (only if recovery amount > 0)
- Net payable calculation: `earned − advances_outstanding_recovery_this_month`

---

## 3. Recurring Expense Templates

### Expenses Page (`/expenses`) — additions

**"Manage Templates" button** in the header:
- Opens a modal listing all templates (add / edit / delete)
- Template fields: category, description, amount, paid-to (optional), note (optional) — same as a regular expense
- No separate page; managed entirely in modal

**"Apply Templates" button** (shown only if templates exist for the company):
- Bulk-inserts all templates as expenses for the currently selected month
- Date used: today's date within the selected month
- Skip logic: if an expense already exists for the month with matching `description + category + amount`, skip that template
- After apply: shows a toast/summary — "3 added, 1 skipped (already exists)"
- Operation is idempotent — safe to click multiple times

---

## 4. Overpayment Alerts

### PaymentModal

- Before saving, compute: `existing_payments_this_month + new_amount`
- If this exceeds `net_payable`: show a yellow inline warning banner
  > "This payment exceeds the remaining net payable by ₹X. Proceed anyway?"
- Save button remains enabled — warning only, not a hard block

### Reports Page

- Employee rows where `net_payable_after_payments < 0`: red tint on net payable cell + "Overpaid" badge
- Employee rows where `net_payable_after_payments === 0`: green "Settled" badge (already partially implemented)
- No new data fetching required — derived from existing `remainingTotals` computation

---

## Files to Create / Modify

### New files
- `src/app/advances/components/AdvancesClient.tsx` — redesigned advances list with repayment support
- `src/app/advances/components/LogRepaymentModal.tsx` — modal for logging a cash or salary repayment
- `src/app/expenses/components/TemplatesModal.tsx` — CRUD modal for expense templates

### Modified files
- `src/app/advances/page.tsx` — fetch advances with repayment aggregates; pass to AdvancesClient
- `src/components/PaymentModal.tsx` — add advance recovery input + overpayment warning
- `src/app/expenses/components/ExpensesManager.tsx` — add "Manage Templates" + "Apply Templates" buttons
- `src/components/PayrollDashboard.tsx` — outstanding advances balance column; overpaid/settled badges
- `src/types/index.ts` — add `AdvanceRepayment` and `ExpenseTemplate` types

---

## Non-Goals (out of scope for Session 3)

- Advance repayment schedule / installment auto-calculation
- Email or push notifications for low balance
- Template scheduling (e.g., skip certain months)
- Partial template application (apply only some templates)
