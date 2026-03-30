import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'edge'

const PUBLIC_PATHS = ['/', '/login', '/signup', '/billing', '/api/razorpay/webhook', '/api/auth/signup', '/api/auth/setup-company', '/onboarding', '/auth', '/contact', '/api/contact', '/viewer', '/api/viewers', '/api/cron', '/super-admin', '/api/super-admin', '/verify-mfa', '/privacy', '/terms', '/not-found']

function client(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => request.cookies.get(name)?.value, set: () => {}, remove: () => {} } }
  )
}

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)
  const { pathname } = request.nextUrl

  // Allow public paths through
  if (PUBLIC_PATHS.some(p => p === '/' ? pathname === '/' : pathname.startsWith(p))) {
    if (pathname.startsWith('/login') || pathname.startsWith('/signup')) {
      // Redirect already-logged-in users away from auth pages
      const { data: { session } } = await client(request).auth.getSession()
      if (session) return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return response
  }

  // Check session from cookie — zero network calls
  const { data: { session } } = await client(request).auth.getSession()
  if (!session) return NextResponse.redirect(new URL('/login', request.url))

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
