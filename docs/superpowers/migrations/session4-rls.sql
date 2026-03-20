-- ════════════════════════════════════════════════════════════
-- SESSION 4 RLS MIGRATION
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ════════════════════════════════════════════════════════════

-- ── 1. profiles: add CHECK constraint + full_name column ──
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'viewer'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- ── 2. Helper: get_my_role() — SECURITY DEFINER to avoid RLS recursion ──
CREATE OR REPLACE FUNCTION get_my_role() RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_catalog;

-- ── 3. New tables: enable RLS + role-aware policies ──

-- payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_read"   ON payments FOR SELECT USING (company_id = get_my_company_id());
CREATE POLICY "payments_insert" ON payments FOR INSERT WITH CHECK (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "payments_update" ON payments FOR UPDATE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "payments_delete" ON payments FOR DELETE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');

-- advance_repayments
ALTER TABLE advance_repayments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "advance_repayments_read"   ON advance_repayments FOR SELECT USING (company_id = get_my_company_id());
CREATE POLICY "advance_repayments_insert" ON advance_repayments FOR INSERT WITH CHECK (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "advance_repayments_update" ON advance_repayments FOR UPDATE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "advance_repayments_delete" ON advance_repayments FOR DELETE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');

-- expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_read"   ON expenses FOR SELECT USING (company_id = get_my_company_id());
CREATE POLICY "expenses_insert" ON expenses FOR INSERT WITH CHECK (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "expenses_update" ON expenses FOR UPDATE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "expenses_delete" ON expenses FOR DELETE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');

-- expense_templates
ALTER TABLE expense_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expense_templates_read"   ON expense_templates FOR SELECT USING (company_id = get_my_company_id());
CREATE POLICY "expense_templates_insert" ON expense_templates FOR INSERT WITH CHECK (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "expense_templates_update" ON expense_templates FOR UPDATE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "expense_templates_delete" ON expense_templates FOR DELETE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');

-- ── 4. Existing tables: replace permissive ALL policies with split role-aware ones ──

-- employees
DROP POLICY IF EXISTS "Company admins manage employees" ON employees;
CREATE POLICY "employees_read"   ON employees FOR SELECT USING (company_id = get_my_company_id());
CREATE POLICY "employees_insert" ON employees FOR INSERT WITH CHECK (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "employees_update" ON employees FOR UPDATE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "employees_delete" ON employees FOR DELETE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');

-- attendance_records
DROP POLICY IF EXISTS "Company admins manage attendance" ON attendance_records;
CREATE POLICY "attendance_read"   ON attendance_records FOR SELECT USING (company_id = get_my_company_id());
CREATE POLICY "attendance_insert" ON attendance_records FOR INSERT WITH CHECK (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "attendance_update" ON attendance_records FOR UPDATE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "attendance_delete" ON attendance_records FOR DELETE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');

-- payroll_summaries
DROP POLICY IF EXISTS "Company admins manage payroll summaries" ON payroll_summaries;
CREATE POLICY "payroll_read"   ON payroll_summaries FOR SELECT USING (company_id = get_my_company_id());
CREATE POLICY "payroll_insert" ON payroll_summaries FOR INSERT WITH CHECK (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "payroll_update" ON payroll_summaries FOR UPDATE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "payroll_delete" ON payroll_summaries FOR DELETE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');

-- work_entries
DROP POLICY IF EXISTS "Company admins manage work entries" ON work_entries;
CREATE POLICY "work_entries_read"   ON work_entries FOR SELECT USING (company_id = get_my_company_id());
CREATE POLICY "work_entries_insert" ON work_entries FOR INSERT WITH CHECK (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "work_entries_update" ON work_entries FOR UPDATE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "work_entries_delete" ON work_entries FOR DELETE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');

-- employee_advances
DROP POLICY IF EXISTS "Company admins manage employee advances" ON employee_advances;
CREATE POLICY "advances_read"   ON employee_advances FOR SELECT USING (company_id = get_my_company_id());
CREATE POLICY "advances_insert" ON employee_advances FOR INSERT WITH CHECK (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "advances_update" ON employee_advances FOR UPDATE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "advances_delete" ON employee_advances FOR DELETE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');

-- daily_attendance
DROP POLICY IF EXISTS "Company admins manage daily attendance" ON daily_attendance;
CREATE POLICY "daily_attendance_read"   ON daily_attendance FOR SELECT USING (company_id = get_my_company_id());
CREATE POLICY "daily_attendance_insert" ON daily_attendance FOR INSERT WITH CHECK (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "daily_attendance_update" ON daily_attendance FOR UPDATE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "daily_attendance_delete" ON daily_attendance FOR DELETE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');

-- commission_items
DROP POLICY IF EXISTS "Company admins manage commission items" ON commission_items;
CREATE POLICY "commission_items_read"   ON commission_items FOR SELECT USING (company_id = get_my_company_id());
CREATE POLICY "commission_items_insert" ON commission_items FOR INSERT WITH CHECK (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "commission_items_update" ON commission_items FOR UPDATE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');
CREATE POLICY "commission_items_delete" ON commission_items FOR DELETE USING (company_id = get_my_company_id() AND get_my_role() = 'admin');

-- agent_item_rates (no company_id column — join through employees)
DROP POLICY IF EXISTS "Company admins manage agent item rates" ON agent_item_rates;
CREATE POLICY "agent_rates_read"   ON agent_item_rates FOR SELECT
  USING (employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id()));
CREATE POLICY "agent_rates_insert" ON agent_item_rates FOR INSERT
  WITH CHECK (employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id()) AND get_my_role() = 'admin');
CREATE POLICY "agent_rates_update" ON agent_item_rates FOR UPDATE
  USING (employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id()) AND get_my_role() = 'admin');
CREATE POLICY "agent_rates_delete" ON agent_item_rates FOR DELETE
  USING (employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id()) AND get_my_role() = 'admin');

-- ── 5. companies ──
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
CREATE POLICY "companies_read"   ON companies FOR SELECT USING (id = get_my_company_id());
CREATE POLICY "companies_update" ON companies FOR UPDATE USING (id = get_my_company_id() AND get_my_role() = 'admin');

-- ── 6. profiles ──
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "profiles_read" ON profiles FOR SELECT
  USING (company_id = get_my_company_id() OR id = auth.uid());

-- No INSERT policy: all profile inserts use service-role client (bypasses RLS).
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = get_my_role());

CREATE POLICY "profiles_delete_member" ON profiles FOR DELETE
  USING (company_id = get_my_company_id() AND get_my_role() = 'admin' AND id != auth.uid());
