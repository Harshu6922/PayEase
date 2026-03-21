-- Plans reference (no table needed — managed in code)
-- 'starter'  = ₹299, 15 employees
-- 'growth'   = ₹499, 75 employees
-- 'business' = ₹999, 500 employees

-- Subscriptions
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'growth', 'business')),
  status text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'locked', 'cancelled')),
  trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  razorpay_subscription_id text,
  razorpay_plan_id text,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Referral codes
CREATE TABLE public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Referral discounts (one row per active referral relationship)
CREATE TABLE public.referral_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  referred_company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(referred_company_id) -- each company can only be referred once
);

-- RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company can read own subscription"
  ON public.subscriptions FOR SELECT
  USING (company_id = get_my_company_id());

CREATE POLICY "company can read own referral code"
  ON public.referral_codes FOR SELECT
  USING (company_id = get_my_company_id());

CREATE POLICY "company can read own referral discounts"
  ON public.referral_discounts FOR SELECT
  USING (referrer_company_id = get_my_company_id());

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
