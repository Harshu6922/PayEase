# Commission Payslip PDF Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add downloadable commission payslip PDFs showing monthly work entries — triggered from both the worker list and worker detail pages.

**Architecture:** A new `CommissionPayslipPDF` React PDF component renders the payslip. Two existing pages are updated to fetch `companyName` and pass it down. The worker list gets a new `WorkerListClient` client component that handles per-worker download with on-demand data fetching. The worker detail `WorkEntryManager` gets a Download PDF button using already-loaded data.

**Tech Stack:** Next.js 14 App Router, TypeScript, @react-pdf/renderer, Supabase client, Tailwind CSS, date-fns

---

## Task 1: CommissionPayslipPDF component

Create `src/components/pdf/CommissionPayslipPDF.tsx`

Follow `EmployeeDetailPDF.tsx` pattern exactly. Use `Document`, `Page`, `View`, `Text` from `@react-pdf/renderer`.

### Steps

- [ ] Create `src/components/pdf/CommissionPayslipPDF.tsx` as a `'use client'` component with the following props interface:

  ```ts
  interface CommissionPayslipPDFProps {
    month: string              // 'yyyy-MM'
    companyName: string
    employee: { full_name: string; employee_id: string }
    entries: WorkEntry[]
    agentRates: AgentItemRate[]
  }
  ```

- [ ] Add imports at the top of the file:

  ```ts
  'use client';

  import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
  import { format, parse } from 'date-fns';
  import type { WorkEntry, AgentItemRate } from '@/types';
  ```

- [ ] Define `StyleSheet.create(...)` with these styles (follow EmployeeDetailPDF spacing and font conventions):

  | Style key | Value |
  |---|---|
  | `page` | `{ padding: 40, fontFamily: 'Helvetica', fontSize: 10 }` |
  | `companyName` | `{ fontSize: 14, fontWeight: 'bold', marginBottom: 2 }` |
  | `reportTitle` | `{ fontSize: 11, color: '#374151', marginBottom: 20 }` |
  | `employeeName` | `{ fontSize: 12, fontWeight: 'bold' }` |
  | `employeeSubtitle` | `{ fontSize: 10, color: '#6b7280', marginBottom: 8 }` |
  | `sectionGap` | `{ marginBottom: 12 }` |
  | `tableHeaderRow` | `{ flexDirection: 'row', backgroundColor: '#f3f4f6', paddingVertical: 4, paddingHorizontal: 6, marginBottom: 2 }` |
  | `tableHeaderText` | `{ fontSize: 8, fontWeight: 'bold', color: '#6b7280' }` |
  | `tableRow` | `{ flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 6 }` |
  | `tableRowAlt` | `{ flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 6, backgroundColor: '#f9fafb' }` |
  | `cellText` | `{ fontSize: 9 }` |
  | `grandTotalRow` | `{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, borderTop: '1pt solid #d1d5db', marginTop: 2 }` |
  | `grandTotalText` | `{ fontSize: 10, fontWeight: 'bold' }` |
  | `spacer` | `{ flexGrow: 1 }` |
  | `footer` | `{ fontSize: 8, color: '#9ca3af', marginTop: 20 }` |

  Column flex widths for **Summary** table:
  - Item Name: `flex: 3`
  - Total Qty: `flex: 1`, `textAlign: 'right'`
  - Rate (Rs.): `flex: 1`, `textAlign: 'right'`
  - Total Amount: `flex: 1.5`, `textAlign: 'right'`

  Column flex widths for **Daily Breakdown** table:
  - Date: `flex: 1.5`
  - Item: `flex: 2`
  - Qty: `flex: 0.8`, `textAlign: 'right'`
  - Rate: `flex: 0.8`, `textAlign: 'right'`
  - Amount: `flex: 1`, `textAlign: 'right'`

- [ ] Implement the component body logic:

  **Month label:**
  ```ts
  const monthLabel = format(parse(month + '-01', 'yyyy-MM-dd', new Date()), 'MMMM yyyy');
  ```

  **Item name lookup map** (build once, use in both sections):
  ```ts
  const itemNameMap = new Map<string, string>();
  agentRates.forEach(rate => {
    itemNameMap.set(rate.item_id, rate.commission_items?.name ?? 'Unknown');
  });
  ```

  **Summary section data** (group by item_id, sum qty and total_amount):
  ```ts
  const summaryMap = new Map<string, { name: string; qty: number; rate: number; total: number }>();
  entries.forEach(e => {
    const name = itemNameMap.get(e.item_id) ?? 'Unknown';
    const existing = summaryMap.get(e.item_id);
    if (existing) {
      existing.qty += Number(e.quantity);
      existing.total += Number(e.total_amount);
    } else {
      summaryMap.set(e.item_id, { name, qty: Number(e.quantity), rate: Number(e.rate), total: Number(e.total_amount) });
    }
  });
  const summaryRows = Array.from(summaryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  ```

  **Grand total:**
  ```ts
  const grandTotal = entries.reduce((sum, e) => sum + Number(e.total_amount), 0);
  ```

  **Daily breakdown sort** (date asc, then item name asc within same date):
  ```ts
  const sortedEntries = [...entries].sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    return (itemNameMap.get(a.item_id) ?? '').localeCompare(itemNameMap.get(b.item_id) ?? '');
  });
  ```

- [ ] Implement the JSX return — A4 portrait page with `padding: 40`:

  ```
  <Document>
    <Page size="A4" style={styles.page}>

      {/* Header */}
      <Text style={styles.companyName}>{companyName}</Text>
      <Text style={styles.reportTitle}>Commission Payslip — {monthLabel}</Text>

      {/* Employee identity */}
      <Text style={styles.employeeName}>{employee.full_name}</Text>
      <Text style={styles.employeeSubtitle}>{employee.employee_id} · Commission Worker</Text>

      {/* SUMMARY BY ITEM */}
      {/* Header row with gray bg */}
      {/* One data row per summaryRows entry */}
      {/* Grand Total row (bold) */}

      {/* 12px gap via sectionGap View */}

      {/* DAILY BREAKDOWN */}
      {/* Header row with gray bg */}
      {/* One row per sortedEntries entry — alternate row bg using index % 2 */}

      {/* Spacer to push footer down */}
      <View style={styles.spacer} />

      {/* Footer */}
      <Text style={styles.footer}>Generated on {format(new Date(), 'dd MMMM yyyy')}</Text>

    </Page>
  </Document>
  ```

  Format amounts as `Rs. X,XXX.XX`:
  ```ts
  function formatRs(n: number): string {
    return 'Rs. ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  ```

  Format dates in breakdown as `MMM d, yyyy`:
  ```ts
  format(new Date(entry.date + 'T00:00:00'), 'MMM d, yyyy')
  ```

- [ ] Export the component as default export.

- [ ] No tests needed (PDF component — visual output only).

### Commit

```
feat: CommissionPayslipPDF component
```

---

## Task 2: Thread companyName through worker detail page

### Files touched
- `src/app/work-entries/[employeeId]/page.tsx`
- `src/app/work-entries/[employeeId]/components/WorkEntryManager.tsx`

### Steps

- [ ] In `src/app/work-entries/[employeeId]/page.tsx`, after the block that reads `companyId`, add a company name fetch:

  ```ts
  const { data: companyData } = await supabase
    .from('companies').select('name').eq('id', companyId).maybeSingle()
  const companyName = (companyData as { name: string } | null)?.name ?? 'My Company'
  ```

  Insert this immediately after:
  ```ts
  const companyId = (profileData as { company_id: string | null } | null)?.company_id
  if (!companyId) redirect('/login')
  ```

- [ ] In the same file, pass `companyName` as a prop to `<WorkEntryManager />`:

  ```tsx
  <WorkEntryManager
    employee={employee}
    agentRates={agentRates}
    initialEntries={initialEntries}
    month={month}
    companyId={companyId}
    companyName={companyName}
  />
  ```

- [ ] In `src/app/work-entries/[employeeId]/components/WorkEntryManager.tsx`, add `companyName: string` to the `Props` interface:

  ```ts
  interface Props {
    employee: Employee
    agentRates: AgentItemRate[]
    initialEntries: WorkEntry[]
    month: string
    companyId: string
    companyName: string   // ← add this
  }
  ```

- [ ] In `WorkEntryManager`, destructure `companyName` from props:

  ```ts
  export default function WorkEntryManager({ employee, agentRates, initialEntries, month, companyId, companyName }: Props) {
  ```

- [ ] Add `downloadPdf` import to the existing import from `@/lib/pdf-utils`:

  ```ts
  import { downloadPdf } from '@/lib/pdf-utils'
  ```

- [ ] Add `isDownloading` state below the existing `useState` declarations:

  ```ts
  const [isDownloading, setIsDownloading] = useState(false)
  ```

- [ ] Add `handleDownloadPdf` function inside the component, after `openEdit`:

  ```ts
  const handleDownloadPdf = async () => {
    if (entries.length === 0) { alert('No entries for this month.'); return }
    setIsDownloading(true)
    try {
      const [{ default: CommissionPayslipPDF }, { pdf }] = await Promise.all([
        import('@/components/pdf/CommissionPayslipPDF'),
        import('@react-pdf/renderer'),
      ])
      const blob = await pdf(
        <CommissionPayslipPDF
          month={month}
          companyName={companyName}
          employee={{ full_name: employee.full_name, employee_id: employee.employee_id }}
          entries={entries}
          agentRates={agentRates}
        />
      ).toBlob()
      downloadPdf(blob, `commission-${employee.employee_id}-${month}.pdf`)
    } catch {
      alert('Failed to generate PDF.')
    } finally {
      setIsDownloading(false)
    }
  }
  ```

- [ ] Add a "Download PDF" button in the JSX beside the month picker. The month picker block currently reads:

  ```tsx
  {/* Month picker */}
  <div className="flex items-center gap-2 mb-6">
    <button onClick={prevMonth} ...>‹</button>
    <span ...>{monthLabel}</span>
    <button onClick={nextMonth} ...>›</button>
  </div>
  ```

  Replace with (append the Download PDF button inside the same flex container):

  ```tsx
  {/* Month picker */}
  <div className="flex items-center gap-2 mb-6">
    <button onClick={prevMonth} className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold">‹</button>
    <span className="text-base font-semibold text-gray-800 w-40 text-center">{monthLabel}</span>
    <button onClick={nextMonth} className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold">›</button>
    <button
      onClick={handleDownloadPdf}
      disabled={isDownloading}
      className="ml-4 px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isDownloading ? 'Generating...' : 'Download PDF'}
    </button>
  </div>
  ```

- [ ] Run TypeScript check:

  ```bash
  npx tsc --noEmit
  ```

  Resolve any type errors before committing.

### Commit

```
feat: Download PDF button on commission worker detail page
```

---

## Task 3: WorkerListClient + download from list page

### Files touched
- `src/app/work-entries/components/WorkerListClient.tsx` (new)
- `src/app/work-entries/page.tsx`

### Steps

- [ ] Create directory `src/app/work-entries/components/` if it does not already exist.

- [ ] Create `src/app/work-entries/components/WorkerListClient.tsx` as a new client component:

  ```ts
  'use client'

  import { useState } from 'react'
  import { format } from 'date-fns'
  import Link from 'next/link'
  import { ChevronRight, Download } from 'lucide-react'
  import { createClient } from '@/lib/supabase/client'
  import { downloadPdf } from '@/lib/pdf-utils'

  interface Worker {
    id: string
    full_name: string
    employee_id: string
  }

  interface Props {
    workers: Worker[]
    companyName: string
    companyId: string
  }

  export default function WorkerListClient({ workers, companyName, companyId }: Props) {
    const [downloadingId, setDownloadingId] = useState<string | null>(null)

    const handleDownload = async (worker: Worker) => {
      setDownloadingId(worker.id)
      try {
        const currentMonth = format(new Date(), 'yyyy-MM')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = createClient() as unknown as any

        const firstDay = currentMonth + '-01'
        const lastDay = format(
          new Date(parseInt(currentMonth.split('-')[0]), parseInt(currentMonth.split('-')[1]), 0),
          'yyyy-MM-dd'
        )

        const { data: entriesData } = await supabase
          .from('work_entries').select('*')
          .eq('employee_id', worker.id).eq('company_id', companyId)
          .gte('date', firstDay).lte('date', lastDay)
        const entries = entriesData || []

        if (entries.length === 0) { alert('No entries for this month.'); return }

        const { data: ratesData } = await supabase
          .from('agent_item_rates').select('*, commission_items(id, name, default_rate)')
          .eq('employee_id', worker.id)
        const agentRates = ratesData || []

        const [{ default: CommissionPayslipPDF }, { pdf }] = await Promise.all([
          import('@/components/pdf/CommissionPayslipPDF'),
          import('@react-pdf/renderer'),
        ])
        const blob = await pdf(
          <CommissionPayslipPDF
            month={currentMonth}
            companyName={companyName}
            employee={{ full_name: worker.full_name, employee_id: worker.employee_id }}
            entries={entries}
            agentRates={agentRates}
          />
        ).toBlob()
        downloadPdf(blob, `commission-${worker.employee_id}-${currentMonth}.pdf`)
      } catch {
        alert('Failed to generate PDF.')
      } finally {
        setDownloadingId(null)
      }
    }

    if (workers.length === 0) {
      return (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No commission workers yet.</p>
          <p className="text-sm mt-1">Add employees with Worker Type = Commission to get started.</p>
        </div>
      )
    }

    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
        {workers.map(worker => (
          <div key={worker.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
            <Link href={`/work-entries/${worker.id}`} className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{worker.full_name}</p>
              <p className="text-sm text-gray-400">{worker.employee_id}</p>
            </Link>
            <div className="flex items-center gap-3 ml-4">
              <button
                onClick={() => handleDownload(worker)}
                disabled={!!downloadingId}
                title="Download current month PDF"
                className="text-gray-400 hover:text-indigo-600 disabled:opacity-40 transition-colors"
              >
                {downloadingId === worker.id ? (
                  <span className="text-xs text-gray-500">...</span>
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </button>
              <Link href={`/work-entries/${worker.id}`}>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    )
  }
  ```

- [ ] In `src/app/work-entries/page.tsx`, after the `companyId` block, add a company name fetch:

  ```ts
  const { data: companyData } = await supabase
    .from('companies').select('name').eq('id', companyId).maybeSingle()
  const companyName = (companyData as { name: string } | null)?.name ?? 'My Company'
  ```

  Insert immediately after:
  ```ts
  const companyId = (profileData as { company_id: string | null } | null)?.company_id
  if (!companyId) redirect('/login')
  ```

- [ ] In `src/app/work-entries/page.tsx`, add `WorkerListClient` import at the top:

  ```ts
  import WorkerListClient from './components/WorkerListClient'
  ```

- [ ] In `src/app/work-entries/page.tsx`, replace the inline worker list JSX with `<WorkerListClient>`. The current JSX in the return value is:

  ```tsx
  {commissionWorkers.length === 0 ? (
    <div className="text-center py-16 text-gray-400">
      <p className="text-lg font-medium">No commission workers yet.</p>
      <p className="text-sm mt-1">Add employees with Worker Type = Commission to get started.</p>
    </div>
  ) : (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
      {commissionWorkers.map(worker => (
        <Link
          key={worker.id}
          href={`/work-entries/${worker.id}`}
          className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div>
            <p className="font-semibold text-gray-900">{worker.full_name}</p>
            <p className="text-sm text-gray-400">{worker.employee_id}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </Link>
      ))}
    </div>
  )}
  ```

  Replace with:
  ```tsx
  <WorkerListClient
    workers={commissionWorkers}
    companyName={companyName}
    companyId={companyId}
  />
  ```

- [ ] Remove the now-unused `Link` and `ChevronRight` imports from `src/app/work-entries/page.tsx` (both are moved into `WorkerListClient`).

- [ ] Run TypeScript check:

  ```bash
  npx tsc --noEmit
  ```

  Resolve any type errors before committing.

### Commit

```
feat: per-worker PDF download from commission worker list
```

---

## After all tasks

- [ ] Run full TypeScript check across all touched files:

  ```bash
  npx tsc --noEmit
  ```

- [ ] Verify no errors in:
  - `src/components/pdf/CommissionPayslipPDF.tsx`
  - `src/app/work-entries/[employeeId]/page.tsx`
  - `src/app/work-entries/[employeeId]/components/WorkEntryManager.tsx`
  - `src/app/work-entries/page.tsx`
  - `src/app/work-entries/components/WorkerListClient.tsx`
