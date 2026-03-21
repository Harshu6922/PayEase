-- Add default shift times to employees
-- These are used to auto-fill attendance when an employee is marked Present

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS default_start_time TIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS default_end_time   TIME DEFAULT NULL;
