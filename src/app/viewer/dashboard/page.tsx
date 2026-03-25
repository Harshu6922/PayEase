'use client'

import { useState, useEffect } from 'react'
import { format, parseISO, differenceInHours } from 'date-fns'

type SnapshotData = {
  month: string
  metrics: { total_paid_this_month: number; active_employees: number; present_today: number; attendance_percentage: number }
  payroll: Array<{ employee_id: string; full_name: string; final_payable_salary: number; paid_this_month: number }>
  employees: Array<{ id: string; full_name: string; worker_type: string; monthly_salary: number }>
  attendance?: { present_today: any[]; monthly_summary: Array<{ employee_id: string; full_name: string; days_worked: number }> }
  compliance?: { note: string; pf_due_date: string; esi_due_date: string }
}

type ViewerResponse = { role: string; last_updated: string; data: SnapshotData }

const fmt = (n: number) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })

export default function ViewerDashboard() {
  const [token, setToken] = useState<string | null>(null)
  const [vd, setVd] = useState<ViewerResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [bizId, setBizId] = useState('')
  const [pass, setPass] = useState('')

  useEffect(() => {
    const t = localStorage.getItem('viewer_token')
    if (t) { setToken(t); fetchDashboard(t) }
  }, [])

  async function fetchDashboard(t: string) {
    setLoading(true)
    const res = await fetch('/api/viewers/dashboard', { headers: { Authorization: `Bearer ${t}` } })
    if (res.status === 401) { localStorage.removeItem('viewer_token'); setToken(null); setLoading(false); return }
    setVd(await res.json())
    setLoading(false)
  }

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const res = await fetch('/api/viewers/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, business_id: bizId, password: pass }),
    })
    const d = await res.json()
    if (!res.ok) { setError(d.error); setLoading(false); return }
    localStorage.setItem('viewer_token', d.token)
    setToken(d.token)
    fetchDashboard(d.token)
  }

  if (!token || !vd) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-xl shadow p-6 space-y-4">
          <h1 className="text-xl font-bold text-gray-900">Viewer Login</h1>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
          <form onSubmit={login} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Business ID</label>
              <input required value={bizId} onChange={e => setBizId(e.target.value)} placeholder="Provided by your employer" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
              <input required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91XXXXXXXXXX" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
              <input required type="password" value={pass} onChange={e => setPass(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <button disabled={loading} className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const { data, role, last_updated } = vd
  const isStale = differenceInHours(new Date(), parseISO(last_updated)) > 24
  const top5 = [...(data.payroll ?? [])].sort((a, b) => b.final_payable_salary - a.final_payable_salary).slice(0, 5)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payroll Dashboard</h1>
            <p className="text-sm text-gray-500 capitalize">Role: <span className="font-medium">{role}</span> · {data.month}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Last updated</p>
            <p className="text-sm font-semibold text-gray-800">{format(parseISO(last_updated), 'dd MMM yyyy, hh:mm a')}</p>
            <button onClick={() => { localStorage.removeItem('viewer_token'); setToken(null); setVd(null) }} className="text-xs text-indigo-500 hover:underline mt-1">Sign out</button>
          </div>
        </div>

        {isStale && (
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800 font-medium">
            Data may be outdated — ask your employer to refresh the dashboard.
          </div>
        )}

        {/* Metric cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Paid This Month', value: fmt(data.metrics.total_paid_this_month) },
            { label: 'Active Employees', value: data.metrics.active_employees },
            { label: 'Present Today', value: data.metrics.present_today },
            { label: 'Attendance %', value: `${data.metrics.attendance_percentage}%` },
          ].map(m => (
            <div key={m.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 leading-snug">{m.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{m.value}</p>
            </div>
          ))}
        </div>

        {/* Top 5 */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h2 className="text-sm font-semibold text-gray-900">Top 5 Employees by Net Pay</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-right font-medium">Net Pay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {top5.map(e => (
                <tr key={e.employee_id}>
                  <td className="px-4 py-2.5 text-gray-900">{e.full_name}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{fmt(e.final_payable_salary)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Attendance (ca + manager only) */}
        {role !== 'partner' && data.attendance && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Monthly Attendance</h2>
            <div className="space-y-1.5">
              {data.attendance.monthly_summary?.map(e => (
                <div key={e.employee_id} className="flex justify-between text-sm">
                  <span className="text-gray-700">{e.full_name}</span>
                  <span className="font-medium text-gray-900">{e.days_worked} days</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compliance (ca only) */}
        {role === 'ca' && data.compliance && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Compliance</h2>
            <p className="text-sm text-gray-600">{data.compliance.note}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-lg px-3 py-2">
                <p className="text-xs text-blue-500">PF Due</p>
                <p className="text-sm font-bold text-blue-900">{data.compliance.pf_due_date}</p>
              </div>
              <div className="bg-blue-50 rounded-lg px-3 py-2">
                <p className="text-xs text-blue-500">ESI Due</p>
                <p className="text-sm font-bold text-blue-900">{data.compliance.esi_due_date}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
