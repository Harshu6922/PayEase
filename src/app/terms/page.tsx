import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — PayEase Buddy',
  description: 'Terms and conditions for using PayEase Buddy.',
}

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: `By creating an account or using PayEase Buddy, you agree to these Terms of Service. If you do not agree, do not use the service. These terms apply to all users including admins, viewers, and employees accessing the self-service portal.`,
  },
  {
    title: '2. Description of Service',
    body: `PayEase Buddy is a cloud-based payroll and workforce management platform. We provide tools for managing employees, tracking attendance, processing payroll, and generating reports. The service is provided on a subscription basis.`,
  },
  {
    title: '3. Account Responsibilities',
    body: `You are responsible for maintaining the security of your account credentials. You must not share your login details or allow unauthorised access to your account. You are responsible for all activity that occurs under your account. Notify us immediately if you suspect unauthorised access.`,
  },
  {
    title: '4. Subscription & Billing',
    body: `Subscriptions are billed monthly via Razorpay. Prices are shown in Indian Rupees (INR) inclusive of applicable taxes. Subscriptions auto-renew unless cancelled. Refunds are not provided for partial billing periods. We reserve the right to change pricing with 30 days notice.`,
  },
  {
    title: '5. Free Trial',
    body: `New accounts receive a 7-day free trial with full access to all features. No credit card is required for the trial. At the end of the trial period, you must subscribe to continue using the service. Trial accounts that do not convert are locked and data is retained for 30 days before deletion.`,
  },
  {
    title: '6. Acceptable Use',
    body: `You may only use PayEase Buddy for lawful purposes. You must not attempt to reverse engineer, hack, or exploit the platform. You must not use the service to store or transmit illegal, fraudulent, or harmful content. We reserve the right to suspend accounts that violate these terms without prior notice.`,
  },
  {
    title: '7. Data Ownership',
    body: `You retain full ownership of all data you input into PayEase Buddy including employee records, payroll data, and company information. We do not claim any rights over your data. Upon account deletion, all your data is permanently removed within 30 days.`,
  },
  {
    title: '8. Service Availability',
    body: `We aim for 99.9% uptime but do not guarantee uninterrupted service. Scheduled maintenance will be communicated in advance where possible. We are not liable for losses arising from temporary service unavailability.`,
  },
  {
    title: '9. Limitation of Liability',
    body: `PayEase Buddy is provided "as is". We are not liable for any indirect, incidental, or consequential damages arising from the use of our service. Our maximum liability to you in any month shall not exceed the subscription amount paid in that month.`,
  },
  {
    title: '10. Termination',
    body: `You may cancel your subscription at any time from the Billing page. We reserve the right to terminate accounts that violate these terms. Upon termination, your access to the service ends immediately and your data is retained for 30 days before deletion.`,
  },
  {
    title: '11. Governing Law',
    body: `These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in India.`,
  },
  {
    title: '12. Changes to Terms',
    body: `We may update these terms from time to time. We will notify users by email before significant changes take effect. Continued use of the service after changes constitutes acceptance of the updated terms.`,
  },
  {
    title: '13. Contact',
    body: `For questions about these terms, contact us at payeasebuddy@gmail.com or use the contact form on our website.`,
  },
]

export default function TermsOfService() {
  return (
    <div className="min-h-screen" style={{ background: '#0F0A1E' }}>
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">

        <Link href="/" className="inline-flex items-center gap-2 text-sm mb-10 transition-colors"
          style={{ color: '#afa7c2' }}>
          ← Back to home
        </Link>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3"
          style={{ color: '#ebe1fe' }}>Terms of Service</h1>
        <p className="text-sm mb-12" style={{ color: '#afa7c2' }}>
          Last updated: March 2026
        </p>

        <p className="text-sm leading-relaxed mb-12" style={{ color: '#afa7c2' }}>
          Please read these Terms of Service carefully before using PayEase Buddy. These terms form a legally binding agreement between you and PayEase Buddy.
        </p>

        <div className="space-y-10">
          {SECTIONS.map(s => (
            <section key={s.title}>
              <h2 className="text-lg font-bold mb-3" style={{ color: '#ebe1fe' }}>{s.title}</h2>
              <p className="text-sm leading-relaxed" style={{ color: '#afa7c2' }}>{s.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-16 pt-8" style={{ borderTop: '1px solid rgba(189,157,255,0.1)' }}>
          <p className="text-xs" style={{ color: '#6b6483' }}>
            © {new Date().getFullYear()} PayEase Buddy. All rights reserved. &nbsp;
            <Link href="/privacy" className="hover:text-[#bd9dff] transition-colors">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
