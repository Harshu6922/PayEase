-- 07-salary-divisor.sql
-- Configurable salary divisor for monthly-salaried payroll.
-- NULL = use actual days in month (default behaviour). A value (e.g. 26)
-- fixes the per-day rate at monthly_salary / divisor.

alter table employees add column if not exists salary_divisor integer
  check (salary_divisor is null or (salary_divisor between 1 and 31));

alter table companies add column if not exists default_salary_divisor integer
  check (default_salary_divisor is null or (default_salary_divisor between 1 and 31));
