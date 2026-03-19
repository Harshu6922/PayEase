# Commission Work Entry UI — Sub-project 2 Design

**Date:** 2026-03-19
**Status:** Approved
**Sub-project:** 2 of 3 (Work Entry UI)

---

## Overview

A dedicated UI for logging daily work quantities for commission employees. Commission workers are paid per unit of work (e.g. Stitching, Cutting). Each day, an admin logs how many units of each item a worker completed. The system calculates earnings automatically using the worker's custom rate (from `agent_item_rates`, falling back to `commission_items.default_rate`).

This sub-project does NOT touch payroll reports — that is Sub-project 3.

---

## Pages

### Page 1: `/work-entries` — Worker List

Server component. Lists all active commission employees for the company.

- Fetches employees WHERE `worker_type = 'commission'` AND `is_active = true`, ordered by `full_name`
- Renders a simple list: worker name, employee ID, "View Entries →" link to `/work-entries/[employeeId]`
- If no commission workers: show empty state "No commission workers yet. Add employees with Worker Type = Commission."

### Page 2: `/work-entries/[employeeId]` — Worker Detail

Server component. Shows a specific worker's logged entries for a selected month.

**Data fetched on server:**
1. Employee record (must belong to company, redirect to `/work-entries` if not found)
2. Worker's assigned items: `SELECT *, commission_items(id, name, default_rate) FROM agent_item_rates WHERE employee_id = ?`
   — No `company_id` filter needed here: `agent_item_rates` has no `company_id` column, and the employee record is already verified to belong to the company in step 1.
3. Work entries for selected month: `SELECT * FROM work_entries WHERE employee_id = ? AND company_id = ? AND date BETWEEN ? AND ?`

**URL:** `/work-entries/[employeeId]?month=2026-03` (defaults to current month)

Passes all data to `WorkEntryManager` client component.

---

## Components

### `WorkEntryManager` (client, `/work-entries/[employeeId]/components/`)

Props: `{ employee, agentRates, initialEntries, month, companyId }`

State:
- `entries` — local copy of work entries (initialized from props, grouped by date)
- `isModalOpen: boolean`
- `editingDate: string | null` — null = new entry, set = editing existing date
- `month: string` — current YYYY-MM (for month navigation, triggers router.push)

**UI layout:**
```
← Back to Workers    [worker name]    [← March 2026 →]    [+ Log Day]

Date        Items Worked                          Total      Actions
──────────────────────────────────────────────────────────────────
Mar 15      Stitching: 50 · Cutting: 30          Rs. 2,400  [Edit] [Delete]
Mar 14      Stitching: 45                        Rs. 1,800  [Edit] [Delete]

(empty state: "No entries for this month. Click + Log Day to start.")
```

Month navigation: prev/next arrows update `?month=` query param via `router.push`.

On "Edit": opens modal pre-filled with that date's entries.
On "Delete": deletes ALL `work_entries` for that employee on that date (with confirm dialog).

### `LogDayModal` (client, `/work-entries/[employeeId]/components/`)

Props: `{ agentRates, existingEntries, companyId, employeeId, onSave, onClose }`

State:
- `date: string` — defaults to today (or editingDate if editing)
- `quantities: Record<itemId, string>` — one input per assigned item
- `saving: boolean`
- `error: string | null`

**Modal body:**
- Date picker at top
- For each item in `agentRates`, one row:
  ```
  Stitching    [  50  ]  @ Rs. 36.00/unit  =  Rs. 1,800.00
  ```
  Rate shown is `agentRate.commission_rate` (the worker's custom rate).
  Live total updates as user types.

- Items with empty or zero quantity are skipped on save.
- Must have at least one item with quantity > 0 to save.

**On save:**
- For each item with quantity > 0: upsert into `work_entries` with `onConflict: 'employee_id,item_id,date'` (no spaces around commas — Supabase requires exact column name format)
  ```
  { employee_id, company_id, date, item_id, quantity, rate: agentRate.commission_rate }
  ```
- For items with quantity = 0 that previously had an entry for this date: DELETE those rows.
- Call `onSave(date, newEntries)` to update local state.

**Grand total** shown at bottom of modal: sum of (quantity × rate) across all items.

---

## Data Flow

```
agent_item_rates (worker's items + rates)
        ↓
LogDayModal — user enters quantities
        ↓
work_entries upsert (one row per item per day)
        ↓
WorkEntryManager — groups entries by date for display
```

Entry grouping for display: `Map<date, WorkEntry[]>` — dates sorted descending.

Row total for display: sum of `entry.total_amount` for all entries on that date (total_amount is a generated column: quantity × rate).

---

## Rate Resolution

The rate stored in `work_entries.rate` is always `agentRate.commission_rate` (the per-worker custom rate). If a worker has no custom rate for an item, that item should not appear in their modal (they must have a rate assigned via the employee detail page first).

---

## Error Handling

- If employee not found or not commission type: redirect to `/work-entries`
- If worker has no assigned items: show "No commission items assigned. Go to the employee detail page to assign items and rates."
- Supabase errors on save: display inline in modal
- Delete errors: display inline with a toast or inline message

---

## Files

| File | Type | Purpose |
|---|---|---|
| `src/app/work-entries/page.tsx` | Server | Worker list |
| `src/app/work-entries/[employeeId]/page.tsx` | Server | Worker detail + data fetch |
| `src/app/work-entries/[employeeId]/components/WorkEntryManager.tsx` | Client | Month view + entry list |
| `src/app/work-entries/[employeeId]/components/LogDayModal.tsx` | Client | Add/Edit day entries |
| `src/components/Sidebar.tsx` | Client | Add "Work Entries" nav link with `ClipboardList` icon from lucide-react |
