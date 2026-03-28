'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format, getDaysInMonth } from 'date-fns'
import { ChevronRight, FileDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { downloadPdf } from '@/lib/pdf-utils'
import { motion } from 'framer-motion'
import type { AgentItemRate, WorkEntry } from '@/types'
import { staggerContainer, fadeInUp } from '@/lib/animations'

interface Worker { id: string; full_name: string; employee_id: string }

interface Props {
  workers: Worker[]
  companyName: string
  companyId: string
  userRole?: 'admin' | 'viewer'
}

const glassCard: React.CSSProperties = {
  background: 'rgba(28,22,46,0.6)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(189,157,255,0.1)',
}

function getInitials(name: string) {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
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

export default function WorkerListClient({ workers, companyName, companyId }: Props) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const handleDownload = async (e: React.MouseEvent, worker: Worker) => {
    e.preventDefault()
    e.stopPropagation()
    setDownloadingId(worker.id)
    try {
      const currentMonth = format(new Date(), 'yyyy-MM')
      const [yearStr, monthStr] = currentMonth.split('-')
      const year = parseInt(yearStr, 10)
      const monthNum = parseInt(monthStr, 10)
      const days = getDaysInMonth(new Date(year, monthNum - 1))
      const firstDay = `${currentMonth}-01`
      const lastDay = `${currentMonth}-${String(days).padStart(2, '0')}`

      const supabase = createClient() as unknown as any
      const { data: entriesData } = await supabase
        .from('work_entries').select('*')
        .eq('employee_id', worker.id).eq('company_id', companyId)
        .gte('date', firstDay).lte('date', lastDay)
      const entries: WorkEntry[] = entriesData || []
      if (entries.length === 0) { alert('No entries for this month.'); return }

      const { data: ratesData } = await supabase
        .from('agent_item_rates').select('*, commission_items(id, name, default_rate)')
        .eq('employee_id', worker.id)
      const agentRates: AgentItemRate[] = ratesData || []

      const [{ default: CommissionPayslipPDF }, { pdf }] = await Promise.all([
        import('@/components/pdf/CommissionPayslipPDF'),
        import('@react-pdf/renderer'),
      ])
      const blob = await pdf(
        <CommissionPayslipPDF
          month={currentMonth}
          companyName={companyName}
          employee={{ full_name: worker.full_name, employee_id: worker.employee_id }}
          entries={entries}
          agentRates={agentRates}
        />
      ).toBlob()
      downloadPdf(blob, `commission-${worker.employee_id}-${currentMonth}.pdf`)
    } catch {
      alert('Failed to generate PDF.')
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F0A1E' }}>
      {/* Ambient glow */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none -z-10"
        style={{ background: 'radial-gradient(circle, rgba(189,157,255,0.15) 0%, transparent 70%)' }} />

      <motion.div
        className="max-w-2xl mx-auto px-6 pt-16 pb-12"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.header variants={fadeInUp} className="mb-10">
          <h1 className="font-extrabold text-3xl tracking-tight mb-2" style={{ color: '#ebe1fe' }}>
            Work Entries
          </h1>
          <p className="text-lg font-medium" style={{ color: '#afa7c2' }}>Commission workers</p>
        </motion.header>

        {/* Worker list */}
        {workers.length === 0 ? (
          <motion.div variants={fadeInUp} className="py-20 text-center rounded-2xl" style={glassCard}>
            <p className="font-medium mb-1" style={{ color: '#afa7c2' }}>No commission workers yet.</p>
            <p className="text-sm" style={{ color: '#6b6483' }}>
              Add employees with Worker Type = Commission to get started.
            </p>
          </motion.div>
        ) : (
          <motion.div className="flex flex-col gap-4" variants={staggerContainer} initial="hidden" animate="visible">
            {workers.map(worker => (
              <motion.div key={worker.id} variants={fadeInUp}>
                <Link
                  href={`/work-entries/${worker.id}`}
                  className="flex items-center rounded-[14px] px-5 py-4 group transition-all duration-300"
                  style={glassCard}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLAnchorElement
                    el.style.background = 'rgba(47,39,71,0.4)'
                    el.style.boxShadow = '0 0 20px rgba(189,157,255,0.08)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLAnchorElement
                    el.style.background = 'rgba(28,22,46,0.6)'
                    el.style.boxShadow = 'none'
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mr-4"
                    style={{ background: avatarColor(worker.full_name) }}
                  >
                    {getInitials(worker.full_name)}
                  </div>

                  {/* Name + ID */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base leading-tight" style={{ color: '#ebe1fe' }}>{worker.full_name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(175,167,194,0.7)' }}>{worker.employee_id}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                      onClick={e => handleDownload(e, worker)}
                      disabled={downloadingId === worker.id}
                      title="Download this month's payslip"
                      className="p-2 rounded-full transition-colors disabled:opacity-40"
                      style={{ color: '#bd9dff' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(189,157,255,0.1)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                    >
                      {downloadingId === worker.id
                        ? <span className="text-xs font-mono w-5 block text-center">…</span>
                        : <FileDown className="w-5 h-5" />
                      }
                    </button>
                    <ChevronRight
                      className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
                      style={{ color: '#afa7c2' }}
                    />
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
