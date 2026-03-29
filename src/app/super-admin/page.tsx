'use client'

import { useState, useEffect } from 'react'
import { ShieldAlert, LogIn, Users, RefreshCw, Plus, ToggleLeft, ToggleRight } from 'lucide-react'

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

interface PromoCode {
  id: string
  code: string
  discount_type: 'fixed' | 'percent'
  discount_value: number
  max_uses: number | null
  uses_count: number
  expires_at: string | null
  active: boolean
  created_at: string
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  active:   { bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
  trial:    { bg: 'rgba(245,158,11,0.12)',  color: '#F59E0B' },
  locked:   { bg: 'rgba(255,110,132,0.12)', color: '#ff6e84' },
  cancelled:{ bg: 'rgba(255,110,132,0.12)', color: '#ff6e84' },
}

const glassCard: React.CSSProperties = {
  background: 'rgba(28,22,46,0.6)',
  backdropFilter: 'blur(24px)',
  border: '1px solid rgba(189,157,255,0.1)',
  borderRadius: 20,
}

export default function SuperAdminPage() {
  const [secret, setSecret] = useState('')
  const [authed, setAuthed] = useState(false)
  const [tab, setTab] = useState<'companies' | 'promos'>('companies')
  const [companies, setCompanies] = useState<Company[]>([])
  const [promos, setPromos] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(false)
  const [impersonating, setImpersonating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // New promo form
  const [newPromo, setNewPromo] = useState({ code: '', discount_type: 'fixed', discount_value: '', max_uses: '', expires_at: '' })
  const [promoMsg, setPromoMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [promoLoading, setPromoLoading] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('super_admin_secret')
    if (stored) { setSecret(stored); setAuthed(true); fetchAll(stored) }
  }, [])

  async function fetchAll(s = secret) {
    setLoading(true); setError(null)
    const [companiesRes, promosRes] = await Promise.all([
      fetch('/api/super-admin/companies', { headers: { 'x-super-admin-secret': s } }),
      fetch('/api/super-admin/promo', { headers: { 'x-super-admin-secret': s } }),
    ])
    if (!companiesRes.ok) { setError('Invalid secret'); setAuthed(false); sessionStorage.removeItem('super_admin_secret'); setLoading(false); return }
    const [cd, pd] = await Promise.all([companiesRes.json(), promosRes.json()])
    setCompanies(cd.companies ?? [])
    setPromos(pd.promos ?? [])
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

  async function createPromo() {
    if (!newPromo.code || !newPromo.discount_value) return
    setPromoLoading(true); setPromoMsg(null)
    const res = await fetch('/api/super-admin/promo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-super-admin-secret': secret },
      body: JSON.stringify(newPromo),
    })
    const d = await res.json()
    if (!res.ok) { setPromoMsg({ type: 'error', text: d.error }); setPromoLoading(false); return }
    setPromos(prev => [d.promo, ...prev])
    setNewPromo({ code: '', discount_type: 'fixed', discount_value: '', max_uses: '', expires_at: '' })
    setPromoMsg({ type: 'success', text: `Promo code "${d.promo.code}" created!` })
    setPromoLoading(false)
  }

  async function togglePromo(id: string, active: boolean) {
    await fetch('/api/super-admin/promo', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-super-admin-secret': secret },
      body: JSON.stringify({ id, active: !active }),
    })
    setPromos(prev => prev.map(p => p.id === id ? { ...p, active: !active } : p))
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
            <p className="text-xs mt-1" style={{ color: '#afa7c2' }}>PayEase Buddy internal access only</p>
          </div>
          <input
            type="password"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchAll()}
            placeholder="Enter super admin secret"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-3"
            style={{ background: 'rgba(189,157,255,0.06)', border: '1px solid rgba(189,157,255,0.15)', color: '#ebe1fe' }}
          />
          {error && <p className="text-xs text-red-400 mb-3 text-center">{error}</p>}
          <button
            onClick={() => fetchAll()}
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
      {/* Top bar */}
      <div className="sticky top-0 z-20" style={{ background: 'rgba(22,17,38,0.95)', borderBottom: '1px solid rgba(217,119,6,0.2)' }}>
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" style={{ color: '#D97706' }} />
              <span className="text-sm font-bold" style={{ color: '#D97706' }}>Super Admin</span>
            </div>
            <div className="flex gap-1">
              {(['companies', 'promos'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all"
                  style={tab === t
                    ? { background: 'rgba(217,119,6,0.2)', color: '#D97706', border: '1px solid rgba(217,119,6,0.3)' }
                    : { color: '#afa7c2', border: '1px solid transparent' }}>
                  {t === 'companies' ? `Companies (${companies.length})` : `Promo Codes (${promos.length})`}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => fetchAll()} disabled={loading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
            style={{ color: '#afa7c2', border: '1px solid rgba(189,157,255,0.1)' }}>
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Companies tab */}
        {tab === 'companies' && (
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
                      <td className="px-5 py-3 text-xs" style={{ color: '#afa7c2' }}>{c.adminEmail ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: s.bg, color: s.color }}>{c.status}</span>
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
                        <button onClick={() => impersonate(c)}
                          disabled={!c.adminUserId || impersonating === c.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40 transition-all"
                          style={{ background: 'rgba(217,119,6,0.15)', border: '1px solid rgba(217,119,6,0.3)', color: '#D97706' }}>
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
        )}

        {/* Promo Codes tab */}
        {tab === 'promos' && (
          <div className="space-y-6">
            {/* Create form */}
            <div className="rounded-2xl p-6 space-y-4" style={glassCard}>
              <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: '#D97706' }}>Create Promo Code</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <input
                  placeholder="Code (e.g. LAUNCH50)"
                  value={newPromo.code}
                  onChange={e => setNewPromo(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  maxLength={20}
                  className="px-3 py-2 rounded-xl text-sm font-mono uppercase outline-none col-span-2 md:col-span-1"
                  style={{ background: 'rgba(189,157,255,0.06)', border: '1px solid rgba(189,157,255,0.15)', color: '#ebe1fe' }}
                />
                <select
                  value={newPromo.discount_type}
                  onChange={e => setNewPromo(p => ({ ...p, discount_type: e.target.value }))}
                  className="px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(189,157,255,0.06)', border: '1px solid rgba(189,157,255,0.15)', color: '#ebe1fe' }}
                >
                  <option value="fixed" style={{ background: '#1A1035' }}>Fixed (₹)</option>
                  <option value="percent" style={{ background: '#1A1035' }}>Percent (%)</option>
                </select>
                <input
                  placeholder={newPromo.discount_type === 'fixed' ? 'Amount (₹)' : 'Percent (%)'}
                  value={newPromo.discount_value}
                  onChange={e => setNewPromo(p => ({ ...p, discount_value: e.target.value }))}
                  type="number" min="1"
                  className="px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(189,157,255,0.06)', border: '1px solid rgba(189,157,255,0.15)', color: '#ebe1fe' }}
                />
                <input
                  placeholder="Max uses (blank = unlimited)"
                  value={newPromo.max_uses}
                  onChange={e => setNewPromo(p => ({ ...p, max_uses: e.target.value }))}
                  type="number" min="1"
                  className="px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(189,157,255,0.06)', border: '1px solid rgba(189,157,255,0.15)', color: '#ebe1fe' }}
                />
                <input
                  placeholder="Expires (blank = never)"
                  value={newPromo.expires_at}
                  onChange={e => setNewPromo(p => ({ ...p, expires_at: e.target.value }))}
                  type="date"
                  className="px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(189,157,255,0.06)', border: '1px solid rgba(189,157,255,0.15)', color: '#ebe1fe' }}
                />
              </div>
              <div className="flex items-center gap-3">
                <button onClick={createPromo} disabled={!newPromo.code || !newPromo.discount_value || promoLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-40"
                  style={{ background: '#D97706', color: '#000' }}>
                  <Plus size={14} /> {promoLoading ? 'Creating…' : 'Create Code'}
                </button>
                {promoMsg && (
                  <p className={`text-sm ${promoMsg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {promoMsg.text}
                  </p>
                )}
              </div>
            </div>

            {/* Promo list */}
            <div className="rounded-2xl overflow-hidden" style={glassCard}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'rgba(189,157,255,0.04)' }}>
                    {['Code', 'Discount', 'Uses', 'Expires', 'Status', 'Toggle'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: '#afa7c2' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {promos.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(189,157,255,0.06)' }}>
                      <td className="px-5 py-3 font-mono font-bold text-sm" style={{ color: '#ebe1fe' }}>{p.code}</td>
                      <td className="px-5 py-3 text-sm" style={{ color: '#bd9dff' }}>
                        {p.discount_type === 'fixed' ? `₹${p.discount_value} off` : `${p.discount_value}% off`}
                      </td>
                      <td className="px-5 py-3 text-sm" style={{ color: '#afa7c2' }}>
                        {p.uses_count}{p.max_uses !== null ? ` / ${p.max_uses}` : ' / ∞'}
                      </td>
                      <td className="px-5 py-3 text-xs" style={{ color: '#afa7c2' }}>
                        {p.expires_at ? new Date(p.expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={p.active
                            ? { background: 'rgba(16,185,129,0.12)', color: '#10b981' }
                            : { background: 'rgba(255,110,132,0.12)', color: '#ff6e84' }}>
                          {p.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button onClick={() => togglePromo(p.id, p.active)}
                          className="flex items-center gap-1 text-xs transition-colors"
                          style={{ color: p.active ? '#ff6e84' : '#10b981' }}>
                          {p.active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                          {p.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {promos.length === 0 && (
                <p className="text-center py-12 text-sm" style={{ color: '#afa7c2' }}>No promo codes yet.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
