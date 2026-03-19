-- 04-daily-jobwork.sql
-- Run in Supabase SQL editor

-- 1. Extend worker_type to include 'daily'
ALTER TABLE public.employees
  DROP CONSTRAINT employees_worker_type_check;

ALTER TABLE public.employees
  ADD CONSTRAINT employees_worker_type_check
  CHECK (worker_type IN ('salaried', 'commission', 'daily'));

-- 2. Add daily_rate column (nullable, only for daily workers, must be positive if set)
ALTER TABLE public.employees
  ADD COLUMN daily_rate NUMERIC(10,2) DEFAULT NULL
  CHECK (daily_rate IS NULL OR daily_rate > 0);

-- 3. New table for daily worker attendance
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
