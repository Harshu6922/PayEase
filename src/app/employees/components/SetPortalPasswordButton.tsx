'use client'

import { useState, useRef, useEffect } from 'react'
import { KeyRound, Eye, EyeOff, Check, X } from 'lucide-react'

interface Props {
  employeeUuid: string
  employeeName: string
}

export default function SetPortalPasswordButton({ employeeUuid, employeeName }: Props) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
        setPassword('')
        setError(null)
        setSuccess(false)
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
    setTimeout(() => { setOpen(false); setPassword(''); setSuccess(false) }, 1200)
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => { setOpen(v => !v); setError(null); setSuccess(false) }}
        title="Set portal password"
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
          className="absolute bottom-full mb-2 right-0 z-50 p-4 rounded-xl shadow-2xl"
          style={{
            background: 'rgba(22,17,38,0.97)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(189,157,255,0.2)',
            minWidth: 230,
          }}
        >
          <p className="text-xs font-bold mb-1 truncate" style={{ color: '#ebe1fe' }}>
            Set portal password
          </p>
          <p className="text-[10px] mb-3 truncate" style={{ color: '#afa7c2' }}>
            {employeeName}
          </p>

          {error && (
            <p className="text-[10px] mb-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(255,110,132,0.1)', color: '#ff6e84' }}>
              {error}
            </p>
          )}

          {success ? (
            <div className="flex items-center gap-2 py-1" style={{ color: '#10b981' }}>
              <Check size={14} />
              <span className="text-xs font-semibold">Password set!</span>
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
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#afa7c2', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {showPw ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSet}
                  disabled={loading || password.length < 8}
                  className="flex-1 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                  style={{ background: '#bd9dff', color: '#0F0A1E' }}
                >
                  {loading ? '...' : 'Set'}
                </button>
                <button
                  onClick={() => { setOpen(false); setPassword(''); setError(null) }}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: '#afa7c2', border: '1px solid rgba(189,157,255,0.1)' }}
                >
                  <X size={12} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
