# Commission Foundation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the database schema, TypeScript types, item catalog page, and employee rate-assignment UI that form the foundation for the per-piece commission system.

**Architecture:** Four tasks build upward: DB schema first (manual SQL), then types, then the `/commission` item catalog page with CRUD modals, then worker-type fields in employee modals, then the agent rate-assignment section on the employee detail page. No server actions — all writes go through the existing Supabase browser client using the same pattern as other modals (`createClient() as unknown as SupabaseClient<Database>`).

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Supabase browser client, Tailwind CSS, lucide-react

**Spec:** `docs/superpowers/specs/2026-03-18-commission-foundation-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `sql/03-commission.sql` | Migration: `worker_type` alter + 3 new tables + RLS |
| Modify | `src/types/index.ts` | Add `CommissionItem`, `AgentItemRate`, `WorkEntry`; extend `Employee` |
| Modify | `src/components/Sidebar.tsx` | Add "Commission" nav link |
| Create | `src/app/commission/page.tsx` | Server component — item catalog |
| Create | `src/app/commission/components/AddCommissionItemModal.tsx` | Add item modal |
| Create | `src/app/commission/components/EditCommissionItemModal.tsx` | Edit item modal |
| Modify | `src/app/employees/components/AddEmployeeModal.tsx` | Add `worker_type` select field |
| Modify | `src/app/employees/components/EditEmployeeModal.tsx` | Add `worker_type` select field |
| Modify | `src/app/employees/[id]/page.tsx` | Conditionally render commission items section |
| Create | `src/app/employees/[id]/components/AssignItemModal.tsx` | Assign item to agent modal |
| Create | `src/app/employees/[id]/components/EditAgentRateModal.tsx` | Edit agent's commission rate modal |

---

## Task 1: DB Migration

**Files:**
- Create: `sql/03-commission.sql`

This task is manual — you run the SQL directly in the Supabase SQL editor (Dashboard → SQL Editor). There is nothing to commit until after you verify the tables exist.

- [ ] **Step 1: Create `sql/03-commission.sql`**

```sql
-- ─────────────────────────────────────────────────────────────
-- 1. Add worker_type to employees
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.employees
  ADD COLUMN worker_type TEXT NOT NULL DEFAULT 'salaried'
  CHECK (worker_type IN ('salaried', 'commission'));

-- ─────────────────────────────────────────────────────────────
-- 2. commission_items — company item catalog
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.commission_items (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id   UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  default_rate NUMERIC(10,2),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

ALTER TABLE public.commission_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company admins manage commission items"
ON public.commission_items FOR ALL TO authenticated
USING (company_id = get_my_company_id())
WITH CHECK (company_id = get_my_company_id());

-- ─────────────────────────────────────────────────────────────
-- 3. agent_item_rates — per-agent custom rates
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.agent_item_rates (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  item_id         UUID NOT NULL REFERENCES public.commission_items(id) ON DELETE CASCADE,
  commission_rate NUMERIC(10,2) NOT NULL CHECK (commission_rate >= 0),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, item_id)
);

ALTER TABLE public.agent_item_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company admins manage agent item rates"
ON public.agent_item_rates FOR ALL TO authenticated
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE company_id = get_my_company_id()
  )
)
WITH CHECK (
  employee_id IN (
    SELECT id FROM public.employees WHERE company_id = get_my_company_id()
  )
);

-- ─────────────────────────────────────────────────────────────
-- 4. work_entries — daily quantity records
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.work_entries (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id  UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id   UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  item_id      UUID NOT NULL REFERENCES public.commission_items(id),
  quantity     NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  rate         NUMERIC(10,2) NOT NULL CHECK (rate >= 0),
  total_amount NUMERIC(12,2) GENERATED ALWAYS AS (quantity * rate) STORED,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, item_id, date)
);

ALTER TABLE public.work_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company admins manage work entries"
ON public.work_entries FOR ALL TO authenticated
USING (company_id = get_my_company_id())
WITH CHECK (company_id = get_my_company_id());
```

- [ ] **Step 2: Run the migration in Supabase**

1. Open your Supabase project → SQL Editor
2. Paste the full contents of `sql/03-commission.sql`
3. Click **Run**
4. Expected: No errors. You should see the new columns/tables in Table Editor.

- [ ] **Step 3: Verify the schema**

In the Supabase Table Editor, confirm:
- `employees` table has a new `worker_type` column (default `salaried`)
- `commission_items` table exists with columns: `id, company_id, name, default_rate, created_at`
- `agent_item_rates` table exists with columns: `id, employee_id, item_id, commission_rate, created_at`
- `work_entries` table exists with columns: `id, employee_id, company_id, date, item_id, quantity, rate, total_amount, created_at`

- [ ] **Step 4: Commit the SQL file**

```bash
cd "C:\Users\Lenovo\.gemini\antigravity\scratch\payroll-app"
git add sql/03-commission.sql
git commit -m "feat: add commission schema migration SQL"
```

---

## Task 2: TypeScript Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Extend `Employee` with `worker_type`**

In `src/types/index.ts`, find the `Employee` interface and add one line — `worker_type` — after `is_active`:

```ts
  is_active: boolean;
  worker_type: 'salaried' | 'commission';
```

Do NOT replace the whole interface — just insert that one line. Do NOT add `created_at?: string` (it is not in the existing type).

- [ ] **Step 2: Add the three new interfaces**

At the end of `src/types/index.ts`, append:

```ts
export interface CommissionItem {
  id: string;
  company_id: string;
  name: string;
  default_rate: number | null;
  created_at: string;
}

export interface AgentItemRate {
  id: string;
  employee_id: string;
  item_id: string;
  commission_rate: number;
  created_at: string;
  commission_items?: Pick<CommissionItem, 'id' | 'name' | 'default_rate'>;
}

export interface WorkEntry {
  id: string;
  employee_id: string;
  company_id: string;
  date: string;           // 'YYYY-MM-DD'
  item_id: string;
  quantity: number;
  rate: number;           // snapshotted at entry time
  total_amount: number;   // generated column: quantity × rate
  created_at: string;
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd "C:\Users\Lenovo\.gemini\antigravity\scratch\payroll-app"
npx tsc --noEmit
```

Expected: No errors. If you see errors about `worker_type` being missing (e.g. in `EditEmployeeModal`), that's expected — they'll be fixed in Tasks 4 and 5.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add CommissionItem, AgentItemRate, WorkEntry types; extend Employee with worker_type"
```

---

## Task 3: Sidebar Navigation

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Add `Tag` to the lucide-react import and add the nav entry**

In `src/components/Sidebar.tsx`:

Replace:
```ts
import {
  Users,
  CalendarCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  Banknote
} from 'lucide-react'
```

With:
```ts
import {
  Users,
  CalendarCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  Banknote,
  Tag
} from 'lucide-react'
```

Then replace the `navigation` array:
```ts
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Employees', href: '/employees', icon: Users },
  { name: 'Attendance', href: '/attendance', icon: CalendarCheck },
  { name: 'Advances', href: '/advances', icon: Banknote },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Commission', href: '/commission', icon: Tag },
]
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: add Commission link to sidebar navigation"
```

---

## Task 4: Commission Items Page + Modals

**Files:**
- Create: `src/app/commission/page.tsx`
- Create: `src/app/commission/components/AddCommissionItemModal.tsx`
- Create: `src/app/commission/components/EditCommissionItemModal.tsx`

**Important:** Create the modal components BEFORE the page that imports them, so TypeScript is always valid after each file is saved.

### Step 1: Create `AddCommissionItemModal.tsx`

- [ ] **Step 1: Create `src/app/commission/components/AddCommissionItemModal.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Plus, X } from 'lucide-react';
import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

interface Props {
  companyId: string;
}

export default function AddCommissionItemModal({ companyId }: Props) {
  const router = useRouter();
  const supabase = createClient() as unknown as SupabaseClient<Database>;
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [defaultRate, setDefaultRate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('commission_items')
        .insert({
          company_id: companyId,
          name: name.trim(),
          default_rate: defaultRate !== '' ? parseFloat(defaultRate) : null,
        });

      if (insertError) throw new Error(insertError.message);

      setIsOpen(false);
      setName('');
      setDefaultRate('');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
      >
        <Plus className="h-4 w-4" />
        Add Item
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Add Commission Item</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Item Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Default Rate (₹/piece) <span className="text-gray-400 font-normal">— optional</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={defaultRate}
                  onChange={e => setDefaultRate(e.target.value)}
                  placeholder="e.g. 12.50"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-400">Used to pre-fill agent rate assignments.</p>
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
```

### Step 2: Create `EditCommissionItemModal.tsx`

- [ ] **Step 2: Create `src/app/commission/components/EditCommissionItemModal.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Pencil, X } from 'lucide-react';
import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CommissionItem } from '@/types';

interface Props {
  item: CommissionItem;
}

export default function EditCommissionItemModal({ item }: Props) {
  const router = useRouter();
  const supabase = createClient() as unknown as SupabaseClient<Database>;
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(item.name);
  const [defaultRate, setDefaultRate] = useState(
    item.default_rate !== null ? String(item.default_rate) : ''
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('commission_items')
        .update({
          name: name.trim(),
          default_rate: defaultRate !== '' ? parseFloat(defaultRate) : null,
        })
        .eq('id', item.id);

      if (updateError) throw new Error(updateError.message);

      setIsOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-indigo-600 hover:text-indigo-900"
        title="Edit item"
      >
        <Pencil className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Edit Commission Item</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Item Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Default Rate (₹/piece) <span className="text-gray-400 font-normal">— optional</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={defaultRate}
                  onChange={e => setDefaultRate(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Update Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
```

### Step 3: Create `DeleteCommissionItem.tsx`

- [ ] **Step 3: Create `src/app/commission/components/DeleteCommissionItem.tsx`**

(Created before `page.tsx` so the page's import resolves immediately.)

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Trash2 } from 'lucide-react';
import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

interface Props {
  itemId: string;
  itemName: string;
}

export default function DeleteCommissionItem({ itemId, itemName }: Props) {
  const router = useRouter();
  const supabase = createClient() as unknown as SupabaseClient<Database>;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!confirm(`Delete "${itemName}"? This cannot be undone.`)) return;

    setLoading(true);
    setError(null);

    try {
      // Block delete if any agent is assigned to this item
      const { count } = await supabase
        .from('agent_item_rates')
        .select('id', { count: 'exact', head: true })
        .eq('item_id', itemId);

      if ((count ?? 0) > 0) {
        setError('This item is assigned to agents. Remove all assignments before deleting.');
        return;
      }

      const { error: deleteError } = await supabase
        .from('commission_items')
        .delete()
        .eq('id', itemId);

      if (deleteError) throw new Error(deleteError.message);

      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleDelete}
        disabled={loading}
        className="text-red-400 hover:text-red-600 disabled:opacity-40"
        title="Delete item"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      {error && <p className="text-xs text-red-600 max-w-xs text-right">{error}</p>}
    </div>
  );
}
```

### Step 4: Create `commission/page.tsx`

- [ ] **Step 4: Create `src/app/commission/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { formatINR } from '@/lib/payroll-utils';
import type { CommissionItem } from '@/types';
import AddCommissionItemModal from './components/AddCommissionItemModal';
import EditCommissionItemModal from './components/EditCommissionItemModal';
import DeleteCommissionItem from './components/DeleteCommissionItem';

export default async function CommissionPage() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle();

  const companyId = profile?.company_id;
  if (!companyId) {
    return <div className="p-8 text-red-600">No company associated with this profile.</div>;
  }

  const { data: items } = await supabase
    .from('commission_items')
    .select('*')
    .eq('company_id', companyId)
    .order('name', { ascending: true });

  const commissionItems = (items || []) as CommissionItem[];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commission Items</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage the item catalog for commission-based agents.
          </p>
        </div>
        <AddCommissionItemModal companyId={companyId} />
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Default Rate</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {commissionItems.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-500">
                  No commission items yet. Add your first item to get started.
                </td>
              </tr>
            ) : (
              commissionItems.map(item => (
                <tr key={item.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {item.name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
                    {item.default_rate !== null ? `${formatINR(item.default_rate)}/piece` : '—'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-3">
                      <EditCommissionItemModal item={item} />
                      <DeleteCommissionItem itemId={item.id} itemName={item.name} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Run tests**

```bash
npm test
```

Expected: All existing tests still pass (no regressions).

- [ ] **Step 7: Commit**

```bash
git add src/app/commission/
git commit -m "feat: add Commission items page with add/edit/delete modals"
```

---

## Task 5: Worker Type in Employee Modals

**Files:**
- Modify: `src/app/employees/components/AddEmployeeModal.tsx`
- Modify: `src/app/employees/components/EditEmployeeModal.tsx`

- [ ] **Step 1: Add `worker_type` to `AddEmployeeModal`**

In `src/app/employees/components/AddEmployeeModal.tsx`:

**A.** In the `formData` initial state (after `is_active: true`), add:
```ts
    worker_type: 'salaried',
```

`worker_type` is stored as a plain `string` in `formData` (same pattern as `monthly_salary` which is stored as a string and parsed on submit). This avoids TypeScript strict errors in `handleChange` where the generic `[name]: value` assignment requires `string` compatibility.

**B.** In the `supabase.from('employees').insert({...})` call, add:
```ts
        worker_type: formData.worker_type as 'salaried' | 'commission',
```

**C.** In the form JSX, before the `is_active` checkbox block, add a Worker Type field:
```tsx
                <div>
                  <label className="block text-sm font-medium text-gray-700">Worker Type</label>
                  <select
                    name="worker_type"
                    value={formData.worker_type}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="salaried">Salaried</option>
                    <option value="commission">Commission</option>
                  </select>
                </div>
```

Also reset `worker_type` in the success reset block:
```ts
    worker_type: 'salaried',
```

- [ ] **Step 2: Add `worker_type` to `EditEmployeeModal`**

In `src/app/employees/components/EditEmployeeModal.tsx`:

**A.** The modal receives an `employee: Employee` prop — `worker_type` is now on that type. In the `formData` initial state, add:
```ts
    worker_type: employee.worker_type ?? 'salaried',
```

`worker_type` is stored as a plain `string` in `formData` (same reason as AddEmployeeModal — avoids `handleChange` type errors).

**B.** In the `.update({...})` call, add:
```ts
          worker_type: formData.worker_type as 'salaried' | 'commission',
```

**C.** In the form JSX, before the `is_active` checkbox block, add the same Worker Type select as in AddEmployeeModal:
```tsx
                <div>
                  <label className="block text-sm font-medium text-gray-700">Worker Type</label>
                  <select
                    name="worker_type"
                    value={formData.worker_type}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="salaried">Salaried</option>
                    <option value="commission">Commission</option>
                  </select>
                </div>
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/employees/components/AddEmployeeModal.tsx src/app/employees/components/EditEmployeeModal.tsx
git commit -m "feat: add worker_type field to add/edit employee modals"
```

---

## Task 6: Employee Detail Page — Commission Items Section

**Files:**
- Modify: `src/app/employees/[id]/page.tsx`
- Create: `src/app/employees/[id]/components/AssignItemModal.tsx`
- Create: `src/app/employees/[id]/components/EditAgentRateModal.tsx`

### Step 1: Create `AssignItemModal.tsx`

- [ ] **Step 1: Create `src/app/employees/[id]/components/AssignItemModal.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Plus, X } from 'lucide-react';
import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CommissionItem } from '@/types';

interface Props {
  employeeId: string;
  availableItems: CommissionItem[]; // items not yet assigned to this employee
}

export default function AssignItemModal({ employeeId, availableItems }: Props) {
  const router = useRouter();
  const supabase = createClient() as unknown as SupabaseClient<Database>;
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [rate, setRate] = useState('');

  // When user picks an item, pre-fill rate with its default_rate if available
  const handleItemChange = (itemId: string) => {
    setSelectedItemId(itemId);
    const item = availableItems.find(i => i.id === itemId);
    if (item?.default_rate !== null && item?.default_rate !== undefined) {
      setRate(String(item.default_rate));
    } else {
      setRate('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || rate === '') return;
    setLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('agent_item_rates')
        .insert({
          employee_id: employeeId,
          item_id: selectedItemId,
          commission_rate: parseFloat(rate),
        });

      if (insertError) throw new Error(insertError.message);

      setIsOpen(false);
      setSelectedItemId('');
      setRate('');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (availableItems.length === 0) return null; // No items left to assign

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
      >
        <Plus className="h-4 w-4" />
        Assign Item
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Assign Commission Item</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Item</label>
                <select
                  required
                  value={selectedItemId}
                  onChange={e => handleItemChange(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select item…</option>
                  {availableItems.map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Rate (₹/piece)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={rate}
                  onChange={e => setRate(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
```

### Step 2: Create `EditAgentRateModal.tsx`

- [ ] **Step 2: Create `src/app/employees/[id]/components/EditAgentRateModal.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Pencil, X } from 'lucide-react';
import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

interface Props {
  rateId: string;
  itemName: string;
  currentRate: number;
}

export default function EditAgentRateModal({ rateId, itemName, currentRate }: Props) {
  const router = useRouter();
  const supabase = createClient() as unknown as SupabaseClient<Database>;
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rate, setRate] = useState(String(currentRate));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('agent_item_rates')
        .update({ commission_rate: parseFloat(rate) })
        .eq('id', rateId);

      if (updateError) throw new Error(updateError.message);

      setIsOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-indigo-600 hover:text-indigo-900"
        title="Edit rate"
      >
        <Pencil className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Edit Rate — {itemName}</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Rate (₹/piece)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={rate}
                  onChange={e => setRate(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Update Rate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
```

### Step 3: Create `RemoveAgentRate.tsx`

- [ ] **Step 3: Create `src/app/employees/[id]/components/RemoveAgentRate.tsx`**

(Created before the page modification so the import resolves immediately.)

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Trash2 } from 'lucide-react';
import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

interface Props {
  rateId: string;
  itemName: string;
}

export default function RemoveAgentRate({ rateId, itemName }: Props) {
  const router = useRouter();
  const supabase = createClient() as unknown as SupabaseClient<Database>;
  const [loading, setLoading] = useState(false);

  const handleRemove = async () => {
    if (!confirm(`Remove "${itemName}" from this agent? Historical work entries will be preserved.`)) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('agent_item_rates')
        .delete()
        .eq('id', rateId);

      if (error) throw error;
      router.refresh();
    } catch {
      alert('Failed to remove assignment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleRemove}
      disabled={loading}
      className="text-red-400 hover:text-red-600 disabled:opacity-40"
      title="Remove assignment"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
```

### Step 4: Modify the employee detail page

- [ ] **Step 4: Modify `src/app/employees/[id]/page.tsx`**

**A.** Add imports at the top (after existing imports):
```tsx
import type { AgentItemRate, CommissionItem } from '@/types';
import AssignItemModal from './components/AssignItemModal';
import EditAgentRateModal from './components/EditAgentRateModal';
import RemoveAgentRate from './components/RemoveAgentRate';
```

**B.** At the TOP of the function (right after the `employee` null check, before any other fetches), add the company_id lookup unconditionally:

```tsx
  // Fetch company_id once — needed for commission items fetch
  const { data: { user: pageUser }, error: pageAuthError } = await supabase.auth.getUser();
  let pageCompanyId: string | null = null;
  if (!pageAuthError && pageUser) {
    const { data: pageProfile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', pageUser.id)
      .maybeSingle();
    pageCompanyId = pageProfile?.company_id ?? null;
  }
```

**C.** After the advances fetch block (after `const totalAdvances = ...`), add two new fetches that USE `pageCompanyId`:

```tsx
  // 5. If commission agent: fetch assigned rates + all company items (for AssignItemModal)
  let assignedRates: AgentItemRate[] = [];
  let allCompanyItems: CommissionItem[] = [];

  if (employee.worker_type === 'commission') {
    const { data: ratesRaw } = await supabase
      .from('agent_item_rates')
      .select('*, commission_items(id, name, default_rate)')
      .eq('employee_id', employee.id)
      .order('created_at', { ascending: true });

    assignedRates = (ratesRaw || []) as AgentItemRate[];

    if (pageCompanyId) {
      const { data: itemsRaw } = await supabase
        .from('commission_items')
        .select('*')
        .eq('company_id', pageCompanyId)
        .order('name', { ascending: true });
      allCompanyItems = (itemsRaw || []) as CommissionItem[];
    }
  }
```

**D.** Compute `availableItems` (items not yet assigned):

```tsx
  const assignedItemIds = new Set(assignedRates.map(r => r.item_id));
  const availableItems = allCompanyItems.filter(i => !assignedItemIds.has(i.id));
```

**E.** Add the Commission Items section at the end of the returned JSX, just before the final closing `</div>`:

```tsx
      {/* 6. Commission Items — only for commission agents */}
      {employee.worker_type === 'commission' && (
        <>
          <div className="flex items-center justify-between mt-12 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Commission Items</h2>
            <AssignItemModal employeeId={employee.id} availableItems={availableItems} />
          </div>

          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rate (₹/piece)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {assignedRates.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-500">
                      No commission items assigned. Click "Assign Item" to add one.
                    </td>
                  </tr>
                ) : (
                  assignedRates.map(rate => (
                    <tr key={rate.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {rate.commission_items?.name ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-700">
                        ₹{rate.commission_rate}/piece
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                        <div className="flex items-center justify-end gap-3">
                          <EditAgentRateModal
                            rateId={rate.id}
                            itemName={rate.commission_items?.name ?? ''}
                            currentRate={rate.commission_rate}
                          />
                          <RemoveAgentRate rateId={rate.id} itemName={rate.commission_items?.name ?? ''} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Run tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/app/employees/
git commit -m "feat: add commission items section to employee detail page"
```

---

## Task 7: End-to-End Verification (Manual)

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify Commission page**
1. Navigate to `/commission` in your app
2. Sidebar shows "Commission" link (active when on this page)
3. Click **Add Item** — add an item named "Stitching" with rate 12.50
4. Item appears in the table with "₹12.50/piece"
5. Click the pencil icon — edit the rate to 15.00, save — table updates
6. Click trash icon on an item with no assignments — it deletes
7. Click trash icon on an item that HAS an assignment — error message appears

- [ ] **Step 3: Verify worker type in employee modals**
1. Navigate to `/employees`
2. Click **Add Employee** — "Worker Type" dropdown shows Salaried/Commission (defaults to Salaried)
3. Add a new employee with Worker Type = Commission
4. Click **Edit** on an existing employee — Worker Type field is visible and reflects current value

- [ ] **Step 4: Verify commission items on employee detail page**
1. Click on a commission-type employee's name → goes to `/employees/[id]`
2. Bottom of page shows "Commission Items" section with "Assign Item" button
3. Click **Assign Item** — dropdown shows items from catalog, rate pre-fills from default_rate
4. Assign an item and save — appears in table
5. Edit the rate — updates immediately
6. Remove assignment — row disappears
7. On a **salaried** employee's detail page — Commission Items section is NOT visible

- [ ] **Step 5: Final TypeScript + tests**

```bash
npx tsc --noEmit && npm test
```

Expected: No errors, all tests pass.
