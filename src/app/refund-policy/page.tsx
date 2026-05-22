import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy — PayEase',
  description: 'Refund, cancellation, and billing policy for PayEase subscriptions.',
}

const SUPPORT_EMAIL = 'payeasebuddy@gmail.com'

const SECTIONS = [
  {
    title: '1. Free Trial',
    body: `New accounts receive a 7-day free trial with full access to all features. No payment is required during the trial. If you do not subscribe before the trial ends, your account is locked and no charge is made.`,
  },
  {
    title: '2. Subscription Billing',
    body: `Paid plans are billed monthly via Razorpay in Indian Rupees (INR) inclusive of applicable taxes. Charges begin only after you choose a plan and authorise payment. Subscriptions auto-renew on the same calendar day each month until cancelled.`,
  },
  {
    title: '3. Cancellation',
    body: `You can cancel your subscription at any time from the Billing page inside your account. Cancellation stops the next renewal — you continue to have full access until the end of the current billing period. No further charges are made after cancellation.`,
  },
  {
    title: '4. Refund Eligibility',
    body: `Refunds are considered in the following cases:
      (a) Duplicate charges caused by a payment-gateway or technical error on our side — refunded in full within 7 working days.
      (b) Service outage exceeding 24 continuous hours on our side, where you could not access your data — refund prorated for the affected days.
      (c) Charge made to a clearly inactive account where no usage occurred in the billing cycle — refunded in full within 7 working days, on written request within 7 days of the charge.
    Refunds outside these cases are at our sole discretion. Partial-month refunds are not provided for normal cancellations.`,
  },
  {
    title: '5. Non-Refundable Items',
    body: `We do not refund: (a) charges for partial months after normal cancellation, (b) charges where the cancellation request was submitted after the renewal date, (c) charges arising from your failure to cancel before the renewal, or (d) the cost of any one-time professional services already delivered.`,
  },
  {
    title: '6. How to Request a Refund',
    body: `Email ${SUPPORT_EMAIL} from the email address registered on your PayEase account with the subject line "Refund Request — [Your Company Name]". Include the transaction ID from your Razorpay receipt and the reason. We acknowledge requests within 2 working days and process approved refunds within 7 working days from approval.`,
  },
  {
    title: '7. How Refunds Are Processed',
    body: `Approved refunds are returned to the original payment method (card, UPI, net banking, or wallet) via Razorpay. Settlement to your bank typically takes 5–7 working days after we initiate the refund. The exact time depends on your bank and is outside our control once initiated.`,
  },
  {
    title: '8. Pricing Changes',
    body: `We may change subscription prices with at least 30 days written notice to your registered email. You may cancel before the new price takes effect with no charge. Continued use after the effective date constitutes acceptance of the new price.`,
  },
  {
    title: '9. Data After Cancellation',
    body: `After cancellation, your account is retained in read-only locked state for 30 days. During this window you can re-subscribe and resume immediately, or download a CSV/PDF export of your data. After 30 days the account and all associated data is permanently deleted.`,
  },
  {
    title: '10. Contact',
    body: `For any billing, refund, or cancellation questions email ${SUPPORT_EMAIL}. We reply within 24 hours on working days.`,
  },
]

export default function RefundPolicy() {
  return (
    <div className="min-h-screen" style={{ background: '#0F0A1E' }}>
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">

        <Link href="/" className="inline-flex items-center gap-2 text-sm mb-10 transition-colors"
          style={{ color: '#afa7c2' }}>
          ← Back to home
        </Link>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3"
          style={{ color: '#ebe1fe' }}>Refund & Cancellation Policy</h1>
        <p className="text-sm mb-12" style={{ color: '#afa7c2' }}>
          Last updated: May 2026
        </p>

        <p className="text-sm leading-relaxed mb-12" style={{ color: '#afa7c2' }}>
          This policy explains how subscription billing, cancellations, and refunds work at PayEase. It forms part of our <Link href="/terms" style={{ color: '#bd9dff' }}>Terms of Service</Link> and applies to all paid plans.
        </p>

        <div className="space-y-10">
          {SECTIONS.map(s => (
            <section key={s.title}>
              <h2 className="text-lg font-bold mb-3" style={{ color: '#ebe1fe' }}>{s.title}</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#afa7c2' }}>{s.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-16 pt-8" style={{ borderTop: '1px solid rgba(189,157,255,0.1)' }}>
          <p className="text-xs" style={{ color: '#6b6483' }}>
            © {new Date().getFullYear()} PayEase. All rights reserved. &nbsp;
            <Link href="/terms" className="hover:text-[#bd9dff] transition-colors">Terms of Service</Link>
            &nbsp;·&nbsp;
            <Link href="/privacy" className="hover:text-[#bd9dff] transition-colors">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
