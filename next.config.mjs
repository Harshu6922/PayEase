import withPWA from 'next-pwa'

const pwa = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'Content-Security-Policy', value: "default-src 'self'; connect-src 'self' *.supabase.co *.razorpay.com wss://*.supabase.co; img-src 'self' data: blob: *.razorpay.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' *.razorpay.com checkout.razorpay.com; style-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-src *.razorpay.com; frame-ancestors 'none'" },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      ],
    }]
  },
}

export default pwa(nextConfig)
