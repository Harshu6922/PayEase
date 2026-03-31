import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — PayEase',
  description: 'How PayEase collects, uses, and protects your data.',
}

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: `We collect information you provide directly: company name, email address, employee names, salary details, attendance records, and payment information. We also collect usage data such as pages visited and features used to improve the product.`,
  },
  {
    title: '2. How We Use Your Information',
    body: `We use your data solely to provide the PayEase service — processing payroll, generating reports, and sending notifications you configure. We do not sell, rent, or share your data with third parties for marketing purposes.`,
  },
  {
    title: '3. Data Storage & Security',
    body: `Your data is stored on Supabase (hosted on AWS ap-southeast-1). All data is encrypted at rest and in transit using TLS 1.2+. We implement rate limiting, row-level security, and regular security audits to protect your information.`,
  },
  {
    title: '4. Employee Data',
    body: `Payroll data including employee names, salaries, and attendance records is visible only to authorised users of your company account. Employees accessing the self-service portal can only view their own data. We never access your employee data except for technical support when explicitly requested.`,
  },
  {
    title: '5. Payment Information',
    body: `Subscription payments are processed by Razorpay. We do not store your card or bank details. Razorpay's privacy policy governs the handling of payment data.`,
  },
  {
    title: '6. Cookies & Analytics',
    body: `We use Vercel Analytics to understand how users interact with PayEase. This is privacy-safe and does not use cookies or track individuals across sites. No personal data is included in analytics.`,
  },
  {
    title: '7. Data Retention',
    body: `We retain your data for as long as your account is active. If you delete your account, all company data is permanently deleted within 30 days. You may request immediate deletion by contacting support.`,
  },
  {
    title: '8. Your Rights',
    body: `You have the right to access, correct, or delete your personal data at any time. You may also export your data from the Reports section of your account. To exercise any of these rights, contact us at the email below.`,
  },
  {
    title: '9. Changes to This Policy',
    body: `We may update this policy occasionally. We will notify you by email or in-app notification before significant changes take effect. Continued use of PayEase after changes constitutes acceptance.`,
  },
  {
    title: '10. Contact',
    body: `For privacy-related questions, email us at payeasebuddy@gmail.com or use the contact form on our website.`,
  },
]

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen" style={{ background: '#0F0A1E' }}>
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">

        <Link href="/" className="inline-flex items-center gap-2 text-sm mb-10 transition-colors"
          style={{ color: '#afa7c2' }}>
          ← Back to home
        </Link>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3"
          style={{ color: '#ebe1fe' }}>Privacy Policy</h1>
        <p className="text-sm mb-12" style={{ color: '#afa7c2' }}>
          Last updated: March 2026
        </p>

        <p className="text-sm leading-relaxed mb-12" style={{ color: '#afa7c2' }}>
          PayEase (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is committed to protecting the privacy of businesses and individuals who use our payroll management platform. This policy explains what data we collect, how we use it, and your rights.
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
            © {new Date().getFullYear()} PayEase. All rights reserved. &nbsp;
            <Link href="/terms" className="hover:text-[#bd9dff] transition-colors">Terms of Service</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
