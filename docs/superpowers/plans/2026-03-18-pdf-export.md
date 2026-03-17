# Payroll PDF Export Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bulk and per-employee PDF export to the payroll reports page, with optional previous-month outstanding balance support.

**Architecture:** New pure-function utility in `src/lib/pdf-utils.ts` handles all balance math. Two `@react-pdf/renderer` document components in `src/components/pdf/` define the PDF layouts. `PayrollDashboard.tsx` wires state, memos, and handlers together — it already has all the data needed; no new DB queries required beyond adding `companyName` in `reports/page.tsx`.

**Tech Stack:** Next.js 14 App Router, TypeScript, `@react-pdf/renderer@^3`, `date-fns@^3`, Vitest

**Spec:** `docs/superpowers/specs/2026-03-18-pdf-export-design.md`

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `package.json` | Add `@react-pdf/renderer@^3` dependency |
| Modify | `src/types/index.ts` | Add `PayrollRow` exported interface |
| Create | `src/lib/pdf-utils.ts` | `getPrevMonth`, `calcPrevBalance`, `downloadPdf` |
| Create | `src/lib/__tests__/pdf-utils.test.ts` | Unit tests for pure utility functions |
| Create | `src/components/pdf/PayrollSummaryPDF.tsx` | Bulk summary table PDF document component |
| Create | `src/components/pdf/EmployeeDetailPDF.tsx` | Per-employee detail sheet PDF document component |
| Modify | `src/app/reports/page.tsx` | Add company name query; pass `companyName` prop |
| Modify | `src/components/PayrollDashboard.tsx` | Add state, memos, handlers, and UI for PDF export |

---

## Task 1: Install dependency and add `PayrollRow` type

**Files:**
- Modify: `package.json`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Install `@react-pdf/renderer`**

```bash
cd C:\Users\Lenovo\.gemini\antigravity\scratch\payroll-app
npm install @react-pdf/renderer@^3
```

Expected: `@react-pdf/renderer` appears in `dependencies` in `package.json`.

- [ ] **Step 2: Ensure Vitest is installed (needed for Task 2)**

```bash
npm list vitest
```

If vitest is NOT listed, install it:
```bash
npm install -D vitest
```
And add to `package.json` scripts: `"test": "vitest run"`

Also create `vitest.config.ts` if it doesn't exist:
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

- [ ] **Step 3: Add `PayrollRow` interface to `src/types/index.ts`**

Append to the end of `src/types/index.ts`:

```ts
export interface PayrollRow {
  employee_id: string;      // internal UUID
  display_id: string;       // human-readable ID (e.g. EMP-001)
  full_name: string;
  total_worked_days: number;
  earned_salary: number;
  total_overtime_amount: number;
  total_deduction_amount: number;
  total_advances: number;
  final_payable_salary: number;
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/types/index.ts vitest.config.ts
git commit -m "feat: add @react-pdf/renderer and PayrollRow type"
```

---

## Task 2: Create `pdf-utils.ts` (TDD)

**Files:**
- Create: `src/lib/pdf-utils.ts`
- Create: `src/lib/__tests__/pdf-utils.test.ts`

**Background:**
- `getPrevMonth('2024-04')` → `'2024-03'`; `('2024-01')` → `'2023-12'`
- `calcPrevBalance(24000, '2024-06', 25)`: June=30 days, outstanding=5, daily=800, result=4000
- `calcPrevBalance(24000, '2024-06', 30)`: outstanding=0 → 0 (paidUpTo equals days in month)
- `calcPrevBalance(24000, '2024-06', 35)`: outstanding=max(0,-5)=0 (guard)
- `calcPrevBalance(24000, '2024-02', 25)`: Feb 2024=29 days (leap), outstanding=4, daily≈827.59, result=3310.34

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/pdf-utils.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getPrevMonth, calcPrevBalance } from '../pdf-utils';

describe('getPrevMonth', () => {
  it('returns previous month in YYYY-MM format', () => {
    expect(getPrevMonth('2024-04')).toBe('2024-03');
  });

  it('wraps year correctly for January', () => {
    expect(getPrevMonth('2024-01')).toBe('2023-12');
  });
});

describe('calcPrevBalance', () => {
  it('calculates outstanding balance for partial month', () => {
    // June 2024 = 30 days, paidUpTo=25, outstanding=5, daily=24000/30=800
    expect(calcPrevBalance(24000, '2024-06', 25)).toBe(4000);
  });

  it('returns 0 when paidUpToDay equals days in month', () => {
    expect(calcPrevBalance(24000, '2024-06', 30)).toBe(0);
  });

  it('returns 0 when paidUpToDay exceeds days in month (guard)', () => {
    expect(calcPrevBalance(24000, '2024-06', 35)).toBe(0);
  });

  it('handles leap year February correctly', () => {
    // Feb 2024 = 29 days (leap), paidUpTo=25, outstanding=4
    // daily = 24000/29 = 827.5862..., balance = round2(4 * 827.5862) = 3310.34
    expect(calcPrevBalance(24000, '2024-02', 25)).toBe(3310.34);
  });

  it('handles non-leap year February correctly', () => {
    // Feb 2023 = 28 days, paidUpTo=25, outstanding=3
    // daily = 24000/28 = 857.1428..., balance = round2(3 * 857.1428) = 2571.43
    expect(calcPrevBalance(24000, '2023-02', 25)).toBe(2571.43);
  });
});
```

- [ ] **Step 2: Run tests — all must fail**

```bash
npm test
```

Expected: All 7 tests fail with "Cannot find module '../pdf-utils'".

- [ ] **Step 3: Create `src/lib/pdf-utils.ts`**

```ts
import { getDaysInMonth, subMonths, format, parse } from 'date-fns';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Returns the previous month as 'YYYY-MM'.
 * e.g. getPrevMonth('2024-04') → '2024-03'
 */
export function getPrevMonth(monthStr: string): string {
  const date = parse(monthStr, 'yyyy-MM', new Date());
  return format(subMonths(date, 1), 'yyyy-MM');
}

/**
 * Calculates outstanding wages owed from a partial prior pay cycle.
 * Returns 0 if paidUpToDay >= days in the previous month.
 */
export function calcPrevBalance(
  monthlySalary: number,
  prevMonth: string,    // 'YYYY-MM'
  paidUpToDay: number,
): number {
  const [yearStr, monthStr] = prevMonth.split('-');
  const daysInPrevMonth = getDaysInMonth(
    new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1)
  );
  const outstandingDays = Math.max(0, daysInPrevMonth - paidUpToDay);
  if (outstandingDays === 0) return 0;
  return round2(outstandingDays * (monthlySalary / daysInPrevMonth));
}

/**
 * Triggers a browser download for a PDF Blob.
 * Note: browser-only — not callable in Node/test environments.
 */
export function downloadPdf(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: Run tests — all 7 must pass**

```bash
npm test
```

Expected: `7 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf-utils.ts src/lib/__tests__/pdf-utils.test.ts
git commit -m "feat: add pdf-utils with getPrevMonth and calcPrevBalance"
```

---

## Task 3: Create `PayrollSummaryPDF` component

**Files:**
- Create: `src/components/pdf/PayrollSummaryPDF.tsx`

Note: `@react-pdf/renderer` components cannot be unit tested with Vitest (custom renderer). Verify visually in Task 7.

- [ ] **Step 1: Create the directory**

```bash
mkdir -p "C:\Users\Lenovo\.gemini\antigravity\scratch\payroll-app\src\components\pdf"
```

- [ ] **Step 2: Create `src/components/pdf/PayrollSummaryPDF.tsx`**

```tsx
'use client';

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format, parse } from 'date-fns';
import type { PayrollRow } from '@/types';

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica', fontSize: 9 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  companyName: { fontSize: 12, fontWeight: 'bold' },
  reportTitle: { fontSize: 11, fontWeight: 'bold' },
  generatedDate: { fontSize: 8, color: '#666666', marginBottom: 16 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottom: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: 1,
    borderColor: '#f3f4f6',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  footerRow: {
    flexDirection: 'row',
    borderTop: 1,
    borderColor: '#d1d5db',
    marginTop: 2,
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: '#f9fafb',
  },
  colName:   { width: '22%' },
  colDays:   { width: '8%', textAlign: 'right' },
  colEarn:   { width: '13%', textAlign: 'right' },
  colOt:     { width: '10%', textAlign: 'right' },
  colDeduct: { width: '11%', textAlign: 'right' },
  colAdv:    { width: '11%', textAlign: 'right' },
  colPrev:   { width: '12%', textAlign: 'right' },
  colNet:    { width: '13%', textAlign: 'right' },
  th: { fontSize: 8, fontWeight: 'bold', color: '#374151' },
  td: { fontSize: 8, color: '#111827' },
  tdSub: { fontSize: 7, color: '#6b7280' },
  bold: { fontWeight: 'bold' },
  totalLabel: { flex: 1, textAlign: 'right', fontWeight: 'bold', fontSize: 9 },
  totalValue: { width: '13%', textAlign: 'right', fontWeight: 'bold', fontSize: 9 },
});

function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n);
}

export interface PayrollSummaryPDFProps {
  month: string;
  companyName: string;
  rows: PayrollRow[];
  prevBalances: Record<string, number>;
  totalNetPayout: number;
}

export default function PayrollSummaryPDF({
  month,
  companyName,
  rows,
  prevBalances,
  totalNetPayout,
}: PayrollSummaryPDFProps) {
  const monthLabel = format(parse(month, 'yyyy-MM', new Date()), 'MMMM yyyy');
  const hasPrevBalance = rows.some(r => (prevBalances[r.employee_id] ?? 0) > 0);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.companyName}>{companyName}</Text>
          <Text style={styles.reportTitle}>Payroll Report — {monthLabel}</Text>
        </View>
        <Text style={styles.generatedDate}>
          Generated: {format(new Date(), 'dd MMM yyyy')}
        </Text>

        {/* Table header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.colName, styles.th]}>Employee</Text>
          <Text style={[styles.colDays, styles.th]}>Days</Text>
          <Text style={[styles.colEarn, styles.th]}>Earnings</Text>
          <Text style={[styles.colOt, styles.th]}>Overtime</Text>
          <Text style={[styles.colDeduct, styles.th]}>Deductions</Text>
          <Text style={[styles.colAdv, styles.th]}>Advances</Text>
          {hasPrevBalance && <Text style={[styles.colPrev, styles.th]}>Prev Bal</Text>}
          <Text style={[styles.colNet, styles.th]}>Net Payable</Text>
        </View>

        {/* Data rows */}
        {rows.map(row => {
          const prev = prevBalances[row.employee_id] ?? 0;
          const netInPdf = row.final_payable_salary + prev;
          return (
            <View key={row.employee_id} style={styles.tableRow}>
              <View style={styles.colName}>
                <Text style={[styles.td, styles.bold]}>{row.full_name}</Text>
                <Text style={styles.tdSub}>{row.display_id}</Text>
              </View>
              <Text style={[styles.colDays, styles.td]}>{row.total_worked_days}</Text>
              <Text style={[styles.colEarn, styles.td]}>{formatINR(row.earned_salary)}</Text>
              <Text style={[styles.colOt, styles.td]}>
                {row.total_overtime_amount > 0 ? formatINR(row.total_overtime_amount) : '—'}
              </Text>
              <Text style={[styles.colDeduct, styles.td]}>
                {row.total_deduction_amount > 0 ? `-${formatINR(row.total_deduction_amount)}` : '—'}
              </Text>
              <Text style={[styles.colAdv, styles.td]}>
                {row.total_advances > 0 ? `-${formatINR(row.total_advances)}` : '—'}
              </Text>
              {hasPrevBalance && (
                <Text style={[styles.colPrev, styles.td]}>
                  {prev > 0 ? `+${formatINR(prev)}` : '—'}
                </Text>
              )}
              <Text style={[styles.colNet, styles.td, { color: netInPdf < 0 ? '#dc2626' : '#16a34a' }]}>
                {netInPdf < 0
                  ? `(${formatINR(Math.abs(netInPdf))})`
                  : formatINR(netInPdf)}
              </Text>
            </View>
          );
        })}

        {/* Footer total */}
        <View style={styles.footerRow}>
          <Text style={styles.totalLabel}>Total Net Payout:</Text>
          <Text style={[styles.totalValue, { color: totalNetPayout < 0 ? '#dc2626' : '#16a34a' }]}>
            {totalNetPayout < 0
              ? `(${formatINR(Math.abs(totalNetPayout))})`
              : formatINR(totalNetPayout)}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/pdf/PayrollSummaryPDF.tsx
git commit -m "feat: add PayrollSummaryPDF component"
```

---

## Task 4: Create `EmployeeDetailPDF` component

**Files:**
- Create: `src/components/pdf/EmployeeDetailPDF.tsx`

- [ ] **Step 1: Create `src/components/pdf/EmployeeDetailPDF.tsx`**

```tsx
'use client';

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format, parse } from 'date-fns';
import type { PayrollRow } from '@/types';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10 },
  companyName: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  reportTitle: { fontSize: 11, color: '#374151', marginBottom: 20 },
  employeeName: { fontSize: 12, fontWeight: 'bold' },
  employeeId: { fontSize: 10, color: '#6b7280', marginBottom: 16 },
  divider: { borderBottom: 1, borderColor: '#d1d5db', marginVertical: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  label: { color: '#6b7280', fontSize: 10 },
  value: { fontSize: 10 },
  prevNote: { fontSize: 8, color: '#9ca3af' },
  netLabel: { fontSize: 12, fontWeight: 'bold' },
  netValue: { fontSize: 12, fontWeight: 'bold' },
  footer: { marginTop: 20, fontSize: 8, color: '#9ca3af' },
});

function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n);
}

export interface EmployeeDetailPDFProps {
  month: string;
  companyName: string;
  row: PayrollRow;
  monthlySalary: number;
  daysInMonth: number;
  prevBalance: number;
  outstandingDays: number;
  prevMonthName: string;
}

export default function EmployeeDetailPDF({
  month,
  companyName,
  row,
  monthlySalary,
  daysInMonth,
  prevBalance,
  outstandingDays,
  prevMonthName,
}: EmployeeDetailPDFProps) {
  const monthLabel = format(parse(month, 'yyyy-MM', new Date()), 'MMMM yyyy');
  const dailyWage = monthlySalary / daysInMonth;
  const netPayable = row.final_payable_salary + prevBalance;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.companyName}>{companyName}</Text>
        <Text style={styles.reportTitle}>Employee Payroll Detail — {monthLabel}</Text>

        <Text style={styles.employeeName}>{row.full_name}</Text>
        <Text style={styles.employeeId}>ID: {row.display_id}</Text>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>Days Worked</Text>
          <Text style={styles.value}>{row.total_worked_days}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Monthly Salary</Text>
          <Text style={styles.value}>{formatINR(monthlySalary)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Daily Wage</Text>
          <Text style={styles.value}>{formatINR(dailyWage)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Earnings</Text>
          <Text style={styles.value}>{formatINR(row.earned_salary)}</Text>
        </View>

        {row.total_overtime_amount > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>Overtime</Text>
            <Text style={[styles.value, { color: '#16a34a' }]}>
              +{formatINR(row.total_overtime_amount)}
            </Text>
          </View>
        )}

        {row.total_deduction_amount > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>Deductions</Text>
            <Text style={[styles.value, { color: '#dc2626' }]}>
              -{formatINR(row.total_deduction_amount)}
            </Text>
          </View>
        )}

        {row.total_advances > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>Advances</Text>
            <Text style={[styles.value, { color: '#f97316' }]}>
              -{formatINR(row.total_advances)}
            </Text>
          </View>
        )}

        {prevBalance > 0 && (
          <View style={styles.row}>
            <View>
              <Text style={styles.label}>Prev. Month Balance</Text>
              <Text style={styles.prevNote}>
                {outstandingDays} unpaid days from {prevMonthName}
              </Text>
            </View>
            <Text style={[styles.value, { color: '#2563eb' }]}>
              +{formatINR(prevBalance)}
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.netLabel}>Net Payable</Text>
          <Text style={[styles.netValue, { color: netPayable < 0 ? '#dc2626' : '#16a34a' }]}>
            {netPayable < 0
              ? `(${formatINR(Math.abs(netPayable))})`
              : formatINR(netPayable)}
          </Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.footer}>
          Generated: {format(new Date(), 'dd MMM yyyy, HH:mm')}
        </Text>
      </Page>
    </Document>
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
git add src/components/pdf/EmployeeDetailPDF.tsx
git commit -m "feat: add EmployeeDetailPDF component"
```

---

## Task 5: Update `reports/page.tsx` — add `companyName`

**Files:**
- Modify: `src/app/reports/page.tsx`

The server component currently fetches `company_id` from `profiles` but never fetches the company name. Two changes needed: add the company query, pass `companyName` to `<PayrollDashboard>`.

- [ ] **Step 1: Add the company name query**

After the `const companyId = profile?.company_id` block (around line 26), add:

```ts
const { data: companyData } = await supabase
  .from('companies')
  .select('name')
  .eq('id', companyId)
  .maybeSingle();
const companyName = companyData?.name ?? 'My Company';
```

- [ ] **Step 2: Pass `companyName` to `<PayrollDashboard>`**

Find the `<PayrollDashboard ...>` block (around line 106). Add the `companyName` prop:

```tsx
<PayrollDashboard
  initialMonth={selectedMonthStr}
  employees={(employees || []) as any[]}
  attendance={(attendance || []) as any[]}
  advances={(advances || []) as any[]}
  generateAction={generatePayrollAction}
  companyName={companyName}
/>
```

- [ ] **Step 3: Verify TypeScript (will fail until Step 4 in Task 6 adds the prop)**

Skip this step for now. TypeScript will show an error because `PayrollDashboardProps` doesn't have `companyName` yet. That gets fixed in Task 6. Continue.

- [ ] **Step 4: Commit**

```bash
git add src/app/reports/page.tsx
git commit -m "feat: pass companyName to PayrollDashboard from reports page"
```

---

## Task 6: Update `PayrollDashboard.tsx`

**Files:**
- Modify: `src/components/PayrollDashboard.tsx`

This is the largest task. Apply changes in the exact order below.

- [ ] **Step 1: Add new imports at the top of `PayrollDashboard.tsx`**

Find the existing imports block (lines 1–6). Add these imports:

```ts
import { useState, useMemo, useEffect } from 'react'   // add useEffect to existing react import
import { getDaysInMonth, format } from 'date-fns'
import { getPrevMonth, calcPrevBalance, downloadPdf } from '@/lib/pdf-utils'
import type { PayrollRow } from '@/types'
```

The existing `import { useState, useMemo } from 'react'` becomes:
```ts
import { useState, useMemo, useEffect } from 'react'
```

- [ ] **Step 2: Add `companyName` to `PayrollDashboardProps`**

Find the `PayrollDashboardProps` interface (around line 30). Add `companyName`:

```ts
interface PayrollDashboardProps {
  initialMonth: string
  employees: Employee[]
  attendance: AttendanceRecord[]
  advances: Advance[]
  generateAction: (data: any) => Promise<void>
  companyName: string   // ← add this
}
```

Also add `companyName` to the function signature destructuring:
```ts
export default function PayrollDashboard({
  initialMonth,
  employees,
  attendance,
  advances,
  generateAction,
  companyName,   // ← add this
}: PayrollDashboardProps) {
```

- [ ] **Step 3: Add new state variables**

After the existing `const [isGenerating, setIsGenerating] = useState(false)` line, add:

```ts
const [paidUpToDay, setPaidUpToDay] = useState<number | null>(null)
const [isExportingBulk, setIsExportingBulk] = useState(false)
const [exportingEmployeeId, setExportingEmployeeId] = useState<string | null>(null)
```

- [ ] **Step 4: Add `useEffect` to reset `paidUpToDay` when month changes**

After the state declarations, add:

```ts
useEffect(() => {
  setPaidUpToDay(null)
}, [selectedMonth])
```

- [ ] **Step 5: Add new memoized values**

After the existing `const actualDaysInMonth = getDaysInMonth(selectedMonth)` line, add:

```ts
const prevMonth = useMemo(() => getPrevMonth(selectedMonth), [selectedMonth])

const daysInPrevMonth = useMemo(() => {
  const [y, m] = prevMonth.split('-').map(Number)
  return getDaysInMonth(new Date(y, m - 1))
}, [prevMonth])

const prevBalances = useMemo((): Record<string, number> => {
  if (!paidUpToDay) return {}
  return Object.fromEntries(
    employees.map(emp => [
      emp.id,
      calcPrevBalance(emp.monthly_salary, prevMonth, paidUpToDay)
    ])
  )
}, [paidUpToDay, prevMonth, employees])

const pdfTotalNetPayout = useMemo(() => {
  return computedPayroll.rows.reduce((sum, row) => {
    return sum + row.final_payable_salary + (prevBalances[row.employee_id] ?? 0)
  }, 0)
}, [computedPayroll.rows, prevBalances])
```

- [ ] **Step 6: Add bulk export handler**

After the existing `handleMonthChange` function, add:

```ts
const handleExportBulkPdf = async () => {
  setIsExportingBulk(true)
  try {
    const [{ default: PayrollSummaryPDF }, { pdf }] = await Promise.all([
      import('@/components/pdf/PayrollSummaryPDF'),
      import('@react-pdf/renderer'),
    ])
    const blob = await pdf(
      <PayrollSummaryPDF
        month={selectedMonth}
        companyName={companyName}
        rows={computedPayroll.rows}
        prevBalances={prevBalances}
        totalNetPayout={pdfTotalNetPayout}
      />
    ).toBlob()
    downloadPdf(blob, `payroll-${selectedMonth}.pdf`)
  } catch {
    alert('Failed to generate PDF. Please try again.')
  } finally {
    setIsExportingBulk(false)
  }
}
```

- [ ] **Step 7: Add per-employee export handler**

After `handleExportBulkPdf`, add:

```ts
const handleExportEmployeePdf = async (row: PayrollRow) => {
  setExportingEmployeeId(row.employee_id)
  try {
    const emp = employees.find(e => e.id === row.employee_id)
    if (!emp) return
    const pb = prevBalances[row.employee_id] ?? 0
    const [y, m] = prevMonth.split('-').map(Number)
    const od = pb > 0 && paidUpToDay
      ? Math.max(0, getDaysInMonth(new Date(y, m - 1)) - paidUpToDay)
      : 0
    const prevMonthName = format(new Date(y, m - 1), 'MMMM yyyy')
    const [{ default: EmployeeDetailPDF }, { pdf }] = await Promise.all([
      import('@/components/pdf/EmployeeDetailPDF'),
      import('@react-pdf/renderer'),
    ])
    const blob = await pdf(
      <EmployeeDetailPDF
        month={selectedMonth}
        companyName={companyName}
        row={row}
        monthlySalary={emp.monthly_salary}
        daysInMonth={actualDaysInMonth}
        prevBalance={pb}
        outstandingDays={od}
        prevMonthName={prevMonthName}
      />
    ).toBlob()
    downloadPdf(blob, `payroll-${row.display_id}-${selectedMonth}.pdf`)
  } catch {
    alert('Failed to generate PDF. Please try again.')
  } finally {
    setExportingEmployeeId(null)
  }
}
```

- [ ] **Step 8: Add "Prev. month paid up to" input to the control panel UI**

Find the controls section inside the return JSX (the `<div className="flex flex-col sm:flex-row gap-6">` block around line 184). Add a third control after the "Days in Month" input:

```tsx
<div>
  <label htmlFor="paid-up-to" className="block text-sm font-medium leading-6 text-gray-900">
    Prev. month paid up to
  </label>
  <div className="mt-2">
    <input
      type="number"
      id="paid-up-to"
      min={1}
      max={daysInPrevMonth}
      value={paidUpToDay ?? ''}
      onChange={e => {
        const val = parseInt(e.target.value, 10)
        setPaidUpToDay(isNaN(val) ? null : Math.min(val, daysInPrevMonth))
      }}
      placeholder="e.g. 25"
      className="block rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 w-28 px-3"
    />
  </div>
</div>
```

- [ ] **Step 9: Add "Export PDF" button to the header**

Find the `<button onClick={handleGenerate} ...>` button at the top of the return JSX. Add an Export PDF button beside it:

```tsx
<div className="flex items-center gap-3">
  <button
    onClick={handleExportBulkPdf}
    disabled={isExportingBulk || computedPayroll.rows.length === 0}
    className="flex items-center gap-2 rounded-md bg-gray-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  >
    {isExportingBulk ? 'Generating...' : 'Export PDF'}
  </button>
  <button
    onClick={handleGenerate}
    disabled={isGenerating || computedPayroll.rows.length === 0}
    className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  >
    {isGenerating ? 'Generating...' : 'Generate Payroll'}
  </button>
</div>
```

Replace the existing single `<button onClick={handleGenerate} ...>` with this `<div>` containing both buttons.

- [ ] **Step 10: Add per-row download button**

Find the table header row in the `<thead>`. Add a final column header:

```tsx
<th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">PDF</th>
```

Then in each data row's `<tr>`, add a final `<td>` after the Net Payable cell:

```tsx
<td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
  <button
    onClick={() => handleExportEmployeePdf(row)}
    disabled={!!exportingEmployeeId}
    title="Download employee PDF"
    className="text-gray-400 hover:text-indigo-600 disabled:opacity-40 transition-colors"
  >
    {exportingEmployeeId === row.employee_id ? '...' : '↓'}
  </button>
</td>
```

Note: The row variable here is the `row` from `computedPayroll.rows.map(row => ...)`.

- [ ] **Step 11: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: No errors. Common issues to check:
- `useEffect` not imported — ensure it's added to the React import line
- `PayrollRow` type mismatch — `computedPayroll.rows` is typed inline; you may need to cast: `computedPayroll.rows as PayrollRow[]` if the local type doesn't match yet
- `emp.monthly_salary` not available — check the `employees` prop type; the `Employee` interface in `src/types/index.ts` has it

- [ ] **Step 12: Run tests**

```bash
npm test
```

Expected: `7 passed` (pdf-utils tests still pass; no regressions).

- [ ] **Step 13: Commit**

```bash
git add src/components/PayrollDashboard.tsx
git commit -m "feat: add PDF export controls and handlers to PayrollDashboard"
```

---

## Task 7: End-to-End Verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test bulk PDF export**

1. Navigate to `/reports`
2. Ensure at least one employee has attendance for the current month
3. Click **Export PDF**
4. Expected: PDF downloads as `payroll-{YYYY-MM}.pdf`
5. Open the PDF — verify: company name in header, correct month, employee rows with correct values

- [ ] **Step 3: Test per-employee PDF export**

1. Click the **↓** icon on any employee row
2. Expected: PDF downloads as `payroll-{display_id}-{YYYY-MM}.pdf`
3. Open the PDF — verify: employee name, correct values, no "Prev. Month Balance" line (since paid-up-to is empty)

- [ ] **Step 4: Test previous month balance**

1. Enter `25` in the "Prev. month paid up to" input
2. Click **Export PDF** (bulk)
3. Expected: Prev Bal column appears, values are non-zero
4. Download a per-employee PDF — expected: "Prev. Month Balance" line with annotation e.g. "6 unpaid days from March 2024"

- [ ] **Step 5: Test edge cases**

- Enter `31` as paid-up-to day while previous month is February (28 or 29 days) — expected: input clamps to 28/29; prevBalance = 0 (full month paid)
- Enter the exact last day of the previous month — expected: prevBalance = 0

- [ ] **Step 6: Final TypeScript and test check**

```bash
npx tsc --noEmit && npm test
```

Expected: No errors, `7 passed`.

- [ ] **Step 7: Commit if any cleanup needed**

```bash
git status
```

If clean: done. Otherwise commit with:
```bash
git commit -m "chore: cleanup after pdf export implementation"
```
