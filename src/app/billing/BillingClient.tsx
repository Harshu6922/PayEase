'use client'
import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
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

const PLAN_FEATURES = [
  'Full payroll — salary, OT & advances',
  'Attendance & daily labour tracking',
  'Commission & daily wage workers',
  'PDF payslips & payroll reports',
  'Expenses, charts & analytics',
  'Team access with role controls',
]

const PLAN_TAG: Record<string, string> = {
  starter: 'Perfect for small teams',
  growth: 'Built for growing businesses',
  business: 'For large operations',
}

const inputCls = 'bg-[#0F0A1E] border border-[#7C3AED]/30 rounded-xl px-4 py-3 text-[#F1F0F5] placeholder:text-[#7B7A8E]/50 focus:outline-none focus:border-[#7C3AED]/50 focus:ring-1 focus:ring-[#7C3AED]/50 w-full text-sm'

export default function BillingClient({
  subscription,
  referralCode,
  activeReferrals,
  referralDiscountRs,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [referralInput, setReferralInput] = useState('')
  const [referralMsg, setReferralMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
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

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => {
      const rzp = new window.Razorpay({
        key: data.key,
        subscription_id: data.subscriptionId,
        name: 'PayEase',
        description: `${PLANS[plan as PlanId].name} Plan — ₹${PLANS[plan as PlanId].priceRs}/month`,
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
    setReferralMsg({
      type: res.ok ? 'success' : 'error',
      text: res.ok ? 'Referral applied! Discount will apply on your next subscription.' : data.error,
    })
  }

  function copyCode() {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const isLocked = subscription?.isLocked ?? false
  const isTrial = subscription?.status === 'trial'
  const currentPlanId = subscription?.status === 'active' ? subscription.plan : null

  return (
    <div className="min-h-screen bg-[#0F0A1E]">
      {/* Header */}
      <div className="px-6 md:px-8 pt-8 pb-7 border-b border-[#7C3AED]/10">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-[#F1F0F5]">Billing</h1>
          {currentPlanId && (
            <span className="bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30 text-xs px-2 py-0.5 rounded-full font-medium">
              {PLANS[currentPlanId].name} Plan
            </span>
          )}
          {isTrial && (
            <span className="bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 text-xs px-2 py-0.5 rounded-full font-medium">
              Free Trial
            </span>
          )}
          {isLocked && (
            <span className="bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 text-xs px-2 py-0.5 rounded-full font-medium">
              Locked
            </span>
          )}
        </div>
        <p className="text-sm text-[#7B7A8E] mt-1">Manage your subscription and referrals</p>
      </div>

      <div className="px-6 md:px-8 py-6 space-y-6 max-w-5xl">

        {/* Alert banners */}
        {isLocked && (
          <div className="rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 p-4 text-[#EF4444] text-sm font-medium">
            Your account is locked. Choose a plan below to restore access.
          </div>
        )}

        {isTrial && subscription?.daysLeftInTrial !== null && (
          <div className="rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 p-4 text-[#F59E0B] text-sm">
            <span className="font-semibold">Free trial:</span>{' '}
            {subscription.daysLeftInTrial} day{subscription.daysLeftInTrial !== 1 ? 's' : ''} remaining.
            Subscribe below to keep access.
          </div>
        )}

        {/* Referral discount banner */}
        {currentPlanId && referralDiscountRs > 0 && (
          <div className="rounded-xl bg-[#10B981]/10 border border-[#10B981]/30 p-4 text-[#10B981] text-sm">
            Referral discount active: <span className="font-semibold font-mono">−₹{referralDiscountRs}/month</span>{' '}
            ({activeReferrals} active referral{activeReferrals !== 1 ? 's' : ''})
          </div>
        )}

        {/* Plan cards */}
        <div>
          <h2 className="text-sm font-semibold text-[#7B7A8E] mb-4 uppercase tracking-wider">
            {currentPlanId ? 'Change Plan' : 'Choose a Plan'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(Object.values(PLANS) as (typeof PLANS)[PlanId][]).map(plan => {
              const isCurrent = currentPlanId === plan.id
              const isPopular = plan.id === 'growth'
              const discountedPrice = Math.max(0, plan.priceRs - referralDiscountRs)

              return (
                <div
                  key={plan.id}
                  className={`relative backdrop-blur-md bg-white/5 rounded-xl p-6 flex flex-col transition-all ${
                    isPopular
                      ? 'border-2 border-[#7C3AED]/50 shadow-[0_0_30px_rgba(124,58,237,0.2)]'
                      : 'border border-[#7C3AED]/20'
                  }`}
                >
                  {/* Most Popular badge */}
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-[#7C3AED] text-white text-[10px] px-3 py-1 rounded-full font-semibold whitespace-nowrap">
                        Most Popular
                      </span>
                    </div>
                  )}

                  {/* Plan name + current badge */}
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-[#F1F0F5] font-bold text-lg">{plan.name}</p>
                    {isCurrent && (
                      <span className="bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30 text-xs px-2 py-0.5 rounded-full font-medium ml-2 flex-shrink-0">
                        Current
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="font-mono font-extrabold text-3xl text-[#F1F0F5]">₹{discountedPrice}</span>
                    {referralDiscountRs > 0 && (
                      <span className="text-sm text-[#7B7A8E] line-through font-mono">₹{plan.priceRs}</span>
                    )}
                    <span className="text-sm text-[#7B7A8E]">/mo</span>
                  </div>
                  <p className="text-xs text-[#7B7A8E] mb-4">Up to {plan.employeeLimit} employees</p>

                  {/* Features */}
                  <ul className="space-y-2 mb-5 flex-1">
                    {PLAN_FEATURES.map(feat => (
                      <li key={feat} className="flex items-start gap-2 text-sm text-[#F1F0F5]">
                        <CheckCircle className="text-[#10B981] h-4 w-4 flex-shrink-0 mt-0.5" />
                        {feat}
                      </li>
                    ))}
                    <li className="flex items-start gap-2 text-sm text-[#A855F7] font-medium">
                      <CheckCircle className="text-[#A855F7] h-4 w-4 flex-shrink-0 mt-0.5" />
                      {PLAN_TAG[plan.id]}
                    </li>
                  </ul>

                  {/* CTA */}
                  <button
                    onClick={() => !isCurrent && handleSubscribe(plan.id)}
                    disabled={loading || isCurrent}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                      isCurrent
                        ? 'bg-[#7C3AED]/10 text-[#7C3AED] border border-[#7C3AED]/30 cursor-default'
                        : 'bg-[#7C3AED] text-white hover:bg-[#6D28D9] disabled:opacity-50'
                    }`}
                  >
                    {isCurrent ? 'Current Plan' : loading ? 'Loading…' : 'Subscribe'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Referral section */}
        <div className="backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-xl p-6 space-y-5">
          <h2 className="text-[#F1F0F5] font-semibold text-base pb-3 border-b border-[#7C3AED]/10">Referrals</h2>

          {referralCode && (
            <div>
              <p className="text-sm text-[#7B7A8E] mb-3">
                Share your code — earn{' '}
                <span className="font-semibold text-[#F1F0F5]">₹50/month off</span>{' '}
                for each referral (max 5 = ₹250/month)
              </p>
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-bold text-[#A855F7] bg-[#7C3AED]/10 border border-[#7C3AED]/20 px-4 py-2 rounded-xl tracking-widest">
                  {referralCode}
                </span>
                <button
                  onClick={copyCode}
                  className="text-sm font-medium text-[#7B7A8E] hover:text-[#F1F0F5] transition-colors bg-[#7C3AED]/10 border border-[#7C3AED]/20 rounded-lg px-3 py-2"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              {activeReferrals > 0 && (
                <p className="text-sm text-[#10B981] mt-2">
                  {activeReferrals} active referral{activeReferrals !== 1 ? 's' : ''} →{' '}
                  <span className="font-semibold font-mono">₹{activeReferrals * 50}/month discount</span>
                </p>
              )}
            </div>
          )}

          <div className="border-t border-[#7C3AED]/10 pt-4">
            <p className="text-sm text-[#7B7A8E] mb-3">
              Have a referral code? Apply it for a discount on your subscription:
            </p>
            <div className="flex gap-2">
              <input
                value={referralInput}
                onChange={e => setReferralInput(e.target.value.toUpperCase())}
                placeholder="Enter code"
                maxLength={8}
                className="flex-1 bg-[#0F0A1E] border border-[#7C3AED]/30 rounded-xl px-4 py-3 text-[#F1F0F5] placeholder:text-[#7B7A8E]/50 focus:outline-none focus:border-[#7C3AED]/50 focus:ring-1 focus:ring-[#7C3AED]/50 text-sm font-mono uppercase"
              />
              <button
                onClick={applyReferral}
                className="bg-[#7C3AED] text-white rounded-xl px-5 py-3 text-sm font-semibold hover:bg-[#6D28D9] transition-colors"
              >
                Apply
              </button>
            </div>
            {referralMsg && (
              <p className={`text-sm mt-2 ${referralMsg.type === 'success' ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                {referralMsg.text}
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
