'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import type { Employee } from '@/types'
import AddEmployeeModal from './AddEmployeeModal'
import EditEmployeeModal from './EditEmployeeModal'
import ToggleActiveButton from './ToggleActiveButton'
import DeleteEmployeeButton from './DeleteEmployeeButton'
import SetPortalPasswordButton from './SetPortalPasswordButton'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FILTERS = ['All', 'Salaried', 'Commission', 'Daily'] as const
type Filter = typeof FILTERS[number]

const AVATAR_COLORS = ['#bd9dff', '#8a4cfc', '#d3c5f5', '#afa7c2', '#7c6fa0', '#a78bfa']

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

const initials = (name: string) =>
  name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

const formatJoining = (date: string) =>
  new Date(date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })

const salaryLabel = (emp: Employee) => {
  if (emp.worker_type === 'daily') return 'Daily Wage'
  if (emp.worker_type === 'commission' && emp.monthly_salary === 0) return 'Commission only'
  return 'Monthly CTC'
}

const formatSalary = (emp: Employee) => {
  if (emp.worker_type === 'daily')
    return emp.daily_rate ? `₹${Number(emp.daily_rate).toLocaleString('en-IN')}/day` : '—'
  if (emp.worker_type === 'commission' && emp.monthly_salary === 0)
    return 'Commission only'
  return `₹${emp.monthly_salary.toLocaleString('en-IN')}`
}

const avatarColor = (name: string): string => {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

const TYPE_BADGE: Record<string, { bg: string; border: string; color: string }> = {
  salaried:   { bg: 'rgba(189,157,255,0.15)', border: 'rgba(189,157,255,0.3)',  color: '#bd9dff' },
  daily:      { bg: 'rgba(212,168,71,0.1)',   border: 'rgba(212,168,71,0.25)', color: '#D4A847' },
  commission: { bg: 'rgba(16,185,129,0.1)',   border: 'rgba(16,185,129,0.2)',  color: '#10b981' },
}

function TypeBadge({ type }: { type: string }) {
  const s = TYPE_BADGE[type] ?? TYPE_BADGE.salaried
  return (
    <span
      className="px-2.5 py-1 rounded-full text-xs font-semibold border"
      style={{ background: s.bg, borderColor: s.border, color: s.color }}
    >
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </span>
  )
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        {active && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${active ? 'bg-emerald-500' : 'bg-red-400'}`}
        />
      </span>
      <span
        className="text-[10px] uppercase font-bold tracking-tight"
        style={{ color: active ? '#10b981' : '#ff6e84' }}
      >
        {active ? 'Active' : 'Inactive'}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  employees: Employee[]
  userRole: 'admin' | 'viewer'
  atSeatLimit: boolean
  employeeLimit: number
  isSubscribed: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EmployeeListClient({
  employees, userRole, atSeatLimit, employeeLimit, isSubscribed,
}: Props) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('All')
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const filtered = employees.filter(emp => {
    const matchesFilter =
      filter === 'All' || emp.worker_type.toLowerCase() === filter.toLowerCase()
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      emp.full_name.toLowerCase().includes(q) ||
      emp.employee_id.toLowerCase().includes(q)
    return matchesFilter && matchesSearch
  })

  const glassCard = {
    background: 'rgba(28,22,46,0.6)',
    backdropFilter: 'blur(24px)',
    border: '1px solid rgba(189,157,255,0.1)',
  } as const

  return (
    <div className="min-h-screen pb-20" style={{ background: '#100b1f' }}>

      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed top-[-10%] right-[-10%] w-[60%] h-[60%] z-0"
        style={{ background: 'radial-gradient(circle, rgba(189,157,255,0.08) 0%, transparent 70%)' }}
      />

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-16">

        {/* Page Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="font-extrabold text-4xl md:text-5xl tracking-tight" style={{ color: '#ebe1fe' }}>
              Employees
            </h1>
            <p className="mt-2 text-sm" style={{ color: '#afa7c2' }}>
              Manage your workforce and salaries
            </p>
          </div>
          {userRole === 'admin' && (
            <AddEmployeeModal
              atSeatLimit={atSeatLimit}
              employeeLimit={employeeLimit}
              isSubscribed={isSubscribed}
            />
          )}
        </header>

        {/* Search + Filter Bar */}
        <section className="flex flex-col lg:flex-row gap-5 mb-12">
          <div
            className="relative flex-grow lg:w-2/3 flex items-center gap-3 px-4 py-4 rounded-2xl border focus-within:border-[#bd9dff]/30 focus-within:ring-1 focus-within:ring-[#bd9dff]/20 transition-all cursor-text"
            style={{ ...glassCard, borderColor: 'rgba(189,157,255,0.1)' }}
            onClick={() => searchRef.current?.focus()}
          >
            <Search className="h-5 w-5 flex-shrink-0" style={{ color: '#afa7c2' }} />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or employee ID..."
              className="bg-transparent border-none outline-none w-full text-sm"
              style={{ color: '#ebe1fe' }}
            />
          </div>

          <div
            className="lg:w-1/3 flex p-1.5 rounded-2xl"
            style={glassCard}
          >
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="flex-1 py-2.5 rounded-xl font-semibold text-xs transition-all"
                style={
                  filter === f
                    ? { background: '#bd9dff', color: '#000000' }
                    : { color: '#afa7c2' }
                }
                onMouseEnter={e => {
                  if (filter !== f)
                    (e.currentTarget as HTMLButtonElement).style.color = '#ebe1fe'
                }}
                onMouseLeave={e => {
                  if (filter !== f)
                    (e.currentTarget as HTMLButtonElement).style.color = '#afa7c2'
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </section>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div className="text-center py-28" style={{ color: '#afa7c2' }}>
            <p className="text-xl font-semibold">No employees found</p>
            <p className="text-sm mt-2 opacity-60">Try adjusting your search or filter.</p>
          </div>
        ) : (
          <>
            {/* ----------------------------------------------------------------
                MOBILE CARDS  (hidden on lg+)
            ---------------------------------------------------------------- */}
            <div className="lg:hidden">
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 gap-5"
              >
                {filtered.map(emp => {
                  const bg = avatarColor(emp.full_name)
                  return (
                    <motion.div
                      key={emp.id}
                      variants={fadeInUp}
                      className="rounded-2xl p-5"
                      style={glassCard}
                      whileHover={{
                        y: -2,
                        boxShadow: '0 0 24px rgba(124,58,237,0.15)',
                        borderColor: 'rgba(189,157,255,0.3)',
                      }}
                    >
                      {/* Row 1: avatar + name + badge */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-base flex-shrink-0"
                            style={{ background: bg, color: '#100b1f' }}
                          >
                            {initials(emp.full_name)}
                          </div>
                          <div>
                            <p className="font-semibold text-sm leading-tight" style={{ color: '#ebe1fe' }}>
                              {emp.full_name}
                            </p>
                            <p className="font-mono text-[10px] uppercase tracking-widest mt-0.5" style={{ color: '#afa7c2' }}>
                              {emp.employee_id}
                            </p>
                          </div>
                        </div>
                        <TypeBadge type={emp.worker_type} />
                      </div>

                      {/* Row 2: salary + status */}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-wide font-semibold mb-0.5" style={{ color: '#6b6483' }}>
                            {salaryLabel(emp)}
                          </p>
                          <p className="text-sm font-bold" style={{ color: '#bd9dff' }}>
                            {formatSalary(emp)}
                          </p>
                        </div>
                        <StatusDot active={emp.is_active} />
                      </div>

                      {/* Row 3: actions */}
                      {userRole === 'admin' && (
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/employees/${emp.id}`}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold border text-center transition-all"
                            style={{
                              borderColor: 'rgba(189,157,255,0.2)',
                              color: '#bd9dff',
                            }}
                          >
                            View Details
                          </Link>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <EditEmployeeModal employee={emp} />
                            <SetPortalPasswordButton employeeUuid={emp.id} employeeName={emp.full_name} />
                            <ToggleActiveButton id={emp.id} isActive={emp.is_active} />
                            <DeleteEmployeeButton id={emp.id} name={emp.full_name} />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </motion.div>
            </div>

            {/* ----------------------------------------------------------------
                DESKTOP TABLE  (hidden on md and below)
            ---------------------------------------------------------------- */}
            <div className="hidden lg:block rounded-2xl overflow-hidden" style={glassCard}>
              <table className="w-full border-collapse">
                <thead>
                  <tr style={{ background: 'rgba(189,157,255,0.04)' }}>
                    {['Employee', 'ID', 'Type', 'Salary', 'Status', 'Joined', ...(userRole === 'admin' ? ['Actions'] : [])].map(col => (
                      <th
                        key={col}
                        className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.2em]"
                        style={{ color: '#afa7c2' }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(emp => {
                    const bg = avatarColor(emp.full_name)
                    const isHovered = hoveredRow === emp.id
                    return (
                      <tr
                        key={emp.id}
                        style={{
                          borderBottom: '1px solid rgba(189,157,255,0.06)',
                          background: isHovered ? 'rgba(47,39,71,0.3)' : 'transparent',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={() => setHoveredRow(emp.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        {/* Employee */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                              style={{ background: bg, color: '#100b1f' }}
                            >
                              {initials(emp.full_name)}
                            </div>
                            <div>
                              <p className="font-medium text-sm" style={{ color: '#ebe1fe' }}>
                                {emp.full_name}
                              </p>
                              <p className="font-mono text-xs uppercase" style={{ color: '#afa7c2' }}>
                                {emp.employee_id}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* ID */}
                        <td className="px-6 py-4 font-mono text-xs uppercase" style={{ color: '#afa7c2' }}>
                          {emp.employee_id}
                        </td>

                        {/* Type */}
                        <td className="px-6 py-4">
                          <TypeBadge type={emp.worker_type} />
                        </td>

                        {/* Salary */}
                        <td className="px-6 py-4 text-sm font-semibold" style={{ color: '#bd9dff' }}>
                          {formatSalary(emp)}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <StatusDot active={emp.is_active} />
                        </td>

                        {/* Joined */}
                        <td className="px-6 py-4 text-sm" style={{ color: '#afa7c2' }}>
                          {formatJoining(emp.joining_date)}
                        </td>

                        {/* Actions */}
                        {userRole === 'admin' && (
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              <Link
                                href={`/employees/${emp.id}`}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                                style={{
                                  borderColor: 'rgba(189,157,255,0.2)',
                                  color: '#bd9dff',
                                }}
                                onMouseEnter={e => {
                                  (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(189,157,255,0.05)'
                                }}
                                onMouseLeave={e => {
                                  (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
                                }}
                              >
                                View
                              </Link>
                              <EditEmployeeModal employee={emp} />
                              <SetPortalPasswordButton employeeUuid={emp.id} employeeName={emp.full_name} />
                              <ToggleActiveButton id={emp.id} isActive={emp.is_active} />
                              <DeleteEmployeeButton id={emp.id} name={emp.full_name} />
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Footer count */}
        {filtered.length > 0 && (
          <footer className="mt-16 flex justify-center">
            <div
              className="flex items-center gap-3 px-6 py-3 rounded-full border"
              style={{
                background: 'rgba(28,22,46,0.3)',
                backdropFilter: 'blur(12px)',
                borderColor: 'rgba(75,69,92,0.1)',
              }}
            >
              <span className="text-xs font-medium uppercase tracking-widest" style={{ color: '#afa7c2' }}>
                Showing {filtered.length} of {employees.length} Employees
              </span>
            </div>
          </footer>
        )}

      </main>
    </div>
  )
}
