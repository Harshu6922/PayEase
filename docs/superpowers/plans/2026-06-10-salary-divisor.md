# Configurable Salary Divisor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let employers set a fixed salary divisor (e.g. 26) per employee and as a company-wide default, replacing the hardcoded/actual-days divisor so a month's earnings derive from `salary / divisor`.

**Architecture:** Add `salary_divisor` to employees and `default_salary_divisor` to companies. Funnel every per-day computation through one helper (`calculateRates` in `payroll-utils.ts`). A backfill recomputes stored `attendance_records` snapshots when a divisor changes, so current and previous months stay consistent. UI in the employee modals (per-employee) and Settings page (company default + bulk apply).

**Tech Stack:** Next.js 15, TypeScript, Supabase (Postgres), vitest. Migration applied via Supabase MCP `apply_migration`.

**Spec:** `docs/superpowers/specs/2026-06-10-salary-divisor-design.md`

---

## File Structure

- `src/lib/payroll-utils.ts` — divisor-aware `calculateRates` (single source of truth) + new `effectiveDivisor()` helper.
- `src/lib/payroll-backfill.ts` (new) — pure function `recomputeAttendanceRow(employee, row)` returning updated payroll columns.
- `src/types/index.ts`, `src/types/supabase.ts` — add `salary_divisor`.
- Read/write call sites: `components/PayrollDashboard.tsx`, `app/reports/components/PayrollComparison.tsx`, `app/employees/[id]/components/EmployeeAttendanceSection.tsx`, `app/attendance/components/AttendanceManager.tsx`, `app/api/cron/daily-notifications/route.ts`, `app/api/employee-portal/me/route.ts`, `components/pdf/EmployeeDetailPDF.tsx`, `components/pdf/PayrollSummaryPDF.tsx`.
- UI: `app/employees/components/AddEmployeeModal.tsx`, `EditEmployeeModal.tsx`, `app/settings/page.tsx` (+ a settings client component).
- Backfill trigger: `app/api/employees/recompute/route.ts` (new) — server route that runs the backfill for one employee or all.

---

## Task 1: Database migration + types

**Files:**
- Migrate: via Supabase MCP `apply_migration` (name `add_salary_divisor`)
- Record: `sql/07-salary-divisor.sql` (create)
- Modify: `src/types/index.ts:12-28`, `src/types/supabase.ts` (employees Row/Insert/Update + companies)

- [ ] **Step 1: Apply migration** (Supabase MCP `apply_migration`, also save to `sql/07-salary-divisor.sql`):

```sql
alter table employees  add column if not exists salary_divisor integer
  check (salary_divisor is null or (salary_divisor between 1 and 31));
alter table companies add column if not exists default_salary_divisor integer
  check (default_salary_divisor is null or (default_salary_divisor between 1 and 31));
```

- [ ] **Step 2:** Add `salary_divisor?: number | null;` to `Employee` interface; add `salary_divisor` (number|null) to `employees` Row/Insert/Update and `default_salary_divisor` to `companies` in `supabase.ts`.
- [ ] **Step 3: Verify build** — `npm run build` (type-check passes).
- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(db): add salary_divisor columns + types"`

---

## Task 2: Divisor-aware core rate (TDD)

**Files:**
- Modify: `src/lib/payroll-utils.ts:14-21`
- Test: `src/lib/__tests__/payroll-utils.test.ts` (create)

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { calculateRates } from '../payroll-utils';
const base = { monthly_salary: 26000, standard_working_hours: 8 } as any;

describe('calculateRates divisor', () => {
  it('falls back to actual days in month when salary_divisor is null', () => {
    // June 2026 = 30 days
    expect(calculateRates({ ...base, salary_divisor: null }, 6, 2026).dailyWage).toBeCloseTo(866.67, 2);
  });
  it('uses the fixed divisor when set', () => {
    expect(calculateRates({ ...base, salary_divisor: 26 }, 6, 2026).dailyWage).toBe(1000);
  });
});
```

- [ ] **Step 2: Run, verify fail** — `npm test -- payroll-utils` → FAIL (uses days-in-month).
- [ ] **Step 3: Implement** — in `calculateRates`:

```ts
const divisor = employee.salary_divisor ?? getDaysInMonth(new Date(year, month - 1));
const dailyWage = round2(employee.monthly_salary / divisor);
```

Also export helper:

```ts
export function effectiveDivisor(employee: Employee, month: number, year: number): number {
  return employee.salary_divisor ?? getDaysInMonth(new Date(year, month - 1));
}
```

- [ ] **Step 4: Run, verify pass** — `npm test -- payroll-utils` → PASS.
- [ ] **Step 5: Commit** — `feat(payroll): divisor-aware calculateRates`

---

## Task 3: Backfill recompute function (TDD)

**Files:**
- Create: `src/lib/payroll-backfill.ts`
- Test: `src/lib/__tests__/payroll-backfill.test.ts`

`recomputeAttendanceRow(employee, row)` returns `{ daily_wage, hourly_rate, daily_pay, overtime_hours, overtime_amount, deduction_hours, deduction_amount }` by calling `calculateDailyPayroll(employee, row.date, row.start_time, row.end_time)` — EXCEPT when `row.status === 'Absent'`, in which case `deduction_amount`/`deduction_hours` are forced to 0 (matches commit 695a54d7).

- [ ] **Step 1: Write failing tests** — (a) present-short row deduction scales with divisor; (b) Absent row → deduction 0; (c) full present row daily_pay ≈ salary/divisor.
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement** `recomputeAttendanceRow`.
- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** — `feat(payroll): attendance backfill recompute helper`

---

## Task 4: Consolidate per-day call sites onto the divisor

For each file, replace the hardcoded/days-in-month divisor with `effectiveDivisor(emp, month, year)` (or `salary_divisor ?? <existing>`). No new tests; rely on Task 2/3 + build.

- [ ] **Step 1:** `PayrollDashboard.tsx:121` → `const per_day_salary = (emp.salary_divisor ?? workingDays) > 0 ? Number(emp.monthly_salary) / (emp.salary_divisor ?? workingDays) : 0`.
- [ ] **Step 2:** `PayrollComparison.tsx:18` → divisor-aware `perDay`.
- [ ] **Step 3:** `EmployeeAttendanceSection.tsx:65,113` → `Number(employee.monthly_salary) / (employee.salary_divisor ?? daysInMonth)`.
- [ ] **Step 4:** `AttendanceManager.tsx:282` → use `salary_divisor ?? daysInMonth`.
- [ ] **Step 5:** `daily-notifications/route.ts:88` and `employee-portal/me/route.ts:68` → replace `/ 26` with `/ (emp.salary_divisor ?? daysInMonth(month,year))`. Ensure these routes `select` `salary_divisor`.
- [ ] **Step 6:** `EmployeeDetailPDF.tsx:61` and `PayrollSummaryPDF.tsx` → accept/use divisor for `dailyWage`.
- [ ] **Step 7: Build** — `npm run build` passes.
- [ ] **Step 8: Commit** — `refactor(payroll): route all per-day rates through salary_divisor`

---

## Task 5: Backfill trigger route

**Files:**
- Create: `src/app/api/employees/recompute/route.ts`

POST `{ employeeId?: string }` (omit = all salaried employees in caller's company). For each target: fetch `attendance_records`, map through `recomputeAttendanceRow`, update changed rows. Auth: company-scoped via the authed user's `company_id` (mirror an existing protected route). Returns `{ updated: number }`.

- [ ] **Step 1:** Implement route (reuse server supabase client + company scoping pattern from an existing `app/api/*` route).
- [ ] **Step 2:** Manual check — call with a test employee id, confirm `{ updated }`.
- [ ] **Step 3: Commit** — `feat(api): attendance recompute endpoint for divisor changes`

---

## Task 6: Per-employee divisor UI

**Files:**
- Modify: `AddEmployeeModal.tsx`, `EditEmployeeModal.tsx`

- [ ] **Step 1:** Add `salary_divisor` to form state (default: company `default_salary_divisor` if present in Add, else null/"Actual days").
- [ ] **Step 2:** Render a "Salary divisor" control ONLY when `worker_type === 'salaried'`: preset chips *Actual days (null)*, *26*, *30*, *Custom* (numeric 1–31). Place near `monthly_salary`/`standard_working_hours`.
- [ ] **Step 3:** Include `salary_divisor` in insert (Add) and update (Edit) payloads. In Edit, after a successful change of `salary_divisor`, POST `/api/employees/recompute` with the employee id.
- [ ] **Step 4: Build** — passes.
- [ ] **Step 5: Commit** — `feat(employees): per-employee salary divisor field`

---

## Task 7: Company default + bulk apply

**Files:**
- Modify: `src/app/settings/page.tsx` (+ small client component)

- [ ] **Step 1:** Load/save `companies.default_salary_divisor` (numeric input 1–31 or "Actual days").
- [ ] **Step 2:** "Apply to all employees" button → confirm dialog → update every salaried employee's `salary_divisor` to the default, then POST `/api/employees/recompute` (all). Show result toast (`{updated} records recomputed`).
- [ ] **Step 3: Build** — passes.
- [ ] **Step 4: Commit** — `feat(settings): company default divisor + bulk apply`

---

## Task 8: Verify & ship

- [ ] **Step 1:** `npm test` (all pass) and `npm run build` (clean).
- [ ] **Step 2: Manual** — set divisor 26 on one salaried employee; confirm dashboard, employee detail, and PDF reflect higher per-day pay for current AND a previous month; confirm an Absent day still deducts 0; confirm bulk apply updates everyone.
- [ ] **Step 3: Push** — `git push origin main` (Vercel auto-deploys). Includes the earlier spec commit `ea5adb33`.
