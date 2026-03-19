# Daily Jobwork Worker Type — Design Spec

## Overview

Add a third worker type (`'daily'`) for piece-rate daily wage workers. These employees are paid a flat daily rate, with proportional adjustments for hours over or under their standard working day. They have a dedicated monthly attendance grid and a separate payroll summary — they do not appear in the main salaried payroll reports.

---

## 1. Database Changes

### 1a. Alter `worker_type` constraint on `employees`

```sql
ALTER TABLE public.employees
  DROP CONSTRAINT employees_worker_type_check;

ALTER TABLE public.employees
  ADD CONSTRAINT employees_worker_type_check
  CHECK (worker_type IN ('salaried', 'commission', 'daily'));
```

### 1b. Add `daily_rate` column

```sql
ALTER TABLE public.employees
  ADD COLUMN daily_rate NUMERIC(10,2) DEFAULT NULL CHECK (daily_rate IS NULL OR daily_rate > 0);
```

Nullable — only populated for `worker_type = 'daily'`. Salaried and commission employees leave it NULL. The CHECK constraint ensures that if a value is stored it is positive, preventing a zero-rate that would cause division-by-zero in pay calculation.

### 1c. New table: `daily_attendance`

Daily workers use a separate attendance table (not `attendance_records`, which is designed for salaried workers).

```sql
CREATE TABLE public.daily_attendance (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id   UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id  UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  hours_worked NUMERIC(5,2) NOT NULL,  -- defaults to standard_working_hours on creation
  pay_amount   NUMERIC(10,2) NOT NULL, -- computed: (daily_rate / standard_working_hours) * hours_worked
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

ALTER TABLE public.daily_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins manage daily attendance"
ON public.daily_attendance FOR ALL TO authenticated
USING (company_id = get_my_company_id())
WITH CHECK (company_id = get_my_company_id());
```

---

## 2. TypeScript Types

Add to `src/types/index.ts`:

```ts
export interface DailyAttendance {
  id: string;
  company_id: string;
  employee_id: string;
  date: string;           // 'YYYY-MM-DD'
  hours_worked: number;
  pay_amount: number;
  created_at: string;
}
```

Extend `Employee`:
- `daily_rate: number | null` — already present as nullable, only set for `worker_type = 'daily'`

Update `worker_type` union type:
```ts
worker_type: 'salaried' | 'commission' | 'daily';
```

---

## 3. Employee Add/Edit Form — Conditional Fields

Fields shown by `worker_type`:

| Field               | salaried | commission | daily |
|---------------------|----------|------------|-------|
| Monthly Salary      | ✓        | hidden     | hidden |
| Daily Rate          | hidden   | hidden     | ✓     |
| Working Hours/Day   | ✓        | hidden     | ✓     |
| OT Multiplier       | ✓        | hidden     | hidden |
| Active Employee     | ✓        | ✓          | ✓     |

### Validation
- `daily`: `daily_rate` required and > 0; `standard_working_hours` required and > 0
- `salaried`: `monthly_salary` required; `standard_working_hours` required; `overtime_multiplier` required
- `commission`: no salary/hours fields required

### DB insert/update
- For `daily` workers: insert `daily_rate`, set `monthly_salary = 0` (column is NOT NULL), set `overtime_multiplier = 1`
- For `salaried`/`commission` workers: `daily_rate` stays NULL

---

## 4. Daily Attendance Page (`/daily-attendance`)

### Sidebar
Add "Daily Attendance" link after "Attendance" in the nav, with a `CalendarDays` icon.

### Page structure

**Header:** "Daily Attendance" title + month/year picker (prev/next arrows, display "March 2026")

**Grid (main section):**
- Rows = active daily workers (fetched from employees WHERE worker_type = 'daily')
- Columns = day 1 to last day of selected month
- First column = worker name (fixed/sticky left)
- Column headers = day numbers (1, 2, 3… 31)
- Days beyond the month's length are hidden
- Future days (after today) are greyed out and not clickable

**Cell states:**
- Empty/white = absent (no record in `daily_attendance`)
- Green = present (record exists)
- Each present cell shows the pay amount: `Rs. X`

**Interactions:**
- Click absent cell → immediately creates a `daily_attendance` record using the formula:
  ```ts
  const hours_worked = employee.standard_working_hours;
  const pay_amount = hours_worked * (employee.daily_rate / employee.standard_working_hours);
  // simplifies to: pay_amount = employee.daily_rate (full day)
  ```
  Guard: if `employee.daily_rate` is null or `employee.standard_working_hours` is 0, show an error toast and abort.
- Click present cell → opens inline popup:
  ```
  [Worker Name] — [Date]
  Hours: [input, default = current hours_worked]
  [Save] [Remove]
  ```
  - Save: updates `hours_worked` and recalculates `pay_amount`
  - Remove: deletes the record (marks absent)

**Pay calculation (client-side, before upsert):**
```ts
const hourly_rate = employee.daily_rate / employee.standard_working_hours;
const pay_amount = hours_worked * hourly_rate;
```

### Monthly Summary (below grid)

A table showing totals for the selected month:

| Worker Name | Days Present | Total Hours | Total Pay |
|-------------|-------------|-------------|-----------|
| Ali         | 22          | 176h        | Rs. 8,800 |
| …           | …           | …           | …         |
| **Total**   | —           | —           | Rs. XX,XXX |

---

## 5. Data Fetching

### Server component (`page.tsx`)
- Auth + company_id (same pattern as other pages — uses server-side Supabase client from `@/lib/supabase/server`, NOT the client-component cast pattern)
- Fetch daily workers: `SELECT * FROM employees WHERE company_id = ? AND worker_type = 'daily' AND is_active = true ORDER BY full_name`
- Pass workers to client component

### Client component (`DailyAttendanceManager.tsx`)
- Holds selected month/year state (default: current month)
- On mount and month change: fetch `daily_attendance` for selected month: `SELECT * FROM daily_attendance WHERE company_id = ? AND date >= first_day AND date <= last_day`
- Manages local `records` state (Map of `employee_id + date` → record) for optimistic UI

---

## 6. Out of Scope

- Daily workers do NOT appear in `/reports` (payroll reports page)
- No PDF payslip for daily workers in this sub-project (future sub-project)
- No biometric import for daily workers in this sub-project
- Overtime multiplier is NOT used for daily workers — all hours (over or under standard) are calculated at the flat hourly rate (`daily_rate / standard_working_hours`). The `overtime_multiplier` column is set to `1` in the DB purely to satisfy the NOT NULL constraint and has no effect on daily worker pay.
