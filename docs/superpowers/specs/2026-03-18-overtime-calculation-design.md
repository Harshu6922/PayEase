# Overtime Calculation — Design Spec
**Date:** 2026-03-18
**Status:** Approved
**Scope:** `payroll-utils.ts`, `AttendanceManager.tsx`, `AddEmployeeModal.tsx`, `EditEmployeeModal.tsx`

---

## Problem Statement

Overtime is currently never calculated or saved. `AttendanceManager.tsx` hardcodes `overtime_hours: 0` and `overtime_amount: 0` for every attendance record. The `calculateDailyPayroll` utility also ignores the `overtime_multiplier` field stored on each employee. As a result, the Payroll Dashboard shows zero overtime for all employees.

---

## Decisions

| Question | Decision |
|---|---|
| Overtime formula | `overtime_amount = overtime_hours × hourlyRate × overtime_multiplier` |
| Default `overtime_multiplier` | `1.0` (no premium; per-employee config can override) |
| Half Day with time override | Use actual hours from override; without override, use `standardHours / 2` |
| `daily_pay` formula | `min(workedHours, standardHours) × hourlyRate` (capped at standard hours) |
| `deduction_amount` formula | `dailyWage - dailyPay` (single authoritative derivation, avoids rounding split) |

---

## Architecture

### 1. `payroll-utils.ts` — Fix `calculateDailyPayroll`

`calculateDailyPayroll` is exported but not currently called by any file in the codebase. Fix it anyway to keep it correct as a utility.

**Rounding order** (must match `buildAttendancePayload`): `workedHours` is rounded first via `round2`, then used in all downstream calculations. This is already the case (line 50) and must be preserved.

**Fixes:**
- `dailyPay = round2(Math.min(workedHours, employee.standard_working_hours) * hourlyRate)` (cap at standard hours)
- `overtimeAmount = round2(overtimeHours * hourlyRate * employee.overtime_multiplier)` (apply multiplier)
- `deductionAmount = round2(dailyWage - dailyPay)` (replaces hours-based formula; consistent with `buildAttendancePayload`)

**Known limitation (pre-existing, not in scope):** `dailyWage` is derived internally from `employee.monthly_salary / daysInMonth`, so output changes based on which calendar month `dateString` falls in.

---

### 2. `payroll-utils.ts` — Add `buildAttendancePayload`

New pure function. Returns a fully typed DB row (minus `company_id`) ready for Supabase upsert. All numeric fields are non-nullable `number`. Uses `round2` on every money and hours field.

#### Type definition (add to `payroll-utils.ts`):

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
```

#### Signature:

```ts
export function buildAttendancePayload(
  employee: Employee,
  date: string,
  status: 'Present' | 'Half Day' | 'Absent',
  startTime: string,       // HH:mm — resolved by caller
  endTime: string,         // HH:mm — resolved by caller
  hasTimeOverride: boolean // true if manager explicitly set a time override
): AttendancePayload
```

`hasTimeOverride` lets the function distinguish a Half Day where the manager explicitly set an end time (use actual hours) from one where the caller just computed the default half-day end time (force `standardHours / 2`).

#### Internal logic:

**Absent:**
```
workedHours     = 0
dailyPay        = 0
overtimeHours   = 0
overtimeAmount  = 0
deductionHours  = standardHours
deductionAmount = dailyWage
```

**Half Day, `hasTimeOverride = false`:**
```
workedHours     = round2(standardHours / 2)
dailyPay        = round2(dailyWage / 2)
overtimeHours   = 0
overtimeAmount  = 0
deductionHours  = round2(standardHours / 2)
deductionAmount = round2(dailyWage - dailyPay)
```
Using `dailyWage / 2` directly (not `workedHours × hourlyRate`) avoids sub-cent rounding divergence.

**Half Day, `hasTimeOverride = true` / Present:**
```
workedHours     = round2(calculateHoursFromTimes(startTime, endTime))
dailyPay        = round2(Math.min(workedHours, standardHours) * hourlyRate)
overtimeHours   = round2(Math.max(0, workedHours - standardHours))
overtimeAmount  = round2(overtimeHours * hourlyRate * employee.overtime_multiplier)
deductionHours  = round2(Math.max(0, standardHours - workedHours))
deductionAmount = round2(dailyWage - dailyPay)
```

#### `calculateHoursFromTimes` (internal helper):

Computes decimal hours between two `HH:mm` strings. Uses `date-fns` `parse` + `differenceInMinutes` (already imported in the file). Returns `Math.max(0, minutes / 60)`.

---

### 3. `AttendanceManager.tsx` — Replace inline math

**Time resolution** (done before calling `buildAttendancePayload`):

| Status | Has override? | startTime | endTime | hasTimeOverride |
|---|---|---|---|---|
| `Absent` | — | `'00:00'` | `'00:00'` | `false` |
| `Half Day` | No | `globalStartTime` | computed: see below | `false` |
| `Half Day` | Yes | `override or global` | `override or global` | `true` |
| `Present` | No | `globalStartTime` | `globalEndTime` | `false` |
| `Present` | Yes | `override or global` | `override or global` | `true` |

**Half Day default end time computation** (replaces broken existing logic):
```ts
// Use date-fns addMinutes to avoid integer-only hour arithmetic
import { parse, addMinutes, format } from 'date-fns';
const halfMinutes = Math.round((standardHours / 2) * 60);
const startParsed = parse(globalStartTime, 'HH:mm', new Date());
endTime = format(addMinutes(startParsed, halfMinutes), 'HH:mm');
```
This correctly handles fractional `standardHours` (e.g., 9h → 4h 30m end time) and preserves minutes from `globalStartTime`.

**`handleSave` payload construction:**

Time resolution is inline logic inside the `employees.map(...)` loop — not a separate helper. For each employee:

```ts
const standardHours = Number(emp.standard_working_hours) || 8;
const hasOverride   = !!(state?.overrideStartTime || state?.overrideEndTime);

let startTime: string;
let endTime: string;

if (status === 'Absent') {
  startTime = '00:00';
  endTime   = '00:00';
} else {
  startTime = state?.overrideStartTime || globalStartTime;

  if (status === 'Half Day' && !state?.overrideEndTime) {
    // Compute default half-day end using date-fns to handle fractional hours and minute offsets
    const halfMinutes  = Math.round((standardHours / 2) * 60);
    const startParsed  = parse(startTime, 'HH:mm', new Date());
    endTime            = format(addMinutes(startParsed, halfMinutes), 'HH:mm');
  } else {
    endTime = state?.overrideEndTime || globalEndTime;
  }
}

const row = buildAttendancePayload(emp, globalDate, status, startTime, endTime, hasOverride);
return { company_id: companyId, ...row };
```

Required imports to add: `parse`, `addMinutes`, `format` from `date-fns`.

**Removals:**
- Dead import: `calculateRates`
- Unsafe cast: `as unknown as SupabaseClient<Database>` → `createClient()` directly with proper generic if available, else remove the cast entirely and rely on inferred type

**Known limitation (accepted, out of scope):**
`fetchExistingRecords` detects overrides by comparing saved times against the current `globalStartTime`/`globalEndTime`. If the manager changes the global time after loading records, override detection may be inaccurate. This is a pre-existing issue not introduced by this change; tracked for a future improvement.

---

### 4. `AddEmployeeModal.tsx`

Three changes:
- Initial state: `overtime_multiplier: '1.0'`
- Reset state after successful save: `overtime_multiplier: '1.0'`
- The `min="1"` constraint on the OT multiplier input remains correct — `1.0` satisfies it, and values below 1 (reduced OT) are not a supported use case.

---

### 5. `EditEmployeeModal.tsx` — Add to scope

Fix fallback on line 27:
```ts
// Before:
overtime_multiplier: String(employee.overtime_multiplier || 1.5),
// After:
overtime_multiplier: String(employee.overtime_multiplier ?? 1.0),
```
Use `??` (nullish coalescing) instead of `||` so that a legitimate `0` value is not overridden. The fallback value changes from `1.5` to `1.0` to match the new default.

---

## Data Model

No DB schema changes required. All fields already exist in `attendance_records`:

```
overtime_hours   numeric  -- previously always 0, now correctly populated
overtime_amount  numeric  -- previously always 0, now correctly populated
deduction_hours  numeric
deduction_amount numeric
daily_pay        numeric  -- fixed: no longer double-counts OT hours
```

---

## Type Safety Requirements

- No `as any` or `as unknown as` casts
- All numeric fields guarded with `Number(x) || 0` at data fetch boundaries
- `AttendancePayload` type explicitly defined and exported from `payroll-utils.ts`
- `buildAttendancePayload` return type is `AttendancePayload` (all fields non-nullable `number`)
- `round2` applied to all money and hours fields inside `buildAttendancePayload`

---

## Files Changed

| File | Change |
|---|---|
| `src/lib/payroll-utils.ts` | Fix `calculateDailyPayroll`; export `AttendancePayload` type; add `buildAttendancePayload` |
| `src/app/attendance/components/AttendanceManager.tsx` | Use `buildAttendancePayload`; remove inline math; fix import/cast; fix Half Day time arithmetic |
| `src/app/employees/components/AddEmployeeModal.tsx` | Change default + reset `overtime_multiplier` to `1.0` |
| `src/app/employees/components/EditEmployeeModal.tsx` | Change fallback from `\|\| 1.5` to `?? 1.0` |

---

## Out of Scope

- Real-time per-row pay preview in the attendance table (deferred; no refactor needed to add later)
- PayrollDashboard changes (already correctly uses `overtime_amount` from DB)
- `fetchExistingRecords` override detection fragility (tracked as separate future improvement)
