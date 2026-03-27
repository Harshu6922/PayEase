'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { springScaleIn } from '@/lib/animations'

export default function OnboardingForm({ userId, email }: { userId: string; email: string }) {
  const [companyName, setCompanyName] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/setup-company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyName, referralCode: referralCode || undefined }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Setup failed')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 overflow-hidden">
      {/* Purple orb top-right */}
      <div
        className="fixed top-0 right-0 w-[480px] h-[480px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)',
          filter: 'blur(60px)',
          transform: 'translate(30%, -30%)',
        }}
      />

      <motion.div
        variants={springScaleIn}
        initial="hidden"
        animate="visible"
        className="relative w-full max-w-md backdrop-blur-xl bg-[rgba(28,22,46,0.8)] border border-[#7C3AED]/20 rounded-2xl p-8 md:p-10 space-y-6"
      >
        {/* Logo + heading */}
        <div className="flex flex-col items-center gap-3 text-center">
          <img src="/payease logo.png" alt="PayEase" className="h-10 w-auto" />
          <h2 className="text-text font-bold text-3xl">Welcome to PayEase</h2>
          <p className="text-text-muted text-sm">Tell us about your business to get started.</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger rounded-xl px-4 py-3 text-sm text-center">
            {error}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="block text-xs uppercase tracking-wider text-text-muted font-semibold">
              Company Name
            </label>
            <input
              type="text"
              required
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="Acme Corp"
              className="block w-full bg-background border border-[#7C3AED]/30 rounded-xl px-4 py-3 text-text placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs uppercase tracking-wider text-text-muted font-semibold">
              Referral Code{' '}
              <span className="normal-case tracking-normal font-normal text-text-muted/60">(optional)</span>
            </label>
            <input
              type="text"
              value={referralCode}
              onChange={e => setReferralCode(e.target.value)}
              placeholder="Enter code for discount"
              className="block w-full bg-background border border-[#7C3AED]/30 rounded-xl px-4 py-3 text-text placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
            />
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-[0_10px_30px_-10px_rgba(124,58,237,0.5)] hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Setting up…' : 'Get Started →'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}
