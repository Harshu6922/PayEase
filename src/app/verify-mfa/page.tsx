'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShieldCheck } from 'lucide-react'

export default function VerifyMFA() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => { inputRef.current?.focus() }, [])

  async function verify() {
    if (code.length !== 6) return
    setLoading(true); setError(null)
    const supabase = createClient() as any

    const { data: factors } = await supabase.auth.mfa.listFactors()
    const totpFactor = factors?.totp?.[0]
    if (!totpFactor) { setError('No 2FA factor found.'); setLoading(false); return }

    const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id })
    if (challengeErr) { setError(challengeErr.message); setLoading(false); return }

    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId: totpFactor.id,
      challengeId: challenge.id,
      code,
    })

    if (verifyErr) {
      setError('Invalid code. Please try again.')
      setCode('')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0F0A1E' }}>
      <div className="w-full max-w-sm">
        <div className="rounded-2xl p-10 text-center"
          style={{ background: 'rgba(28,22,46,0.6)', backdropFilter: 'blur(24px)', border: '1px solid rgba(189,157,255,0.1)' }}>

          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(189,157,255,0.1)', border: '1px solid rgba(189,157,255,0.2)' }}>
            <ShieldCheck className="w-7 h-7" style={{ color: '#bd9dff' }} />
          </div>

          <h1 className="text-xl font-bold mb-1" style={{ color: '#ebe1fe' }}>Two-Factor Auth</h1>
          <p className="text-sm mb-8" style={{ color: '#afa7c2' }}>
            Enter the 6-digit code from your authenticator app
          </p>

          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={e => {
              const v = e.target.value.replace(/\D/g, '')
              setCode(v)
              if (v.length === 6) setTimeout(() => verify(), 0)
            }}
            placeholder="000000"
            className="w-full text-center text-3xl font-mono tracking-[0.5em] py-4 rounded-xl outline-none mb-4"
            style={{
              background: 'rgba(189,157,255,0.06)',
              border: `1px solid ${error ? 'rgba(255,110,132,0.4)' : 'rgba(189,157,255,0.15)'}`,
              color: '#ebe1fe',
              letterSpacing: '0.4em',
            }}
          />

          {error && (
            <p className="text-sm mb-4" style={{ color: '#ff6e84' }}>{error}</p>
          )}

          <button
            onClick={verify}
            disabled={code.length !== 6 || loading}
            className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-40 transition-all"
            style={{ background: '#bd9dff', color: '#0F0A1E' }}
          >
            {loading ? 'Verifying…' : 'Verify'}
          </button>

          <p className="text-xs mt-5" style={{ color: '#afa7c2' }}>
            Open Google Authenticator or Authy to get your code.
          </p>
        </div>
      </div>
    </div>
  )
}
