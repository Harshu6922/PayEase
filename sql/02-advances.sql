-- 1. Create Employee Advances Table
CREATE TABLE public.employee_advances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  advance_date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, advance_date)
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.employee_advances ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Admin can CRUD employee advances in their company
CREATE POLICY "Company admins manage employee advances" 
ON public.employee_advances FOR ALL 
TO authenticated 
USING (company_id = get_my_company_id())
WITH CHECK (company_id = get_my_company_id());
