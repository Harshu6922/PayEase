# Commission Work Entry UI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated work entry UI where admins log daily quantities for commission employees.

**Architecture:** Two-page structure: `/work-entries` lists commission workers, `/work-entries/[employeeId]` shows a month view of entries with a modal for logging daily quantities. Server components fetch data, client components handle interactivity.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (client + server), Tailwind CSS, date-fns, lucide-react

---

## Task 1: Sidebar nav link

**File:** `src/components/Sidebar.tsx`

- [ ] Add `ClipboardList` to the lucide-react import alongside the existing icons (`Users`, `CalendarCheck`, `FileText`, `LayoutDashboard`, `LogOut`, `Banknote`, `Tag`, `CalendarDays`)
- [ ] Add a new entry to the `navigation` array after the `Commission` entry:
  ```ts
  { name: 'Work Entries', href: '/work-entries', icon: ClipboardList },
  ```
- [ ] No tests required (UI-only change)
- [ ] Commit: `feat: add Work Entries link to sidebar`

**Notes:**
- The `navigation` array currently ends with `{ name: 'Commission', href: '/commission', icon: Tag }`. The new entry goes immediately after it.
- The sidebar uses `pathname.startsWith(item.href)` for active detection, so `/work-entries/[employeeId]` will also highlight the nav link correctly.

---

## Task 2: Worker list page (`/work-entries`)

**File:** `src/app/work-entries/page.tsx` (new file, server component)

- [ ] Create the file as an `async` default export server component (no `'use client'` directive)
- [ ] Import `createClient` from `@/lib/supabase/server`, `redirect` from `next/navigation`, and `Employee` from `@/types`
- [ ] Auth pattern — identical to `src/app/commission/page.tsx`:
  ```ts
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const userId = user!.id
  ```
- [ ] Profile/company pattern:
  ```ts
  const { data: profileData } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .maybeSingle()
  const profile = profileData as { company_id: string | null } | null
  const companyId = profile?.company_id
  if (!companyId) redirect('/login')
  ```
- [ ] Fetch commission employees:
  ```ts
  const { data: employeesData } = await supabase
    .from('employees')
    .select('id, full_name, employee_id')
    .eq('company_id', companyId)
    .eq('worker_type', 'commission')
    .eq('is_active', true)
    .order('full_name')
  const employees = (employeesData || []) as Pick<Employee, 'id' | 'full_name' | 'employee_id'>[]
  ```
- [ ] Render a page with:
  - Heading: "Work Entries"
  - Empty state if `employees.length === 0`: `"No commission workers yet. Add employees with Worker Type = Commission."`
  - Otherwise: a list/table with each worker's `full_name`, `employee_id`, and a link `"View Entries →"` pointing to `/work-entries/${employee.id}`
- [ ] Commit: `feat: work entries worker list page`

**Type note:** The select query returns a partial Employee shape. Cast to `Pick<Employee, 'id' | 'full_name' | 'employee_id'>[]` — all three fields exist on the `Employee` interface in `src/types/index.ts`.

---

## Task 3: Worker detail server page (`/work-entries/[employeeId]`)

**File:** `src/app/work-entries/[employeeId]/page.tsx` (new file, server component)

- [ ] Create as an `async` server component with params signature:
  ```ts
  export default async function WorkerDetailPage({
    params,
    searchParams,
  }: {
    params: { employeeId: string }
    searchParams: { month?: string }
  })
  ```
- [ ] Import: `createClient` from `@/lib/supabase/server`, `redirect` from `next/navigation`, `format`, `parse`, `startOfMonth`, `endOfMonth` from `date-fns`, `Employee`, `AgentItemRate`, `WorkEntry` from `@/types`, and `WorkEntryManager` from `./components/WorkEntryManager`
- [ ] Auth + company_id using the same pattern as Task 2
- [ ] Resolve the month:
  ```ts
  const month = searchParams.month ?? format(new Date(), 'yyyy-MM')
  ```
- [ ] Fetch and validate the employee:
  ```ts
  const { data: employeeData } = await supabase
    .from('employees')
    .select('*')
    .eq('id', params.employeeId)
    .eq('company_id', companyId)
    .eq('worker_type', 'commission')
    .maybeSingle()
  if (!employeeData) redirect('/work-entries')
  const employee = employeeData as Employee
  ```
- [ ] Fetch agent rates (no `company_id` filter — `agent_item_rates` has no `company_id` column; ownership is verified via the employee check above):
  ```ts
  const { data: ratesData } = await supabase
    .from('agent_item_rates')
    .select('*, commission_items(id, name, default_rate)')
    .eq('employee_id', params.employeeId)
  const agentRates = (ratesData || []) as AgentItemRate[]
  ```
- [ ] Compute date range from the month string:
  ```ts
  const firstDay = format(parse(month, 'yyyy-MM', new Date()), 'yyyy-MM-01')
  // or use startOfMonth/endOfMonth from date-fns:
  const parsedMonth = parse(month, 'yyyy-MM', new Date())
  const firstDay = format(startOfMonth(parsedMonth), 'yyyy-MM-dd')
  const lastDay = format(endOfMonth(parsedMonth), 'yyyy-MM-dd')
  ```
- [ ] Fetch work entries for the month:
  ```ts
  const { data: entriesData } = await supabase
    .from('work_entries')
    .select('*')
    .eq('employee_id', params.employeeId)
    .eq('company_id', companyId)
    .gte('date', firstDay)
    .lte('date', lastDay)
    .order('date', { ascending: false })
  const initialEntries = (entriesData || []) as WorkEntry[]
  ```
- [ ] Return:
  ```tsx
  return (
    <WorkEntryManager
      employee={employee}
      agentRates={agentRates}
      initialEntries={initialEntries}
      month={month}
      companyId={companyId}
    />
  )
  ```
- [ ] Commit: `feat: work entries worker detail server page`

**Type notes:**
- `Employee` has `worker_type: 'salaried' | 'commission' | 'daily'` — the `.eq('worker_type', 'commission')` filter ensures the cast is valid.
- `AgentItemRate.commission_items` is typed as `Pick<CommissionItem, 'id' | 'name' | 'default_rate'> | undefined` — matches the joined select shape.
- `WorkEntry` has `id`, `employee_id`, `company_id`, `date`, `item_id`, `quantity`, `rate`, `total_amount`, `created_at` — all returned by `select('*')`.

---

## Task 4: WorkEntryManager client component

**File:** `src/app/work-entries/[employeeId]/components/WorkEntryManager.tsx` (new file)

- [ ] Create directory `src/app/work-entries/[employeeId]/components/` if it does not exist
- [ ] Add `'use client'` directive at the top
- [ ] Imports:
  ```ts
  import { useState, useMemo } from 'react'
  import { useRouter } from 'next/navigation'
  import { format, addMonths, subMonths, parse } from 'date-fns'
  import { createClient } from '@/lib/supabase/client'
  import type { Employee, AgentItemRate, WorkEntry } from '@/types'
  import LogDayModal from './LogDayModal'
  ```
- [ ] Props interface:
  ```ts
  interface WorkEntryManagerProps {
    employee: Employee
    agentRates: AgentItemRate[]
    initialEntries: WorkEntry[]
    month: string
    companyId: string
  }
  ```
- [ ] State:
  ```ts
  const [entries, setEntries] = useState<WorkEntry[]>(initialEntries)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [deleteDate, setDeleteDate] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const router = useRouter()
  ```
- [ ] Group entries by date with `useMemo`:
  ```ts
  const entriesByDate = useMemo(() => {
    const map = new Map<string, WorkEntry[]>()
    for (const entry of entries) {
      const existing = map.get(entry.date) ?? []
      map.set(entry.date, [...existing, entry])
    }
    return map
  }, [entries])

  const sortedDates = useMemo(
    () => Array.from(entriesByDate.keys()).sort((a, b) => b.localeCompare(a)),
    [entriesByDate]
  )
  ```
- [ ] Month navigation helpers:
  ```ts
  const parsedMonth = parse(month, 'yyyy-MM', new Date())
  const prevMonth = format(subMonths(parsedMonth, 1), 'yyyy-MM')
  const nextMonth = format(addMonths(parsedMonth, 1), 'yyyy-MM')
  const displayMonth = format(parsedMonth, 'MMMM yyyy')
  ```
- [ ] Delete handler:
  ```ts
  const handleDelete = async (date: string) => {
    if (!window.confirm(`Delete all entries for ${date}?`)) return
    const supabase = createClient() as unknown as any
    const { error } = await supabase
      .from('work_entries')
      .delete()
      .eq('employee_id', employee.id)
      .eq('company_id', companyId)
      .eq('date', date)
    if (error) {
      setDeleteError(`Failed to delete entries for ${date}.`)
      return
    }
    setEntries(prev => prev.filter(e => e.date !== date))
    setDeleteError(null)
  }
  ```
- [ ] `onSave` callback passed to modal:
  ```ts
  const handleSave = (date: string, newEntries: WorkEntry[]) => {
    setEntries(prev => {
      const withoutDate = prev.filter(e => e.date !== date)
      return [...withoutDate, ...newEntries].sort((a, b) => b.date.localeCompare(a.date))
    })
    setIsModalOpen(false)
    setEditingDate(null)
  }
  ```
- [ ] UI structure:
  ```tsx
  <div className="p-6">
    {/* Header row */}
    <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
      <button onClick={() => router.push('/work-entries')} className="text-blue-600 hover:underline text-sm">
        ← Back to Workers
      </button>
      <h1 className="text-2xl font-bold text-gray-900">{employee.full_name}</h1>
      <div className="flex items-center gap-2">
        <button onClick={() => router.push(`/work-entries/${employee.id}?month=${prevMonth}`)}>←</button>
        <span className="font-medium">{displayMonth}</span>
        <button onClick={() => router.push(`/work-entries/${employee.id}?month=${nextMonth}`)}>→</button>
      </div>
      <button
        onClick={() => { setEditingDate(null); setIsModalOpen(true) }}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        + Log Day
      </button>
    </div>

    {/* Delete error */}
    {deleteError && <p className="text-red-600 mb-4 text-sm">{deleteError}</p>}

    {/* Entries table or empty state */}
    {sortedDates.length === 0 ? (
      <p className="text-gray-500 text-center py-12">
        No entries for this month. Click + Log Day to start.
      </p>
    ) : (
      <table className="w-full border-collapse bg-white rounded-lg shadow">
        <thead>
          <tr className="border-b">
            <th className="text-left p-4 text-gray-600 font-medium">Date</th>
            <th className="text-left p-4 text-gray-600 font-medium">Items Worked</th>
            <th className="text-right p-4 text-gray-600 font-medium">Total</th>
            <th className="text-right p-4 text-gray-600 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedDates.map(date => {
            const dayEntries = entriesByDate.get(date)!
            const dayTotal = dayEntries.reduce((sum, e) => sum + e.total_amount, 0)
            const itemsLabel = dayEntries
              .map(e => {
                const rate = agentRates.find(r => r.item_id === e.item_id)
                const name = rate?.commission_items?.name ?? e.item_id
                return `${name}: ${e.quantity}`
              })
              .join(' · ')
            return (
              <tr key={date} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-4">{format(new Date(date + 'T00:00:00'), 'MMM d')}</td>
                <td className="p-4 text-gray-600">{itemsLabel}</td>
                <td className="p-4 text-right">Rs. {dayTotal.toFixed(2)}</td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => { setEditingDate(date); setIsModalOpen(true) }}
                    className="text-blue-600 hover:text-blue-800 mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(date)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )}

    {/* Modal */}
    {isModalOpen && (
      <LogDayModal
        agentRates={agentRates}
        existingEntries={editingDate ? (entriesByDate.get(editingDate) ?? []) : []}
        companyId={companyId}
        employeeId={employee.id}
        editingDate={editingDate}
        onSave={handleSave}
        onClose={() => { setIsModalOpen(false); setEditingDate(null) }}
      />
    )}
  </div>
  ```
- [ ] Commit: `feat: WorkEntryManager client component`

**Type notes:**
- `entries` is `WorkEntry[]` — `total_amount` is present on `WorkEntry` (generated DB column, always returned by `select('*')`).
- `agentRates` is `AgentItemRate[]` — `commission_items` is `Pick<CommissionItem, 'id' | 'name' | 'default_rate'> | undefined`, so access via optional chaining.
- Date display: `new Date(date + 'T00:00:00')` avoids UTC offset issues when constructing from a `YYYY-MM-DD` string.

---

## Task 5: LogDayModal client component

**File:** `src/app/work-entries/[employeeId]/components/LogDayModal.tsx` (new file)

- [ ] Add `'use client'` directive at the top
- [ ] Imports:
  ```ts
  import { useState, useEffect } from 'react'
  import { format } from 'date-fns'
  import { createClient } from '@/lib/supabase/client'
  import type { AgentItemRate, WorkEntry } from '@/types'
  ```
- [ ] Props interface:
  ```ts
  interface LogDayModalProps {
    agentRates: AgentItemRate[]
    existingEntries: WorkEntry[]
    companyId: string
    employeeId: string
    editingDate: string | null
    onSave: (date: string, entries: WorkEntry[]) => void
    onClose: () => void
  }
  ```
- [ ] State:
  ```ts
  const [date, setDate] = useState<string>(
    editingDate ?? format(new Date(), 'yyyy-MM-dd')
  )
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  ```
- [ ] Initialize quantities from `existingEntries` when in edit mode:
  ```ts
  useEffect(() => {
    if (editingDate && existingEntries.length > 0) {
      const initial: Record<string, string> = {}
      for (const entry of existingEntries) {
        initial[entry.item_id] = String(entry.quantity)
      }
      setQuantities(initial)
    }
  }, [editingDate]) // intentionally omit existingEntries to avoid re-init on parent re-render
  ```
- [ ] Live grand total:
  ```ts
  const grandTotal = agentRates.reduce((sum, rate) => {
    const qty = parseFloat(quantities[rate.item_id] ?? '0') || 0
    return sum + qty * rate.commission_rate
  }, 0)
  ```
- [ ] Save handler:
  ```ts
  const handleSave = async () => {
    setError(null)

    const hasAny = agentRates.some(r => {
      const qty = parseFloat(quantities[r.item_id] ?? '0')
      return !isNaN(qty) && qty > 0
    })
    if (!hasAny) {
      setError('Enter a quantity greater than 0 for at least one item.')
      return
    }

    setSaving(true)
    try {
      const supabase = createClient() as unknown as any

      for (const rate of agentRates) {
        const qty = parseFloat(quantities[rate.item_id] ?? '0') || 0
        const existingEntry = existingEntries.find(
          e => e.item_id === rate.item_id && e.date === date
        )

        if (qty > 0) {
          const { error: upsertError } = await supabase
            .from('work_entries')
            .upsert(
              {
                employee_id: employeeId,
                company_id: companyId,
                date,
                item_id: rate.item_id,
                quantity: qty,
                rate: rate.commission_rate,
              },
              { onConflict: 'employee_id,item_id,date' }
            )
          if (upsertError) throw upsertError
        } else if (existingEntry) {
          const { error: deleteError } = await supabase
            .from('work_entries')
            .delete()
            .eq('id', existingEntry.id)
          if (deleteError) throw deleteError
        }
      }

      // Re-fetch fresh entries for the date to get generated total_amount values
      const { data: freshData, error: fetchError } = await supabase
        .from('work_entries')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('company_id', companyId)
        .eq('date', date)
      if (fetchError) throw fetchError

      onSave(date, (freshData ?? []) as WorkEntry[])
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred.')
      }
    } finally {
      setSaving(false)
    }
  }
  ```
- [ ] UI — centered overlay modal:
  ```tsx
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {editingDate ? 'Edit Day Entries' : 'Log Day'}
      </h2>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Date picker */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          disabled={!!editingDate}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
        />
      </div>

      {/* No items assigned state */}
      {agentRates.length === 0 ? (
        <p className="text-gray-500 text-center py-6">
          No commission items assigned. Go to the employee detail page to assign items and rates.
        </p>
      ) : (
        <>
          {/* Item rows */}
          <div className="space-y-3 mb-4">
            {agentRates.map(rate => {
              const qty = parseFloat(quantities[rate.item_id] ?? '0') || 0
              const lineTotal = qty * rate.commission_rate
              const itemName = rate.commission_items?.name ?? rate.item_id
              return (
                <div key={rate.item_id} className="flex items-center gap-3">
                  <span className="flex-1 text-sm font-medium text-gray-700">{itemName}</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={quantities[rate.item_id] ?? ''}
                    onChange={e =>
                      setQuantities(prev => ({ ...prev, [rate.item_id]: e.target.value }))
                    }
                    placeholder="0"
                    className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-right text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-500 w-36">
                    @ Rs. {rate.commission_rate.toFixed(2)}/unit
                  </span>
                  <span className="text-sm font-medium text-gray-700 w-28 text-right">
                    = Rs. {lineTotal.toFixed(2)}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Grand total */}
          <div className="border-t pt-3 mb-4 flex justify-between items-center">
            <span className="font-semibold text-gray-700">Grand Total</span>
            <span className="font-bold text-gray-900">Rs. {grandTotal.toFixed(2)}</span>
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        {agentRates.length > 0 && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>
    </div>
  </div>
  ```
- [ ] Commit: `feat: LogDayModal for daily work quantity entry`

**Type notes:**
- `agentRates` is `AgentItemRate[]`. Each `rate.item_id` is a `string` — safe as `Record<string, string>` key.
- `rate.commission_rate` is `number` — no null check needed (`AgentItemRate.commission_rate: number` in `src/types/index.ts`).
- `freshData` from re-fetch is cast to `WorkEntry[]` — matches `select('*')` shape.
- `existingEntry.id` is `string` (non-optional on `WorkEntry`) — safe to use in `.eq('id', existingEntry.id)`.
- Date input is disabled when editing to prevent changing the date key mid-edit. If the spec later requires date changes on edit, the save logic must delete the old date's entries and insert at the new date — not implemented here per spec scope.

---

## Implementation order

1. Task 1 — Sidebar (isolated change, safe to do first)
2. Task 2 — Worker list page (depends only on Supabase `employees` table)
3. Task 3 — Worker detail server page (depends on Tasks 4 and 5 being created before running)
4. Task 4 — WorkEntryManager (depends on Task 5's `LogDayModal`)
5. Task 5 — LogDayModal (no local dependencies)

In practice, create Tasks 5 → 4 → 3 in that order so imports resolve, then Tasks 2 and 1.

---

## Type consistency checklist

| Usage | Type source | Verified |
|---|---|---|
| `Employee.worker_type` | `'salaried' \| 'commission' \| 'daily'` | `src/types/index.ts:23` |
| `Employee.id`, `.full_name`, `.employee_id` | `string` | `src/types/index.ts:13-14` |
| `AgentItemRate.commission_rate` | `number` (non-nullable) | `src/types/index.ts:99` |
| `AgentItemRate.item_id` | `string` | `src/types/index.ts:98` |
| `AgentItemRate.commission_items` | `Pick<CommissionItem, 'id' \| 'name' \| 'default_rate'> \| undefined` | `src/types/index.ts:101` |
| `WorkEntry.total_amount` | `number` (generated column) | `src/types/index.ts:112` |
| `WorkEntry.id` | `string` (non-optional) | `src/types/index.ts:105` |
| `WorkEntry.date` | `string` (`YYYY-MM-DD`) | `src/types/index.ts:108` |
| `WorkEntry.item_id` | `string` | `src/types/index.ts:109` |
| `WorkEntry.quantity` | `number` | `src/types/index.ts:110` |
