# Overtime Calculation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make overtime hours and amounts calculate and save correctly for every attendance record, using per-employee `overtime_multiplier`.

**Architecture:** Add a `buildAttendancePayload` pure function to `payroll-utils.ts` that owns all status-based payroll math. `AttendanceManager.tsx` becomes a pure UI component — it resolves times and delegates all calculation to this function. Fix the existing `calculateDailyPayroll` utility to match the same formulas.

**Tech Stack:** TypeScript, date-fns v3, Vitest (to be added), Supabase

**Spec:** `docs/superpowers/specs/2026-03-18-overtime-calculation-design.md`

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `vitest.config.ts` | Test runner config with `@/*` alias |
| Create | `src/lib/__tests__/payroll-utils.test.ts` | Unit tests for `buildAttendancePayload` and `calculateDailyPayroll` |
| Modify | `src/lib/payroll-utils.ts` | Fix `calculateDailyPayroll`; export `AttendancePayload` type; add `buildAttendancePayload` |
| Modify | `src/app/attendance/components/AttendanceManager.tsx` | Remove inline math; use `buildAttendancePayload`; fix imports and Supabase cast; fix Half Day time arithmetic |
| Modify | `src/app/employees/components/AddEmployeeModal.tsx` | Change default `overtime_multiplier` to `1.0` (initial state + reset) |
| Modify | `src/app/employees/components/EditEmployeeModal.tsx` | Change fallback `\|\| 1.5` to `?? 1.0` |

---

## Task 1: Bootstrap Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add `test` script)

- [ ] **Step 1: Install Vitest**

```bash
cd C:\Users\Lenovo\.gemini\antigravity\scratch\payroll-app
npm install -D vitest
```

Expected: vitest appears in `devDependencies` in `package.json`.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

Note: `__dirname` is not available in ESM modules. The two lines above recreate it from `import.meta.url` so the path alias works correctly.

- [ ] **Step 3: Add `test` script to `package.json`**

In the `"scripts"` block, add:
```json
"test": "vitest run"
```

- [ ] **Step 4: Verify Vitest is wired up**

Create a throwaway file `src/lib/__tests__/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run:
```bash
npm test
```

Expected: `1 passed`.

- [ ] **Step 5: Delete the smoke test file**

Delete `src/lib/__tests__/smoke.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: add vitest for unit testing"
```

---

## Task 2: Fix `calculateDailyPayroll`

**Files:**
- Modify: `src/lib/payroll-utils.ts:51-75`
- Create: `src/lib/__tests__/payroll-utils.test.ts`

**Background:** `calculateDailyPayroll` has three bugs: `dailyPay` is not capped at standard hours, `overtimeAmount` ignores `overtime_multiplier`, and `deductionAmount` uses a different formula than `buildAttendancePayload` will use. All three must match the spec.

We use a clean employee fixture: monthly_salary=24000, standard_working_hours=8, daysInMonth=30 (June 2024).
- `dailyWage = 24000 / 30 = 800.00`
- `hourlyRate = 800 / 8 = 100.00`

- [ ] **Step 1: Create test file with failing tests for `calculateDailyPayroll`**

Create `src/lib/__tests__/payroll-utils.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { calculateDailyPayroll } from '../payroll-utils';
import type { Employee } from '@/types';

const baseEmployee: Employee = {
  id: 'emp-1',
  company_id: 'co-1',
  full_name: 'Test User',
  employee_id: 'E001',
  monthly_salary: 24000,
  standard_working_hours: 8,
  overtime_multiplier: 1.0,
  joining_date: '2024-01-01',
  is_active: true,
};

// June 2024 = 30 days → dailyWage=800, hourlyRate=100

describe('calculateDailyPayroll', () => {
  it('caps daily_pay at standard hours when overtime is worked', () => {
    // 10 hours worked; dailyPay must not exceed dailyWage (800)
    const result = calculateDailyPayroll(baseEmployee, '2024-06-15', '09:00', '19:00');
    expect(result.daily_pay).toBe(800);
  });

  it('calculates overtime_amount using overtime_multiplier', () => {
    const emp = { ...baseEmployee, overtime_multiplier: 1.5 };
    // 10 hours: 2 OT hours × 100 × 1.5 = 300
    const result = calculateDailyPayroll(emp, '2024-06-15', '09:00', '19:00');
    expect(result.overtime_hours).toBe(2);
    expect(result.overtime_amount).toBe(300);
  });

  it('uses dailyWage - dailyPay for deduction_amount', () => {
    // 6 hours: dailyPay=600, deductionAmount=800-600=200
    const result = calculateDailyPayroll(baseEmployee, '2024-06-15', '09:00', '15:00');
    expect(result.deduction_hours).toBe(2);
    expect(result.deduction_amount).toBe(200);
  });

  it('has zero deduction and zero OT when exactly on standard hours', () => {
    const result = calculateDailyPayroll(baseEmployee, '2024-06-15', '09:00', '17:00');
    expect(result.overtime_hours).toBe(0);
    expect(result.overtime_amount).toBe(0);
    expect(result.deduction_hours).toBe(0);
    expect(result.deduction_amount).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm they currently fail**

```bash
npm test
```

Expected: 3 of the 4 tests fail (the last one may pass by coincidence). Note which fail.

- [ ] **Step 3: Apply the three fixes to `calculateDailyPayroll` in `src/lib/payroll-utils.ts`**

Find the block starting at line 51. Replace these three lines:

```ts
// OLD — replace these three lines:
const dailyPay = round2(workedHours * hourlyRate);
// ...
overtimeAmount = round2(overtimeHours * hourlyRate);
// ...
deductionAmount = round2(deductionHours * hourlyRate);
```

With:
```ts
// NEW
const dailyPay = round2(Math.min(workedHours, employee.standard_working_hours) * hourlyRate);
// ...
overtimeAmount = round2(overtimeHours * hourlyRate * employee.overtime_multiplier);
// ...
deductionAmount = round2(dailyWage - dailyPay);
```

The full corrected block (lines 50–74) should look like this:

```ts
const workedHours = round2(minutesWorked / 60);
const dailyPay = round2(Math.min(workedHours, employee.standard_working_hours) * hourlyRate);

let overtimeHours = 0;
let overtimeAmount = 0;
let deductionHours = 0;
let deductionAmount = 0;

if (workedHours > employee.standard_working_hours) {
  overtimeHours = round2(workedHours - employee.standard_working_hours);
  overtimeAmount = round2(overtimeHours * hourlyRate * employee.overtime_multiplier);
} else if (workedHours < employee.standard_working_hours) {
  deductionHours = round2(employee.standard_working_hours - workedHours);
  deductionAmount = round2(dailyWage - dailyPay);
}
```

- [ ] **Step 4: Run tests — all 4 must pass**

```bash
npm test
```

Expected: `4 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/payroll-utils.ts src/lib/__tests__/payroll-utils.test.ts
git commit -m "fix: calculateDailyPayroll now applies overtime_multiplier and caps daily_pay"
```

---

## Task 3: Add `AttendancePayload` type and `buildAttendancePayload`

**Files:**
- Modify: `src/lib/payroll-utils.ts` (append type + function)
- Modify: `src/lib/__tests__/payroll-utils.test.ts` (append tests)

- [ ] **Step 1: Write failing tests for `buildAttendancePayload`**

Update the import at the top of `src/lib/__tests__/payroll-utils.test.ts` (line 2) to also import `buildAttendancePayload`:

```ts
import { calculateDailyPayroll, buildAttendancePayload } from '../payroll-utils';
```

Then append the following `describe` blocks to the bottom of the same file:

```ts
// Reuses baseEmployee from above (daily_wage=800, hourly_rate=100)

describe('buildAttendancePayload — Absent', () => {
  it('returns all zeros with full deduction for an absent employee', () => {
    const r = buildAttendancePayload(baseEmployee, '2024-06-15', 'Absent', '00:00', '00:00', false);
    expect(r.worked_hours).toBe(0);
    expect(r.daily_pay).toBe(0);
    expect(r.overtime_hours).toBe(0);
    expect(r.overtime_amount).toBe(0);
    expect(r.deduction_hours).toBe(8);
    expect(r.deduction_amount).toBe(800);
    expect(r.status).toBe('Absent');
  });
});

describe('buildAttendancePayload — Half Day (no override)', () => {
  it('uses exactly standardHours/2 and dailyWage/2', () => {
    const r = buildAttendancePayload(baseEmployee, '2024-06-15', 'Half Day', '09:00', '13:00', false);
    expect(r.worked_hours).toBe(4);
    expect(r.daily_pay).toBe(400);
    expect(r.overtime_hours).toBe(0);
    expect(r.overtime_amount).toBe(0);
    expect(r.deduction_hours).toBe(4);
    expect(r.deduction_amount).toBe(400);
  });
});

describe('buildAttendancePayload — Half Day (with override)', () => {
  it('uses actual hours when hasTimeOverride is true', () => {
    // 6 hours worked (09:00–15:00), hasTimeOverride=true
    const r = buildAttendancePayload(baseEmployee, '2024-06-15', 'Half Day', '09:00', '15:00', true);
    expect(r.worked_hours).toBe(6);
    expect(r.daily_pay).toBe(600);
    expect(r.deduction_hours).toBe(2);
    expect(r.deduction_amount).toBe(200);
  });

  it('calculates OT if override hours exceed standard', () => {
    // 10 hours worked (09:00–19:00), hasTimeOverride=true
    const r = buildAttendancePayload(baseEmployee, '2024-06-15', 'Half Day', '09:00', '19:00', true);
    expect(r.overtime_hours).toBe(2);
    expect(r.overtime_amount).toBe(200); // 2 × 100 × 1.0
    expect(r.deduction_hours).toBe(0);
    expect(r.deduction_amount).toBe(0);
  });
});

describe('buildAttendancePayload — Present', () => {
  it('exactly standard hours: no OT, no deduction', () => {
    const r = buildAttendancePayload(baseEmployee, '2024-06-15', 'Present', '09:00', '17:00', false);
    expect(r.worked_hours).toBe(8);
    expect(r.daily_pay).toBe(800);
    expect(r.overtime_hours).toBe(0);
    expect(r.overtime_amount).toBe(0);
    expect(r.deduction_hours).toBe(0);
    expect(r.deduction_amount).toBe(0);
  });

  it('overtime applied with 1.5x multiplier', () => {
    const emp15 = { ...baseEmployee, overtime_multiplier: 1.5 };
    const r = buildAttendancePayload(emp15, '2024-06-15', 'Present', '09:00', '19:00', false);
    expect(r.overtime_hours).toBe(2);
    expect(r.overtime_amount).toBe(300); // 2 × 100 × 1.5
    expect(r.daily_pay).toBe(800);       // capped at standard
    expect(r.deduction_hours).toBe(0);
  });

  it('short day: deduction correct', () => {
    const r = buildAttendancePayload(baseEmployee, '2024-06-15', 'Present', '09:00', '15:00', false);
    expect(r.worked_hours).toBe(6);
    expect(r.daily_pay).toBe(600);
    expect(r.deduction_hours).toBe(2);
    expect(r.deduction_amount).toBe(200);
    expect(r.overtime_hours).toBe(0);
  });

  it('stores employee_id and date on the returned payload', () => {
    const r = buildAttendancePayload(baseEmployee, '2024-06-15', 'Present', '09:00', '17:00', false);
    expect(r.employee_id).toBe('emp-1');
    expect(r.date).toBe('2024-06-15');
    expect(r.daily_wage).toBe(800);
    expect(r.hourly_rate).toBe(100);
  });
});
```

- [ ] **Step 2: Run tests — new ones must fail (function does not exist yet)**

```bash
npm test
```

Expected: `4 passed, 9 failed` (the new tests fail with "buildAttendancePayload is not a function").

- [ ] **Step 3: Add `AttendancePayload` type and `buildAttendancePayload` to `payroll-utils.ts`**

Add the following after the existing `calculateDailyPayroll` function (before `formatINR`):

```ts
export type AttendancePayload = {
  employee_id: string;
  date: string;
  status: 'Present' | 'Half Day' | 'Absent';
  start_time: string;
  end_time: string;
  daily_wage: number;
  hourly_rate: number;
  worked_hours: number;
  daily_pay: number;
  overtime_hours: number;
  overtime_amount: number;
  deduction_hours: number;
  deduction_amount: number;
};

export function buildAttendancePayload(
  employee: Employee,
  date: string,
  status: 'Present' | 'Half Day' | 'Absent',
  startTime: string,
  endTime: string,
  hasTimeOverride: boolean,
): AttendancePayload {
  const [yearStr, monthStr] = date.split('-');
  const { dailyWage, hourlyRate } = calculateRates(
    employee,
    parseInt(monthStr, 10),
    parseInt(yearStr, 10),
  );
  const standardHours = employee.standard_working_hours;

  // --- Absent ---
  if (status === 'Absent') {
    return {
      employee_id: employee.id,
      date,
      status,
      start_time: startTime,
      end_time: endTime,
      daily_wage: dailyWage,
      hourly_rate: hourlyRate,
      worked_hours: 0,
      daily_pay: 0,
      overtime_hours: 0,
      overtime_amount: 0,
      deduction_hours: round2(standardHours),
      deduction_amount: round2(dailyWage),
    };
  }

  // --- Half Day, no time override: use fixed 50% values ---
  if (status === 'Half Day' && !hasTimeOverride) {
    const workedHours = round2(standardHours / 2);
    const dailyPay = round2(dailyWage / 2);
    return {
      employee_id: employee.id,
      date,
      status,
      start_time: startTime,
      end_time: endTime,
      daily_wage: dailyWage,
      hourly_rate: hourlyRate,
      worked_hours: workedHours,
      daily_pay: dailyPay,
      overtime_hours: 0,
      overtime_amount: 0,
      deduction_hours: round2(standardHours / 2),
      deduction_amount: round2(dailyWage - dailyPay),
    };
  }

  // --- Present, or Half Day with override: compute from actual times ---
  const baseDate = new Date();
  const start = parse(startTime, 'HH:mm', baseDate);
  const end = parse(endTime, 'HH:mm', baseDate);
  let minutes = differenceInMinutes(end, start);
  if (minutes < 0) minutes += 24 * 60; // night-shift handling

  const workedHours = round2(minutes / 60);
  const dailyPay = round2(Math.min(workedHours, standardHours) * hourlyRate);

  const overtimeHours = workedHours > standardHours
    ? round2(workedHours - standardHours)
    : 0;
  const overtimeAmount = overtimeHours > 0
    ? round2(overtimeHours * hourlyRate * employee.overtime_multiplier)
    : 0;
  const deductionHours = workedHours < standardHours
    ? round2(standardHours - workedHours)
    : 0;
  const deductionAmount = deductionHours > 0
    ? round2(dailyWage - dailyPay)
    : 0;

  return {
    employee_id: employee.id,
    date,
    status,
    start_time: startTime,
    end_time: endTime,
    daily_wage: dailyWage,
    hourly_rate: hourlyRate,
    worked_hours: workedHours,
    daily_pay: dailyPay,
    overtime_hours: overtimeHours,
    overtime_amount: overtimeAmount,
    deduction_hours: deductionHours,
    deduction_amount: deductionAmount,
  };
}
```

Note: `parse` and `differenceInMinutes` are already imported at the top of `payroll-utils.ts`. No new imports needed.

- [ ] **Step 4: Run all tests — all 13 must pass**

```bash
npm test
```

Expected: `13 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/payroll-utils.ts src/lib/__tests__/payroll-utils.test.ts
git commit -m "feat: add buildAttendancePayload with correct overtime_multiplier support"
```

---

## Task 4: Update `AttendanceManager.tsx`

**Files:**
- Modify: `src/app/attendance/components/AttendanceManager.tsx`

Three changes:
1. Replace inline payroll math in `handleSave` with `buildAttendancePayload`
2. Fix the Half Day end-time calculation using `date-fns addMinutes`
3. Remove the unsafe Supabase cast and unused imports

- [ ] **Step 1: Update imports at the top of `AttendanceManager.tsx`**

Current imports block (lines 1–10):
```ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { calculateRates } from '@/lib/payroll-utils';
import type { Database } from '@/types/supabase';
import type { Employee, AttendanceRecord } from '@/types';
import type { SupabaseClient } from '@supabase/supabase-js';
```

Replace with:
```ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { parse, addMinutes, format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { buildAttendancePayload } from '@/lib/payroll-utils';
import type { Employee, AttendanceRecord } from '@/types';
```

Removed: `calculateRates` (unused), `Database` type import, `SupabaseClient` type import.
Added: `parse`, `addMinutes`, `format` from `date-fns`; `buildAttendancePayload`.

- [ ] **Step 2: Fix the Supabase client instantiation (line 21)**

Current:
```ts
const supabase = createClient() as unknown as SupabaseClient<Database>;
```

Replace with:
```ts
const supabase = createClient();
```

`createClient()` in this project already returns `SupabaseClient<Database>` via `createBrowserClient<Database>(...)`. The cast is unnecessary.

- [ ] **Step 3: Replace the inline payload construction in `handleSave`**

Find the block starting with the comment `// 2. Build full payload for all employees` (around line 155) and replace everything from that comment up to (but not including) the `// 3. Single upsert` comment.

Current block to remove:
```ts
// 2. Build full payload for all employees (upsert handles insert vs update automatically)
// Calculate actual days in month from globalDate (YYYY-MM-DD format)
const [yearStr, monthStr] = globalDate.split('-');
const year = parseInt(yearStr, 10);
const month = parseInt(monthStr, 10);
const daysInMonth = new Date(year, month, 0).getDate();

const payload = employees.map((emp) => {
  const state        = records[emp.id];
  const status       = state?.status || 'Absent';
  const standardHours = Number(emp.standard_working_hours) || 8;
  // Use actual days in month for accurate daily wage calculation
  const dailyWage    = Number(emp.monthly_salary) / daysInMonth;
  const hourlyRate   = dailyWage / standardHours;

  // Resolve times
  let startTime = state?.overrideStartTime || (status === 'Absent' ? '00:00' : globalStartTime);
  let endTime   = state?.overrideEndTime   || (status === 'Absent' ? '00:00' : globalEndTime);
  if (status === 'Half Day' && !state?.overrideEndTime) {
    const [sH] = startTime.split(':').map(Number);
    endTime = `${String(sH + Math.floor(standardHours / 2)).padStart(2, '0')}:00`;
  }

  // Compute hours & pay
  let workedHours = 0;
  let dailyPay    = dailyWage;
  if (status === 'Absent') {
    workedHours = 0; dailyPay = 0;
  } else if (status === 'Half Day') {
    workedHours = standardHours / 2; dailyPay = dailyWage / 2;
  } else {
    workedHours = calculateHours(startTime, endTime);
    const short = standardHours - workedHours;
    if (short > 0) dailyPay = dailyWage - short * hourlyRate;
  }

  const deductionHours  = status === 'Absent' ? standardHours
                        : status === 'Half Day' ? standardHours / 2
                        : Math.max(0, standardHours - workedHours);
  const deductionAmount = dailyWage - dailyPay;

  return {
    company_id:       companyId,
    employee_id:      emp.id,
    date:             globalDate,
    status,
    start_time:       startTime,
    end_time:         endTime,
    daily_wage:       dailyWage,
    hourly_rate:      hourlyRate,
    worked_hours:     workedHours,
    daily_pay:        dailyPay,
    overtime_hours:   0,
    overtime_amount:  0,
    deduction_hours:  deductionHours,
    deduction_amount: deductionAmount,
  };
});
```

Replace with:
```ts
// 2. Build full payload for all employees
const payload = employees.map((emp) => {
  const state         = records[emp.id];
  const status        = state?.status ?? 'Absent';
  const standardHours = Number(emp.standard_working_hours) || 8;
  // hasOverride requires BOTH start and end to be explicitly set.
  // This prevents a start-time-only override on a Half Day from accidentally
  // switching it to actual-hours mode with globalEndTime as the end time.
  const hasOverride   = !!(state?.overrideStartTime && state?.overrideEndTime);

  let startTime: string;
  let endTime: string;

  if (status === 'Absent') {
    startTime = '00:00';
    endTime   = '00:00';
  } else {
    startTime = state?.overrideStartTime || globalStartTime;

    if (status === 'Half Day' && !state?.overrideEndTime) {
      // Use date-fns to correctly handle fractional standardHours and minute offsets
      const halfMinutes = Math.round((standardHours / 2) * 60);
      const startParsed = parse(startTime, 'HH:mm', new Date());
      endTime = format(addMinutes(startParsed, halfMinutes), 'HH:mm');
    } else {
      endTime = state?.overrideEndTime || globalEndTime;
    }
  }

  const row = buildAttendancePayload(emp, globalDate, status, startTime, endTime, hasOverride);
  return { company_id: companyId, ...row };
});
```

- [ ] **Step 4: Remove the now-unused `calculateHours` function**

The `calculateHours` function (around line 128) is no longer called. Delete the entire function:

```ts
// DELETE this entire function — no longer needed
const calculateHours = (start: string, end: string) => {
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  const totalHours = (eH + eM / 60) - (sH + sM / 60);
  return Math.max(0, totalHours);
};
```

- [ ] **Step 5: Verify TypeScript compiles cleanly**

```bash
cd C:\Users\Lenovo\.gemini\antigravity\scratch\payroll-app
npx tsc --noEmit
```

Expected: No errors. If there are errors, read the error messages carefully — they will point to exact lines. Common issues: lingering reference to `calculateHours`, missing import.

- [ ] **Step 6: Run tests to confirm nothing broke**

```bash
npm test
```

Expected: `13 passed`.

- [ ] **Step 7: Commit**

```bash
git add src/app/attendance/components/AttendanceManager.tsx
git commit -m "refactor: AttendanceManager uses buildAttendancePayload, removes inline math and unsafe cast"
```

---

## Task 5: Update `AddEmployeeModal.tsx` defaults

**Files:**
- Modify: `src/app/employees/components/AddEmployeeModal.tsx`

Three changes: remove the unsafe Supabase cast, and change two `'1.5'` defaults to `'1.0'`.

- [ ] **Step 1: Remove the unsafe Supabase cast (line 12)**

Current:
```ts
const supabase = createClient() as unknown as SupabaseClient<Database>;
```

Replace with:
```ts
const supabase = createClient();
```

Also remove the now-unused imports on lines 7–8:
```ts
import type { Database } from '@/types/supabase';      // remove
import type { SupabaseClient } from '@supabase/supabase-js'; // remove
```

- [ ] **Step 3: Change initial state default**

Find (around line 23):
```ts
overtime_multiplier: '1.5', // default 1.5x (common labor law standard)
```

Replace with:
```ts
overtime_multiplier: '1.0',
```

- [ ] **Step 4: Change reset state after successful save**

Find the reset block in the success branch (after `setIsOpen(false)`):
```ts
overtime_multiplier: '1.5',
```

Replace with:
```ts
overtime_multiplier: '1.0',
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/employees/components/AddEmployeeModal.tsx
git commit -m "fix: remove unsafe cast and default overtime_multiplier to 1.0 in AddEmployeeModal"
```

---

## Task 6: Update `EditEmployeeModal.tsx` fallback

**Files:**
- Modify: `src/app/employees/components/EditEmployeeModal.tsx`

One line changes: `|| 1.5` → `?? 1.0`. The `??` (nullish coalescing) is safer: it only triggers on `null` or `undefined`, not on a legitimate `0`.

- [ ] **Step 1: Fix the fallback**

Find line 27:
```ts
overtime_multiplier: String(employee.overtime_multiplier || 1.5),
```

Replace with:
```ts
overtime_multiplier: String(employee.overtime_multiplier ?? 1.0),
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/employees/components/EditEmployeeModal.tsx
git commit -m "fix: EditEmployeeModal fallback uses nullish coalescing with 1.0 default"
```

---

## Task 7: End-to-End Verification

- [ ] **Step 1: Run full test suite one final time**

```bash
npm test
```

Expected: `13 passed, 0 failed`.

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Start dev server and do a manual smoke test**

```bash
npm run dev
```

Open the app. Do the following:
1. Navigate to Attendance
2. Select today's date
3. Mark one employee **Present**, set end time 2 hours past the global end time (to trigger OT)
4. Click **Save All Attendance**
5. Expected: Save succeeds with no error banner

Then verify the saved record in Supabase:
- `overtime_hours` should be `2`
- `overtime_amount` should be `2 × hourly_rate × overtime_multiplier`
- `overtime_amount` should NOT be `0`

- [ ] **Step 4: Verify payroll report**

Navigate to Reports for the current month. The employee's **Overtime** column should show a non-zero value.

- [ ] **Step 5: Final commit if any stray changes**

```bash
git status
```

If clean: done. If any unstaged files: commit them with an appropriate message.
