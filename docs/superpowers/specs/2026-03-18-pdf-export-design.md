# Payroll PDF Export — Design Spec
**Date:** 2026-03-18
**Status:** Approved
**Scope:** `PayrollDashboard.tsx`, `src/app/reports/page.tsx`, new `src/components/pdf/` components, new `src/lib/pdf-utils.ts`, `src/types/index.ts`

---

## Feature Summary

Add PDF export to the payroll reports page. Two export types:
1. **Bulk export** — one PDF containing all employees as a summary table, downloaded from the reports page header
2. **Per-employee export** — a single-employee detail sheet, triggered from a download icon on each row

Both documents include an optional **previous month balance** line/column, representing wages owed from a prior partial pay cycle (e.g., if March payroll was processed only up to March 25th, the 6 remaining days are owed and shown as a carry-forward balance in April's PDF).

---

## Dependencies

**Required install step (must be the first implementation action):**
```bash
npm install @react-pdf/renderer@^3
```

All PDF components must be in `'use client'` files. The `pdf()` function from `@react-pdf/renderer` must never be called during server-side rendering. Because `PayrollDashboard.tsx` is already a client component, this constraint is naturally satisfied. Import using dynamic `await import('@react-pdf/renderer')` inside handlers to ensure the library is never loaded server-side.

---

## Decisions

| Question | Decision |
|---|---|
| PDF generation method | `@react-pdf/renderer@^3` — client-side, no server needed, full layout control |
| Bulk layout | Compact summary table (all employees, one or more pages) |
| Per-employee layout | Simple detail sheet (internal record, not a formal payslip) |
| Previous month balance | User enters "paid up to" day; system calculates outstanding days × daily wage |
| Balance carries into PDF calculation? | Yes — added to net payable in the PDF output only |
| DB changes needed | None — PDF uses already-computed data from `PayrollDashboard` state |
| Bulk export disabled when? | When `computedPayroll.rows.length === 0` (mirrors existing Generate Payroll button) |

---

## Previous Month Balance Formula

```
prev_month         = month before selectedMonth (e.g., March if April selected)
days_in_prev_month = actual calendar days in prev_month (from date-fns getDaysInMonth)
outstanding_days   = max(0, days_in_prev_month - paidUpToDay)
daily_wage_prev    = employee.monthly_salary / days_in_prev_month
prev_balance       = round2(outstanding_days * daily_wage_prev)
```

- `paidUpToDay` comes from the "Prev. month paid up to" day input (1 to `days_in_prev_month`)
- If `paidUpToDay >= days_in_prev_month`, `outstanding_days` is `0` → `prev_balance = 0`
- If no date is entered, `prev_balance = 0` and the column/line is hidden
- `prev_balance` is per-employee (each has a different `monthly_salary`)
- **Net payable in PDF** = `final_payable_salary` (from existing calculation) + `prev_balance`

---

## Type Definitions

### Add to `src/types/index.ts`

```ts
export interface PayrollRow {
  employee_id: string;      // internal UUID
  display_id: string;       // human-readable employee ID (e.g., EMP-001)
  full_name: string;
  total_worked_days: number;
  earned_salary: number;
  total_overtime_amount: number;
  total_deduction_amount: number;
  total_advances: number;
  final_payable_salary: number;
}
```

`PayrollDashboard.tsx` currently computes this shape inline without a named type. Promoting it to `src/types/index.ts` allows the PDF components to share it without duplication.

---

## Architecture

### New Files

**`src/lib/pdf-utils.ts`**

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
  prevMonth: string,       // 'YYYY-MM'
  paidUpToDay: number,
): number {
  const [yearStr, monthStr] = prevMonth.split('-');
  const daysInPrevMonth = getDaysInMonth(new Date(parseInt(yearStr), parseInt(monthStr) - 1));
  const outstandingDays = Math.max(0, daysInPrevMonth - paidUpToDay);
  if (outstandingDays === 0) return 0;
  const dailyWage = monthlySalary / daysInPrevMonth;
  return round2(outstandingDays * dailyWage);
}

/**
 * Triggers a browser download for a PDF Blob.
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

---

**`src/components/pdf/PayrollSummaryPDF.tsx`** — `'use client'`

Props:
```ts
{
  month: string                          // 'YYYY-MM'
  companyName: string
  rows: PayrollRow[]
  prevBalances: Record<string, number>   // employee_id → prev_balance
  totalNetPayout: number                 // must be sum of (final_payable_salary + prevBalance) per row
}
```

Structure:
- Page header: `companyName` (left), `"Payroll Report — {Month Year}"` (right), generated date below
- Table columns: Employee | Days | Earnings | OT | Deductions | Advances | Prev Balance* | Net Payable
- `Net Payable` per row = `row.final_payable_salary + prevBalances[row.employee_id]`
- *Prev Balance column only rendered when at least one employee has `prevBalance > 0`
- Footer row: `"Total Net Payout: {totalNetPayout}"`
- Error handling: wraps `pdf().toBlob()` in try/catch; shows `alert()` on failure (matches existing pattern)

---

**`src/components/pdf/EmployeeDetailPDF.tsx`** — `'use client'`

Props:
```ts
{
  month: string               // 'YYYY-MM'
  companyName: string
  row: PayrollRow
  monthlySalary: number
  daysInMonth: number
  prevBalance: number         // 0 if not applicable
  outstandingDays: number     // 0 if not applicable; used for annotation
  prevMonthName: string       // e.g., 'March 2024'; used for annotation
}
```

Structure:
- Header: `companyName`, `"Employee Payroll Detail — {Month Year}"`
- Employee: `row.full_name`, ID: `row.display_id`
- Line items: Days Worked, Monthly Salary, Daily Wage (`monthlySalary / daysInMonth`), Earnings, Overtime, Deductions, Advances
- Prev Month Balance line — rendered only when `prevBalance > 0`:
  `"+₹{prevBalance}  ({outstandingDays} unpaid days from {prevMonthName})"`
- Divider line
- Net Payable (bold): `row.final_payable_salary + prevBalance`
- Generated date footer
- Error handling: wraps `pdf().toBlob()` in try/catch; shows `alert()` on failure

---

### Modified Files

**`src/types/index.ts`**
- Add `PayrollRow` interface (defined above)

**`src/app/reports/page.tsx`**
- After fetching `profile.company_id`, query the `companies` table:
  ```ts
  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', profile.company_id)
    .maybeSingle();
  const companyName = company?.name ?? 'My Company';
  ```
- Pass `companyName` as a new prop to `<PayrollDashboard>`

**`src/components/PayrollDashboard.tsx`**

New imports to add:
```ts
import { getDaysInMonth, format } from 'date-fns';
import { getPrevMonth, calcPrevBalance, downloadPdf } from '@/lib/pdf-utils';
import type { PayrollRow } from '@/types';
import type { PayrollSummaryPDFProps } from '@/components/pdf/PayrollSummaryPDF';  // optional — can inline
import type { EmployeeDetailPDFProps } from '@/components/pdf/EmployeeDetailPDF';  // optional — can inline
```

The PDF components themselves must add:
```ts
import type { PayrollRow } from '@/types';
```

New prop:
```ts
companyName: string
```

New state:
```ts
const [paidUpToDay, setPaidUpToDay] = useState<number | null>(null);
const [isExportingBulk, setIsExportingBulk] = useState(false);
const [exportingEmployeeId, setExportingEmployeeId] = useState<string | null>(null);
```

Reset `paidUpToDay` when month changes:
```ts
useEffect(() => {
  setPaidUpToDay(null);
}, [selectedMonth]);
```

New memoized derived data:
```ts
const prevMonth = useMemo(() => getPrevMonth(selectedMonth), [selectedMonth]);

const prevBalances = useMemo((): Record<string, number> => {
  if (!paidUpToDay) return {};
  return Object.fromEntries(
    employees.map(emp => [emp.id, calcPrevBalance(emp.monthly_salary, prevMonth, paidUpToDay)])
  );
}, [paidUpToDay, prevMonth, employees]);

const pdfTotalNetPayout = useMemo(() => {
  return computedPayroll.rows.reduce((sum, row) => {
    return sum + row.final_payable_salary + (prevBalances[row.employee_id] ?? 0);
  }, 0);
}, [computedPayroll.rows, prevBalances]);
```

Days-in-prev-month for UI input max:
```ts
const daysInPrevMonth = useMemo(() => {
  const [y, m] = prevMonth.split('-').map(Number);
  return getDaysInMonth(new Date(y, m - 1));
}, [prevMonth]);
```

New UI in control panel:
```tsx
<div>
  <label>Prev. month paid up to (day)</label>
  <input
    type="number"
    min={1}
    max={daysInPrevMonth}
    value={paidUpToDay ?? ''}
    onChange={e => {
      const val = parseInt(e.target.value, 10);
      setPaidUpToDay(isNaN(val) ? null : Math.min(val, daysInPrevMonth));
    }}
    placeholder="e.g. 25"
  />
</div>
```

Bulk export handler:
```ts
const handleExportBulkPdf = async () => {
  setIsExportingBulk(true);
  try {
    const { pdf } = await import('@react-pdf/renderer');
    const blob = await pdf(
      <PayrollSummaryPDF
        month={selectedMonth}
        companyName={companyName}
        rows={computedPayroll.rows}
        prevBalances={prevBalances}
        totalNetPayout={pdfTotalNetPayout}
      />
    ).toBlob();
    downloadPdf(blob, `payroll-${selectedMonth}.pdf`);
  } catch {
    alert('Failed to generate PDF. Please try again.');
  } finally {
    setIsExportingBulk(false);
  }
};
```

Per-employee export handler:
```ts
const handleExportEmployeePdf = async (row: PayrollRow) => {
  setExportingEmployeeId(row.employee_id);
  try {
    const emp = employees.find(e => e.id === row.employee_id);
    if (!emp) return;
    const pb = prevBalances[row.employee_id] ?? 0;
    const [y, m] = prevMonth.split('-').map(Number);
    const od = pb > 0 && paidUpToDay
      ? Math.max(0, getDaysInMonth(new Date(y, m - 1)) - paidUpToDay)
      : 0;
    const prevMonthName = format(new Date(y, m - 1), 'MMMM yyyy');
    const { pdf } = await import('@react-pdf/renderer');
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
    ).toBlob();
    downloadPdf(blob, `payroll-${row.display_id}-${selectedMonth}.pdf`);
  } catch {
    alert('Failed to generate PDF. Please try again.');
  } finally {
    setExportingEmployeeId(null);
  }
};
```

Note: `@react-pdf/renderer` is imported dynamically (`await import(...)`) to prevent it from loading during SSR.

New UI additions:
- **Control panel**: "Prev. month paid up to" number input (see above)
- **Header**: "Export PDF" button beside "Generate Payroll"; `disabled={isExportingBulk || computedPayroll.rows.length === 0}`
- **Per-row**: small download icon button in each row; `disabled={!!exportingEmployeeId}`; shows spinner when `exportingEmployeeId === row.employee_id`

---

## Out of Scope

- Saving PDFs to Supabase storage
- Emailing PDFs to employees
- Formal payslip design with company logo upload
- Carrying closing balance forward into the DB
- Company name configuration UI
