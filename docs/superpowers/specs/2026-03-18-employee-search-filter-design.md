# Employee Search & Filter Design

**Date:** 2026-03-18
**Feature:** Client-side employee search and alphabetical sort in the payroll reports table

---

## Overview

Add a filter bar between the control panel and the employee table in `PayrollDashboard.tsx`. Users can search employees by name or ID and cycle the sort order. All filtering is purely on-screen — PDF export is unaffected.

---

## Scope

Single file change: `src/components/PayrollDashboard.tsx`

No new files. No server queries. No database changes.

---

## State

Two new state variables added to `PayrollDashboard`:

```ts
const [searchQuery, setSearchQuery] = useState('')
const [sortOrder, setSortOrder] = useState<'default' | 'asc' | 'desc'>('default')
```

`sortOrder` cycles on each button click: `'default'` → `'asc'` → `'desc'` → `'default'`.

---

## `filteredRows` Memo

```ts
const filteredRows = useMemo(() => {
  let rows = computedPayroll.rows

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase()
    rows = rows.filter(
      r =>
        r.full_name.toLowerCase().includes(q) ||
        r.display_id.toLowerCase().includes(q)
    )
  }

  if (sortOrder === 'asc') {
    return [...rows].sort((a, b) => a.full_name.localeCompare(b.full_name))
  }
  if (sortOrder === 'desc') {
    return [...rows].sort((a, b) => b.full_name.localeCompare(a.full_name))
  }

  return rows // 'default' = net payable descending (already sorted by calculatePayroll)
}, [computedPayroll.rows, searchQuery, sortOrder])
```

---

## Filter Bar UI

Placed between the control panel card and the table. Full-width slim `<div>` with flex layout:

- **Left:** text input, placeholder `"Search employee…"`, `value={searchQuery}`, `onChange` updates `searchQuery`
- **Right:** button that cycles `sortOrder` on click

Sort button label:

| `sortOrder` | Button shows |
|---|---|
| `'default'` | `Default sort` |
| `'asc'` | `A → Z` |
| `'desc'` | `Z → A` |

---

## Table Render Change

Replace `computedPayroll.rows` with `filteredRows` **only** in the `<tbody>` map. The `colSpan` empty-state row appears when `filteredRows.length === 0`.

PDF handlers (`handleExportBulkPdf`, `handleExportEmployeePdf`) continue to use `computedPayroll.rows` — unaffected by search/sort.

---

## Edge Cases

- Empty search (`''`) → no filtering, all rows shown
- Search with no matches → empty table row: "No employees match your search."
- `sortOrder` reset: does NOT reset on month change (sort preference is sticky within the session)
- `searchQuery` reset: does NOT reset on month change (search is sticky — user may be looking for the same employee across months)

---

## No Testing Required

`filteredRows` is a pure memo over already-tested data. No new unit tests needed. Verified visually in browser.
