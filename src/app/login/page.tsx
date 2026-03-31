'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { springScaleIn } from '@/lib/animations'

export default function LoginPage() {
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [referralCode, setReferralCode] = useState('')
  const supabase = createClient()

  async function handleGoogle() {
    setGoogleLoading(true)
    setError(null)
    if (referralCode.trim()) {
      localStorage.setItem('pendingReferralCode', referralCode.trim().toUpperCase())
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
    if (error) { setError(error.message); setGoogleLoading(false) }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden px-4 py-24">

      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-[20%] -left-[10%] w-[600px] h-[600px] rounded-full blur-[100px]"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-[20%] -right-[10%] w-[600px] h-[600px] rounded-full blur-[100px]"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)' }}
        />
      </div>

      {/* Glass card */}
      <motion.div
        variants={springScaleIn}
        initial="hidden"
        animate="visible"
        className="w-full max-w-[400px] relative z-10"
      >
        <div className="backdrop-blur-xl bg-[rgba(28,22,46,0.8)] border border-[#7C3AED]/20 rounded-2xl p-8 md:p-10 shadow-2xl shadow-black/50">

          {/* Logo & Brand */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 border border-[#7C3AED]/20">
              <img src="/payease logo.png" alt="PayEase" className="w-9 h-9 rounded-lg object-cover" />
            </div>
            <h1 className="text-3xl font-bold text-text tracking-tight">Welcome back</h1>
            <p className="text-text-muted text-sm mt-2">Sign in to your account</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 bg-danger/10 border border-danger/30 text-danger text-sm rounded-xl px-4 py-3 text-center">
              {error}
            </div>
          )}

          {/* Referral code */}
          <div className="mb-5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
              Referral Code <span className="normal-case font-normal opacity-60">(optional)</span>
            </label>
            <input
              type="text"
              value={referralCode}
              onChange={e => setReferralCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC12345"
              maxLength={8}
              className="w-full bg-[rgba(189,157,255,0.05)] border border-[rgba(189,157,255,0.1)] rounded-xl px-4 py-3 text-sm text-[#ebe1fe] placeholder-[#afa7c2]/50 font-mono uppercase focus:outline-none focus:border-[#bd9dff]/40 transition-colors"
            />
          </div>

          {/* Google Sign In */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full bg-primary text-white font-bold py-4 rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-all shadow-[0_10px_30px_-10px_rgba(124,58,237,0.5)] flex items-center justify-center gap-3"
          >
            {!googleLoading && (
              <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/>
              </svg>
            )}
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </motion.button>

          {/* Footer */}
          <div className="mt-8 text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-text-muted" />
              <span className="text-[11px] text-text-muted/80 uppercase tracking-widest font-medium">Secure sign-in · No password needed</span>
            </div>
            <p className="text-xs" style={{ color: '#afa7c2' }}>
              Are you an employee?{' '}
              <Link href="/employee-portal" className="font-semibold transition-colors" style={{ color: '#bd9dff' }}>
                Access your portal →
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
