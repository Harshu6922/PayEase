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
const cardAnim = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' as const } } }

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function AdvancesClient({
  initialAdvances,
  companyId,
  userRole = 'admin',
}: {
  initialAdvances: AdvanceWithBalance[]
  companyId: string
  userRole?: 'admin' | 'viewer'
}) {
  const supabase = createClient() as unknown as any
  const [advances, setAdvances] = useState<AdvanceWithBalance[]>(initialAdvances)
  const [repayingAdvance, setRepayingAdvance] = useState<AdvanceWithBalance | null>(null)
  const [showSettled, setShowSettled] = useState(false)

  const active = advances.filter(a => a.remaining > 0)
  const settled = advances.filter(a => a.remaining <= 0)

  const handleRepaymentSaved = async () => {
    // Refresh advances with new balances
    const { data, error } = await supabase
      .from('employee_advances')
      .select(`
        id, employee_id, company_id, amount, advance_date, note,
        employees(full_name, employee_id),
        advance_repayments(amount)
      `)
      .eq('company_id', companyId)
      .order('advance_date', { ascending: false })

    if (error) {
      // Silently close modal on error; data will be stale until next page load
      setRepayingAdvance(null)
      return
    }

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

  const AdvanceCard = ({ adv }: { adv: AdvanceWithBalance }) => {
    const pct = Math.min(100, Math.round((adv.repaid_total / adv.amount) * 100))
    const isSettled = adv.remaining <= 0

    return (
      <motion.div
        variants={cardAnim}
        className="backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-xl p-5 flex flex-col gap-3"
      >
        {/* Employee info row */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 text-primary-light flex items-center justify-center text-sm font-bold flex-shrink-0">
            {getInitials(adv.employee_name)}
          </div>
          <div className="min-w-0">
            <p className="text-text font-semibold text-sm truncate">{adv.employee_name}</p>
            <p className="text-text-muted text-xs">{adv.employee_display_id}</p>
          </div>
          {isSettled && (
            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
              Settled
            </span>
          )}
        </div>

        {/* Date & note */}
        <div className="text-xs text-text-muted">
          <span>{format(new Date(adv.advance_date + 'T00:00:00'), 'dd MMM yyyy')}</span>
          {adv.note && (
            <span className="ml-2 italic truncate block mt-0.5">{adv.note}</span>
          )}
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-text-muted mb-1.5">
            <span className="font-mono">Repaid: {formatRs(adv.repaid_total)}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isSettled ? 'bg-success' : 'bg-primary'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Outstanding */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide">Outstanding Balance</p>
            <p className={`font-mono font-bold text-2xl mt-0.5 ${isSettled ? 'text-text-muted' : 'text-danger'}`}>
              {formatRs(adv.remaining > 0 ? adv.remaining : 0)}
            </p>
          </div>
          <p className="text-xs text-text-muted font-mono">of {formatRs(adv.amount)}</p>
        </div>

        {/* Action button */}
        {!isSettled && userRole === 'admin' && (
          <button
            onClick={() => setRepayingAdvance(adv)}
            className="w-full mt-1 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            Log Repayment
          </button>
        )}
      </motion.div>
    )
  }

  return (
    <>
      {/* Active advances */}
      <div>
        <div className="px-1 pb-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
          Active — {active.length} advance{active.length !== 1 ? 's' : ''}
        </div>
        {active.length === 0 ? (
          <div className="backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-xl px-6 py-12 text-center text-sm text-text-muted">
            No active advances.
          </div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {active.map(adv => <AdvanceCard key={adv.id} adv={adv} />)}
          </motion.div>
        )}
      </div>

      {/* Settled section */}
      {settled.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowSettled(s => !s)}
            className="text-sm text-text-muted hover:text-text font-medium mb-3 flex items-center gap-1 transition-colors"
          >
            <span>{showSettled ? '▾' : '▸'}</span>
            <span>Settled ({settled.length})</span>
          </button>
          <AnimatePresence>
            {showSettled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <motion.div
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {settled.map(adv => <AdvanceCard key={adv.id} adv={adv} />)}
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
