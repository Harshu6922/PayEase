'use client'

import { useState, useEffect } from 'react'
import { format, parse } from 'date-fns'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Payment, EmployeeAdvance } from '@/types'

interface PaymentModalProps {
  employee: { id: string; full_name: string; employee_id: string }
  month: string                 // 'YYYY-MM'
  currentMonthPayable: number
  companyId: string
  outstandingAdvances: {
    totalOutstanding: number
    advances: { id: string; remaining: number; advance_date: string }[]
  }
  onClose: () => void
  onPaymentRecorded: () => void
}

const formatRs = (n: number) =>
  'Rs. ' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function PaymentModal({
  employee,
  month,
  currentMonthPayable,
  companyId,
  outstandingAdvances,
  onClose,
  onPaymentRecorded,
}: PaymentModalProps) {
  const supabase = createClient() as unknown as any

  const [payments, setPayments] = useState<Payment[]>([])
  const [advances, setAdvances] = useState<EmployeeAdvance[]>([])
  const [repayments, setRepayments] = useState<{ id: string; amount: number; repayment_date: string; method: string; note: string | null }[]>([])
  const [advanceRepaidThisMonth, setAdvanceRepaidThisMonth] = useState(0)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'full' | 'parts' | null>(null)
  const [partialAmount, setPartialAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const monthLabel = format(parse(month + '-01', 'yyyy-MM-dd', new Date()), 'MMMM yyyy')

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const [paymentsRes, advancesRes, repaymentsRes] = await Promise.all([
        supabase
          .from('payments')
          .select('*')
          .eq('employee_id', employee.id)
          .order('payment_date', { ascending: false }),
        supabase
          .from('employee_advances')
          .select('*')
          .eq('employee_id', employee.id)
          .order('advance_date', { ascending: false }),
        supabase
          .from('advance_repayments')
          .select('id, amount, repayment_date, method, note')
          .eq('employee_id', employee.id)
          .order('repayment_date', { ascending: false }),
      ])
      if (paymentsRes.data) setPayments(paymentsRes.data)
      if (advancesRes.data) setAdvances(advancesRes.data)
      if (repaymentsRes.data) setRepayments(repaymentsRes.data)
      setAdvanceRepaidThisMonth(
        (repaymentsRes.data || [])
          .filter((r: any) => r.method === 'salary_deduction' && r.repayment_date.startsWith(month))
          .reduce((s: number, r: any) => s + Number(r.amount), 0)
      )
      setLoading(false)
    }
    fetchData()
  }, [employee.id])

  // Auto-deduct advances from payable
  const advanceDeduction = Math.min(outstandingAdvances?.totalOutstanding ?? 0, currentMonthPayable)
  const netMonthPayable = Math.round((currentMonthPayable - advanceDeduction) * 100) / 100

  const paymentsThisMonth = payments
    .filter(p => p.month === month)
    .reduce((sum, p) => sum + Number(p.amount), 0)
  const remainingThisMonth = Math.round((netMonthPayable - paymentsThisMonth - advanceRepaidThisMonth) * 100) / 100

  async function recordPayment(cashAmount: number, date: string, noteText: string, autoRepayAdvances: boolean) {
    setSaving(true)
    setError(null)

    const { error: err } = await supabase.from('payments').insert({
      company_id: companyId,
      employee_id: employee.id,
      month,
      amount: cashAmount,
      payment_date: date,
      note: noteText || null,
    })
    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    // Auto-create advance repayments (FIFO) when paying in full
    if (autoRepayAdvances && advanceDeduction > 0) {
      let toDistribute = advanceDeduction
      for (const adv of outstandingAdvances.advances) {
        if (toDistribute <= 0) break
        const toRepay = Math.min(toDistribute, adv.remaining)
        const { error: repErr } = await supabase.from('advance_repayments').insert({
          company_id: companyId,
          advance_id: adv.id,
          employee_id: employee.id,
          amount: toRepay,
          repayment_date: date,
          method: 'salary_deduction',
          note: noteText || null,
        })
        if (repErr) {
          setError(`Payment recorded, but advance repayment failed: ${repErr.message}`)
          setSaving(false)
          onPaymentRecorded()
          return
        }
        toDistribute -= toRepay
      }
    }

    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('employee_id', employee.id)
      .order('payment_date', { ascending: false })
    if (data) setPayments(data)
    setMode(null)
    setPartialAmount('')
    setNote('')
    setSaving(false)
    onPaymentRecorded()
  }

  function handlePayFull() {
    if (remainingThisMonth <= 0) return
    recordPayment(remainingThisMonth, paymentDate, note, true)
  }

  function handlePayParts() {
    const amt = parseFloat(partialAmount)
    if (isNaN(amt) || amt <= 0) {
      setError('Enter a valid amount.')
      return
    }
    recordPayment(amt, paymentDate, note, false)
  }

  // Combined history
  type HistoryItem = {
    date: string
    type: 'salary' | 'advance' | 'repayment'
    amount: number
    note: string | null
    month?: string
    method?: string
  }
  const history: HistoryItem[] = [
    ...payments.map(p => ({
      date: p.payment_date,
      type: 'salary' as const,
      amount: Number(p.amount),
      note: p.note,
      month: p.month,
    })),
    ...advances.map(a => ({
      date: a.advance_date,
      type: 'advance' as const,
      amount: Number(a.amount),
      note: a.note ?? null,
    })),
    ...repayments.map(r => ({
      date: r.repayment_date,
      type: 'repayment' as const,
      amount: Number(r.amount),
      note: r.note,
      method: r.method,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />
      <motion.div
        className="relative w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 shadow-2xl flex flex-col max-h-[90vh]"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b dark:border-gray-700 px-6 py-4">
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{employee.full_name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{employee.employee_id} · {monthLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl font-bold leading-none"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
          {/* Balance Summary */}
          <div className="rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Gross Salary</span>
              <span className="font-semibold text-gray-900 dark:text-white">{formatRs(currentMonthPayable)}</span>
            </div>
            {advanceDeduction > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Advance Deduction</span>
                <span className="font-semibold text-orange-600">− {formatRs(advanceDeduction)}</span>
              </div>
            )}
            {advanceDeduction > 0 && (
              <div className="flex justify-between text-sm border-t dark:border-gray-600 pt-2">
                <span className="text-gray-700 dark:text-gray-300 font-medium">Net Payable (Cash)</span>
                <span className="font-bold text-gray-900 dark:text-white">{formatRs(netMonthPayable)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Paid This Month</span>
              <span className="font-semibold text-green-600">{formatRs(paymentsThisMonth)}</span>
            </div>
            <div className="flex justify-between text-sm border-t dark:border-gray-600 pt-2 mt-1">
              <span className="text-gray-800 dark:text-gray-200 font-medium">Remaining</span>
              <span className={`font-bold text-base ${remainingThisMonth <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {remainingThisMonth <= 0 ? 'Fully Paid' : formatRs(remainingThisMonth)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          {remainingThisMonth > 0 && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={() => { setMode('full'); setError(null) }}
                  disabled={saving}
                  className={`flex-1 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                    mode === 'full'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  Pay in Full
                </button>
                <button
                  onClick={() => { setMode('parts'); setError(null) }}
                  disabled={saving}
                  className={`flex-1 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                    mode === 'parts'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  Pay in Parts
                </button>
              </div>

              {mode && (
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                  {mode === 'full' && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p>Cash to hand: <span className="font-semibold text-gray-900 dark:text-white">{formatRs(remainingThisMonth)}</span></p>
                      {advanceDeduction > 0 && (
                        <p className="text-xs text-orange-600">+ {formatRs(advanceDeduction)} advance auto-recovered via salary deduction</p>
                      )}
                    </div>
                  )}
                  {mode === 'parts' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={partialAmount}
                        onChange={e => setPartialAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Date</label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={e => setPaymentDate(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span></label>
                    <input
                      type="text"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="e.g. March partial"
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <button
                    onClick={mode === 'full' ? handlePayFull : handlePayParts}
                    disabled={saving}
                    className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Recording…' : 'Record Payment'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Payment History */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Payment History</h3>
            {loading ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">Loading…</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No payments or advances recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {history.map((item, i) => (
                  <div key={i} className="flex items-start justify-between rounded-md bg-gray-50 dark:bg-gray-700 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {item.type === 'advance' ? 'Advance Given' : item.type === 'repayment' ? 'Advance Repaid' : 'Salary'}
                        {item.type === 'salary' && item.month && item.month !== month && (
                          <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">({item.month})</span>
                        )}
                        {item.type === 'repayment' && item.method && (
                          <span className="ml-1 text-xs text-gray-400 dark:text-gray-500 capitalize">· {item.method.replace('_', ' ')}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {format(new Date(item.date + 'T00:00:00'), 'MMM d, yyyy')}
                        {item.note && <> · <span className="italic">{item.note}</span></>}
                      </p>
                    </div>
                    <span className={`text-sm font-semibold ml-4 whitespace-nowrap ${item.type === 'repayment' ? 'text-green-500' : item.type === 'advance' ? 'text-orange-400' : 'text-gray-900 dark:text-white'}`}>
                      {item.type === 'repayment' ? '−' : item.type === 'advance' ? '+' : ''}{formatRs(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
