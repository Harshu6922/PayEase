# SaaS Billing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add subscription billing to the payroll app with 3 plans, Razorpay payments, 7-day free trial, seat enforcement, and a referral discount system.

**Architecture:** A `subscriptions` table tracks each company's plan and status. Middleware checks subscription status on every request and redirects locked accounts to `/billing`. Razorpay webhooks update subscription status server-side. Referral discounts are tracked in their own table and applied to the Razorpay subscription amount at checkout.

**Tech Stack:** Next.js 14 App Router, Supabase (postgres + RLS), Razorpay Node SDK (`razorpay`), `nanoid` for referral codes.

---

## File Map

### New files
- `docs/superpowers/migrations/session5-billing.sql` — DB schema for subscriptions, referral_codes, referral_discounts
- `src/lib/plans.ts` — Plan config (ids, names, prices, seat limits)
- `src/lib/subscription.ts` — Server helper: get company subscription + status
- `src/lib/razorpay.ts` — Razorpay client singleton
- `src/app/billing/page.tsx` — Billing page (plan picker, current plan, referral code)
- `src/app/billing/BillingClient.tsx` — Client component for Razorpay checkout button
- `src/app/api/razorpay/create-subscription/route.ts` — API: create Razorpay subscription
- `src/app/api/razorpay/webhook/route.ts` — API: handle Razorpay webhook events
- `src/app/api/referral/apply/route.ts` — API: apply referral code at signup

### Modified files
- `src/middleware.ts` — Add subscription status check, redirect locked accounts
- `src/app/onboarding/page.tsx` — After company creation, create subscription row (trial), generate referral code
- `src/app/settings/page.tsx` + `SettingsClient.tsx` — Add billing tab with referral code display
- `src/app/employees/components/AddEmployeeModal.tsx` — Check seat limit before allowing add
- `src/components/PageShell.tsx` — Show trial countdown banner when on trial

---

## Task 1: DB Migration

**Files:**
- Create: `docs/superpowers/migrations/session5-billing.sql`

- [ ] **Step 1: Write migration SQL**

```sql
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
```

- [ ] **Step 2: Run in Supabase SQL Editor**

Paste the contents of `docs/superpowers/migrations/session5-billing.sql` into Supabase SQL Editor and execute.

- [ ] **Step 3: Verify tables exist**

In Supabase Table Editor, confirm `subscriptions`, `referral_codes`, `referral_discounts` all exist with the correct columns.

---

## Task 2: Plan Config + Razorpay Client

**Files:**
- Create: `src/lib/plans.ts`
- Create: `src/lib/razorpay.ts`

- [ ] **Step 1: Create plan config**

```typescript
// src/lib/plans.ts
export const PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    priceRs: 299,
    employeeLimit: 15,
    razorpayPlanId: process.env.RAZORPAY_PLAN_STARTER_ID ?? '',
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    priceRs: 499,
    employeeLimit: 75,
    razorpayPlanId: process.env.RAZORPAY_PLAN_GROWTH_ID ?? '',
  },
  business: {
    id: 'business',
    name: 'Business',
    priceRs: 999,
    employeeLimit: 500,
    razorpayPlanId: process.env.RAZORPAY_PLAN_BUSINESS_ID ?? '',
  },
} as const

export type PlanId = keyof typeof PLANS

export const REFERRAL_DISCOUNT_RS = 50
export const MAX_REFERRALS = 5
```

- [ ] **Step 2: Create Razorpay client**

```typescript
// src/lib/razorpay.ts
import Razorpay from 'razorpay'

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})
```

- [ ] **Step 3: Add env vars to `.env.local`**

```
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxx
RAZORPAY_PLAN_STARTER_ID=plan_xxxxxxxxxxxx
RAZORPAY_PLAN_GROWTH_ID=plan_xxxxxxxxxxxx
RAZORPAY_PLAN_BUSINESS_ID=plan_xxxxxxxxxxxx
```

**Note:** Create the 3 plans in Razorpay Dashboard → Products → Plans before this step. Set intervals to monthly, amounts to 29900, 49900, 99900 (paise).

- [ ] **Step 4: Install Razorpay SDK**

```bash
cd C:\Users\Lenovo\.gemini\antigravity\scratch\payroll-app
npm install razorpay nanoid
npm install --save-dev @types/razorpay
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/plans.ts src/lib/razorpay.ts .env.local
git commit -m "feat: add plan config and razorpay client"
```

---

## Task 3: Subscription Server Helper

**Files:**
- Create: `src/lib/subscription.ts`

- [ ] **Step 1: Write helper**

```typescript
// src/lib/subscription.ts
import { createClient } from '@/lib/supabase/server'
import { PLANS, type PlanId } from './plans'

export type SubscriptionStatus = 'trial' | 'active' | 'locked' | 'cancelled'

export interface CompanySubscription {
  plan: PlanId
  status: SubscriptionStatus
  trialEndsAt: Date | null
  employeeLimit: number
  daysLeftInTrial: number | null
  isLocked: boolean
  razorpaySubscriptionId: string | null
}

export async function getCompanySubscription(companyId: string): Promise<CompanySubscription | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle()

  if (!data) return null

  const plan = (data.plan as PlanId) ?? 'starter'
  let status = data.status as SubscriptionStatus

  // Auto-lock if trial expired and still on trial
  if (status === 'trial' && data.trial_ends_at) {
    const trialEnd = new Date(data.trial_ends_at)
    if (trialEnd < new Date()) {
      status = 'locked'
      // Update in DB (fire-and-forget)
      supabase.from('subscriptions').update({ status: 'locked' }).eq('company_id', companyId)
    }
  }

  const trialEndsAt = data.trial_ends_at ? new Date(data.trial_ends_at) : null
  const daysLeftInTrial = (status === 'trial' && trialEndsAt)
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86400000))
    : null

  return {
    plan,
    status,
    trialEndsAt,
    employeeLimit: PLANS[plan].employeeLimit,
    daysLeftInTrial,
    isLocked: status === 'locked' || status === 'cancelled',
    razorpaySubscriptionId: data.razorpay_subscription_id ?? null,
  }
}

export async function getReferralDiscount(companyId: string): Promise<number> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('referral_discounts')
    .select('id')
    .eq('referrer_company_id', companyId)
    .eq('active', true)

  const activeReferrals = (data ?? []).length
  const { REFERRAL_DISCOUNT_RS, MAX_REFERRALS } = await import('./plans')
  return Math.min(activeReferrals, MAX_REFERRALS) * REFERRAL_DISCOUNT_RS
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/subscription.ts
git commit -m "feat: add subscription server helper"
```

---

## Task 4: Middleware — Lock Accounts

**Files:**
- Modify: `src/middleware.ts`

- [ ] **Step 1: Update middleware**

Replace the contents of `src/middleware.ts`:

```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_PATHS = ['/login', '/billing', '/api/razorpay/webhook', '/onboarding', '/auth']

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)
  const { pathname } = request.nextUrl

  // Skip public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return response

  // Check subscription status for protected routes
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return response

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.company_id) return response

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status, trial_ends_at')
    .eq('company_id', profile.company_id)
    .maybeSingle()

  if (!sub) return response

  let isLocked = sub.status === 'locked' || sub.status === 'cancelled'
  if (sub.status === 'trial' && sub.trial_ends_at) {
    if (new Date(sub.trial_ends_at) < new Date()) isLocked = true
  }

  if (isLocked && !pathname.startsWith('/billing')) {
    return NextResponse.redirect(new URL('/billing', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: lock accounts in middleware when subscription expired"
```

---

## Task 5: Onboarding — Create Subscription + Referral Code

**Files:**
- Modify: `src/app/onboarding/page.tsx`

- [ ] **Step 1: Update onboarding to create subscription row and referral code after company setup**

In `src/app/onboarding/page.tsx`, after the profile insert succeeds, add (using `adminClient`):

```typescript
import { nanoid } from 'nanoid'

// After successful profile insert:
const companyId = adminUser.user_metadata?.company_id

// Create subscription (trial)
await adminClient.from('subscriptions').insert({
  company_id: companyId,
  plan: 'starter',
  status: 'trial',
  trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
})

// Generate unique referral code
const code = nanoid(8).toUpperCase()
await adminClient.from('referral_codes').insert({
  company_id: companyId,
  code,
})
```

**Note:** This is for the admin (company owner) onboarding flow. The existing invited-viewer onboarding (`/onboarding`) doesn't need subscription creation — the company already has one.

**Important:** The company creation flow is in the login/signup page. Find where `companies` is inserted and add the subscription + referral code creation there, using the service role client.

- [ ] **Step 2: Find company creation point**

```bash
grep -r "from('companies').insert" src/
```

Add the subscription + referral code creation right after the company insert succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/onboarding/page.tsx
git commit -m "feat: create subscription and referral code on company signup"
```

---

## Task 6: Referral Code Apply API

**Files:**
- Create: `src/app/api/referral/apply/route.ts`

- [ ] **Step 1: Write route**

```typescript
// src/app/api/referral/apply/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { MAX_REFERRALS } from '@/lib/plans'

export async function POST(req: NextRequest) {
  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.company_id) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Find referral code owner
  const { data: refCode } = await adminClient
    .from('referral_codes')
    .select('company_id')
    .eq('code', code.toUpperCase())
    .maybeSingle()

  if (!refCode) return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })
  if (refCode.company_id === profile.company_id) {
    return NextResponse.json({ error: 'Cannot use your own referral code' }, { status: 400 })
  }

  // Check referrer hasn't hit max referrals
  const { data: existing } = await adminClient
    .from('referral_discounts')
    .select('id')
    .eq('referrer_company_id', refCode.company_id)
    .eq('active', true)

  if ((existing ?? []).length >= MAX_REFERRALS) {
    return NextResponse.json({ error: 'Referrer has reached the maximum referral limit' }, { status: 400 })
  }

  // Check this company hasn't already been referred
  const { data: alreadyReferred } = await adminClient
    .from('referral_discounts')
    .select('id')
    .eq('referred_company_id', profile.company_id)
    .maybeSingle()

  if (alreadyReferred) {
    return NextResponse.json({ error: 'Your account has already been referred' }, { status: 400 })
  }

  // Create referral discount relationship
  const { error } = await adminClient.from('referral_discounts').insert({
    referrer_company_id: refCode.company_id,
    referred_company_id: profile.company_id,
    active: true,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/referral/apply/route.ts
git commit -m "feat: referral code apply API"
```

---

## Task 7: Razorpay Create-Subscription API

**Files:**
- Create: `src/app/api/razorpay/create-subscription/route.ts`

- [ ] **Step 1: Write route**

```typescript
// src/app/api/razorpay/create-subscription/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { razorpay } from '@/lib/razorpay'
import { PLANS, REFERRAL_DISCOUNT_RS, MAX_REFERRALS, type PlanId } from '@/lib/plans'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { plan } = await req.json() as { plan: PlanId }
  if (!PLANS[plan]) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.company_id) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Calculate discount
  const { data: discounts } = await adminClient
    .from('referral_discounts')
    .select('id')
    .eq('referrer_company_id', profile.company_id)
    .eq('active', true)

  const activeReferrals = Math.min((discounts ?? []).length, MAX_REFERRALS)
  const discountRs = activeReferrals * REFERRAL_DISCOUNT_RS
  const finalPriceRs = Math.max(0, PLANS[plan].priceRs - discountRs)
  const finalPricePaise = finalPriceRs * 100

  // Create Razorpay subscription
  // Note: Razorpay doesn't support per-subscription discounts natively.
  // For discounts, create a custom plan at the discounted price, OR use Offers/Coupons API.
  // Simplest approach: create a one-time plan at the adjusted price if discount > 0.
  let planId = PLANS[plan].razorpayPlanId

  if (discountRs > 0) {
    // Create a temporary plan at discounted price
    const tempPlan = await razorpay.plans.create({
      period: 'monthly',
      interval: 1,
      item: {
        name: `${PLANS[plan].name} (Referral Discount)`,
        amount: finalPricePaise,
        currency: 'INR',
      },
    })
    planId = tempPlan.id
  }

  const subscription = await razorpay.subscriptions.create({
    plan_id: planId,
    total_count: 120, // 10 years
    quantity: 1,
  })

  // Save subscription ID to DB
  await adminClient
    .from('subscriptions')
    .update({
      razorpay_subscription_id: subscription.id,
      razorpay_plan_id: planId,
      plan,
    })
    .eq('company_id', profile.company_id)

  return NextResponse.json({
    subscriptionId: subscription.id,
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    amount: finalPricePaise,
    plan,
    discountRs,
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/razorpay/create-subscription/route.ts
git commit -m "feat: create razorpay subscription API with referral discount"
```

---

## Task 8: Razorpay Webhook Handler

**Files:**
- Create: `src/app/api/razorpay/webhook/route.ts`

- [ ] **Step 1: Write webhook handler**

```typescript
// src/app/api/razorpay/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const adminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-razorpay-signature') ?? ''

  // Verify webhook signature
  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex')

  if (expectedSig !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(body)
  const subId = event?.payload?.subscription?.entity?.id

  if (!subId) return NextResponse.json({ ok: true })

  // Find company by subscription ID
  const { data: sub } = await adminClient
    .from('subscriptions')
    .select('company_id')
    .eq('razorpay_subscription_id', subId)
    .maybeSingle()

  if (!sub) return NextResponse.json({ ok: true })

  switch (event.event) {
    case 'subscription.activated':
    case 'subscription.charged': {
      const periodEnd = event?.payload?.subscription?.entity?.current_end
      await adminClient.from('subscriptions').update({
        status: 'active',
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      }).eq('company_id', sub.company_id)
      break
    }
    case 'subscription.cancelled':
    case 'subscription.expired': {
      await adminClient.from('subscriptions').update({
        status: 'cancelled',
      }).eq('company_id', sub.company_id)

      // Deactivate referral discounts for this company
      await adminClient.from('referral_discounts').update({ active: false })
        .eq('referred_company_id', sub.company_id)
      break
    }
    case 'subscription.pending':
    case 'subscription.halted': {
      await adminClient.from('subscriptions').update({
        status: 'locked',
      }).eq('company_id', sub.company_id)
      break
    }
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Configure webhook in Razorpay Dashboard**

Go to Razorpay Dashboard → Settings → Webhooks → Add new webhook:
- URL: `https://your-domain.com/api/razorpay/webhook`
- Secret: same as `RAZORPAY_WEBHOOK_SECRET` in `.env.local`
- Events: `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `subscription.expired`, `subscription.pending`, `subscription.halted`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/razorpay/webhook/route.ts
git commit -m "feat: razorpay webhook handler"
```

---

## Task 9: Billing Page

**Files:**
- Create: `src/app/billing/page.tsx`
- Create: `src/app/billing/BillingClient.tsx`

- [ ] **Step 1: Create billing page server component**

```typescript
// src/app/billing/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCompanySubscription, getReferralDiscount } from '@/lib/subscription'
import BillingClient from './BillingClient'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.company_id) redirect('/login')

  const [subscription, referralDiscount] = await Promise.all([
    getCompanySubscription(profile.company_id),
    getReferralDiscount(profile.company_id),
  ])

  const { data: refCode } = await supabase
    .from('referral_codes')
    .select('code')
    .eq('company_id', profile.company_id)
    .maybeSingle()

  const { data: referralCount } = await supabase
    .from('referral_discounts')
    .select('id')
    .eq('referrer_company_id', profile.company_id)
    .eq('active', true)

  return (
    <BillingClient
      subscription={subscription}
      referralCode={(refCode as any)?.code ?? null}
      activeReferrals={(referralCount ?? []).length}
      referralDiscountRs={referralDiscount}
      companyId={profile.company_id}
    />
  )
}
```

- [ ] **Step 2: Create BillingClient component**

```tsx
// src/app/billing/BillingClient.tsx
'use client'
import { useState } from 'react'
import { PLANS, type PlanId } from '@/lib/plans'
import type { CompanySubscription } from '@/lib/subscription'

interface Props {
  subscription: CompanySubscription | null
  referralCode: string | null
  activeReferrals: number
  referralDiscountRs: number
  companyId: string
}

declare global { interface Window { Razorpay: any } }

export default function BillingClient({ subscription, referralCode, activeReferrals, referralDiscountRs }: Props) {
  const [loading, setLoading] = useState(false)
  const [referralInput, setReferralInput] = useState('')
  const [referralMsg, setReferralMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubscribe(plan: PlanId) {
    setLoading(true)
    const res = await fetch('/api/razorpay/create-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error); setLoading(false); return }

    // Load Razorpay checkout
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => {
      const rzp = new window.Razorpay({
        key: data.key,
        subscription_id: data.subscriptionId,
        name: 'PayrollApp',
        description: `${PLANS[plan].name} Plan`,
        handler: () => { window.location.reload() },
      })
      rzp.open()
      setLoading(false)
    }
    document.body.appendChild(script)
  }

  async function applyReferral() {
    if (!referralInput.trim()) return
    const res = await fetch('/api/referral/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: referralInput.trim() }),
    })
    const data = await res.json()
    setReferralMsg({ type: res.ok ? 'success' : 'error', text: res.ok ? 'Referral applied! Discount active.' : data.error })
  }

  function copyCode() {
    if (referralCode) { navigator.clipboard.writeText(referralCode); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }

  const isLocked = subscription?.isLocked ?? false
  const isTrial = subscription?.status === 'trial'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Billing</h1>

      {isLocked && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-red-800 text-sm font-medium">
          Your account is locked. Choose a plan below to continue.
        </div>
      )}
      {isTrial && subscription?.daysLeftInTrial !== null && (
        <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm">
          <span className="font-semibold">Free trial:</span> {subscription.daysLeftInTrial} day{subscription.daysLeftInTrial !== 1 ? 's' : ''} remaining. Subscribe to keep access.
        </div>
      )}

      {/* Current plan */}
      {subscription && !isLocked && (
        <div className="mb-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Current plan</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{PLANS[subscription.plan].name} — ₹{PLANS[subscription.plan].priceRs}/month</p>
          {referralDiscountRs > 0 && (
            <p className="text-sm text-green-600 mt-1">Referral discount: −₹{referralDiscountRs}/month ({activeReferrals} active referral{activeReferrals !== 1 ? 's' : ''})</p>
          )}
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {(Object.values(PLANS) as typeof PLANS[PlanId][]).map(plan => {
          const isCurrent = subscription?.plan === plan.id && !isLocked
          const discountedPrice = Math.max(0, plan.priceRs - referralDiscountRs)
          return (
            <div key={plan.id} className={`rounded-xl border p-5 bg-white dark:bg-gray-800 flex flex-col ${isCurrent ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-gray-200 dark:border-gray-700'}`}>
              <p className="font-bold text-gray-900 dark:text-white">{plan.name}</p>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                ₹{discountedPrice}
                {referralDiscountRs > 0 && <span className="text-sm font-normal text-gray-400 line-through ml-2">₹{plan.priceRs}</span>}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{plan.employeeLimit} employees</p>
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading || isCurrent}
                className={`mt-4 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${isCurrent ? 'bg-indigo-100 text-indigo-700 cursor-default' : 'bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50'}`}
              >
                {isCurrent ? 'Current Plan' : loading ? 'Loading…' : 'Subscribe'}
              </button>
            </div>
          )
        })}
      </div>

      {/* Referral section */}
      <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">Referrals</h2>

        {referralCode && (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Your referral code — share this to earn ₹50/month off per referral (max 5)</p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900 px-3 py-1 rounded-lg">{referralCode}</span>
              <button onClick={copyCode} className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            {activeReferrals > 0 && (
              <p className="text-sm text-green-600 mt-2">{activeReferrals} active referral{activeReferrals !== 1 ? 's' : ''} → ₹{activeReferrals * 50}/month discount</p>
            )}
          </div>
        )}

        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Have a referral code? Apply it for a discount:</p>
          <div className="flex gap-2">
            <input
              value={referralInput}
              onChange={e => setReferralInput(e.target.value)}
              placeholder="Enter code"
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button onClick={applyReferral} className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-500">
              Apply
            </button>
          </div>
          {referralMsg && (
            <p className={`text-sm mt-1 ${referralMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{referralMsg.text}</p>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/billing/page.tsx src/app/billing/BillingClient.tsx
git commit -m "feat: billing page with plan picker, referral code display"
```

---

## Task 10: Seat Enforcement in AddEmployeeModal

**Files:**
- Modify: `src/app/employees/components/AddEmployeeModal.tsx`

- [ ] **Step 1: Pass seat limit info to AddEmployeeModal from employees page**

In `src/app/employees/page.tsx`, fetch subscription alongside employees:

```typescript
const { data: subData } = await supabase
  .from('subscriptions')
  .select('plan, status, trial_ends_at')
  .eq('company_id', (profileData as any)?.company_id ?? '')
  .maybeSingle()

const sub = subData as any
const planId: PlanId = sub?.plan ?? 'starter'
const employeeLimit = PLANS[planId]?.employeeLimit ?? 15
const activeEmployeeCount = employees.filter(e => e.is_active).length
const atSeatLimit = activeEmployeeCount >= employeeLimit
```

Pass `atSeatLimit` and `employeeLimit` to `<AddEmployeeModal>`.

- [ ] **Step 2: Block add in AddEmployeeModal when at limit**

In `AddEmployeeModal`, if `atSeatLimit` is true, show an upgrade prompt instead of the add form:

```tsx
if (atSeatLimit) {
  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
      You've reached your {employeeLimit}-employee limit.{' '}
      <a href="/billing" className="font-semibold underline">Upgrade your plan</a> to add more.
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/employees/page.tsx src/app/employees/components/AddEmployeeModal.tsx
git commit -m "feat: enforce employee seat limit with upgrade prompt"
```

---

## Task 11: Trial Banner in PageShell

**Files:**
- Modify: `src/components/PageShell.tsx`

- [ ] **Step 1: Read the current PageShell component**

Read `src/components/PageShell.tsx` to understand its current props and structure.

- [ ] **Step 2: Add trial banner**

Add a server-side check for trial status and show a dismissable banner at the top:

```tsx
// Show when status = 'trial' and daysLeft <= 3
{daysLeftInTrial !== null && daysLeftInTrial <= 3 && (
  <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-sm text-amber-800 flex justify-between">
    <span>⚠️ Your free trial ends in <strong>{daysLeftInTrial} day{daysLeftInTrial !== 1 ? 's' : ''}</strong>. <a href="/billing" className="underline font-semibold">Subscribe now</a></span>
  </div>
)}
```

Pass `daysLeftInTrial` from each page's server component, or fetch it directly in PageShell if it's a server component.

- [ ] **Step 3: Commit**

```bash
git add src/components/PageShell.tsx
git commit -m "feat: trial expiry banner in PageShell"
```

---

## Task 12: Add Billing Link to Sidebar

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Add billing nav item**

In the sidebar nav items list, add:

```tsx
{ href: '/billing', label: 'Billing', icon: CreditCardIcon }
```

Place it under the Settings section.

- [ ] **Step 2: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: add billing link to sidebar"
```

---

## Manual Steps Summary

After all tasks are complete:

1. **Razorpay account setup:**
   - Create 3 Plans in Razorpay Dashboard (monthly, amounts 29900/49900/99900 paise)
   - Copy plan IDs to `.env.local` as `RAZORPAY_PLAN_STARTER_ID` etc.
   - Add test API keys to `.env.local`
   - Configure webhook URL + secret

2. **Run DB migration** (Task 1) in Supabase SQL Editor

3. **Backfill existing companies** — existing companies won't have subscription rows. Run in SQL Editor:
   ```sql
   -- Insert subscription rows for existing companies that don't have one
   INSERT INTO public.subscriptions (company_id, plan, status, trial_ends_at)
   SELECT id, 'starter', 'active', now() + interval '100 years'
   FROM public.companies
   WHERE id NOT IN (SELECT company_id FROM public.subscriptions);

   -- Generate referral codes for existing companies
   INSERT INTO public.referral_codes (company_id, code)
   SELECT id, upper(substring(md5(random()::text) from 1 for 8))
   FROM public.companies
   WHERE id NOT IN (SELECT company_id FROM public.referral_codes);
   ```

4. **Test the full flow** in test mode:
   - Sign up new account → see trial banner
   - Hit employee seat limit → see upgrade prompt
   - Apply referral code → see discount on plan cards
   - Subscribe with Razorpay test card → account activates
   - Simulate webhook `subscription.cancelled` → account locks → redirects to `/billing`
