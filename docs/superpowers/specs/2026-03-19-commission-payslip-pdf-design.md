# Commission Payslip PDF — Sub-project 3 Design

**Date:** 2026-03-19
**Status:** Approved
**Sub-project:** 3 of 3 (Commission Payslip PDF)

---

## Overview

Generate a downloadable PDF payslip for commission workers showing their monthly work entries. The PDF has two sections: a summary grouped by item, and a full daily breakdown. The download button appears in two places: the worker list page and the worker detail page.

---

## PDF Component

**File:** `src/components/pdf/CommissionPayslipPDF.tsx`

**Props:**
```ts
interface CommissionPayslipPDFProps {
  month: string              // 'yyyy-MM'
  companyName: string
  employee: {
    full_name: string
    employee_id: string
  }
  entries: WorkEntry[]       // all work_entries for this employee+month
  agentRates: AgentItemRate[] // for resolving item names
}
```

**Layout (A4 portrait, 40px padding — matches EmployeeDetailPDF style):**

```
[Company Name]                      Commission Payslip — March 2026

Tiwari
EMP-003 · Commission Worker

─── Summary by Item ────────────────────────────────────────────
Item Name       Total Qty    Rate (Rs.)    Total Amount
Stitching       320          36.00         11,520.00
Cutting         180          20.00          3,600.00
                                    Grand Total: Rs. 15,120.00

─── Daily Breakdown ────────────────────────────────────────────
Date            Item          Qty      Rate      Amount
Mar 15, 2026    Stitching      50      36.00     1,800.00
Mar 15, 2026    Cutting        30      20.00       600.00
Mar 16, 2026    Stitching      45      36.00     1,620.00
...

Generated on 19 March 2026
```

**Summary section logic:**
- Group `entries` by `item_id`
- For each item: sum quantities, use `entry.rate` for rate, sum `total_amount`
- Sort items alphabetically by name (resolved via `agentRates`)
- Grand total = sum of all `entry.total_amount`

**Daily breakdown logic:**
- Sort entries by `date` ascending, then by item name alphabetically within same date
- Each row: formatted date | item name | quantity | rate | total_amount
- Item name resolved via `agentRates.find(r => r.item_id === entry.item_id)?.commission_items?.name`

**Styling (follow existing PDF components):**
- Font: Helvetica
- Header: company name 14px bold, report title 11px gray
- Employee name: 12px bold, ID/type: 10px gray
- Section headers: 9px uppercase, light gray background
- Table headers: 8px bold gray
- Table rows: 9px, alternating subtle background
- Grand total row: 10px bold
- All amounts: formatted as `Rs. X,XXX.XX` — wrap all numeric DB values in `Number()` before arithmetic (Supabase returns numerics as strings at runtime)
- Generation timestamp: 8px gray, bottom of page

---

## Download Triggers

### Trigger 1: Worker List Page (`/work-entries/page.tsx`)

Currently a server component. To support PDF download (client-side), the worker list must become partially interactive. Best approach: keep the page as server component but extract the list into a `WorkerListClient.tsx` client component that handles the download button.

**`src/app/work-entries/components/WorkerListClient.tsx`** (new client component):
- Props: `{ workers: { id, full_name, employee_id }[], companyName: string, companyId: string }`
- Each worker row has a download icon button
- On click: fetch that worker's entries for the current month (from `work_entries`), fetch their `agent_item_rates`, then render and download the PDF
- Loading state per worker (spinner while fetching + generating)
- Current month = `format(new Date(), 'yyyy-MM')`

**`/work-entries/page.tsx`** updated to:
- Also fetch the `name` column from the `companies` table: `.select('name').eq('id', companyId).maybeSingle()` → `companyData?.name ?? 'My Company'`
- Pass `companyName` and `companyId` to `WorkerListClient`

### Trigger 2: Worker Detail Page (`/work-entries/[employeeId]`)

**`WorkEntryManager.tsx`** gets a "Download PDF" button beside the month picker.
- Uses the already-loaded `entries`, `agentRates`, `employee`, and `companyName` (new prop)
- On click: dynamically import `CommissionPayslipPDF` and `@react-pdf/renderer`, generate blob, download
- Same pattern as `handleExportBulkPdf` in `PayrollDashboard.tsx`
- `companyName` must be passed down from the server page → `WorkEntryManager` props

**`/work-entries/[employeeId]/page.tsx`** updated to:
- Also fetch the `name` column from `companies` using `companyId`: `.select('name').eq('id', companyId).maybeSingle()` → `companyData?.name ?? 'My Company'`
- Pass `companyName` as prop to `WorkEntryManager`

---

## Data Flow

```
Server page fetches: entries + agentRates + companyName
        ↓
WorkEntryManager (already has entries + agentRates)
        ↓ click "Download PDF"
CommissionPayslipPDF rendered with all data
        ↓
pdf().toBlob() → downloadPdf(blob, filename)
```

Filename format: `commission-{employee_id}-{month}.pdf` (e.g. `commission-EMP-003-2026-03.pdf`)

---

## Files

| File | Change | Purpose |
|---|---|---|
| `src/components/pdf/CommissionPayslipPDF.tsx` | Create | PDF component |
| `src/app/work-entries/page.tsx` | Modify | Fetch companyName, render WorkerListClient |
| `src/app/work-entries/components/WorkerListClient.tsx` | Create | Client component with download buttons |
| `src/app/work-entries/[employeeId]/page.tsx` | Modify | Fetch companyName, pass to WorkEntryManager |
| `src/app/work-entries/[employeeId]/components/WorkEntryManager.tsx` | Modify | Add companyName prop + Download PDF button |

---

## Error Handling

- If entries are empty when downloading from list page: show "No entries for this month" alert
- PDF generation failure: catch error, show alert (matches existing pattern in PayrollDashboard)
- Loading state: disable button and show "Generating..." while in progress
