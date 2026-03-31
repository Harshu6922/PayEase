'use client'

import { useState, useRef, useEffect } from 'react'
import { KeyRound, Eye, EyeOff, Check, X, Copy, Link2, Share2 } from 'lucide-react'

interface Props {
  employeeUuid: string
  employeeName: string
  companyId: string
  employeeDisplayId: string
  employeePhone?: string | null
}

export default function SetPortalPasswordButton({
  employeeUuid, employeeName, companyId, employeeDisplayId, employeePhone,
}: Props) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'password' | 'share'>('password')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const portalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/employee-portal?c=${companyId}`
    : `/employee-portal?c=${companyId}`

  const accessText = `PayEase Employee Portal\nURL: ${portalUrl}\nEmployee ID: ${employeeDisplayId}\nPassword: (as set by admin)`

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false); setPassword(''); setError(null); setSuccess(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function handleSet() {
    if (!password) return
    setLoading(true); setError(null)
    const res = await fetch('/api/employee-portal/set-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_uuid: employeeUuid, password }),
    })
    const d = await res.json()
    setLoading(false)
    if (!res.ok) { setError(d.error); return }
    setSuccess(true)
    setTimeout(() => { setTab('share'); setPassword(''); setSuccess(false) }, 900)
  }

  function handleCopy() {
    navigator.clipboard.writeText(accessText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSMS() {
    const msg = encodeURIComponent(accessText)
    const digits = (employeePhone ?? '').replace(/\D/g, '')
    const phone = digits.startsWith('91') ? digits : digits.length === 10 ? `91${digits}` : digits
    window.open(`sms:+${phone}?body=${msg}`)
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => { setOpen(v => !v); setError(null); setSuccess(false) }}
        title="Portal access"
        className="p-2 rounded-lg transition-colors"
        style={{
          color: open ? '#bd9dff' : '#afa7c2',
          background: open ? 'rgba(189,157,255,0.08)' : 'transparent',
        }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLButtonElement).style.color = '#ebe1fe' }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLButtonElement).style.color = '#afa7c2' }}
      >
        <KeyRound size={14} />
      </button>

      {open && (
        <div
          className="absolute bottom-full mb-2 right-0 z-50 rounded-xl shadow-2xl"
          style={{
            background: 'rgba(22,17,38,0.97)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(189,157,255,0.2)',
            minWidth: 260,
          }}
        >
          {/* Tab bar */}
          <div className="flex border-b" style={{ borderColor: 'rgba(189,157,255,0.1)' }}>
            {(['password', 'share'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                style={{
                  color: tab === t ? '#bd9dff' : '#afa7c2',
                  borderBottom: tab === t ? '2px solid #bd9dff' : '2px solid transparent',
                }}
              >
                {t === 'password' ? <><KeyRound size={11} /> Set Password</> : <><Share2 size={11} /> Share Access</>}
              </button>
            ))}
          </div>

          <div className="p-4">
            <p className="text-xs font-bold mb-0.5 truncate" style={{ color: '#ebe1fe' }}>{employeeName}</p>
            <p className="text-[10px] mb-3 font-mono" style={{ color: '#afa7c2' }}>{employeeDisplayId}</p>

            {tab === 'password' ? (
              <>
                {error && (
                  <p className="text-[10px] mb-2 px-2 py-1.5 rounded-lg"
                    style={{ background: 'rgba(255,110,132,0.1)', color: '#ff6e84' }}>
                    {error}
                  </p>
                )}
                {success ? (
                  <div className="flex items-center gap-2 py-1" style={{ color: '#10b981' }}>
                    <Check size={14} /><span className="text-xs font-semibold">Password set! Switching to share…</span>
                  </div>
                ) : (
                  <>
                    <div style={{ position: 'relative' }} className="mb-3">
                      <input
                        autoFocus
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSet()}
                        placeholder="New password (min 8 chars)"
                        className="w-full rounded-lg text-xs outline-none"
                        style={{
                          background: 'rgba(189,157,255,0.06)',
                          border: '1px solid rgba(189,157,255,0.15)',
                          color: '#ebe1fe',
                          padding: '8px 36px 8px 10px',
                        }}
                      />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#afa7c2', background: 'none', border: 'none', cursor: 'pointer' }}>
                        {showPw ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleSet} disabled={loading || password.length < 8}
                        className="flex-1 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                        style={{ background: '#bd9dff', color: '#0F0A1E' }}>
                        {loading ? '…' : 'Set Password'}
                      </button>
                      <button onClick={() => { setOpen(false); setPassword(''); setError(null) }}
                        className="p-2 rounded-lg"
                        style={{ color: '#afa7c2', border: '1px solid rgba(189,157,255,0.1)' }}>
                        <X size={12} />
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                {/* Portal URL */}
                <div className="mb-3 p-2.5 rounded-lg"
                  style={{ background: 'rgba(189,157,255,0.05)', border: '1px solid rgba(189,157,255,0.1)' }}>
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: '#afa7c2' }}>Portal URL</p>
                  <p className="text-[10px] break-all font-mono" style={{ color: '#bd9dff' }}>{portalUrl}</p>
                </div>

                <div className="mb-3 space-y-1">
                  <p className="text-[10px]" style={{ color: '#afa7c2' }}>
                    Tell <span style={{ color: '#ebe1fe' }}>{employeeName}</span> to open the link and sign in with:
                  </p>
                  <p className="text-[10px]" style={{ color: '#afa7c2' }}>
                    Employee ID: <span className="font-mono font-bold" style={{ color: '#ebe1fe' }}>{employeeDisplayId}</span>
                  </p>
                  <p className="text-[10px]" style={{ color: '#afa7c2' }}>
                    Password: <span style={{ color: '#ebe1fe' }}>as set by you</span>
                  </p>
                </div>

                <div className="flex gap-2">
                  <button onClick={handleCopy}
                    className="flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    style={{
                      background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(189,157,255,0.1)',
                      color: copied ? '#10b981' : '#bd9dff',
                      border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(189,157,255,0.2)'}`,
                    }}>
                    {copied ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy Info</>}
                  </button>
                  {employeePhone && (
                    <button onClick={handleSMS}
                      className="flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                      style={{ background: 'rgba(189,157,255,0.05)', color: '#afa7c2', border: '1px solid rgba(189,157,255,0.1)' }}>
                      <Link2 size={11} /> SMS
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
