# Biometric CSV Import Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a two-step modal to `AttendanceManager` that parses a biometric punch-log CSV, previews matches, detects conflicts, and upserts attendance records using the existing `calculateDailyPayroll` utility.

**Architecture:** Pure CSV parsing logic lives in `src/lib/biometric-utils.ts` (unit-tested with Vitest). The modal `BiometricImportModal.tsx` handles all UI, conflict fetching, and upserts — it is mounted inside `AttendanceManager.tsx` which already owns `globalDate` state and passes `(date) => setGlobalDate(date)` as `onImportComplete`. No server-side changes, no new DB tables.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Supabase browser client, Vitest, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-18-biometric-import-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/types/index.ts` | Add `ParsedPunchRow` interface |
| Create | `src/lib/biometric-utils.ts` | `parseBiometricCsv` pure function |
| Create | `src/lib/__tests__/biometric-utils.test.ts` | Unit tests for CSV parsing |
| Create | `src/app/attendance/components/BiometricImportModal.tsx` | Two-step import modal |
| Modify | `src/app/attendance/components/AttendanceManager.tsx` | Lift `companyId` to state; add button + modal mount |

---

## Task 1: Add `ParsedPunchRow` type

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Append `ParsedPunchRow` to `src/types/index.ts`**

At the end of the file, add:

```ts
export interface ParsedPunchRow {
  biometricName: string;
  date: string;           // 'YYYY-MM-DD'
  inTime: string | null;  // 'HH:mm' — null if only one punch
  outTime: string | null; // 'HH:mm' — null if only one punch
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd C:\Users\Lenovo\.gemini\antigravity\scratch\payroll-app
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add ParsedPunchRow type for biometric import"
```

---

## Task 2: Create `biometric-utils.ts` (TDD)

**Files:**
- Create: `src/lib/biometric-utils.ts`
- Create: `src/lib/__tests__/biometric-utils.test.ts`

**Background:**
- CSV format: header row `Name,Date,Time`; each employee/day has 2 rows (in, out); times are `HH:mm:ss` in the file
- Parser strips seconds: `"09:02:34"` → `"09:02"`
- Groups by `(Name, Date)` — first row = inTime, last row = outTime
- Only one row for a group → `outTime: null`

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/biometric-utils.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseBiometricCsv } from '../biometric-utils';

describe('parseBiometricCsv', () => {
  it('parses a normal two-punch-per-day CSV', () => {
    const csv = `Name,Date,Time
Ravi Kumar,2026-03-18,09:02:34
Ravi Kumar,2026-03-18,17:45:21`;
    const result = parseBiometricCsv(csv);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      biometricName: 'Ravi Kumar',
      date: '2026-03-18',
      inTime: '09:02',
      outTime: '17:45',
    });
  });

  it('strips seconds from times', () => {
    const csv = `Name,Date,Time
Ahmed,2026-03-18,08:00:00
Ahmed,2026-03-18,16:30:59`;
    const result = parseBiometricCsv(csv);
    expect(result[0].inTime).toBe('08:00');
    expect(result[0].outTime).toBe('16:30');
  });

  it('sets outTime to null for single punch', () => {
    const csv = `Name,Date,Time
Ravi Kumar,2026-03-18,09:02:34`;
    const result = parseBiometricCsv(csv);
    expect(result[0].inTime).toBe('09:02');
    expect(result[0].outTime).toBeNull();
  });

  it('handles multiple employees and multiple days', () => {
    const csv = `Name,Date,Time
Ravi Kumar,2026-03-18,09:00:00
Ravi Kumar,2026-03-18,17:00:00
Ahmed Khan,2026-03-18,08:30:00
Ahmed Khan,2026-03-18,16:30:00
Ravi Kumar,2026-03-19,09:05:00
Ravi Kumar,2026-03-19,17:10:00`;
    const result = parseBiometricCsv(csv);
    expect(result).toHaveLength(3);
    const raviMar18 = result.find(r => r.biometricName === 'Ravi Kumar' && r.date === '2026-03-18');
    expect(raviMar18?.inTime).toBe('09:00');
    expect(raviMar18?.outTime).toBe('17:00');
    const ahmed = result.find(r => r.biometricName === 'Ahmed Khan');
    expect(ahmed?.inTime).toBe('08:30');
  });

  it('returns empty array for header-only CSV', () => {
    expect(parseBiometricCsv('Name,Date,Time')).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseBiometricCsv('')).toEqual([]);
  });

  it('throws a descriptive error for missing required columns', () => {
    const csv = `Employee,Date,Time
Ravi,2026-03-18,09:00:00`;
    expect(() => parseBiometricCsv(csv)).toThrow('CSV must have columns: Name, Date, Time');
  });

  it('uses last punch as outTime when more than 2 punches exist', () => {
    const csv = `Name,Date,Time
Ravi,2026-03-18,09:00:00
Ravi,2026-03-18,13:00:00
Ravi,2026-03-18,17:30:00`;
    const result = parseBiometricCsv(csv);
    expect(result[0].inTime).toBe('09:00');
    expect(result[0].outTime).toBe('17:30');
  });
});
```

- [ ] **Step 2: Run tests — all must fail**

```bash
npm test
```

Expected: All 8 tests fail with `Cannot find module '../biometric-utils'`.

- [ ] **Step 3: Create `src/lib/biometric-utils.ts`**

```ts
import type { ParsedPunchRow } from '@/types';

/**
 * Strips seconds from a time string.
 * '09:02:34' → '09:02'   |   '09:02' → '09:02'
 */
function toHHmm(time: string): string {
  return time.length >= 5 ? time.substring(0, 5) : time;
}

/**
 * Parses a biometric device punch-log CSV into grouped punch rows.
 *
 * Expected CSV format:
 *   Name,Date,Time
 *   Ravi Kumar,2026-03-18,09:02:34
 *   Ravi Kumar,2026-03-18,17:45:21
 *
 * Rules:
 * - Groups rows by (Name, Date)
 * - First timestamp in a group = inTime
 * - Last timestamp in a group = outTime (null if only one punch)
 * - Seconds are stripped from all times ('HH:mm:ss' → 'HH:mm')
 *
 * @throws Error if required columns (Name, Date, Time) are missing
 */
export function parseBiometricCsv(text: string): ParsedPunchRow[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const lines = trimmed.split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const nameIdx = header.indexOf('name');
  const dateIdx = header.indexOf('date');
  const timeIdx = header.indexOf('time');

  if (nameIdx === -1 || dateIdx === -1 || timeIdx === -1) {
    throw new Error('CSV must have columns: Name, Date, Time');
  }

  // Map: "Name|Date" → [time1, time2, ...]
  const groups = new Map<string, string[]>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(',').map(c => c.trim());
    const name = cols[nameIdx];
    const date = cols[dateIdx];
    const time = cols[timeIdx];
    if (!name || !date || !time) continue;

    const key = `${name}|${date}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(time);
  }

  const result: ParsedPunchRow[] = [];
  groups.forEach((times, key) => {
    const pipeIdx = key.indexOf('|');
    const biometricName = key.substring(0, pipeIdx);
    const date = key.substring(pipeIdx + 1);
    result.push({
      biometricName,
      date,
      inTime: times.length > 0 ? toHHmm(times[0]) : null,
      outTime: times.length > 1 ? toHHmm(times[times.length - 1]) : null,
    });
  });

  return result;
}
```

- [ ] **Step 4: Run tests — all 8 must pass**

```bash
npm test
```

Expected: `8 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/biometric-utils.ts src/lib/__tests__/biometric-utils.test.ts
git commit -m "feat: add parseBiometricCsv utility with TDD"
```

---

## Task 3: Create `BiometricImportModal.tsx`

**Files:**
- Create: `src/app/attendance/components/BiometricImportModal.tsx`

Note: This component uses Supabase client, so it cannot be unit tested with Vitest. Verify visually in Task 5.

- [ ] **Step 1: Create `src/app/attendance/components/BiometricImportModal.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { parseBiometricCsv } from '@/lib/biometric-utils';
import { calculateDailyPayroll } from '@/lib/payroll-utils';
import type { Employee, ParsedPunchRow } from '@/types';

interface ImportRow {
  parsed: ParsedPunchRow;
  matchedEmployee: Employee | null;
  /** Status precedence: missing-punch-out > conflict > matched/unmatched */
  status: 'matched' | 'unmatched' | 'missing-punch-out' | 'conflict';
  action: 'import' | 'skip' | 'overwrite';
  manualOutTime: string; // 'HH:mm' from <input type="time">
}

interface Props {
  employees: Employee[];
  companyId: string;
  onImportComplete: (earliestDate: string) => void;
  onClose: () => void;
}

export default function BiometricImportModal({
  employees,
  companyId,
  onImportComplete,
  onClose,
}: Props) {
  const supabase = createClient();
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────

  function matchEmployee(name: string): Employee | null {
    return (
      employees.find(
        e => e.full_name.toLowerCase() === name.toLowerCase(),
      ) ?? null
    );
  }

  function computeStatus(
    parsed: ParsedPunchRow,
    matched: Employee | null,
    conflictSet: Set<string>,
  ): ImportRow['status'] {
    if (parsed.outTime === null) return 'missing-punch-out'; // highest precedence
    if (matched && conflictSet.has(`${matched.id}|${parsed.date}`)) return 'conflict';
    if (matched) return 'matched';
    return 'unmatched';
  }

  function defaultAction(status: ImportRow['status']): ImportRow['action'] {
    if (status === 'conflict') return 'skip';
    if (status === 'missing-punch-out') return 'skip';
    if (status === 'unmatched') return 'skip';
    return 'import';
  }

  // ── File Upload ───────────────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError(null);
    setIsFetching(true);

    try {
      const text = await file.text();
      const parsed = parseBiometricCsv(text);

      if (parsed.length === 0) {
        setParseError('No rows found in CSV. Check that the file has Name, Date, Time columns.');
        setIsFetching(false);
        return;
      }

      // Fetch existing records for conflict detection
      const distinctDates = [...new Set(parsed.map(r => r.date))];
      const { data: existing } = await supabase
        .from('attendance_records')
        .select('employee_id, date')
        .eq('company_id', companyId)
        .in('date', distinctDates);

      const conflictSet = new Set(
        (existing ?? []).map(r => `${r.employee_id}|${r.date}`),
      );

      const importRows: ImportRow[] = parsed.map(p => {
        const matched = matchEmployee(p.biometricName);
        const status = computeStatus(p, matched, conflictSet);
        return {
          parsed: p,
          matchedEmployee: matched,
          status,
          action: defaultAction(status),
          manualOutTime: '',
        };
      });

      setRows(importRows);
      setStep('preview');
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse CSV.');
    } finally {
      setIsFetching(false);
    }
  };

  // ── Row Updates ───────────────────────────────────────────────────────────

  const updateRow = (idx: number, patch: Partial<ImportRow>) => {
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  // Import button is disabled if any non-skipped row is still unresolved
  const canImport = rows.every(r => {
    if (r.action === 'skip') return true;
    if (r.matchedEmployee === null) return false;
    if (r.parsed.outTime === null && r.manualOutTime === '') return false;
    return true;
  });

  // ── Confirm Import ────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    setIsImporting(true);
    setImportError(null);

    const toProcess = rows.filter(r => r.action !== 'skip' && r.matchedEmployee !== null);
    const failedLabels: string[] = [];

    for (const row of toProcess) {
      const emp = row.matchedEmployee!;
      const inTime = row.parsed.inTime!;
      const outTime = row.parsed.outTime ?? row.manualOutTime;

      try {
        const computed = calculateDailyPayroll(emp, row.parsed.date, inTime, outTime);
        const { error } = await supabase.from('attendance_records').upsert(
          {
            company_id: companyId,
            employee_id: emp.id,
            date: row.parsed.date,
            status: 'present',
            start_time: inTime,
            end_time: outTime,
            ...computed,
          },
          { onConflict: 'employee_id,date' },
        );
        if (error) failedLabels.push(`${emp.full_name} (${row.parsed.date})`);
      } catch {
        failedLabels.push(`${emp.full_name} (${row.parsed.date})`);
      }
    }

    setIsImporting(false);

    if (failedLabels.length > 0) {
      setImportError(`Failed to import: ${failedLabels.join(', ')}`);
      return; // Stay open so user can see errors
    }

    // All succeeded — navigate to earliest imported date and close
    if (toProcess.length > 0) {
      const earliestDate = toProcess.reduce(
        (min, r) => (r.parsed.date < min ? r.parsed.date : min),
        toProcess[0].parsed.date,
      );
      onImportComplete(earliestDate);
    }
    onClose();
  };

  // ── Status Badge ──────────────────────────────────────────────────────────

  function StatusBadge({ status }: { status: ImportRow['status'] }) {
    const map: Record<ImportRow['status'], { label: string; className: string }> = {
      matched: { label: 'Matched', className: 'bg-green-100 text-green-800' },
      unmatched: { label: 'Unmatched', className: 'bg-amber-100 text-amber-800' },
      'missing-punch-out': { label: 'Missing out', className: 'bg-amber-100 text-amber-800' },
      conflict: { label: 'Conflict', className: 'bg-blue-100 text-blue-800' },
    };
    const { label, className } = map[status];
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
        {label}
      </span>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-5xl rounded-xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {step === 'upload' ? 'Import from Biometric Device' : 'Preview & Confirm Import'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* ── Step 1: Upload ── */}
          {step === 'upload' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Upload a CSV exported from your biometric device. Required columns:{' '}
                <code className="bg-gray-100 px-1 rounded text-xs">Name, Date, Time</code>
              </p>
              <p className="text-xs text-gray-500">
                Example format: each employee has alternating in/out rows per day.
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isFetching}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
              />
              {isFetching && (
                <p className="text-sm text-indigo-600">Parsing and checking for conflicts…</p>
              )}
              {parseError && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-800">{parseError}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Preview ── */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>{rows.length} rows parsed</span>
                <span className="text-green-700">{rows.filter(r => r.status === 'matched').length} matched</span>
                <span className="text-amber-700">{rows.filter(r => r.status === 'unmatched').length} unmatched</span>
                <span className="text-amber-700">{rows.filter(r => r.status === 'missing-punch-out').length} missing out</span>
                <span className="text-blue-700">{rows.filter(r => r.status === 'conflict').length} conflicts</span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Biometric Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Matched Employee</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">In</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Out</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {rows.map((row, idx) => (
                      <tr key={idx} className={row.action === 'skip' ? 'opacity-40' : ''}>
                        <td className="px-4 py-2 text-gray-900">{row.parsed.biometricName}</td>

                        {/* Matched Employee — dropdown if unmatched */}
                        <td className="px-4 py-2">
                          {row.status === 'unmatched' ? (
                            <select
                              value={row.matchedEmployee?.id ?? ''}
                              onChange={e => {
                                const emp = employees.find(emp => emp.id === e.target.value) ?? null;
                                updateRow(idx, {
                                  matchedEmployee: emp,
                                  status: emp ? 'matched' : 'unmatched',
                                  action: emp ? 'import' : 'skip',
                                });
                              }}
                              className="rounded border border-gray-300 px-2 py-1 text-xs"
                            >
                              <option value="">Select employee…</option>
                              {employees.map(e => (
                                <option key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-gray-700">
                              {row.matchedEmployee?.full_name ?? '—'}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{row.parsed.date}</td>
                        <td className="px-4 py-2 text-gray-700">{row.parsed.inTime ?? '—'}</td>

                        {/* Out time — editable if missing */}
                        <td className="px-4 py-2">
                          {row.status === 'missing-punch-out' && row.action !== 'skip' ? (
                            <input
                              type="time"
                              value={row.manualOutTime}
                              onChange={e => updateRow(idx, { manualOutTime: e.target.value })}
                              className="rounded border border-amber-300 px-2 py-1 text-xs"
                            />
                          ) : (
                            <span className="text-gray-700">{row.parsed.outTime ?? '—'}</span>
                          )}
                        </td>

                        <td className="px-4 py-2">
                          <StatusBadge status={row.status} />
                        </td>

                        {/* Action toggle */}
                        <td className="px-4 py-2">
                          {row.status === 'conflict' ? (
                            <select
                              value={row.action}
                              onChange={e => updateRow(idx, { action: e.target.value as ImportRow['action'] })}
                              className="rounded border border-gray-300 px-2 py-1 text-xs"
                            >
                              <option value="skip">Skip</option>
                              <option value="overwrite">Overwrite</option>
                            </select>
                          ) : (
                            <button
                              onClick={() => updateRow(idx, { action: row.action === 'skip' ? defaultAction(row.status) : 'skip' })}
                              className={`text-xs font-medium px-2 py-1 rounded ${
                                row.action === 'skip'
                                  ? 'text-gray-500 hover:text-gray-700'
                                  : 'text-red-600 hover:text-red-800'
                              }`}
                            >
                              {row.action === 'skip' ? 'Include' : 'Skip'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {importError && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-800">{importError}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          {step === 'preview' && (
            <button
              onClick={handleConfirm}
              disabled={!canImport || isImporting}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting
                ? 'Importing…'
                : `Import ${rows.filter(r => r.action !== 'skip').length} records`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/attendance/components/BiometricImportModal.tsx
git commit -m "feat: add BiometricImportModal component"
```

---

## Task 4: Wire modal into `AttendanceManager.tsx`

**Files:**
- Modify: `src/app/attendance/components/AttendanceManager.tsx`

Three changes needed:
1. Add `companyId` state — fetched once on mount (the modal needs it)
2. Add `isImportOpen` state + "Import Biometric" button
3. Mount `<BiometricImportModal>` conditionally

- [ ] **Step 1: Add `BiometricImportModal` import**

At the top of `AttendanceManager.tsx`, after the existing imports, add:

```ts
import BiometricImportModal from './BiometricImportModal';
```

- [ ] **Step 2: Add `companyId` state and fetch it on mount**

After the existing `const [success, setSuccess] = useState<string | null>(null);` line, add:

```ts
const [companyId, setCompanyId] = useState<string | null>(null);
const [isImportOpen, setIsImportOpen] = useState(false);
```

After the existing `useEffect(() => { fetchExistingRecords(globalDate); }, ...)`, add a new effect to fetch the company ID once:

```ts
useEffect(() => {
  async function fetchCompanyId() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.company_id) setCompanyId(profile.company_id);
  }
  fetchCompanyId();
}, [supabase]);
```

- [ ] **Step 3: Add "Import Biometric" button**

Find the existing controls `<div>` that contains the "Save All Attendance" button (the outer `<div className="flex flex-col md:flex-row ...`). The button is currently alone on the right side. Wrap it alongside a new Import button:

Replace:
```tsx
<button
  onClick={handleSave}
  disabled={loading || fetching}
  className="flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
>
  {loading ? 'Saving securely...' : 'Save All Attendance'}
</button>
```

With:
```tsx
<div className="flex items-center gap-3">
  <button
    onClick={() => setIsImportOpen(true)}
    disabled={!companyId}
    className="flex items-center gap-2 rounded-md bg-gray-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-600 disabled:opacity-50 transition-colors"
  >
    Import Biometric
  </button>
  <button
    onClick={handleSave}
    disabled={loading || fetching}
    className="flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
  >
    {loading ? 'Saving securely...' : 'Save All Attendance'}
  </button>
</div>
```

- [ ] **Step 4: Mount the modal**

At the very end of the component's `return (...)`, just before the closing `</div>`, add:

```tsx
{isImportOpen && companyId && (
  <BiometricImportModal
    employees={employees}
    companyId={companyId}
    onImportComplete={(date) => {
      setGlobalDate(date);
      setIsImportOpen(false);
    }}
    onClose={() => setIsImportOpen(false)}
  />
)}
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Run tests — no regressions**

```bash
npm test
```

Expected: `8 passed` (biometric-utils tests; no regressions).

- [ ] **Step 7: Commit**

```bash
git add src/app/attendance/components/AttendanceManager.tsx
git commit -m "feat: wire BiometricImportModal into AttendanceManager"
```

---

## Task 5: End-to-End Verification (Manual)

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Prepare a test CSV file**

Create a file `test-biometric.csv` on your desktop with:

```
Name,Date,Time
<employee_full_name>,<today_YYYY-MM-DD>,09:00:00
<employee_full_name>,<today_YYYY-MM-DD>,17:00:00
```

Replace `<employee_full_name>` with an active employee's exact name from the app.

- [ ] **Step 3: Test happy path**

1. Navigate to `/attendance`
2. Click **Import Biometric**
3. Upload the test CSV
4. Expected: Preview table shows 1 row, status **Matched**, action **Import**
5. Click **Import 1 records**
6. Expected: Modal closes, date jumps to today, attendance shows the imported record

- [ ] **Step 4: Test unmatched employee**

1. Add a row to the CSV with a name not in the system (e.g., `Unknown Person`)
2. Upload again — expected: that row shows **Unmatched** (amber), action **Skip** by default
3. Use the dropdown to select the correct employee → status turns **Matched**
4. Import — expected: both records saved

- [ ] **Step 5: Test missing punch-out**

1. Add a CSV row with only one punch for an employee
2. Expected: status **Missing out**, action **Skip** by default
3. Toggle to Include — a time input appears for manual out time
4. Enter an out time and confirm import

- [ ] **Step 6: Test conflict detection**

1. Import the same date again for an employee that already has a record
2. Expected: status **Conflict**, action **Skip** by default
3. Toggle to **Overwrite** and import — expected: record updated

- [ ] **Step 7: Final TypeScript + tests**

```bash
npx tsc --noEmit && npm test
```

Expected: No errors, `8 passed`.
