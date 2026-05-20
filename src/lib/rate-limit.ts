import { createClient as createAdminClient } from '@supabase/supabase-js'

const DEFAULT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const DEFAULT_MAX_ATTEMPTS = 5

export interface RateLimitOptions {
  windowMs?: number
  maxAttempts?: number
}

/**
 * Returns true if the request should be blocked (rate limit exceeded).
 * Key should be descriptive, e.g. "emp_login:companyId:employeeId"
 */
export async function isRateLimited(key: string, opts: RateLimitOptions = {}): Promise<boolean> {
  const WINDOW_MS = opts.windowMs ?? DEFAULT_WINDOW_MS
  const MAX_ATTEMPTS = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS

  const db = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString()

  const { data } = await db
    .from('rate_limits')
    .select('attempts, window_start')
    .eq('key', key)
    .maybeSingle()

  if (!data) {
    // First attempt — insert
    await db.from('rate_limits').insert({ key })
    return false
  }

  const windowExpired = new Date(data.window_start) < new Date(windowStart)

  if (windowExpired) {
    // Reset window
    await db.from('rate_limits').update({ attempts: 1, window_start: new Date().toISOString() }).eq('key', key)
    return false
  }

  if (data.attempts >= MAX_ATTEMPTS) {
    return true // blocked
  }

  // Increment
  await db.from('rate_limits').update({ attempts: data.attempts + 1 }).eq('key', key)
  return false
}

/**
 * Clear rate limit after successful login (optional, resets on success)
 */
export async function clearRateLimit(key: string): Promise<void> {
  const db = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  await db.from('rate_limits').delete().eq('key', key)
}
