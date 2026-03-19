'use client'

import { useState, useEffect } from 'react'
import { format, parse } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import type { Payment, EmployeeAdvance } from '@/types'

interface PaymentModalProps {
  employee: { id: string; full_name: string; employee_id: string }
  month: string                 // 'YYYY-MM'
  currentMonthPayable: number
  companyId: string
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
  onClose,
  onPaymentRecorded,
}: PaymentModalProps) {
  const supabase = createClient() as unknown as any

  const [payments, setPayments] = useState<Payment[]>([])
  const [advances, setAdvances] = useState<EmployeeAdvance[]>([])
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
      const [paymentsRes, advancesRes] = await Promise.all([
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
      ])
      if (paymentsRes.data) setPayments(paymentsRes.data)
      if (advancesRes.data) setAdvances(advancesRes.data)
      setLoading(false)
    }
    fetchData()
  }, [employee.id])

  const paymentsThisMonth = payments
    .filter(p => p.month === month)
    .reduce((sum, p) => sum + Number(p.amount), 0)
  const remainingThisMonth = currentMonthPayable - paymentsThisMonth

  async function recordPayment(amount: number, date: string, noteText: string) {
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('payments').insert({
      company_id: companyId,
      employee_id: employee.id,
      month,
      amount,
      payment_date: date,
      note: noteText || null,
    })
    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }
    // Re-fetch payments
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
    recordPayment(remainingThisMonth, paymentDate, note)
  }

  function handlePayParts() {
    const amt = parseFloat(partialAmount)
    if (isNaN(amt) || amt <= 0) {
      setError('Enter a valid amount.')
      return
    }
    recordPayment(amt, paymentDate, note)
  }

  // Combined history: payments + advances, sorted newest first
  type HistoryItem = {
    date: string
    type: 'salary' | 'advance'
    amount: number
    note: string | null
    month?: string
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
  ].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <p className="text-lg font-bold text-gray-900">{employee.full_name}</p>
            <p className="text-sm text-gray-500">{employee.employee_id} · {monthLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
          {/* Balance Summary */}
          <div className="rounded-lg bg-gray-50 border border-gray-100 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">This Month&apos;s Payable</span>
              <span className="font-semibold text-gray-900">{formatRs(currentMonthPayable)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Paid This Month</span>
              <span className="font-semibold text-green-600">{formatRs(paymentsThisMonth)}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2 mt-1">
              <span className="text-gray-800 font-medium">Remaining</span>
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
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
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
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Pay in Parts
                </button>
              </div>

              {mode && (
                <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                  {mode === 'full' && (
                    <p className="text-sm text-gray-600">
                      Record full remaining payment of <span className="font-semibold text-gray-900">{formatRs(remainingThisMonth)}</span>
                    </p>
                  )}
                  {mode === 'parts' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={partialAmount}
                        onChange={e => setPartialAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={e => setPaymentDate(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Note <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input
                      type="text"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="e.g. March partial"
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Payment History</h3>
            {loading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-gray-400">No payments or advances recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {history.map((item, i) => (
                  <div key={i} className="flex items-start justify-between rounded-md bg-gray-50 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {item.type === 'advance' ? 'Advance' : 'Salary'}
                        {item.type === 'salary' && item.month && item.month !== month && (
                          <span className="ml-1 text-xs text-gray-400">({item.month})</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(item.date + 'T00:00:00'), 'MMM d, yyyy')}
                        {item.note && <> · <span className="italic">{item.note}</span></>}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 ml-4 whitespace-nowrap">
                      {formatRs(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
