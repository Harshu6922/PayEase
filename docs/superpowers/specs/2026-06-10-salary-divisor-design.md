# Configurable Salary Divisor — Design

**Date:** 2026-06-10
**Status:** Approved (pending spec review)

## Problem

Monthly-salaried payroll currently computes the per-day rate as
`monthly_salary / (actual days in month)` — so the daily rate floats between
1/28 and 1/31 of salary depending on the month. Some employers instead want a
**fixed divisor** (commonly 26 — the "26 working days" convention that treats
weekly-offs as paid), so the per-day rate is stable and a full month earns one
salary regardless of calendar length.

There is also existing **inconsistency**: the cron job and employee-portal
already hardcode `/ 26`, while the dashboard, reports and attendance use actual
days-in-month. This feature consolidates all of them onto one configurable
source of truth.

## Requirements

- Per-employee custom divisor (monthly-salaried employees only).
- A company-level **default** divisor that new employees inherit.
- A **bulk apply** action that writes a chosen divisor onto all existing employees.
- Earnings semantics: **pure rate, no cap** — `earned = (salary / divisor) × days_present`.
  Present beyond the divisor earns proportionally more; absence/short days are
  deducted at the (higher) per-day rate. This is the intended trade-off.
- Retroactive: changing a divisor recomputes **current and previous months**.

## Out of scope

- Daily-wage and commission workers (they don't use `monthly_salary` per-day division).
- Weekly-off / Sunday auto-marking. The divisor only changes the rate; attendance
  is still recorded per actual day as today.

## Data model

Supabase migration adds two nullable integer columns (valid range 1–31):

- `employees.salary_divisor` — `NULL` = use actual days in month (today's behavior;
  all existing rows stay `NULL`, so nothing changes until opted in). A value such
  as `26` fixes the divisor.
- `companies.default_salary_divisor` — inherited by new employees at creation.

`src/types/index.ts` `Employee` gains `salary_divisor?: number | null`, and the
generated `src/types/supabase.ts` is updated.

## Single source of truth

`src/lib/payroll-utils.ts` `calculateRates(employee, month, year)` becomes:

```
const divisor = employee.salary_divisor ?? getDaysInMonth(new Date(year, month - 1));
const dailyWage = round2(employee.monthly_salary / divisor);
```

All other per-day computations defer to this divisor instead of hardcoding:

| File | Current | Change |
|------|---------|--------|
| `components/PayrollDashboard.tsx` | `monthly_salary / workingDays` | `monthly_salary / (salary_divisor ?? workingDays)` |
| `app/reports/components/PayrollComparison.tsx` | `monthly_salary / days` | divisor-aware |
| `app/employees/[id]/components/EmployeeAttendanceSection.tsx` | `monthly_salary / daysInMonth` | divisor-aware |
| `app/attendance/components/AttendanceManager.tsx` (save) | `monthly_salary / daysInMonth` | divisor-aware (via `calculateRates`) |
| `app/api/cron/daily-notifications/route.ts` | `/ 26` hardcoded | divisor-aware (default 26 if null kept? → use `salary_divisor ?? daysInMonth`) |
| `app/api/employee-portal/me/route.ts` | `/ 26` hardcoded | divisor-aware |
| `components/pdf/*` | `monthly_salary / daysInMonth` | divisor-aware |

Note: the two `/26` call sites change behavior for employees left at `NULL`
(they revert to actual-days). This is the intended consolidation — flagged for
the user, since it makes the app internally consistent.

## Retroactivity & backfill

- `earned_salary` is recomputed live in the dashboard/reports/employee views, so
  changing the divisor updates earnings for **any** month automatically.
- Stored `overtime_amount` / `deduction_amount` / `daily_pay` / `hourly_rate` on
  `attendance_records` are snapshots. When a divisor changes (single edit **or**
  bulk apply), a **backfill** recomputes those columns for the affected
  employee(s) across all months, re-deriving each row from its stored
  `start_time`/`end_time` via `calculateDailyPayroll`. This keeps OT/deductions
  consistent with the new rate for past months. Absent rows keep `deduction = 0`
  (per the prior absent-day fix).

The backfill runs server-side (a route/server action) over the affected
employees' `attendance_records`, status-aware (Absent → no deduction).

## UI

- **Add/Edit Employee modal** (`employees/components/AddEmployeeModal.tsx`,
  `EditEmployeeModal.tsx`): a "Salary divisor" control shown only for
  `worker_type === 'salaried'`. Preset chips — *Actual days (default)*, *26*,
  *30*, *Custom* (numeric input 1–31). Stored as `salary_divisor` (`NULL` for
  "Actual days").
- **Company default + bulk apply**: a control (Employees page header / Settings)
  to set `companies.default_salary_divisor` and an **"Apply to all employees"**
  button that writes the value to every salaried employee and triggers the
  backfill. Confirmation dialog before bulk apply.

## Testing

- Unit: `calculateRates` with `salary_divisor` set vs `NULL` (falls back to
  days-in-month); `calculateDailyPayroll` OT/deduction scale with divisor.
- Backfill: an Absent row stays `deduction = 0`; a present-short row's deduction
  scales with the new divisor; a full present row's `daily_pay` = `salary/divisor`.
- Manual: set divisor 26 on one employee, verify current + a previous month's
  earned/deductions change in dashboard, employee detail, and PDF.

## Migration / rollback

- Forward: add columns (nullable, no default) — non-breaking; existing rows `NULL`.
- Rollback: drop columns; code falls back to days-in-month everywhere.
