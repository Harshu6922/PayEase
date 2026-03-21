-- Advance Repayments Table
-- Tracks partial/full repayments against employee advances (e.g., via salary deduction)

CREATE TABLE IF NOT EXISTS public.advance_repayments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  advance_id UUID NOT NULL REFERENCES public.employee_advances(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  repayment_date DATE NOT NULL,
  method TEXT NOT NULL DEFAULT 'salary_deduction',  -- 'salary_deduction' | 'cash'
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.advance_repayments ENABLE ROW LEVEL SECURITY;

-- Policy: company members can manage repayments for their company
CREATE POLICY "Company members manage advance repayments"
ON public.advance_repayments FOR ALL
TO authenticated
USING (company_id = get_my_company_id())
WITH CHECK (company_id = get_my_company_id());
