# Security Hardening — Production Readiness

This document tracks security posture for PayEase. See `migrations/` for the SQL changes applied.

## What was hardened (automated)

### Database (Supabase)
- **RLS enabled** on all 26 public tables (was disabled on 6: `business_snapshots`, `company_viewers`, `viewer_sessions`, `employee_sessions`, `notification_settings`, `rate_limits`).
- **Service-role-only tables**: `viewer_sessions`, `employee_sessions`, `rate_limits`, `promo_codes` writes, `promo_code_uses` writes — no anon/authenticated access, only server code (service_role) can touch them.
- **Company-scoped policies**: `business_snapshots`, `company_viewers`, `notification_settings` are admin-only-of-their-company.
- **`contact_submissions`**: replaced `WITH CHECK = true` (always-true bypass) with length-capped validation on every field.
- **SECURITY DEFINER functions**: `auth_company_id`, `get_my_company_id`, `get_my_role`, `update_updated_at` now have `search_path = ''` (immune to search_path hijacking). Anon execute revoked.
- **Anon role**: SELECT/INSERT/UPDATE/DELETE revoked on every sensitive table. The only anon entry point is `contact_submissions.INSERT` (with content caps).
- **GraphQL endpoint**: `USAGE` on `graphql` schema revoked from anon + authenticated. We use PostgREST only — GraphQL is dead.

### API routes
- **Timing-safe secret comparisons**: webhook signature, super-admin secret, cron Bearer token — all now use `crypto.timingSafeEqual` via `src/lib/security.ts`. Plain `===` leaks the prefix length via timing.
- **Razorpay webhook**: still verifies HMAC-SHA256 signature; now also fails gracefully if the secret env var is missing.
- **Cron endpoints**: `verifyBearer()` helper used for both `/api/cron/*`.
- **`/api/promo/validate`** now requires auth + per-user rate limit (10/min) to prevent anonymous code-guessing.
- **`/api/viewers`** now requires `role = 'admin'` on every method (was: any authenticated user could create viewers).
- **`/api/auth/setup-company`** referral-discount activation flag changed from `true` → `false` (was auto-granting discount before referee paid).
- **Token lookups** (`/api/viewers/dashboard`, `/api/employee-portal/me`, `/api/employee-portal/logout`) now validate token shape (64 hex chars) before DB lookup. Defends against DoS via huge attacker-controlled token strings.
- **Input validation** (length caps + type checks) added to: `signup`, `setup-company`, `contact`, `referral/apply`, `viewers`, `promo/validate`.

### HTTP security headers (`next.config.mjs`)
- CSP tightened: added `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `upgrade-insecure-requests`. Added Vercel Analytics origin.
- HSTS extended to 2 years with `preload` directive.
- `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Resource-Policy: same-origin` added.
- `X-Powered-By` header disabled (no Next.js version leakage).
- `X-Frame-Options: DENY` + `frame-ancestors 'none'` (no clickjacking).

### Bug fixes (security-adjacent)
- `/api/dashboard` queried non-existent `advances` table → fixed to `employee_advances` with correct repayment math.
- `/api/cron/daily-notifications` queried non-existent `attendance` table → fixed to `attendance_records`. Also fixed `is_repaid` lookup (no such column) — now computes remaining from `advance_repayments`.
- `/api/employee-portal/me` had same `is_repaid` bug → fixed.
- Razorpay webhook email had no `micro` plan price → added.

---

## What YOU still need to do (manual — Supabase dashboard)

These can't be done via SQL/code. Open the Supabase dashboard for project `fbzytsvdhiksqtnyicxf`:

1. **Enable HaveIBeenPwned password protection**
   Path: **Auth → Policies → Password protection** → toggle on
   This blocks signups/changes that match leaked password lists.

2. **Enforce MFA on the super-admin Supabase user (your account)**
   Path: **Account settings → Multi-factor authentication** → enroll a TOTP app
   Your account can read every customer's data via the dashboard — MFA is non-negotiable.

3. **Restrict the Supabase service-role key**
   Path: **Project settings → API → Service role keys**
   Confirm only Vercel has this key. Rotate if you ever pasted it anywhere (chat, screenshot, public repo).

4. **Set up alerts**
   Path: **Reports → Alerts**
   - Alert on auth signup spike (brute force)
   - Alert on database errors spike

5. **Confirm Vercel env vars are scoped**
   In Vercel: `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_KEY_SECRET`, `SUPER_ADMIN_SECRET`, `CRON_SECRET` should all be **Production-only**, encrypted.
   `NEXT_PUBLIC_*` vars are fine in all environments.

---

## Known limitations (acceptable tradeoffs, document for posterity)

- **CSP allows `'unsafe-inline'` + `'unsafe-eval'`** for scripts. Required by Next.js inline bootstrap + Razorpay checkout. Tightening to nonce-based CSP needs a custom middleware injecting nonces per request — non-trivial. Mitigation: framework-driven XSS (React) is the main risk-reducer here.
- **Super-admin uses shared secret**, not signed tokens. Acceptable for a single operator; if you add ops staff, migrate to signed JWTs or IP allowlist.
- **`notification_settings` contains plaintext WhatsApp/SMS API tokens.** RLS restricts to company admin only, but tokens are not encrypted at rest. For production, consider per-row encryption (pgcrypto) or moving these to Vercel env vars per company.

## How to re-audit

```bash
# Via Supabase MCP / dashboard:
# Project → Advisors → Security
# Should return only INFO-level entries (no ERROR/WARN unless documented above).
```
