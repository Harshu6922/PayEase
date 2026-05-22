# PayEase Launch Checklist

Tasks that **must** be completed manually outside the codebase before public launch.
Code-level work is done. This file is the punch list.

---

## 🚫 BLOCKERS — do all of these before announcing the product

### 1. Verify the sending email domain on Resend
The code now sends from `noreply@payeasebuddy.co.in` (configurable via `RESEND_FROM` env var).

- [ ] Log into Resend → Domains → Add `payeasebuddy.co.in`
- [ ] Add the SPF + DKIM + DMARC DNS records Resend gives you (in your domain DNS provider — Hostinger / GoDaddy / Cloudflare, wherever the domain is)
- [ ] Wait for "Verified" status (usually 5–30 min)
- [ ] Set env vars in Vercel:
  - `RESEND_API_KEY=re_xxx` (from Resend dashboard)
  - `RESEND_FROM=PayEase <noreply@payeasebuddy.co.in>` (optional override)
  - `NEXT_PUBLIC_APP_URL=https://www.payeasebuddy.co.in`
- [ ] Send yourself a test email — sign up a new throwaway account and confirm the welcome email arrives in inbox (not spam)

### 2. Razorpay live-mode verification
- [ ] Razorpay dashboard → Account & Settings → **Business Profile** → fully verified (KYC, bank account, PAN, GST if applicable)
- [ ] Toggle from **Test Mode** to **Live Mode** in Razorpay dashboard
- [ ] Update Vercel env vars to the **live** keys (not test):
  - `RAZORPAY_KEY_ID` (starts with `rzp_live_`)
  - `RAZORPAY_KEY_SECRET`
  - `NEXT_PUBLIC_RAZORPAY_KEY_ID` (same as `RAZORPAY_KEY_ID`)
  - `RAZORPAY_WEBHOOK_SECRET` (set this in Razorpay → Webhooks → Add → point to `https://www.payeasebuddy.co.in/api/razorpay/webhook` and copy the secret)
  - `RAZORPAY_PLAN_MICRO_ID` (create plan in Razorpay live, paste ID — repeat for STARTER, GROWTH, BUSINESS)
- [ ] Confirm the four plan IDs match the IDs in your live Razorpay account

### 3. Real-money end-to-end test
- [ ] Sign up a fresh test account (e.g. with a personal Gmail)
- [ ] Click upgrade → pick **Micro ₹125** → pay with a real card
- [ ] Confirm webhook fires (Razorpay → Webhooks → see the event)
- [ ] Confirm subscription row in Supabase shows `status='active'`
- [ ] Confirm payment confirmation email arrived
- [ ] Refund the test charge yourself from Razorpay dashboard to verify the refund flow works

### 4. Supabase Auth dashboard toggles
- [ ] Project → Authentication → Policies → enable **"Check against HaveIBeenPwned"** (blocks signup with known-leaked passwords)
- [ ] Your account → Multi-factor authentication → enroll a TOTP app (Google Authenticator / 1Password / etc.) on your Supabase account so your DB can't be compromised by an email-only attacker

### 5. Sentry error monitoring (optional but strongly recommended)
The SDK is installed and configured. To activate:
- [ ] Create a free Sentry account → New project → "Next.js"
- [ ] Copy the DSN
- [ ] Set Vercel env vars:
  - `NEXT_PUBLIC_SENTRY_DSN=https://...@...ingest.sentry.io/...`
  - `SENTRY_ORG=your-org-slug`
  - `SENTRY_PROJECT=payease`
  - `SENTRY_AUTH_TOKEN=...` (Sentry → Settings → Auth Tokens, scope: `project:releases`)
- [ ] Redeploy. Trigger a test error to confirm it appears in Sentry.

---

## ⚠️ STRONGLY RECOMMENDED — within first week post-launch

### 6. Database backups
- [ ] Supabase → Database → Backups — confirm daily backup is running
- [ ] On free tier you get 7-day PITR (point-in-time recovery). If your data is critical, upgrade Supabase plan for longer retention
- [ ] Test restore: pick a recent backup and verify you can restore it to a branch

### 7. Support inbox set up
- [ ] Make sure `payeasebuddy@gmail.com` is monitored by you daily
- [ ] Optional: set up an auto-reply: "We've received your message — we reply within 24 hours."

### 8. Domain → Vercel sanity check
- [ ] `www.payeasebuddy.co.in` resolves and serves HTTPS (it already does)
- [ ] Bare `payeasebuddy.co.in` 301-redirects to `www.` version (check in Vercel → Settings → Domains)
- [ ] SSL cert is valid for at least 60 more days (Vercel auto-renews; check date)

### 9. Play Store listing
- [ ] GitHub Actions tab → run **"Build Android TWA (APK/AAB)"** workflow
- [ ] Download `payease-android-build.zip` from the artifact
- [ ] **Save `android.keystore` somewhere SAFE and back it up** — if you lose it you can never update the app
- [ ] Extract SHA-256 fingerprint from the keystore:
      `keytool -list -v -keystore android.keystore -alias payease -storepass payease123`
      Copy the SHA256 hex string
- [ ] Open `public/.well-known/assetlinks.json`, replace `PASTE_SHA256_FINGERPRINT_FROM_PWABUILDER_HERE` with that SHA256, commit & push
- [ ] Play Console → Create app → upload the `.aab` file → fill out store listing
- [ ] Pricing: Free / Category: Business / Content rating: filled out / Privacy policy URL: `https://www.payeasebuddy.co.in/privacy`
- [ ] Submit for review (~3–7 days)

---

## ✅ ALREADY DONE BY CODE

- Security hardening (RLS, headers, timing-safe secrets, input validation, rate limiting)
- Refund & Cancellation Policy page at `/refund-policy`
- Footer links to Terms / Privacy / Refund Policy on landing page
- Support email visible in footer + emails
- Sitemap includes `/refund-policy`
- Email templates updated with correct domain + URLs + pricing
- Sentry SDK installed + configured (just needs DSN env var)
- Test data verification — all payroll formulas confirmed correct
- PWA manifest, service worker, offline page
- GitHub Actions workflow for Android APK build

---

## ENV VAR CHECKLIST (Vercel → Settings → Environment Variables)

Production-required:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://www.payeasebuddy.co.in
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_WEBHOOK_SECRET=
RAZORPAY_PLAN_MICRO_ID=
RAZORPAY_PLAN_STARTER_ID=
RAZORPAY_PLAN_GROWTH_ID=
RAZORPAY_PLAN_BUSINESS_ID=
RESEND_API_KEY=re_...
RESEND_FROM=PayEase <noreply@payeasebuddy.co.in>
CRON_SECRET=          # any long random string; set same value in your cron scheduler
SUPER_ADMIN_SECRET=   # any long random string; you use this from /super-admin
```

Optional (Sentry):
```
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```
