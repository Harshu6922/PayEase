import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':')
    const buf = Buffer.from(hash, 'hex')
    return timingSafeEqual(buf, scryptSync(password, salt, 64))
  } catch { return false }
}

export function generateToken(): string {
  return randomBytes(32).toString('hex')
}
