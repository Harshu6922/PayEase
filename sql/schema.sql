-- Payroll App Supabase Schema
-- Run this in the Supabase SQL Editor

-- 1. Create Tables

CREATE TABLE public.companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  monthly_salary NUMERIC(12,2) NOT NULL,
  standard_working_hours NUMERIC(5,2) NOT NULL,
  joining_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, employee_id)
);

CREATE TABLE public.attendance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Present',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  daily_wage NUMERIC(12,2) NOT NULL,      -- Persisted daily wage rate at that time
  hourly_rate NUMERIC(12,2) NOT NULL,     -- Persisted hourly rate at that time
  worked_hours NUMERIC(5,2) NOT NULL,
  daily_pay NUMERIC(12,2) NOT NULL,
  overtime_hours NUMERIC(5,2) DEFAULT 0,
  overtime_amount NUMERIC(12,2) DEFAULT 0,
  deduction_hours NUMERIC(5,2) DEFAULT 0,
  deduction_amount NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

CREATE TABLE public.payroll_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month INTEGER NOT NULL, -- 1 to 12
  year INTEGER NOT NULL,
  total_worked_days INTEGER NOT NULL DEFAULT 0,
  total_worked_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_overtime_hours NUMERIC(10,2) DEFAULT 0,
  total_overtime_amount NUMERIC(12,2) DEFAULT 0,
  total_deduction_amount NUMERIC(12,2) DEFAULT 0,
  final_payable_salary NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, month, year)
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_summaries ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies (MVP level: Company based isolation)
-- Assumes auth.uid() corresponds to profiles.id -> profiles.company_id

CREATE OR REPLACE FUNCTION get_my_company_id() RETURNS UUID AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Companies: Admin can see their own company
CREATE POLICY "Users can view their own company" 
ON public.companies FOR SELECT 
TO authenticated 
USING (id = get_my_company_id());

-- Profiles: Admin can view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (id = auth.uid());

-- Employees: Admin can CRUD employees in their company
CREATE POLICY "Company admins manage employees" 
ON public.employees FOR ALL 
TO authenticated 
USING (company_id = get_my_company_id())
WITH CHECK (company_id = get_my_company_id());

-- Attendance: Admin can CRUD attendance in their company
CREATE POLICY "Company admins manage attendance" 
ON public.attendance_records FOR ALL 
TO authenticated 
USING (company_id = get_my_company_id())
WITH CHECK (company_id = get_my_company_id());

-- Payroll: Admin can CRUD payroll in their company
CREATE POLICY "Company admins manage payroll summaries" 
ON public.payroll_summaries FOR ALL 
TO authenticated 
USING (company_id = get_my_company_id())
WITH CHECK (company_id = get_my_company_id());

-- 4. Initial Seed Data (Optional, run manually or via app logic upon registration)
-- INSERT INTO auth.users ...
-- INSERT INTO companies (name) VALUES ('Acme Corp');
-- INSERT INTO profiles (id, company_id) VALUES ('user-uuid', 'company-uuid');
