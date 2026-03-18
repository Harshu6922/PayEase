# Biometric CSV Import — Design Spec

**Date:** 2026-03-18
**Status:** Approved

---

## Overview

Allow admins to upload a CSV punch log exported from a biometric device and automatically populate attendance records. The flow is: upload → parse client-side → preview with name matching → confirm → upsert attendance.

No new API routes or server actions are needed — all writes go through the existing Supabase browser client using the same upsert logic as `AttendanceManager`.

---

## 1. CSV Format

The biometric device exports a raw punch log CSV with alternating in/out rows per employee per day.

**Expected columns:** `Name, Date, Time`

**Sample:**
```
Name,Date,Time
Ravi Kumar,2026-03-18,09:02:34
Ravi Kumar,2026-03-18,17:45:21
Ahmed Khan,2026-03-18,08:55:10
Ahmed Khan,2026-03-18,17:50:00
Ravi Kumar,2026-03-19,09:10:00
Ravi Kumar,2026-03-19,17:30:00
```

**Parsing rules:**
- Group rows by `(Name, Date)`
- Within each group, first timestamp = punch-in, last timestamp = punch-out
- If a group has only one timestamp → `Missing punch-out` status
- Date format: `YYYY-MM-DD`; Time format: `HH:mm` (strip seconds — `calculateDailyPayroll` expects `HH:mm`)

---

## 2. UI — Import Button & Modal

### 2.1 Entry point

Add an **"Import Biometric"** button to the attendance page (`src/app/attendance/page.tsx`), alongside the existing controls. Clicking it opens the import modal.

### 2.2 Modal — Step 1: Upload

- File picker: accepts `.csv` only
- On file select: parse CSV client-side immediately, advance to Step 2
- On parse error (unrecognised format): show inline error, allow re-upload

### 2.3 Modal — Step 2: Preview table

One row per `(employee, date)` pair. Columns:

| Column | Description |
|--------|-------------|
| **Biometric Name** | Raw name string from CSV |
| **Matched Employee** | Auto-matched employee name + ID, or dropdown if unmatched |
| **Date** | Parsed date (`DD MMM YYYY`) |
| **In Time** | Punch-in timestamp (`HH:mm`) |
| **Out Time** | Punch-out timestamp (`HH:mm`), or editable input if missing |
| **Status** | `Matched` / `Unmatched` / `Missing punch-out` / `Conflict` |
| **Action** | "Skip" toggle per row |

**Status colours:**
- `Matched` — green
- `Unmatched` — amber (dropdown required before import)
- `Missing punch-out` — amber (manual time input required or skip)
- `Conflict` — blue (attendance already exists; default action = Skip, toggleable to Overwrite)

**Import button** is disabled while any row is `Unmatched` or `Missing punch-out` and not marked Skip.

---

## 3. Name Matching

**Auto-match:** case-insensitive exact match on `employee.full_name`. Runs client-side against the employees list already loaded on the attendance page.

**Manual match:** if no auto-match, the Matched Employee cell shows a searchable dropdown of all active employees. User selects the correct employee.

**Multiple matches:** if two employees share the same name, show both in the dropdown — user picks one.

**Commission agents:** excluded from import. Once the Commission Foundation sub-project is deployed, rows whose matched employee has `worker_type = 'commission'` are automatically marked Skip (with a tooltip: "Commission agents don't use attendance tracking"). Until then, all matched employees are treated as importable.

---

## 4. Conflict Detection

A row is `Conflict` if an attendance record already exists for that `(employee_id, date)` in the DB.

- After parsing the CSV, the modal fetches existing attendance records from Supabase for all dates present in the parsed data — a single query filtered by `company_id = <current company>` AND `date IN (...distinct dates...)`
- Conflict check runs client-side against the fetched records
- Default action for conflicts: **Skip**
- User can toggle conflict rows to **Overwrite** individually

---

## 5. Import Logic (on Confirm)

Process only rows that are not marked Skip:

1. For each `Matched` row with in + out times, call `calculateDailyPayroll(employee, date, inTime, outTime)` from `src/lib/payroll-utils.ts` (same function used by `AttendanceManager`). `inTime`/`outTime` are `'HH:mm'` strings. This returns all required computed fields.

   Assemble the upsert payload:
   ```ts
   const computed = calculateDailyPayroll(employee, row.parsed.date, inTime, outTime);
   const payload = {
     company_id,
     employee_id: employee.id,
     date: row.parsed.date,
     status: 'present',
     start_time: inTime,   // 'HH:mm'
     end_time: outTime,    // 'HH:mm'
     ...computed,          // daily_wage, hourly_rate, worked_hours, daily_pay,
                           // overtime_hours, overtime_amount, deduction_hours, deduction_amount
   };
   ```
   Upsert using `onConflict: 'employee_id,date'` — same pattern as `AttendanceManager`.

2. `Overwrite` conflict rows: included in upsert (overwrites existing record)

3. `Skip` rows: ignored entirely

4. After all upserts complete:
   - Close modal
   - Navigate to the earliest imported date: the modal accepts an `onImportComplete(date: string) => void` prop; the attendance page passes a handler that sets `globalDate` on `AttendanceManager` to that date

**Error handling:** if any upsert fails, show an error summary listing failed rows. Successful rows are still committed (no rollback).

---

## 6. Scope & Out of Scope

**In scope:**
- Client-side CSV parsing
- Two-step modal (upload → preview)
- Name matching with manual override
- Conflict detection and overwrite option
- Upsert to `attendance_records` via existing Supabase client

**Out of scope:**
- Server-side CSV processing
- PDF import (biometric PDFs are not parseable reliably)
- Fuzzy/phonetic name matching
- Saving name mappings for future imports (can be added later)
- Half Day or Absent status from biometric (import always sets `present`)

---

## 7. Architecture

| File | Action | Responsibility |
|------|--------|---------------|
| `src/app/attendance/page.tsx` | Modify | Add "Import Biometric" button; pass employees list to modal |
| `src/app/attendance/components/BiometricImportModal.tsx` | Create | Full two-step modal: upload + preview table + conflict fetch + confirm logic |
| `src/lib/biometric-utils.ts` | Create | Pure CSV parsing function: `parseBiometricCsv(text) → ParsedPunchRow[]` |
| `src/lib/__tests__/biometric-utils.test.ts` | Create | Unit tests for CSV parsing logic |

### `ParsedPunchRow` type (in `src/types/index.ts`):
```ts
export interface ParsedPunchRow {
  biometricName: string;
  date: string;           // 'YYYY-MM-DD'
  inTime: string | null;  // 'HH:mm'
  outTime: string | null; // 'HH:mm'
}
```

### `ImportRow` type (local to `BiometricImportModal.tsx`):
```ts
interface ImportRow {
  parsed: ParsedPunchRow;
  matchedEmployee: Employee | null;
  status: 'matched' | 'unmatched' | 'missing-punch-out' | 'conflict';
  action: 'import' | 'skip' | 'overwrite';
  manualOutTime: string;  // 'HH:mm' — from <input type="time">; used directly with calculateDailyPayroll
}
```

---

## 8. Testing

`parseBiometricCsv` is a pure function — unit tested with Vitest:

- Normal case: 2 rows per employee per day → correct in/out
- Single punch: 1 row → `outTime: null`
- Multiple days: correct grouping
- Case variation in names: preserved as-is (matching is done separately)
- Empty CSV: returns `[]`
- Missing columns: throws descriptive error
