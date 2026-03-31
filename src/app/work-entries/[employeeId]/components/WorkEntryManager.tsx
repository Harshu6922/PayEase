'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format, addMonths, subMonths, parse } from 'date-fns'
import { ChevronLeft, ChevronRight, Download, ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { downloadPdf } from '@/lib/pdf-utils'
import { motion } from 'framer-motion'
import type { Employee, AgentItemRate, WorkEntry } from '@/types'
import LogDayModal from './LogDayModal'
import PaymentModal from '@/components/PaymentModal'
import { staggerContainer, fadeInUp } from '@/lib/animations'

interface Props {
  employee: Employee
  agentRates: AgentItemRate[]
  initialEntries: WorkEntry[]
  month: string
  companyId: string
  companyName: string
}

const glassCard: React.CSSProperties = {
  background: 'rgba(28,22,46,0.6)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(189,157,255,0.1)',
}

const formatRs = (n: number) =>
  '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function WorkEntryManager({ employee, agentRates, initialEntries, month, companyId, companyName }: Props) {
  const router = useRouter()
  const [entries, setEntries] = useState<WorkEntry[]>(initialEntries)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)

  const currentMonthPayable = useMemo(
    () => entries.reduce((sum, e) =>
      sum + (Number(e.total_amount) || Number(e.quantity) * Number(e.rate)), 0),
    [entries]
  )

  const totalItems = useMemo(() => entries.reduce((s, e) => s + Number(e.quantity), 0), [entries])
  const totalDays = useMemo(() => new Set(entries.map(e => e.date)).size, [entries])

  const entriesByDate = useMemo(() => {
    const map: Record<string, WorkEntry[]> = {}
    entries.forEach(e => {
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    })
    return Object.keys(map).sort((a, b) => b.localeCompare(a)).map(date => ({ date, dayEntries: map[date] }))
  }, [entries])

  const monthDate = parse(month + '-01', 'yyyy-MM-dd', new Date())
  const monthLabel = format(monthDate, 'MMMM yyyy')

  const prevMonth = () => router.push(`/work-entries/${employee.id}?month=${format(subMonths(monthDate, 1), 'yyyy-MM')}`)
  const nextMonth = () => router.push(`/work-entries/${employee.id}?month=${format(addMonths(monthDate, 1), 'yyyy-MM')}`)

  const handleDelete = async (date: string) => {
    if (!window.confirm(`Delete all entries for ${format(new Date(date + 'T00:00:00'), 'MMMM d, yyyy')}?`)) return
    const supabase = createClient() as unknown as any
    const { error } = await supabase.from('work_entries').delete().eq('employee_id', employee.id).eq('date', date)
    if (!error) setEntries(prev => prev.filter(e => e.date !== date))
  }

  const handleSave = (date: string, newEntries: WorkEntry[]) => {
    setEntries(prev => {
      const withoutDate = prev.filter(e => e.date !== date)
      return [...withoutDate, ...newEntries].sort((a, b) => b.date.localeCompare(a.date))
    })
    setIsModalOpen(false)
    setEditingDate(null)
    router.refresh()
  }

  const handleDownloadPdf = async () => {
    if (entries.length === 0) { alert('No entries for this month.'); return }
    setIsDownloading(true)
    try {
      const [{ default: CommissionPayslipPDF }, { pdf }] = await Promise.all([
        import('@/components/pdf/CommissionPayslipPDF'),
        import('@react-pdf/renderer'),
      ])
      const blob = await pdf(
        <CommissionPayslipPDF
          month={month}
          companyName={companyName}
          employee={{ full_name: employee.full_name, employee_id: employee.employee_id }}
          entries={entries}
          agentRates={agentRates}
        />
      ).toBlob()
      downloadPdf(blob, `commission-${employee.employee_id}-${month}.pdf`)
    } catch {
      alert('Failed to generate PDF.')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F0A1E' }}>
      {/* Ambient glow */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none -z-10"
        style={{ background: 'radial-gradient(circle, rgba(189,157,255,0.12) 0%, transparent 70%)' }} />

      <motion.div
        className="max-w-4xl mx-auto px-6 pt-12 pb-16"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Back link */}
        <motion.div variants={fadeInUp} className="mb-10">
          <a href="/work-entries" className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: '#bd9dff' }}>
            <ArrowLeft className="w-4 h-4" />
            Workers
          </a>
        </motion.div>

        {/* Worker profile + Log Day button */}
        <motion.div variants={fadeInUp} className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: '#ebe1fe' }}>
                {employee.full_name}
              </h1>
              <span className="text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider"
                style={{ background: 'rgba(189,157,255,0.15)', color: '#bd9dff', border: '1px solid rgba(189,157,255,0.2)' }}>
                Commission Worker
              </span>
            </div>
            <p className="text-sm font-medium" style={{ color: '#afa7c2' }}>
              {employee.employee_id}
            </p>
          </div>

          <button
            onClick={() => { setEditingDate(null); setIsModalOpen(true) }}
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-95"
            style={{
              background: 'rgba(178,140,255,0.9)',
              color: '#2e006c',
              boxShadow: '0 0 20px rgba(189,157,255,0.3)',
            }}
          >
            <span className="text-lg">+</span>
            Log Day
          </button>
        </motion.div>

        {/* Month nav + controls */}
        <motion.div variants={fadeInUp} className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4 px-4 py-2 rounded-full w-fit" style={glassCard}>
            <button onClick={prevMonth} className="p-1 transition-colors hover:opacity-70" style={{ color: '#ebe1fe' }}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-bold text-lg min-w-[140px] text-center" style={{ color: '#ebe1fe' }}>
              {monthLabel}
            </span>
            <button onClick={nextMonth} className="p-1 transition-colors hover:opacity-70" style={{ color: '#ebe1fe' }}>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloading || entries.length === 0}
              className="flex items-center gap-2 px-5 py-3 rounded-lg font-semibold transition-all disabled:opacity-40 hover:opacity-80"
              style={{ color: '#bd9dff' }}
            >
              <Download className="w-4 h-4" />
              {isDownloading ? 'Generating…' : 'Download PDF'}
            </button>
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all hover:brightness-110 active:scale-95"
              style={{ background: '#bd9dff', color: '#2e006c' }}
            >
              Record Payment
            </button>
          </div>
        </motion.div>

        {/* Earnings summary card */}
        {entries.length > 0 && (
          <motion.div variants={fadeInUp} className="p-8 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-6 mb-8" style={glassCard}>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-widest" style={{ color: '#afa7c2' }}>
                Total Earnings — {monthLabel}
              </p>
              <div className="flex items-baseline gap-1">
                <span className="font-light text-2xl" style={{ color: '#afa7c2' }}>₹</span>
                <span className="font-extrabold text-5xl tracking-tighter" style={{ color: '#D4A847' }}>
                  {currentMonthPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="p-4 rounded-2xl text-center min-w-[90px]"
                style={{ background: 'rgba(47,39,71,0.4)' }}>
                <p className="text-[10px] font-bold uppercase mb-1" style={{ color: '#afa7c2' }}>Items</p>
                <p className="text-xl font-bold" style={{ color: '#ebe1fe' }}>{totalItems.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-2xl text-center min-w-[90px]"
                style={{ background: 'rgba(47,39,71,0.4)' }}>
                <p className="text-[10px] font-bold uppercase mb-1" style={{ color: '#afa7c2' }}>Days</p>
                <p className="text-xl font-bold" style={{ color: '#ebe1fe' }}>{totalDays}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* No items warning */}
        {agentRates.length === 0 && (
          <motion.div variants={fadeInUp} className="mb-8 p-4 rounded-2xl flex items-center gap-4"
            style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}>
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#fbbf24' }}>
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-medium" style={{ color: '#fbbf24' }}>
              No commission items assigned.{' '}
              <a href={`/employees/${employee.id}`} className="underline underline-offset-2">
                Visit employee profile
              </a>{' '}
              to set rates.
            </p>
          </motion.div>
        )}

        {/* Entries table */}
        <motion.section variants={fadeInUp} className="rounded-[20px] overflow-hidden" style={glassCard}>
          {entriesByDate.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-medium mb-1" style={{ color: '#afa7c2' }}>No entries for {monthLabel}.</p>
              <p className="text-sm" style={{ color: '#6b6483' }}>Click + Log Day to start.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 px-8 py-5"
                style={{ background: 'rgba(189,157,255,0.04)' }}>
                <div className="col-span-3 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#afa7c2' }}>Date</div>
                <div className="col-span-6 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#afa7c2' }}>Items</div>
                <div className="col-span-3 text-[10px] font-bold uppercase tracking-[0.2em] text-right" style={{ color: '#afa7c2' }}>Amount</div>
              </div>

              <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                {entriesByDate.map(({ date, dayEntries }) => {
                  const dayTotal = dayEntries.reduce((sum, e) =>
                    sum + (Number(e.total_amount) || Number(e.quantity) * Number(e.rate)), 0)
                  const itemSummary = dayEntries.map(e => {
                    const rateName = agentRates.find(r => r.item_id === e.item_id)?.commission_items?.name ?? 'Unknown'
                    return `${rateName}: ${e.quantity}`
                  }).join(' · ')
                  const dayOfWeek = format(new Date(date + 'T00:00:00'), 'EEEE')

                  return (
                    <motion.div
                      key={date}
                      variants={fadeInUp}
                      className="grid grid-cols-12 gap-4 px-8 py-6 group transition-colors"
                      style={{ borderBottom: '1px solid rgba(189,157,255,0.06)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(47,39,71,0.2)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                    >
                      <div className="col-span-3 self-center">
                        <p className="font-bold" style={{ color: '#ebe1fe' }}>
                          {format(new Date(date + 'T00:00:00'), 'MMM d, yyyy')}
                        </p>
                        <p className="text-[10px] font-medium mt-0.5" style={{ color: 'rgba(175,167,194,0.6)' }}>{dayOfWeek}</p>
                      </div>
                      <div className="col-span-5 self-center">
                        <p className="text-sm font-medium leading-relaxed" style={{ color: '#afa7c2' }}>{itemSummary}</p>
                      </div>
                      <div className="col-span-4 self-center flex items-center justify-end gap-3">
                        {/* Edit/Delete — visible on hover */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditingDate(date); setIsModalOpen(true) }}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: '#bd9dff' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(189,157,255,0.1)' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(date)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: '#ff6e84' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,110,132,0.1)' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="font-extrabold text-lg" style={{ color: '#D4A847' }}>{formatRs(dayTotal)}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>

              {/* Footer total */}
              <div className="px-8 py-5 flex justify-between items-center"
                style={{ background: 'rgba(189,157,255,0.04)', borderTop: '1px solid rgba(189,157,255,0.08)' }}>
                <span className="text-sm font-medium" style={{ color: '#afa7c2' }}>
                  {entriesByDate.length} day{entriesByDate.length !== 1 ? 's' : ''} logged
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium" style={{ color: '#afa7c2' }}>Total</span>
                  <span className="text-xl font-bold" style={{ color: '#D4A847' }}>{formatRs(currentMonthPayable)}</span>
                </div>
              </div>
            </>
          )}
        </motion.section>
      </motion.div>

      {/* Modals */}
      {isPaymentModalOpen && (
        <PaymentModal
          employee={{ id: employee.id, full_name: employee.full_name, employee_id: employee.employee_id }}
          month={month}
          currentMonthPayable={currentMonthPayable}
          companyId={companyId}
          outstandingAdvances={{ totalOutstanding: 0, advances: [] }}
          onClose={() => setIsPaymentModalOpen(false)}
          onPaymentRecorded={() => { router.refresh() }}
        />
      )}

      {isModalOpen && (
        <LogDayModal
          agentRates={agentRates}
          existingEntries={editingDate ? (entriesByDate.find(g => g.date === editingDate)?.dayEntries ?? []) : []}
          companyId={companyId}
          employeeId={employee.id}
          editingDate={editingDate}
          onSave={handleSave}
          onClose={() => { setIsModalOpen(false); setEditingDate(null) }}
        />
      )}
    </div>
  )
}
