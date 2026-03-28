'use client'

import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { staggerContainer, fadeInUp } from '@/lib/animations'

export interface RepaymentRow {
  id: string
  amount: number
  repayment_date: string
  method: string
  note: string | null
  advance_amount: number
  advance_date: string | null
  employee_name: string
  employee_display_id: string
}

const formatRs = (n: number) =>
  '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const AVATAR_COLORS = [
  '#7c3aed','#0d9488','#b45309','#be185d','#1d4ed8',
  '#9333ea','#0891b2','#c2410c','#15803d','#4338ca',
]
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

const glassCard: React.CSSProperties = {
  background: 'rgba(28,22,46,0.6)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(189,157,255,0.1)',
}

const methodLabel: Record<string, string> = {
  salary_deduction: 'Salary Deduction',
  cash: 'Cash',
}

export default function AdvanceRepaymentsClient({ repayments }: { repayments: RepaymentRow[] }) {
  const totalRepaid = repayments.reduce((s, r) => s + r.amount, 0)
  const salaryDeductions = repayments.filter(r => r.method === 'salary_deduction').reduce((s, r) => s + r.amount, 0)
  const cashPayments = repayments.filter(r => r.method === 'cash').reduce((s, r) => s + r.amount, 0)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F0A1E' }}>
      {/* Ambient glow */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none -z-10"
        style={{ background: 'rgba(189,157,255,0.08)', filter: 'blur(120px)' }} />

      <motion.div
        className="max-w-7xl mx-auto px-6 py-10 md:py-16"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.header variants={fadeInUp} className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="font-extrabold text-4xl md:text-5xl tracking-tight mb-2" style={{ color: '#ebe1fe' }}>
              Advance Repayments
            </h1>
            <p style={{ color: '#afa7c2' }} className="text-lg">All repayment records</p>
          </div>
          <div className="px-6 py-3 rounded-2xl flex items-center gap-4 self-start md:self-auto" style={glassCard}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(212,168,71,0.1)' }}>
              <svg className="w-5 h-5" fill="none" stroke="#D4A847" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: '#afa7c2' }}>Total Repaid to Date</p>
              <p className="text-2xl font-bold" style={{ color: '#D4A847' }}>{formatRs(totalRepaid)}</p>
            </div>
          </div>
        </motion.header>

        {/* Stat Cards */}
        <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Total Repaid */}
          <div className="p-6 rounded-2xl" style={glassCard}>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-xl" style={{ background: 'rgba(212,168,71,0.1)' }}>
                <svg className="w-5 h-5" fill="none" stroke="#D4A847" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded"
                style={{ color: '#afa7c2', background: 'rgba(47,39,71,0.5)' }}>ALL TIME</span>
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: '#afa7c2' }}>Total Repaid</p>
            <p className="text-3xl font-bold" style={{ color: '#D4A847' }}>{formatRs(totalRepaid)}</p>
          </div>

          {/* Salary Deductions */}
          <div className="p-6 rounded-2xl" style={glassCard}>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-xl" style={{ background: 'rgba(189,157,255,0.1)' }}>
                <svg className="w-5 h-5" fill="none" stroke="#bd9dff" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded"
                style={{ color: '#afa7c2', background: 'rgba(47,39,71,0.5)' }}>AUTO</span>
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: '#afa7c2' }}>Salary Deductions</p>
            <p className="text-3xl font-bold" style={{ color: '#bd9dff' }}>{formatRs(salaryDeductions)}</p>
          </div>

          {/* Cash Payments */}
          <div className="p-6 rounded-2xl" style={glassCard}>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-xl" style={{ background: 'rgba(52,211,153,0.1)' }}>
                <svg className="w-5 h-5" fill="none" stroke="#34d399" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded"
                style={{ color: '#afa7c2', background: 'rgba(47,39,71,0.5)' }}>DIRECT</span>
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: '#afa7c2' }}>Cash Payments</p>
            <p className="text-3xl font-bold" style={{ color: '#34d399' }}>{formatRs(cashPayments)}</p>
          </div>
        </motion.div>

        {/* Table */}
        <motion.section variants={fadeInUp} className="rounded-[20px] overflow-hidden" style={glassCard}>
          {repayments.length === 0 ? (
            <div className="px-8 py-20 text-center">
              <p className="text-sm font-medium mb-1" style={{ color: '#afa7c2' }}>No repayments recorded yet.</p>
              <p className="text-xs" style={{ color: '#6b6483' }}>Repayments are created when salary advances are recovered.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr style={{ background: 'rgba(189,157,255,0.05)' }}>
                      {['Employee','Original Advance','Repaid On','Method','Amount'].map((h, i) => (
                        <th key={h} className={`px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] ${i === 4 ? 'text-right' : ''}`}
                          style={{ color: '#afa7c2' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <motion.tbody
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    style={{ borderTop: '1px solid rgba(189,157,255,0.06)' }}
                  >
                    {repayments.map(r => (
                      <motion.tr
                        key={r.id}
                        variants={fadeInUp}
                        className="group transition-colors"
                        style={{ borderBottom: '1px solid rgba(189,157,255,0.06)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(47,39,71,0.2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Employee */}
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ background: avatarColor(r.employee_name) }}>
                              {getInitials(r.employee_name)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold" style={{ color: '#ebe1fe' }}>{r.employee_name}</p>
                              <p className="text-[11px]" style={{ color: '#afa7c2' }}>{r.employee_display_id}</p>
                            </div>
                          </div>
                        </td>

                        {/* Original Advance */}
                        <td className="px-8 py-6">
                          <p className="text-sm font-medium" style={{ color: '#ebe1fe' }}>{formatRs(r.advance_amount)}</p>
                          {r.advance_date && (
                            <p className="text-[11px]" style={{ color: '#afa7c2' }}>
                              given {format(new Date(r.advance_date + 'T00:00:00'), 'dd MMM yyyy')}
                            </p>
                          )}
                        </td>

                        {/* Repaid On */}
                        <td className="px-8 py-6">
                          <p className="text-sm" style={{ color: '#ebe1fe' }}>
                            {format(new Date(r.repayment_date + 'T00:00:00'), 'dd MMM yyyy')}
                          </p>
                        </td>

                        {/* Method */}
                        <td className="px-8 py-6">
                          {r.method === 'salary_deduction' ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase"
                              style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>
                              Salary Deduction
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase"
                              style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>
                              {methodLabel[r.method] ?? r.method}
                            </span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="px-8 py-6 text-right">
                          <p className="font-bold" style={{ color: '#D4A847' }}>{formatRs(r.amount)}</p>
                          {r.note && <p className="text-[11px] mt-0.5" style={{ color: '#afa7c2' }}>{r.note}</p>}
                        </td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="px-8 py-6 flex justify-between items-center"
                style={{ background: 'rgba(189,157,255,0.04)', borderTop: '1px solid rgba(189,157,255,0.08)' }}>
                <p className="text-[11px] font-medium" style={{ color: '#afa7c2' }}>
                  {repayments.length} record{repayments.length !== 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-6">
                  <span className="text-sm font-medium" style={{ color: '#afa7c2' }}>Total</span>
                  <span className="text-xl font-bold" style={{ color: '#D4A847' }}>{formatRs(totalRepaid)}</span>
                </div>
              </div>
            </>
          )}
        </motion.section>
      </motion.div>
    </div>
  )
}
