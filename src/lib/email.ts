import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'PayEase Buddy <noreply@payeasebuddy.co.in>'
const SITE = 'https://payeasebuddy.co.in'
const SUPPORT_EMAIL = 'payeasebuddy@gmail.com'

export async function sendTrialEndingEmail(to: string, companyName: string, daysLeft: number) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your PayEase Buddy trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0F0A1E;color:#ebe1fe;padding:40px 32px;border-radius:16px">
        <div style="font-size:28px;font-weight:900;color:#bd9dff;margin-bottom:8px">PayEase Buddy</div>
        <h1 style="font-size:22px;font-weight:700;margin:24px 0 12px">Your trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}</h1>
        <p style="color:#afa7c2;font-size:14px;line-height:1.6">
          Hi ${companyName}, your free trial of PayEase Buddy ends soon. Subscribe now to keep access to your payroll data, employee records, and all features.
        </p>
        <a href="${SITE}/billing"
          style="display:inline-block;margin:24px 0;padding:14px 28px;background:#bd9dff;color:#0F0A1E;font-weight:700;font-size:14px;border-radius:12px;text-decoration:none">
          Choose a Plan →
        </a>
        <p style="color:#6b6483;font-size:12px;margin-top:32px">
          Plans start at ₹299/month. Questions? Email us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#bd9dff">${SUPPORT_EMAIL}</a>
        </p>
      </div>
    `,
  })
}

export async function sendPaymentConfirmationEmail(to: string, companyName: string, planName: string, amountRs: number) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Payment confirmed — PayEase Buddy ${planName} Plan`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0F0A1E;color:#ebe1fe;padding:40px 32px;border-radius:16px">
        <div style="font-size:28px;font-weight:900;color:#bd9dff;margin-bottom:8px">PayEase Buddy</div>
        <h1 style="font-size:22px;font-weight:700;margin:24px 0 12px">Payment confirmed ✓</h1>
        <p style="color:#afa7c2;font-size:14px;line-height:1.6">
          Thank you, ${companyName}. Your payment of <strong style="color:#ebe1fe">₹${amountRs.toLocaleString('en-IN')}</strong> for the <strong style="color:#ebe1fe">${planName} Plan</strong> has been received.
        </p>
        <div style="margin:24px 0;padding:20px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:12px">
          <p style="margin:0;font-size:13px;color:#10b981;font-weight:600">Active subscription — full access restored</p>
        </div>
        <a href="${SITE}/dashboard"
          style="display:inline-block;padding:14px 28px;background:#bd9dff;color:#0F0A1E;font-weight:700;font-size:14px;border-radius:12px;text-decoration:none">
          Go to Dashboard →
        </a>
        <p style="color:#6b6483;font-size:12px;margin-top:32px">
          Need help? Email us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#bd9dff">${SUPPORT_EMAIL}</a>
        </p>
      </div>
    `,
  })
}

export async function sendWelcomeEmail(to: string, companyName: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Welcome to PayEase Buddy — your trial has started',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0F0A1E;color:#ebe1fe;padding:40px 32px;border-radius:16px">
        <div style="font-size:28px;font-weight:900;color:#bd9dff;margin-bottom:8px">PayEase Buddy</div>
        <h1 style="font-size:22px;font-weight:700;margin:24px 0 12px">Welcome, ${companyName} 👋</h1>
        <p style="color:#afa7c2;font-size:14px;line-height:1.6">
          Your 7-day free trial has started. Here's what to do first:
        </p>
        <ol style="color:#afa7c2;font-size:14px;line-height:2;padding-left:20px">
          <li>Add your employees under <strong style="color:#ebe1fe">Employees</strong></li>
          <li>Mark today's attendance under <strong style="color:#ebe1fe">Attendance</strong></li>
          <li>Run your first payroll under <strong style="color:#ebe1fe">Reports</strong></li>
        </ol>
        <a href="${SITE}/dashboard"
          style="display:inline-block;margin:24px 0;padding:14px 28px;background:#bd9dff;color:#0F0A1E;font-weight:700;font-size:14px;border-radius:12px;text-decoration:none">
          Get Started →
        </a>
        <p style="color:#6b6483;font-size:12px;margin-top:32px">
          Trial ends in 7 days. <a href="${SITE}/billing" style="color:#bd9dff">View plans</a>
        </p>
      </div>
    `,
  })
}
