# Daily Jobwork Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 'daily' worker type with a dedicated monthly attendance grid and pay summary.

**Architecture:** Three layers — DB migration (manual), TypeScript types + employee form updates, new /daily-attendance page with grid UI. Daily workers use a separate `daily_attendance` table. Pay = hours_worked × (daily_rate / standard_working_hours).

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Supabase PostgreSQL, Tailwind CSS, date-fns (already in project)

---

## Implementation Notes

- `date-fns` is available — use `format(date, 'yyyy-MM-dd')` for date strings
- Supabase client in client components: `createClient() as unknown as any` (consistent with codebase pattern — `agent_item_rates` and `daily_attendance` tables are not in `supabase.ts` type definitions). Existing modals use `createClient() as unknown as SupabaseClient<Database>` — for `daily_attendance` operations use `createClient() as unknown as any` since the table is not typed.
- Server component uses `createClient()` from `@/lib/supabase/server` (not the client cast), with `await createClient()` — see commission/page.tsx pattern
- Grid must handle months with 28/29/30/31 days correctly using `new Date(year, month, 0).getDate()` where `month` is 1-indexed
- `editingCell` state type: `{ worker: Employee; date: string; record: DailyAttendance } | null`
- The `daily_attendance` table's unique constraint is `(employee_id, date)` — use upsert with `onConflict: 'employee_id,date'`
- Daily workers do NOT appear in `/reports` — no changes needed to reports page
- The `overtime_multiplier` column is set to `1` for daily workers only to satisfy the NOT NULL DB constraint; it has no effect on pay calculation

---

## Task 1: DB Migration (manual)

**Files to create:** `sql/04-daily-jobwork.sql`

- [ ] Create the file `sql/04-daily-jobwork.sql` at the project root with the following exact SQL:

```sql
-- 1a. Drop old worker_type check constraint and add updated one
ALTER TABLE public.employees
  DROP CONSTRAINT employees_worker_type_check;

ALTER TABLE public.employees
  ADD CONSTRAINT employees_worker_type_check
  CHECK (worker_type IN ('salaried', 'commission', 'daily'));

-- 1b. Add daily_rate column (nullable, positive only)
ALTER TABLE public.employees
  ADD COLUMN daily_rate NUMERIC(10,2) DEFAULT NULL CHECK (daily_rate IS NULL OR daily_rate > 0);

-- 1c. Create daily_attendance table
CREATE TABLE public.daily_attendance (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id   UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id  UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  hours_worked NUMERIC(5,2) NOT NULL,
  pay_amount   NUMERIC(10,2) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

ALTER TABLE public.daily_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins manage daily attendance"
ON public.daily_attendance FOR ALL TO authenticated
USING (company_id = get_my_company_id())
WITH CHECK (company_id = get_my_company_id());
```

- [ ] Paste the contents of `sql/04-daily-jobwork.sql` into the Supabase SQL editor and run it. Verify no errors.
- [ ] Commit the SQL file:
  ```
  git add sql/04-daily-jobwork.sql
  git commit -m "chore: add daily_attendance table and daily_rate column migration"
  ```

---

## Task 2: TypeScript Types

**Files to modify:** `src/types/index.ts`

- [ ] In `src/types/index.ts`, change the `worker_type` union in the `Employee` interface from:
  ```ts
  worker_type: 'salaried' | 'commission';
  ```
  to:
  ```ts
  worker_type: 'salaried' | 'commission' | 'daily';
  ```

- [ ] Add `daily_rate: number | null;` as a field on the `Employee` interface, directly after `overtime_multiplier`:
  ```ts
  export interface Employee {
    id: string;
    company_id: string;
    full_name: string;
    employee_id: string;
    monthly_salary: number;
    standard_working_hours: number;
    overtime_multiplier: number;
    daily_rate: number | null;       // <-- add this line
    joining_date: string;
    is_active: boolean;
    worker_type: 'salaried' | 'commission' | 'daily';
  }
  ```

- [ ] Add the new `DailyAttendance` interface at the end of `src/types/index.ts`:
  ```ts
  export interface DailyAttendance {
    id: string;
    company_id: string;
    employee_id: string;
    date: string;           // 'YYYY-MM-DD'
    hours_worked: number;
    pay_amount: number;
    created_at: string;
  }
  ```

- [ ] Run type check — expect TypeScript errors in the employee modal files because they use the narrower `'salaried' | 'commission'` union for `worker_type` in their `formData` state; these will be fixed in Task 3:
  ```
  npx tsc --noEmit
  ```

- [ ] Commit:
  ```
  git add src/types/index.ts
  git commit -m "feat(types): add daily worker_type, daily_rate field, and DailyAttendance interface"
  ```

---

## Task 3: Employee Form Conditional Fields

**Files to modify:**
- `src/app/employees/components/AddEmployeeModal.tsx`
- `src/app/employees/components/EditEmployeeModal.tsx`

### AddEmployeeModal.tsx changes

- [ ] Update the `worker_type` type annotation in `formData` state from `'salaried' | 'commission'` to `'salaried' | 'commission' | 'daily'`.

- [ ] Add `daily_rate: ''` to the `formData` initial state object.

- [ ] In `handleSubmit`, replace the existing `.insert({...})` payload to handle the three worker types:

  ```ts
  const isDailyWorker = formData.worker_type === 'daily';
  const isCommissionWorker = formData.worker_type === 'commission';

  if (isDailyWorker) {
    if (!formData.daily_rate || parseFloat(formData.daily_rate) <= 0) {
      setError('Daily Rate must be greater than 0 for daily workers.');
      setLoading(false);
      return;
    }
    if (!formData.standard_working_hours || parseFloat(formData.standard_working_hours) <= 0) {
      setError('Working Hours must be greater than 0 for daily workers.');
      setLoading(false);
      return;
    }
  }

  const { error: insertError } = await supabase.from('employees').insert({
    company_id: profile.company_id,
    full_name: formData.full_name,
    employee_id: formData.employee_id,
    monthly_salary: isDailyWorker || isCommissionWorker ? 0 : parseFloat(formData.monthly_salary),
    standard_working_hours: isCommissionWorker ? 0 : parseFloat(formData.standard_working_hours),
    overtime_multiplier: isDailyWorker || isCommissionWorker ? 1 : parseFloat(formData.overtime_multiplier),
    joining_date: formData.joining_date,
    is_active: formData.is_active,
    worker_type: formData.worker_type,
    daily_rate: isDailyWorker ? parseFloat(formData.daily_rate) : null,
  });
  ```

  Note: existing commission logic used `overtime_multiplier: 0` — change it to `1` for commission workers too so the NOT NULL constraint is met correctly (the spec requires `1` for daily; use the same safe value for commission).

- [ ] After the `setIsOpen(false)` success block, reset `formData` to include `daily_rate: ''` and `worker_type: 'salaried'`.

- [ ] In the JSX, add `'Daily'` option to the worker type select:
  ```tsx
  <option value="salaried">Salaried</option>
  <option value="commission">Commission</option>
  <option value="daily">Daily</option>
  ```

- [ ] Replace the existing `{formData.worker_type === 'salaried' && (...)}` block with three separate conditional blocks:

  ```tsx
  {/* Salaried-only fields */}
  {formData.worker_type === 'salaried' && (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700">Monthly Salary (INR)</label>
        <input
          type="number"
          name="monthly_salary"
          required
          step="0.01"
          min="0"
          value={formData.monthly_salary}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Working Hours/Day</label>
          <input
            type="number"
            name="standard_working_hours"
            required
            step="0.5"
            min="1"
            max="24"
            value={formData.standard_working_hours}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">OT Multiplier</label>
          <input
            type="number"
            name="overtime_multiplier"
            required
            step="0.1"
            min="1"
            max="5"
            value={formData.overtime_multiplier}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
            title="Overtime rate multiplier (e.g., 1.5 means 1.5x regular rate)"
          />
        </div>
      </div>
    </>
  )}

  {/* Daily-only fields */}
  {formData.worker_type === 'daily' && (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700">Daily Rate (INR)</label>
        <input
          type="number"
          name="daily_rate"
          required
          step="0.01"
          min="0.01"
          value={formData.daily_rate}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Working Hours/Day</label>
        <input
          type="number"
          name="standard_working_hours"
          required
          step="0.5"
          min="1"
          max="24"
          value={formData.standard_working_hours}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
    </>
  )}
  ```

  Commission workers see no salary/hours fields — the existing behavior (the two conditional blocks above cover salaried and daily; commission renders nothing between worker_type select and is_active checkbox) is correct.

### EditEmployeeModal.tsx changes

- [ ] Update the `worker_type` type annotation in `formData` state from `'salaried' | 'commission'` to `'salaried' | 'commission' | 'daily'`.

- [ ] Add `daily_rate: String(employee.daily_rate ?? '')` to the `formData` initial state, initialized from the `employee` prop.

- [ ] Apply the same three-block JSX conditional pattern (salaried fields / daily fields / commission = nothing) as described above for AddEmployeeModal.

- [ ] In `handleSubmit`, update the `.update({...})` payload to match the same logic:

  ```ts
  const isDailyWorker = formData.worker_type === 'daily';
  const isCommissionWorker = formData.worker_type === 'commission';

  if (isDailyWorker) {
    if (!formData.daily_rate || parseFloat(formData.daily_rate) <= 0) {
      setError('Daily Rate must be greater than 0 for daily workers.');
      setLoading(false);
      return;
    }
    if (!formData.standard_working_hours || parseFloat(formData.standard_working_hours) <= 0) {
      setError('Working Hours must be greater than 0 for daily workers.');
      setLoading(false);
      return;
    }
  }

  const { error: updateError } = await supabase
    .from('employees')
    .update({
      full_name: formData.full_name,
      employee_id: formData.employee_id,
      monthly_salary: isDailyWorker || isCommissionWorker ? 0 : parseFloat(formData.monthly_salary),
      standard_working_hours: isCommissionWorker ? 0 : parseFloat(formData.standard_working_hours),
      overtime_multiplier: isDailyWorker || isCommissionWorker ? 1 : parseFloat(formData.overtime_multiplier),
      joining_date: formData.joining_date,
      is_active: formData.is_active,
      worker_type: formData.worker_type,
      daily_rate: isDailyWorker ? parseFloat(formData.daily_rate) : null,
    })
    .eq('id', employee.id);
  ```

- [ ] Add `'Daily'` option to the worker type select in EditEmployeeModal JSX (same as AddEmployeeModal).

- [ ] Run type check:
  ```
  npx tsc --noEmit
  ```
  Expect no errors at this point.

- [ ] Commit:
  ```
  git add src/app/employees/components/AddEmployeeModal.tsx src/app/employees/components/EditEmployeeModal.tsx
  git commit -m "feat(employees): add daily worker type with daily_rate field in add/edit modals"
  ```

---

## Task 4: Sidebar Nav Link

**Files to modify:** `src/components/Sidebar.tsx`

- [ ] Add `CalendarDays` to the lucide-react import line:
  ```ts
  import {
    Users,
    CalendarCheck,
    FileText,
    LayoutDashboard,
    LogOut,
    Banknote,
    Tag,
    CalendarDays,
  } from 'lucide-react'
  ```

- [ ] Add the Daily Attendance entry to the `navigation` array, immediately after the `Attendance` entry:
  ```ts
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Employees', href: '/employees', icon: Users },
    { name: 'Attendance', href: '/attendance', icon: CalendarCheck },
    { name: 'Daily Attendance', href: '/daily-attendance', icon: CalendarDays },
    { name: 'Advances', href: '/advances', icon: Banknote },
    { name: 'Reports', href: '/reports', icon: FileText },
    { name: 'Commission', href: '/commission', icon: Tag },
  ]
  ```

- [ ] Commit:
  ```
  git add src/components/Sidebar.tsx
  git commit -m "feat(nav): add Daily Attendance link to sidebar"
  ```

---

## Task 5: Daily Attendance Page — Server Component + Client Shell

**Files to create:**
- `src/app/daily-attendance/page.tsx`
- `src/app/daily-attendance/components/DailyAttendanceManager.tsx`

### `src/app/daily-attendance/page.tsx`

- [ ] Create the server component following the same pattern as `src/app/commission/page.tsx`:

  ```tsx
  import { createClient } from '@/lib/supabase/server'
  import { redirect } from 'next/navigation'
  import { Employee } from '@/types'
  import DailyAttendanceManager from './components/DailyAttendanceManager'

  export default async function DailyAttendancePage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      redirect('/login')
    }

    const userId = user!.id

    const { data: profileData } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .maybeSingle()

    const profile = profileData as { company_id: string | null } | null
    const companyId = profile?.company_id
    if (!companyId) redirect('/login')

    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('company_id', companyId)
      .eq('worker_type', 'daily')
      .eq('is_active', true)
      .order('full_name')

    const workers: Employee[] = (data || []) as Employee[]

    return (
      <DailyAttendanceManager workers={workers} companyId={companyId} />
    )
  }
  ```

### `src/app/daily-attendance/components/DailyAttendanceManager.tsx`

- [ ] Create the client component shell (minimal — just renders the heading):

  ```tsx
  'use client';

  import { Employee } from '@/types';

  interface DailyAttendanceManagerProps {
    workers: Employee[];
    companyId: string;
  }

  export default function DailyAttendanceManager({ workers, companyId }: DailyAttendanceManagerProps) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900">Daily Attendance</h1>
      </div>
    );
  }
  ```

- [ ] Run type check:
  ```
  npx tsc --noEmit
  ```

- [ ] Commit:
  ```
  git add src/app/daily-attendance/page.tsx src/app/daily-attendance/components/DailyAttendanceManager.tsx
  git commit -m "feat(daily-attendance): add server page and client component shell"
  ```

---

## Task 6: Month Picker + Grid Skeleton

**Files to modify:** `src/app/daily-attendance/components/DailyAttendanceManager.tsx`

- [ ] Add imports at the top:
  ```tsx
  'use client';

  import { useState } from 'react';
  import { ChevronLeft, ChevronRight } from 'lucide-react';
  import { format } from 'date-fns';
  import { Employee } from '@/types';
  ```

- [ ] Add month/year state (default: current month/year):
  ```tsx
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed
  const [year, setYear] = useState(now.getFullYear());
  ```

- [ ] Add navigation helpers:
  ```tsx
  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else { setMonth(m => m - 1); }
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else { setMonth(m => m + 1); }
  };
  ```

- [ ] Compute days in month and today's date for comparison:
  ```tsx
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  ```

- [ ] Render header with month/year picker and grid table skeleton:
  ```tsx
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Daily Attendance</h1>
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={prevMonth} className="rounded p-1 hover:bg-gray-100">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium w-28 text-center">
            {format(new Date(year, month - 1, 1), 'MMMM yyyy')}
          </span>
          <button onClick={nextMonth} className="rounded p-1 hover:bg-gray-100">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white border border-gray-200 px-3 py-2 text-left font-medium text-gray-700 min-w-[140px]">
                Worker
              </th>
              {days.map(day => {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isToday = dateStr === todayStr;
                return (
                  <th
                    key={day}
                    className={`border border-gray-200 px-1 py-2 text-center font-medium w-12 ${
                      isToday ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600'
                    }`}
                  >
                    {day}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {workers.map(worker => (
              <tr key={worker.id}>
                <td className="sticky left-0 z-10 bg-white border border-gray-200 px-3 py-2 font-medium text-gray-900 whitespace-nowrap">
                  {worker.full_name}
                </td>
                {days.map(day => {
                  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isFuture = dateStr > todayStr;
                  return (
                    <td
                      key={day}
                      className={`border border-gray-200 w-12 h-10 text-center ${
                        isFuture ? 'bg-gray-50 opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'
                      }`}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
  ```

- [ ] Run type check:
  ```
  npx tsc --noEmit
  ```

- [ ] Commit:
  ```
  git add src/app/daily-attendance/components/DailyAttendanceManager.tsx
  git commit -m "feat(daily-attendance): add month picker and grid skeleton"
  ```

---

## Task 7: Attendance Data Fetching + Cell Rendering

**Files to modify:** `src/app/daily-attendance/components/DailyAttendanceManager.tsx`

- [ ] Add imports for `useEffect` and `DailyAttendance` type, and the Supabase client:
  ```tsx
  import { useState, useEffect } from 'react';
  import { createClient } from '@/lib/supabase/client';
  import { Employee, DailyAttendance } from '@/types';
  ```

- [ ] Add records and loading state:
  ```tsx
  const [records, setRecords] = useState<DailyAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient() as unknown as any;
  ```

- [ ] Add `useEffect` to fetch attendance data when month/year/companyId changes:
  ```tsx
  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
      const { data, error } = await supabase
        .from('daily_attendance')
        .select('*')
        .eq('company_id', companyId)
        .gte('date', firstDay)
        .lte('date', lastDay);
      if (!error) {
        setRecords((data || []) as DailyAttendance[]);
      }
      setLoading(false);
    };
    fetchRecords();
  }, [month, year, companyId]);
  ```

  Note: `daysInMonth` must be computed before the `useEffect` (it already is from Task 6). The ESLint `exhaustive-deps` rule may warn about `daysInMonth` — add it to the dependency array or suppress with a comment if needed.

- [ ] Build the lookup Map before the return statement:
  ```tsx
  const recordMap = new Map<string, DailyAttendance>();
  records.forEach(r => {
    recordMap.set(`${r.employee_id}_${r.date}`, r);
  });
  ```

- [ ] Update cell rendering in the table body to use the lookup map:
  ```tsx
  {days.map(day => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isFuture = dateStr > todayStr;
    const record = recordMap.get(`${worker.id}_${dateStr}`);
    const isPresent = !!record;

    return (
      <td
        key={day}
        className={`border border-gray-200 w-12 h-10 text-center text-xs ${
          isFuture
            ? 'bg-gray-50 opacity-40 cursor-not-allowed'
            : isPresent
            ? 'bg-green-100 cursor-pointer'
            : 'cursor-pointer hover:bg-gray-50'
        }`}
      >
        {isPresent && (
          <span className="text-green-800 font-medium leading-tight block">
            Rs.{record!.pay_amount}
          </span>
        )}
      </td>
    );
  })}
  ```

- [ ] Show a loading indicator when `loading` is true — add above the grid table:
  ```tsx
  {loading && (
    <p className="text-sm text-gray-500 mb-2">Loading attendance data...</p>
  )}
  ```

- [ ] Run type check:
  ```
  npx tsc --noEmit
  ```

- [ ] Commit:
  ```
  git add src/app/daily-attendance/components/DailyAttendanceManager.tsx
  git commit -m "feat(daily-attendance): fetch and render attendance records in grid"
  ```

---

## Task 8: Click Interactions — Mark Present + Edit Popup

**Files to modify:** `src/app/daily-attendance/components/DailyAttendanceManager.tsx`

- [ ] Add `editingCell` state and hours input state:
  ```tsx
  const [editingCell, setEditingCell] = useState<{
    worker: Employee;
    date: string;
    record: DailyAttendance;
  } | null>(null);
  const [editHours, setEditHours] = useState<string>('');
  ```

- [ ] Add `handleCellClick` function:
  ```tsx
  const handleCellClick = async (worker: Employee, dateStr: string) => {
    const isFuture = dateStr > todayStr;
    if (isFuture) return;

    const existingRecord = recordMap.get(`${worker.id}_${dateStr}`);

    if (existingRecord) {
      // Open edit popup
      setEditingCell({ worker, date: dateStr, record: existingRecord });
      setEditHours(String(existingRecord.hours_worked));
      return;
    }

    // Guard: validate daily_rate and standard_working_hours
    if (!worker.daily_rate || worker.daily_rate <= 0) {
      alert('This worker has no valid daily rate configured. Please edit the employee record first.');
      return;
    }
    if (!worker.standard_working_hours || worker.standard_working_hours <= 0) {
      alert('This worker has no valid standard working hours configured. Please edit the employee record first.');
      return;
    }

    // Mark present with full day pay
    const hours_worked = worker.standard_working_hours;
    const pay_amount = worker.daily_rate; // full day = daily_rate exactly

    const newRecord: Omit<DailyAttendance, 'id' | 'created_at'> = {
      company_id: companyId,
      employee_id: worker.id,
      date: dateStr,
      hours_worked,
      pay_amount,
    };

    // Optimistic update
    const optimisticRecord: DailyAttendance = {
      ...newRecord,
      id: `optimistic_${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setRecords(prev => [...prev, optimisticRecord]);

    const { data: upserted, error } = await supabase
      .from('daily_attendance')
      .upsert(newRecord, { onConflict: 'employee_id,date' })
      .select()
      .single();

    if (error) {
      alert(`Failed to save attendance: ${error.message}`);
      // Rollback optimistic update
      setRecords(prev => prev.filter(r => r.id !== optimisticRecord.id));
    } else if (upserted) {
      // Replace optimistic record with real one
      setRecords(prev =>
        prev.map(r => (r.id === optimisticRecord.id ? upserted as DailyAttendance : r))
      );
    }
  };
  ```

- [ ] Wire `handleCellClick` to each cell's `onClick` (only for non-future cells):
  ```tsx
  onClick={isFuture ? undefined : () => handleCellClick(worker, dateStr)}
  ```

- [ ] Add `handleEditSave` function:
  ```tsx
  const handleEditSave = async () => {
    if (!editingCell) return;
    const { worker, date, record } = editingCell;

    const hours_worked = parseFloat(editHours);
    if (isNaN(hours_worked) || hours_worked <= 0) {
      alert('Hours must be a positive number.');
      return;
    }
    if (!worker.daily_rate || !worker.standard_working_hours) return;

    const hourly_rate = worker.daily_rate / worker.standard_working_hours;
    const pay_amount = parseFloat((hours_worked * hourly_rate).toFixed(2));

    const { data: upserted, error } = await supabase
      .from('daily_attendance')
      .upsert(
        { company_id: companyId, employee_id: worker.id, date, hours_worked, pay_amount },
        { onConflict: 'employee_id,date' }
      )
      .select()
      .single();

    if (error) {
      alert(`Failed to update: ${error.message}`);
      return;
    }

    if (upserted) {
      setRecords(prev =>
        prev.map(r => (r.id === record.id ? (upserted as DailyAttendance) : r))
      );
    }
    setEditingCell(null);
  };
  ```

- [ ] Add `handleEditRemove` function:
  ```tsx
  const handleEditRemove = async () => {
    if (!editingCell) return;
    const { record } = editingCell;

    const { error } = await supabase
      .from('daily_attendance')
      .delete()
      .eq('id', record.id);

    if (error) {
      alert(`Failed to remove: ${error.message}`);
      return;
    }

    setRecords(prev => prev.filter(r => r.id !== record.id));
    setEditingCell(null);
  };
  ```

- [ ] Add the edit popup JSX (fixed position, rendered conditionally outside the table, inside the return):
  ```tsx
  {editingCell && (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/30 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl p-6 mb-4">
        <h3 className="text-base font-semibold text-gray-900 mb-1">
          {editingCell.worker.full_name}
        </h3>
        <p className="text-sm text-gray-500 mb-4">{editingCell.date}</p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Hours Worked</label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            max="24"
            value={editHours}
            onChange={e => setEditHours(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleEditSave}
            className="flex-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Save
          </button>
          <button
            onClick={handleEditRemove}
            className="flex-1 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Remove
          </button>
          <button
            onClick={() => setEditingCell(null)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )}
  ```

- [ ] Run type check:
  ```
  npx tsc --noEmit
  ```

- [ ] Commit:
  ```
  git add src/app/daily-attendance/components/DailyAttendanceManager.tsx
  git commit -m "feat(daily-attendance): implement cell click interactions and edit popup"
  ```

---

## Task 9: Monthly Summary Table

**Files to modify:** `src/app/daily-attendance/components/DailyAttendanceManager.tsx`

- [ ] Compute per-worker summary totals (before the return statement, using the existing `records` state):
  ```tsx
  const workerSummaries = workers.map(worker => {
    const workerRecords = records.filter(r => r.employee_id === worker.id);
    const days_present = workerRecords.length;
    const total_hours = workerRecords.reduce((sum, r) => sum + r.hours_worked, 0);
    const total_pay = workerRecords.reduce((sum, r) => sum + r.pay_amount, 0);
    return { worker, days_present, total_hours, total_pay };
  });

  const grandTotalPay = workerSummaries.reduce((sum, s) => sum + s.total_pay, 0);
  ```

- [ ] Render summary table below the grid (inside the return, after the grid `</div>`):
  ```tsx
  {/* Monthly Summary */}
  <div className="mt-8">
    <h2 className="text-lg font-semibold text-gray-900 mb-3">Monthly Summary</h2>
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-2 px-4 text-left font-medium text-gray-700">Worker Name</th>
            <th className="py-2 px-4 text-right font-medium text-gray-700">Days Present</th>
            <th className="py-2 px-4 text-right font-medium text-gray-700">Total Hours</th>
            <th className="py-2 px-4 text-right font-medium text-gray-700">Total Pay</th>
          </tr>
        </thead>
        <tbody>
          {workerSummaries.map(({ worker, days_present, total_hours, total_pay }) => (
            <tr key={worker.id} className="border-b border-gray-100">
              <td className="py-2 px-4 text-gray-900">{worker.full_name}</td>
              <td className="py-2 px-4 text-right text-gray-700">{days_present}</td>
              <td className="py-2 px-4 text-right text-gray-700">{total_hours.toFixed(1)}h</td>
              <td className="py-2 px-4 text-right text-gray-900 font-medium">
                Rs. {total_pay.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
            <td className="py-2 px-4 text-gray-900">Total</td>
            <td className="py-2 px-4 text-right text-gray-700">—</td>
            <td className="py-2 px-4 text-right text-gray-700">—</td>
            <td className="py-2 px-4 text-right text-gray-900">
              Rs. {grandTotalPay.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
  ```

- [ ] Run type check:
  ```
  npx tsc --noEmit
  ```

- [ ] Commit:
  ```
  git add src/app/daily-attendance/components/DailyAttendanceManager.tsx
  git commit -m "feat(daily-attendance): add monthly summary table"
  ```

---

## Task 10: End-to-End Verification (Manual)

- [ ] Start the dev server: `npm run dev`
- [ ] Navigate to `/employees` and add a new daily worker:
  - Set Worker Type to "Daily"
  - Enter a Daily Rate (e.g., 400)
  - Enter Working Hours/Day (e.g., 8)
  - Save
- [ ] Verify the new daily worker appears in the employees list with worker type "daily".
- [ ] Navigate to `/daily-attendance` via the sidebar link.
- [ ] Verify the grid shows the current month with the daily worker's row.
- [ ] Click an empty past cell — verify it turns green and shows `Rs. 400.00`.
- [ ] Click the green cell — verify the edit popup opens with hours pre-filled.
- [ ] Change hours to `4` and click Save — verify the cell updates to show `Rs. 200.00` (half day).
- [ ] Click the cell again and click Remove — verify the cell returns to white (absent).
- [ ] Verify the Monthly Summary table updates correctly after each interaction.
- [ ] Navigate to `/reports` — verify the daily worker does NOT appear in payroll reports.
- [ ] Navigate between months using prev/next arrows — verify future days are greyed out.
