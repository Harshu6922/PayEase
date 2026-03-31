'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { springScaleIn } from '@/lib/animations'
import { LogOut, Eye, EyeOff } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmployeeData {
  employee: {
    id: string; full_name: string; employee_id: string; worker_type: string
    monthly_salary: number; daily_rate: number | null; joining_date: string; is_active: boolean
  }
  companyName: string
  daysPresent: number
  monthlyEarnings: number
  advanceBalance: number
  attendance: Array<{ date: string; status: string; time_in?: string; time_out?: string }>
  payments: Array<{ amount: number; payment_date: string; note?: string }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0 })

const AVATAR_COLORS = ['#bd9dff', '#8a4cfc', '#d3c5f5', '#afa7c2', '#7c6fa0', '#a78bfa']
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}
function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Present:   { bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
  Absent:    { bg: 'rgba(255,110,132,0.12)', color: '#ff6e84' },
  'Half Day':{ bg: 'rgba(212,168,71,0.12)',  color: '#D4A847' },
}

const glassCard: React.CSSProperties = {
  background: 'rgba(28,22,46,0.6)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(189,157,255,0.1)',
  borderRadius: 20,
  padding: '24px',
}

const inputStyle: React.CSSProperties = {
  width: '100%', borderRadius: 12, padding: '10px 16px',
  fontSize: 14, color: '#ebe1fe',
  background: 'rgba(189,157,255,0.05)',
  border: '1px solid rgba(189,157,255,0.1)',
  outline: 'none',
}

// ─── Login form ───────────────────────────────────────────────────────────────

function LoginFormInner({ onLogin }: { onLogin: (token: string) => void }) {
  const searchParams = useSearchParams()
  const [companyId, setCompanyId] = useState(searchParams.get('c') ?? '')
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const res = await fetch('/api/employee-portal/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: companyId.trim(), employee_display_id: employeeId.trim(), password }),
    })
    const d = await res.json()
    if (!res.ok) { setError(d.error); setLoading(false); return }
    localStorage.setItem('employee_portal_token', d.token)
    onLogin(d.token)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden"
      style={{ background: '#0F0A1E' }}>
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(189,157,255,0.1) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute -bottom-1/4 -right-1/4 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(189,157,255,0.08) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      <motion.div variants={springScaleIn} initial="hidden" animate="visible"
        className="relative z-10 w-full max-w-sm">
        <div style={{ ...glassCard, padding: '40px 36px' }}>
          <div className="flex flex-col items-center mb-8">
            <img src="/payease logo.png" alt="PayEase" className="w-12 h-12 rounded-xl object-cover mb-4" />
            <h1 className="text-2xl font-bold" style={{ color: '#ebe1fe' }}>Employee Portal</h1>
            <p className="text-sm mt-1.5 text-center" style={{ color: '#afa7c2' }}>
              Sign in to view your attendance &amp; pay details
            </p>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm text-center"
              style={{ background: 'rgba(255,110,132,0.1)', border: '1px solid rgba(255,110,132,0.2)', color: '#ff6e84' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: '#afa7c2' }}>Company ID</label>
              <input value={companyId} onChange={e => setCompanyId(e.target.value)}
                placeholder="Provided by your employer" required style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: '#afa7c2' }}>Employee ID</label>
              <input value={employeeId} onChange={e => setEmployeeId(e.target.value)}
                placeholder="e.g. EMP-001" required style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: '#afa7c2' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required
                  style={{ ...inputStyle, paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#afa7c2', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 mt-2"
              style={{ background: '#bd9dff', color: '#0F0A1E' }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ token, onSignOut }: { token: string; onSignOut: () => void }) {
  const [data, setData] = useState<EmployeeData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/employee-portal/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        if (r.status === 401) { onSignOut(); return }
        setData(await r.json())
        setLoading(false)
      })
  }, [token, onSignOut])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F0A1E' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'rgba(189,157,255,0.4)', borderTopColor: 'transparent' }} />
      </div>
    )
  }
  if (!data) return null

  const { employee: emp, companyName, daysPresent, monthlyEarnings, advanceBalance, attendance, payments } = data
  const color = avatarColor(emp.full_name)

  return (
    <div className="min-h-screen pb-16" style={{ background: '#0F0A1E' }}>
      {/* Header */}
      <div style={{ background: 'rgba(22,17,38,0.9)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(189,157,255,0.08)' }}
        className="sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/payease logo.png" alt="PayEase" className="w-7 h-7 rounded-lg object-cover" />
            <span className="text-sm font-bold" style={{ color: '#ebe1fe' }}>PayEase</span>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(189,157,255,0.1)', color: '#afa7c2' }}>
              {companyName}
            </span>
          </div>
          <button onClick={onSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{ color: '#afa7c2', border: '1px solid rgba(189,157,255,0.1)' }}>
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Profile card */}
        <div style={glassCard}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
              style={{ background: color, color: '#0F0A1E' }}>
              {initials(emp.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate" style={{ color: '#ebe1fe' }}>{emp.full_name}</h2>
              <p className="font-mono text-xs mt-0.5" style={{ color: '#afa7c2' }}>{emp.employee_id}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize"
                  style={{ background: 'rgba(189,157,255,0.1)', border: '1px solid rgba(189,157,255,0.2)', color: '#bd9dff' }}>
                  {emp.worker_type}
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold"
                  style={{ color: emp.is_active ? '#10b981' : '#ff6e84' }}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block"
                    style={{ background: emp.is_active ? '#10b981' : '#ff6e84' }} />
                  {emp.is_active ? 'Active' : 'Inactive'}
                </span>
                <span className="text-xs" style={{ color: '#afa7c2' }}>
                  Joined {new Date(emp.joining_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* This month stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Days Present', value: daysPresent % 1 === 0 ? daysPresent : daysPresent.toFixed(1), color: '#D4A847' },
            { label: 'Earnings So Far', value: fmt(monthlyEarnings), color: '#bd9dff' },
            { label: 'Advance Balance', value: fmt(advanceBalance), color: advanceBalance > 0 ? '#ff6e84' : '#10b981' },
          ].map(s => (
            <div key={s.label} style={{ ...glassCard, padding: '16px', textAlign: 'center' }}>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#afa7c2' }}>{s.label}</p>
              <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Attendance log */}
        <div style={glassCard}>
          <h3 className="text-sm font-bold mb-4" style={{ color: '#ebe1fe' }}>
            This Month's Attendance
          </h3>
          {attendance.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: '#afa7c2' }}>No attendance records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(189,157,255,0.08)' }}>
                    {['Date', 'Day', 'Status'].map(h => (
                      <th key={h} className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: '#afa7c2' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {attendance.slice(0, 31).map((a, i) => {
                    const d = new Date(a.date)
                    const s = STATUS_STYLE[a.status] ?? STATUS_STYLE['Absent']
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(189,157,255,0.04)' }}>
                        <td className="py-2.5" style={{ color: '#ebe1fe' }}>{a.date}</td>
                        <td className="py-2.5" style={{ color: '#afa7c2' }}>
                          {d.toLocaleDateString('en-IN', { weekday: 'short' })}
                        </td>
                        <td className="py-2.5">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                            style={{ background: s.bg, color: s.color }}>
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent payments */}
        {payments.length > 0 && (
          <div style={glassCard}>
            <h3 className="text-sm font-bold mb-4" style={{ color: '#ebe1fe' }}>Recent Payments</h3>
            <div className="space-y-2">
              {payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2"
                  style={{ borderBottom: i < payments.length - 1 ? '1px solid rgba(189,157,255,0.06)' : 'none' }}>
                  <div>
                    <p className="text-sm" style={{ color: '#ebe1fe' }}>
                      {new Date(p.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                    {p.note && <p className="text-xs mt-0.5" style={{ color: '#afa7c2' }}>{p.note}</p>}
                  </div>
                  <p className="text-sm font-bold" style={{ color: '#bd9dff' }}>{fmt(p.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs" style={{ color: '#afa7c2' + '60' }}>
          Powered by PayEase · Read-only view
        </p>
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function EmployeePortal() {
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const t = localStorage.getItem('employee_portal_token')
    if (t) setToken(t)
  }, [])

  async function signOut() {
    const t = localStorage.getItem('employee_portal_token')
    localStorage.removeItem('employee_portal_token')
    setToken(null)
    if (t) {
      await fetch('/api/employee-portal/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}` },
      }).catch(() => {})
    }
  }

  if (!token) return <Suspense fallback={null}><LoginFormInner onLogin={setToken} /></Suspense>
  return <Dashboard token={token} onSignOut={signOut} />
}
