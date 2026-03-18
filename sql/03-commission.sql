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
