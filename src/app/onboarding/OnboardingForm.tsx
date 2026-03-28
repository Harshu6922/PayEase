'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2 } from 'lucide-react'
import { springScaleIn } from '@/lib/animations'

const inputCls =
  'w-full bg-[#0F0A1E] border border-[#4b455c] rounded-xl px-4 py-3 text-[#ebe1fe] placeholder:text-[#4b455c]/80 focus:outline-none focus:border-[#bd9dff] focus:ring-1 focus:ring-[#bd9dff] transition-all text-sm'

export default function OnboardingForm({ userId, email }: { userId: string; email: string }) {
  const [companyName, setCompanyName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [city, setCity] = useState('')
  const [teamSize, setTeamSize] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const pending = localStorage.getItem('pendingReferralCode')
    if (pending) setReferralCode(pending)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyName.trim()) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/setup-company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: companyName.trim(),
        ownerName: ownerName.trim() || undefined,
        city: city.trim() || undefined,
        teamSize: teamSize || undefined,
        referralCode: referralCode.trim() || undefined,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Setup failed')
      setLoading(false)
      return
    }

    localStorage.removeItem('pendingReferralCode')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#0F0A1E] flex flex-col items-center justify-center relative overflow-hidden px-6 py-12">

      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-20 -right-20 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(189,157,255,0.15) 0%, transparent 70%)', filter: 'blur(60px)' }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full opacity-50"
          style={{ background: 'radial-gradient(circle, rgba(189,157,255,0.15) 0%, transparent 70%)', filter: 'blur(60px)' }}
        />
      </div>

      {/* Logo */}
      <div className="mb-10 relative z-10">
        <img src="/payease logo.png" alt="PayEase" className="h-14 w-14 mx-auto rounded-2xl object-cover" />
      </div>

      {/* Card */}
      <motion.div
        variants={springScaleIn}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-[480px] bg-[rgba(26,16,53,0.8)] backdrop-blur-2xl border border-[#7C3AED]/20 rounded-2xl p-10 md:p-12 flex flex-col items-center shadow-2xl shadow-black/60"
      >
        {/* Step badge */}
        <div className="inline-flex items-center px-3 py-1 rounded-full border border-[#bd9dff]/30 bg-[#bd9dff]/5 mb-5">
          <span className="text-[10px] uppercase tracking-widest font-bold text-[#afa7c2]">Step 1 of 1</span>
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-[#ebe1fe] tracking-tight">Set up your business</h1>
          <p className="mt-2 text-sm text-[#afa7c2] max-w-xs mx-auto">
            Tell us about your business to personalise your experience.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="w-full mb-6 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 text-center">
            {error}
          </div>
        )}

        <form className="w-full space-y-5" onSubmit={handleSubmit}>
          {/* Business Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#afa7c2] uppercase tracking-wider ml-1">
              Business Name
            </label>
            <input
              type="text"
              required
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Corp India"
              className={inputCls}
            />
          </div>

          {/* Owner Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#afa7c2] uppercase tracking-wider ml-1">
              Owner Name
            </label>
            <input
              type="text"
              value={ownerName}
              onChange={e => setOwnerName(e.target.value)}
              placeholder="Enter full name"
              className={inputCls}
            />
          </div>

          {/* City + Team Size */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#afa7c2] uppercase tracking-wider ml-1">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Mumbai"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#afa7c2] uppercase tracking-wider ml-1">
                Team Size
              </label>
              <select
                value={teamSize}
                onChange={e => setTeamSize(e.target.value)}
                className={inputCls + ' appearance-none'}
              >
                <option value="" disabled>Select size</option>
                <option value="1-5">1–5</option>
                <option value="6-20">6–20</option>
                <option value="21-50">21–50</option>
                <option value="50+">50+</option>
              </select>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <motion.button
              type="submit"
              disabled={loading || !companyName.trim()}
              whileTap={{ scale: 0.97 }}
              className="w-full bg-[#bd9dff] hover:bg-[#a67aff] text-[#3c0089] font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(189,157,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Setting up…</>
              ) : (
                <>Get Started <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>
              )}
            </motion.button>
          </div>
        </form>

        {/* Progress bar */}
        <div className="w-full flex gap-2 mt-10">
          <div className="h-1 flex-1 bg-[#bd9dff] rounded-full" />
          <div className="h-1 flex-1 bg-[#28213e] rounded-full" />
        </div>
      </motion.div>

      {/* Trust indicator */}
      <p className="relative z-10 mt-8 text-[#afa7c2]/40 text-[10px] uppercase tracking-[0.2em] font-bold">
        Trusted by 500+ Indian Businesses
      </p>

      {/* Decorative sphere */}
      <div className="absolute bottom-10 right-10 w-24 h-24 rounded-full border border-white/5 bg-white/5 backdrop-blur-sm z-0 hidden lg:block" />
    </div>
  )
}
