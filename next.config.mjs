/** @type {import('next').NextConfig} */
import { withSentryConfig } from '@sentry/nextjs'

const ContentSecurityPolicy = [
  "default-src 'self'",
  "connect-src 'self' *.supabase.co wss://*.supabase.co *.razorpay.com vitals.vercel-insights.com va.vercel-scripts.com *.sentry.io *.ingest.sentry.io *.ingest.us.sentry.io *.ingest.de.sentry.io",
  "img-src 'self' data: blob: *.razorpay.com",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.razorpay.com checkout.razorpay.com va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "frame-src *.razorpay.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join('; ')

const nextConfig = {
  poweredByHeader: false, // Don't leak Next.js version via X-Powered-By
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'Content-Security-Policy', value: ContentSecurityPolicy },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
      ],
    }]
  },
}
// Wrap with Sentry only when DSN is configured; otherwise export plain config
// so local dev / preview builds without Sentry env vars still work.
const finalConfig = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      // Hide sourcemaps from public + tunnel through Vercel to avoid ad-blockers
      hideSourceMaps: true,
      disableLogger: true,
    })
  : nextConfig

export default finalConfig
