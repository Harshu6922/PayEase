# Commission System — Sub-project 1: Foundation Design

**Date:** 2026-03-18
**Status:** Approved
**Sub-project:** 1 of 3 (Foundation — schema + item catalog + rate assignment)

---

## Overview

Add the data foundation and management UI for a per-piece commission system. Commission agents earn money by recording quantities of items they work on each day, with a custom rate per item per agent.

This sub-project covers:
- DB schema (4 changes)
- `worker_type` on employees (salaried vs commission)
- `/commission` page — company item catalog
- Employee detail page — agent-item rate assignment

Sub-projects 2 (Work Entry) and 3 (Payroll Integration) build on top of this.

---

## 1. Database Schema

### 1.1 Add `worker_type` to `employees`

```sql
ALTER TABLE public.employees
  ADD COLUMN worker_type TEXT NOT NULL DEFAULT 'salaried'
  CHECK (worker_type IN ('salaried', 'commission'));
```

All existing employees default to `'salaried'`. The TypeScript `Employee` interface gains `worker_type: 'salaried' | 'commission'`.

### 1.2 `commission_items` table

Company-scoped catalog of items agents can work on.

```sql
CREATE TABLE public.commission_items (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  default_rate  NUMERIC(10,2),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);
```

### 1.3 `agent_item_rates` table

Per-agent custom commission rates. Each row links one employee to one item with a specific rate.

```sql
CREATE TABLE public.agent_item_rates (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id      UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  item_id          UUID NOT NULL REFERENCES public.commission_items(id) ON DELETE CASCADE,
  commission_rate  NUMERIC(10,2) NOT NULL CHECK (commission_rate >= 0),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, item_id)
);
```

### 1.4 `work_entries` table

Daily quantity records. `rate` is snapshotted at entry time so historical records are unaffected by rate changes.

```sql
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
```

---

## 2. TypeScript Types

Add to `src/types/index.ts`:

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
  // joined
  commission_items?: Pick<CommissionItem, 'id' | 'name' | 'default_rate'>;
}

export interface WorkEntry {
  id: string;
  employee_id: string;
  company_id: string;
  date: string;             // 'YYYY-MM-DD'
  item_id: string;
  quantity: number;
  rate: number;             // snapshotted
  total_amount: number;     // generated column: quantity × rate
  created_at: string;
}
```

Also extend `Employee`:
```ts
worker_type: 'salaried' | 'commission';
```

---

## 3. `/commission` Page — Item Catalog

**Route:** `src/app/commission/page.tsx` (server component, same auth pattern as other pages)

**Sidebar:** Add "Commission" nav item in `src/components/Sidebar.tsx`

### 3.1 Page layout

- Page title: "Commission Items"
- "Add Item" button (top right)
- Table with columns: **Name**, **Default Rate**, **Actions**
- Default rate shown as "₹X.XX/piece" or "—" if null
- Actions: Edit (pencil icon), Delete (trash icon)

### 3.2 Add Item modal (`AddCommissionItemModal.tsx`)

Fields:
- **Name** — text input, required
- **Default Rate** — numeric input, optional (hint: "Used to pre-fill agent rate assignments")

On save: `INSERT INTO commission_items (company_id, name, default_rate)`

Validation:
- Name required, non-empty
- Default rate ≥ 0 if provided

### 3.3 Edit Item modal (`EditCommissionItemModal.tsx`)

Same fields as Add, pre-filled. On save: `UPDATE commission_items SET name, default_rate WHERE id`.

### 3.4 Delete

Show confirmation dialog. Block delete if the item has any rows in `agent_item_rates` — show error: "This item is assigned to agents. Remove all assignments before deleting."

Check: `SELECT COUNT(*) FROM agent_item_rates WHERE item_id = ?`

---

## 4. Employee Detail Page — Rate Assignment

**Route:** `src/app/employees/[id]/page.tsx`

### 4.1 Worker Type in Add/Edit modals

`AddEmployeeModal.tsx` and `EditEmployeeModal.tsx` gain a **Worker Type** field:
- Radio group or select: `Salaried` / `Commission`
- Default: `Salaried`
- Stored as `worker_type` on the employees record

### 4.2 Commission Items section on employee detail page

Shown only when `employee.worker_type === 'commission'`.

**Section header:** "Commission Items"
**"Assign Item" button** → `AssignItemModal.tsx`

**Assigned items table** — columns: **Item Name**, **Rate (₹/piece)**, **Actions**
Actions: Edit rate (pencil), Remove (trash)

### 4.3 Assign Item modal (`AssignItemModal.tsx`)

Fields:
- **Item** — dropdown of `commission_items` for the company, excluding already-assigned items
- **Rate** — numeric input, pre-filled with `default_rate` if available, required, ≥ 0

On save: `INSERT INTO agent_item_rates (employee_id, item_id, commission_rate)`

### 4.4 Edit Rate modal (`EditAgentRateModal.tsx`)

Single field: **Rate** (pre-filled with current `commission_rate`).
On save: `UPDATE agent_item_rates SET commission_rate WHERE id`

### 4.5 Remove assignment

Confirmation dialog. Deletes the `agent_item_rates` row. Does NOT touch `work_entries` (historical data preserved).

---

## 5. Architecture

| File | Action | Responsibility |
|------|--------|----------------|
| `sql/03-commission.sql` | Create | Migration SQL for all 4 schema changes |
| `src/types/index.ts` | Modify | Add `CommissionItem`, `AgentItemRate`, `WorkEntry`; extend `Employee` |
| `src/components/Sidebar.tsx` | Modify | Add "Commission" nav link |
| `src/app/commission/page.tsx` | Create | Server component — item catalog page |
| `src/app/commission/components/AddCommissionItemModal.tsx` | Create | Add item modal |
| `src/app/commission/components/EditCommissionItemModal.tsx` | Create | Edit item modal |
| `src/app/employees/[id]/page.tsx` | Modify | Add commission items section |
| `src/app/employees/[id]/components/AssignItemModal.tsx` | Create | Assign item to agent modal |
| `src/app/employees/[id]/components/EditAgentRateModal.tsx` | Create | Edit agent rate modal |
| `src/app/employees/components/AddEmployeeModal.tsx` | Modify | Add worker_type field |
| `src/app/employees/components/EditEmployeeModal.tsx` | Modify | Add worker_type field |

---

## 6. Validation Rules

| Rule | Where enforced |
|------|---------------|
| Item name required | AddCommissionItemModal, EditCommissionItemModal |
| Default rate ≥ 0 | AddCommissionItemModal, EditCommissionItemModal |
| Commission rate required, ≥ 0 | AssignItemModal, EditAgentRateModal |
| Delete blocked if item has assignments | Commission page delete handler |
| worker_type defaults to 'salaried' | DB default + modal default |
| No duplicate item names per company | DB UNIQUE constraint |
| No duplicate item per agent | DB UNIQUE constraint on agent_item_rates |

---

## 7. Out of Scope (handled in later sub-projects)

- Work entry UI (daily quantity input) — Sub-project 2
- Payroll dashboard integration — Sub-project 3
- Tiered pricing, bonuses — future
