import { timingSafeEqual } from 'crypto'

/**
 * Constant-time string comparison. Use this for ALL secret comparisons
 * (webhook signatures, API tokens, cron secrets, super-admin secrets).
 * Plain `===` leaks the prefix length via timing and lets attackers
 * brute-force the secret one byte at a time.
 */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  // Pad both buffers to the same length so timingSafeEqual doesn't throw on mismatched length;
  // length differences are not secret (server picks `b`).
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) {
    // Still run a fake compare so the timing matches the failure path.
    timingSafeEqual(bb, bb)
    return false
  }
  return timingSafeEqual(ab, bb)
}

/**
 * Verify a Bearer-style Authorization header against an env secret.
 * Returns false if header is missing, malformed, or doesn't match.
 */
export function verifyBearer(authHeader: string | null, expected: string | undefined): boolean {
  if (!expected) return false
  if (!authHeader) return false
  const prefix = 'Bearer '
  if (!authHeader.startsWith(prefix)) return false
  return safeEqual(authHeader.slice(prefix.length), expected)
}
