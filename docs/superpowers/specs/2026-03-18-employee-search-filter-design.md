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

Placed between the control panel card (`mb-8` card) and the table div. Use this exact structure:

```tsx
<div className="mb-4 flex items-center justify-between gap-4">
  <input
    type="text"
    placeholder="Search employee…"
    value={searchQuery}
    onChange={e => setSearchQuery(e.target.value)}
    className="block w-64 rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
  />
  <button
    onClick={() =>
      setSortOrder(s => s === 'default' ? 'asc' : s === 'asc' ? 'desc' : 'default')
    }
    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
  >
    {sortOrder === 'default' ? 'Default sort' : sortOrder === 'asc' ? 'A → Z' : 'Z → A'}
  </button>
</div>
```

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

The `colSpan` on the existing empty-state `<td>` must increase from `8` to `8` (unchanged — table column count stays the same). The empty-state message must be **context-aware**:

- When `searchQuery` is non-empty and `filteredRows.length === 0`: show `"No employees match your search."`
- When `searchQuery` is empty and `filteredRows.length === 0`: show the existing `"No active employees found to calculate payroll for."`

---

## Edge Cases

- Empty search (`''`) → no filtering, all rows shown
- Search with no matches → empty table row: "No employees match your search."
- `sortOrder` reset: does NOT reset on month change (sort preference is sticky within the session)
- `searchQuery` reset: does NOT reset on month change (search is sticky — user may be looking for the same employee across months)

---

## No Testing Required

`filteredRows` is a pure memo over already-tested data. No new unit tests needed. Verified visually in browser.
