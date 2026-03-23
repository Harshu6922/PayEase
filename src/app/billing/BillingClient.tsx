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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your subscription and referrals</p>
        </div>

        {isLocked && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-800 dark:text-red-300 text-sm font-medium">
            Your account is locked. Choose a plan below to restore access.
          </div>
        )}

        {isTrial && subscription?.daysLeftInTrial !== null && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-4 text-amber-800 dark:text-amber-300 text-sm">
            <span className="font-semibold">Free trial:</span>{' '}
            {subscription.daysLeftInTrial} day{subscription.daysLeftInTrial !== 1 ? 's' : ''} remaining.
            Subscribe below to keep access.
          </div>
        )}

        {/* Current plan */}
        {subscription && !isLocked && subscription.status === 'active' && (
          <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Current plan</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {PLANS[subscription.plan].name} — ₹{PLANS[subscription.plan].priceRs}/month
            </p>
            {referralDiscountRs > 0 && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                Referral discount: −₹{referralDiscountRs}/month ({activeReferrals} active referral{activeReferrals !== 1 ? 's' : ''})
              </p>
            )}
          </div>
        )}

        {/* Plan cards */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {subscription?.status === 'active' ? 'Change plan' : 'Choose a plan'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(Object.values(PLANS) as (typeof PLANS)[PlanId][]).map(plan => {
              const isCurrent = subscription?.plan === plan.id && subscription.status === 'active'
              const discountedPrice = Math.max(0, plan.priceRs - referralDiscountRs)
              return (
                <div
                  key={plan.id}
                  className={`rounded-xl border p-5 bg-white dark:bg-gray-800 flex flex-col ${
                    isCurrent
                      ? 'border-indigo-500 ring-2 ring-indigo-500'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <p className="font-bold text-gray-900 dark:text-white">{plan.name}</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
                      ₹{discountedPrice}
                    </span>
                    {referralDiscountRs > 0 && (
                      <span className="text-sm text-gray-400 line-through">₹{plan.priceRs}</span>
                    )}
                    <span className="text-sm text-gray-400">/mo</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Up to {plan.employeeLimit} employees
                  </p>
                  <ul className="mt-3 space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {plan.id === 'starter' && <>
                      <li>✓ Payroll in seconds, not hours</li>
                      <li>✓ Attendance + overtime tracking</li>
                      <li>✓ Advance & repayment management</li>
                      <li>✓ PDF payslips for every employee</li>
                      <li>✓ Expense tracking & templates</li>
                      <li>✓ Works offline, syncs instantly</li>
                    </>}
                    {plan.id === 'growth' && <>
                      <li>✓ Everything in Starter</li>
                      <li>✓ Commission & daily wage workers</li>
                      <li>✓ Team access with role controls</li>
                      <li>✓ Charts & payroll analytics</li>
                      <li>✓ Monthly payroll comparison</li>
                      <li>✓ Priority support</li>
                    </>}
                    {plan.id === 'business' && <>
                      <li>✓ Everything in Growth</li>
                      <li>✓ Unlimited team members</li>
                      <li>✓ Bulk payroll export (PDF + CSV)</li>
                      <li>✓ Advanced reporting & charts</li>
                      <li>✓ Dedicated account manager</li>
                      <li>✓ SLA-backed uptime guarantee</li>
                    </>}
                  </ul>
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={loading || isCurrent}
                    className={`mt-4 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                      isCurrent
                        ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 cursor-default'
                        : 'bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50'
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
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 space-y-5">
          <h2 className="font-semibold text-gray-900 dark:text-white">Referrals</h2>

          {referralCode && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Share your code — earn <span className="font-semibold text-gray-900 dark:text-white">₹50/month off</span> for each referral (max 5 = ₹250/month)
              </p>
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-lg tracking-widest">
                  {referralCode}
                </span>
                <button
                  onClick={copyCode}
                  className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              {activeReferrals > 0 && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                  {activeReferrals} active referral{activeReferrals !== 1 ? 's' : ''} →{' '}
                  <span className="font-semibold">₹{activeReferrals * 50}/month discount</span>
                </p>
              )}
            </div>
          )}

          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Have a referral code? Apply it for a discount on your subscription:
            </p>
            <div className="flex gap-2">
              <input
                value={referralInput}
                onChange={e => setReferralInput(e.target.value.toUpperCase())}
                placeholder="Enter code"
                maxLength={8}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
              />
              <button
                onClick={applyReferral}
                className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-500 transition-colors"
              >
                Apply
              </button>
            </div>
            {referralMsg && (
              <p className={`text-sm mt-2 ${referralMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {referralMsg.text}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
