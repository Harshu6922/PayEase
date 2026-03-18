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
- Date format: `YYYY-MM-DD`; Time format: `HH:mm:ss`

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

**Commission agents:** excluded from import. Rows whose matched employee has `worker_type = 'commission'` are automatically marked Skip (with a tooltip: "Commission agents don't use attendance tracking").

---

## 4. Conflict Detection

A row is `Conflict` if an attendance record already exists for that `(employee_id, date)` in the DB.

- Check is done client-side after parsing, by comparing against attendance records already fetched on the page
- Default action for conflicts: **Skip**
- User can toggle conflict rows to **Overwrite** individually

---

## 5. Import Logic (on Confirm)

Process only rows that are not marked Skip:

1. For each `Matched` row with in + out times:
   - Upsert into `attendance_records` with `status = 'present'`, `override_start_time = in time`, `override_end_time = out time`
   - Use `onConflict: 'employee_id,date'` — same upsert pattern as `AttendanceManager`

2. `Overwrite` conflict rows: included in upsert (overwrites existing record)

3. `Skip` rows: ignored entirely

4. After all upserts complete:
   - Close modal
   - Refresh attendance page to the earliest imported date

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
| `src/app/attendance/page.tsx` | Modify | Add "Import Biometric" button; pass employees + attendance to modal |
| `src/app/attendance/components/BiometricImportModal.tsx` | Create | Full two-step modal: upload + preview table + confirm logic |
| `src/lib/biometric-utils.ts` | Create | Pure CSV parsing function: `parsebiometricCsv(text) → ParsedPunchRow[]` |
| `src/lib/__tests__/biometric-utils.test.ts` | Create | Unit tests for CSV parsing logic |

### `ParsedPunchRow` type (in `src/types/index.ts`):
```ts
export interface ParsedPunchRow {
  biometricName: string;
  date: string;           // 'YYYY-MM-DD'
  inTime: string | null;  // 'HH:mm:ss'
  outTime: string | null; // 'HH:mm:ss'
}
```

### `ImportRow` type (local to `BiometricImportModal.tsx`):
```ts
interface ImportRow {
  parsed: ParsedPunchRow;
  matchedEmployee: Employee | null;
  status: 'matched' | 'unmatched' | 'missing-punch-out' | 'conflict';
  action: 'import' | 'skip' | 'overwrite';
  manualOutTime: string;  // editable if missing punch-out
}
```

---

## 8. Testing

`parsebiometricCsv` is a pure function — unit tested with Vitest:

- Normal case: 2 rows per employee per day → correct in/out
- Single punch: 1 row → `outTime: null`
- Multiple days: correct grouping
- Case variation in names: preserved as-is (matching is done separately)
- Empty CSV: returns `[]`
- Missing columns: throws descriptive error
