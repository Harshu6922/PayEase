'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import LogRepaymentModal from './LogRepaymentModal'

export interface AdvanceWithBalance {
  id: string
  employee_id: string
  company_id: string
  amount: number
  advance_date: string
  note: string | null
  repaid_total: number
  remaining: number
  employee_name: string
  employee_display_id: string
}

const formatRs = (n: number) =>
  'Rs. ' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const row = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const } } }

export default function AdvancesClient({
  initialAdvances,
  companyId,
}: {
  initialAdvances: AdvanceWithBalance[]
  companyId: string
}) {
  const supabase = createClient() as unknown as any
  const [advances, setAdvances] = useState<AdvanceWithBalance[]>(initialAdvances)
  const [repayingAdvance, setRepayingAdvance] = useState<AdvanceWithBalance | null>(null)
  const [showSettled, setShowSettled] = useState(false)

  const active = advances.filter(a => a.remaining > 0)
  const settled = advances.filter(a => a.remaining <= 0)

  const handleRepaymentSaved = async () => {
    // Refresh advances with new balances
    const { data } = await supabase
      .from('employee_advances')
      .select(`
        id, employee_id, company_id, amount, advance_date, note,
        employees(full_name, employee_id),
        advance_repayments(amount)
      `)
      .eq('company_id', companyId)
      .order('advance_date', { ascending: false })

    if (data) {
      setAdvances(data.map((a: any) => {
        const repaid_total = (a.advance_repayments || []).reduce((s: number, r: any) => s + Number(r.amount), 0)
        return {
          id: a.id,
          employee_id: a.employee_id,
          company_id: a.company_id,
          amount: Number(a.amount),
          advance_date: a.advance_date,
          note: a.note,
          repaid_total,
          remaining: Number(a.amount) - repaid_total,
          employee_name: a.employees?.full_name ?? '—',
          employee_display_id: a.employees?.employee_id ?? '—',
        }
      }))
    }
    setRepayingAdvance(null)
  }

  const AdvanceRow = ({ adv }: { adv: AdvanceWithBalance }) => {
    const pct = Math.min(100, Math.round((adv.repaid_total / adv.amount) * 100))
    const isSettled = adv.remaining <= 0
    return (
      <motion.div variants={row} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors group">
        {/* Employee */}
        <div className="w-44 flex-shrink-0">
          <p className="text-sm font-semibold text-gray-900">{adv.employee_name}</p>
          <p className="text-xs text-gray-400">{adv.employee_display_id}</p>
        </div>
        {/* Date & note */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500">{format(new Date(adv.advance_date + 'T00:00:00'), 'dd MMM yyyy')}</p>
          {adv.note && <p className="text-xs text-gray-400 italic truncate">{adv.note}</p>}
        </div>
        {/* Progress */}
        <div className="w-32 flex-shrink-0">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{formatRs(adv.repaid_total)}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isSettled ? 'bg-green-500' : 'bg-indigo-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        {/* Amounts */}
        <div className="text-right flex-shrink-0 w-28">
          <p className="text-xs text-gray-400">of {formatRs(adv.amount)}</p>
          <p className={`text-sm font-bold ${isSettled ? 'text-green-600' : 'text-gray-900'}`}>
            {isSettled ? 'Settled' : `${formatRs(adv.remaining)} left`}
          </p>
        </div>
        {/* Action */}
        {!isSettled && (
          <button
            onClick={() => setRepayingAdvance(adv)}
            className="flex-shrink-0 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors opacity-0 group-hover:opacity-100"
          >
            Log Repayment
          </button>
        )}
        {isSettled && <div className="w-[110px] flex-shrink-0" />}
      </motion.div>
    )
  }

  return (
    <>
      {/* Active advances */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Active — {active.length} advance{active.length !== 1 ? 's' : ''}
        </div>
        {active.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">No active advances.</div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show">
            {active.map(adv => <AdvanceRow key={adv.id} adv={adv} />)}
          </motion.div>
        )}
      </div>

      {/* Settled section */}
      {settled.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowSettled(s => !s)}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium mb-2"
          >
            {showSettled ? '▾' : '▸'} Settled ({settled.length})
          </button>
          <AnimatePresence>
            {showSettled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl border bg-white shadow-sm overflow-hidden"
              >
                <motion.div variants={container} initial="hidden" animate="show">
                  {settled.map(adv => <AdvanceRow key={adv.id} adv={adv} />)}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Log Repayment Modal */}
      <AnimatePresence>
        {repayingAdvance && (
          <LogRepaymentModal
            advanceId={repayingAdvance.id}
            employeeId={repayingAdvance.employee_id}
            companyId={companyId}
            remaining={repayingAdvance.remaining}
            onSaved={handleRepaymentSaved}
            onClose={() => setRepayingAdvance(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
