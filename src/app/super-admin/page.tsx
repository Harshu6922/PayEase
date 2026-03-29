'use client'

import { useState, useEffect } from 'react'
import { ShieldAlert, LogIn, Users, RefreshCw } from 'lucide-react'

interface Company {
  id: string
  name: string
  created_at: string
  adminEmail: string | null
  adminUserId: string | null
  status: string
  plan: string | null
  trialDaysLeft: number | null
  employeeCount: number
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  active:   { bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
  trial:    { bg: 'rgba(245,158,11,0.12)',  color: '#F59E0B' },
  locked:   { bg: 'rgba(255,110,132,0.12)', color: '#ff6e84' },
  cancelled:{ bg: 'rgba(255,110,132,0.12)', color: '#ff6e84' },
}

export default function SuperAdminPage() {
  const [secret, setSecret] = useState('')
  const [authed, setAuthed] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [impersonating, setImpersonating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('super_admin_secret')
    if (stored) { setSecret(stored); setAuthed(true); fetchCompanies(stored) }
  }, [])

  async function fetchCompanies(s = secret) {
    setLoading(true); setError(null)
    const res = await fetch('/api/super-admin/companies', {
      headers: { 'x-super-admin-secret': s },
    })
    if (!res.ok) { setError('Invalid secret'); setAuthed(false); sessionStorage.removeItem('super_admin_secret'); setLoading(false); return }
    const d = await res.json()
    setCompanies(d.companies ?? [])
    sessionStorage.setItem('super_admin_secret', s)
    setAuthed(true)
    setLoading(false)
  }

  async function impersonate(company: Company) {
    if (!company.adminUserId) { alert('No admin user found for this company.'); return }
    setImpersonating(company.id)
    const res = await fetch('/api/super-admin/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-super-admin-secret': secret },
      body: JSON.stringify({ admin_user_id: company.adminUserId }),
    })
    const d = await res.json()
    if (!res.ok) { alert(d.error); setImpersonating(null); return }
    sessionStorage.setItem('support_mode', company.name)
    window.location.href = d.magic_link
  }

  const glassCard: React.CSSProperties = {
    background: 'rgba(28,22,46,0.6)',
    backdropFilter: 'blur(24px)',
    border: '1px solid rgba(189,157,255,0.1)',
    borderRadius: 20,
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0F0A1E' }}>
        <div style={{ ...glassCard, padding: '40px 36px', width: '100%', maxWidth: 380 }}>
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(217,119,6,0.15)', border: '1px solid rgba(217,119,6,0.3)' }}>
              <ShieldAlert className="w-6 h-6" style={{ color: '#D97706' }} />
            </div>
            <h1 className="text-xl font-bold" style={{ color: '#ebe1fe' }}>Super Admin</h1>
            <p className="text-xs mt-1" style={{ color: '#afa7c2' }}>PayEase internal access only</p>
          </div>
          <input
            type="password"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchCompanies()}
            placeholder="Enter super admin secret"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-3"
            style={{ background: 'rgba(189,157,255,0.06)', border: '1px solid rgba(189,157,255,0.15)', color: '#ebe1fe' }}
          />
          {error && <p className="text-xs text-red-400 mb-3 text-center">{error}</p>}
          <button
            onClick={() => fetchCompanies()}
            disabled={!secret || loading}
            className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-40"
            style={{ background: '#D97706', color: '#000' }}
          >
            {loading ? 'Checking…' : 'Access Dashboard'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-16" style={{ background: '#0F0A1E' }}>
      <div className="sticky top-0 z-20" style={{ background: 'rgba(22,17,38,0.95)', borderBottom: '1px solid rgba(217,119,6,0.2)' }}>
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" style={{ color: '#D97706' }} />
            <span className="text-sm font-bold" style={{ color: '#D97706' }}>Super Admin Dashboard</span>
            <span className="text-xs px-2 py-0.5 rounded-full ml-1" style={{ background: 'rgba(217,119,6,0.1)', color: '#D97706' }}>
              {companies.length} companies
            </span>
          </div>
          <button onClick={() => fetchCompanies()} disabled={loading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
            style={{ color: '#afa7c2', border: '1px solid rgba(189,157,255,0.1)' }}>
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="rounded-2xl overflow-hidden" style={glassCard}>
          <table className="w-full">
            <thead>
              <tr style={{ background: 'rgba(189,157,255,0.04)' }}>
                {['Company', 'Admin Email', 'Plan / Status', 'Employees', 'Joined', 'Action'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: '#afa7c2' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {companies.map(c => {
                const s = STATUS_STYLE[c.status] ?? STATUS_STYLE.locked
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(189,157,255,0.06)' }}>
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold" style={{ color: '#ebe1fe' }}>{c.name}</p>
                      <p className="text-[10px] font-mono" style={{ color: '#afa7c2' }}>{c.id.slice(0, 8)}…</p>
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: '#afa7c2' }}>
                      {c.adminEmail ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ background: s.bg, color: s.color }}>
                        {c.status}
                      </span>
                      {c.plan && <span className="ml-1.5 text-xs" style={{ color: '#afa7c2' }}>{c.plan}</span>}
                      {c.trialDaysLeft !== null && (
                        <p className="text-[10px] mt-0.5" style={{ color: '#F59E0B' }}>{c.trialDaysLeft}d left</p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <Users size={12} style={{ color: '#afa7c2' }} />
                        <span className="text-sm" style={{ color: '#ebe1fe' }}>{c.employeeCount}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: '#afa7c2' }}>
                      {new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => impersonate(c)}
                        disabled={!c.adminUserId || impersonating === c.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40 transition-all"
                        style={{ background: 'rgba(217,119,6,0.15)', border: '1px solid rgba(217,119,6,0.3)', color: '#D97706' }}
                      >
                        <LogIn size={11} />
                        {impersonating === c.id ? 'Opening…' : 'Login as'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {companies.length === 0 && !loading && (
            <p className="text-center py-12 text-sm" style={{ color: '#afa7c2' }}>No companies yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
