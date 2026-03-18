# Employee Search & Filter Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a client-side search input and alphabetical sort toggle to the payroll reports table in PayrollDashboard.tsx.

**Architecture:** Two new state variables (`searchQuery`, `sortOrder`) feed a `filteredRows` memo that filters and sorts `computedPayroll.rows`. A filter bar div is inserted between the control panel card and the table. PDF export handlers are untouched.

**Tech Stack:** Next.js 14, React (useState, useMemo), TypeScript, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-18-employee-search-filter-design.md`

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `src/components/PayrollDashboard.tsx` | Add state, filteredRows memo, filter bar UI, context-aware empty state |

---

## Task 1: Add search and sort to PayrollDashboard

**Files:**
- Modify: `src/components/PayrollDashboard.tsx`

This is a single-task plan. All changes are in one file with clear, sequential steps.

- [ ] **Step 1: Add `searchQuery` and `sortOrder` state**

Find the existing state declarations (around line 127–131, after `const [exportingEmployeeId, ...]`). Add two new state variables immediately after:

```ts
const [searchQuery, setSearchQuery] = useState('')
const [sortOrder, setSortOrder] = useState<'default' | 'asc' | 'desc'>('default')
```

- [ ] **Step 2: Add `filteredRows` memo**

After the existing `pdfTotalNetPayout` useMemo block, add:

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

  return rows
}, [computedPayroll.rows, searchQuery, sortOrder])
```

- [ ] **Step 3: Add the filter bar UI**

In the JSX return, find the `{/* Dynamic Table */}` comment (around line 364). Insert the filter bar `<div>` immediately before it:

```tsx
{/* Filter Bar */}
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

- [ ] **Step 4: Replace `computedPayroll.rows` with `filteredRows` in the table body**

Find the `<tbody>` section. Make two changes:

**4a.** Change the empty-state condition from `computedPayroll.rows.length === 0` to `filteredRows.length === 0` and update the message to be context-aware:

```tsx
{filteredRows.length === 0 ? (
  <tr>
    <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">
      {searchQuery.trim()
        ? 'No employees match your search.'
        : 'No active employees found to calculate payroll for.'}
    </td>
  </tr>
) : (
  filteredRows.map((row) => (
    // ... existing row JSX unchanged
  ))
)}
```

**4b.** Replace `computedPayroll.rows.map((row) => (` with `filteredRows.map((row) => (`.

**Do NOT change** the `handleExportBulkPdf` or `handleExportEmployeePdf` handlers — they must keep using `computedPayroll.rows`.

- [ ] **Step 5: Verify TypeScript**

```bash
cd C:\Users\Lenovo\.gemini\antigravity\scratch\payroll-app
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Run tests**

```bash
npm test
```

Expected: `7 passed` (existing pdf-utils tests; no regressions).

- [ ] **Step 7: Commit**

```bash
git add src/components/PayrollDashboard.tsx
git commit -m "feat: add employee search and alphabetical sort to payroll table"
```
