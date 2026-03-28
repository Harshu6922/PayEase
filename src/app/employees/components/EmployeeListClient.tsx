'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Search, Calendar, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import type { Employee } from '@/types'
import AddEmployeeModal from './AddEmployeeModal'
import EditEmployeeModal from './EditEmployeeModal'
import ToggleActiveButton from './ToggleActiveButton'
import DeleteEmployeeButton from './DeleteEmployeeButton'

const FILTERS = ['All', 'Salaried', 'Commission', 'Daily'] as const
type Filter = typeof FILTERS[number]

const avatarGradient: Record<string, string> = {
  salaried: 'from-[#bd9dff] to-[#8a4cfc]',
  commission: 'from-[#d3c5f5] to-[#4b4168]',
  daily: 'from-[#dad8ee] to-[#d3c5f5]',
}

const avatarText: Record<string, string> = {
  salaried: 'text-[#000000]',
  commission: 'text-[#382e54]',
  daily: 'text-[#4b455c]',
}

const typeBadge: Record<string, string> = {
  salaried: 'bg-[#4b4168] text-[#d7c9f9]',
  commission: 'bg-[#28213e] text-[#afa7c2]',
  daily: 'bg-[#2f2747] text-[#ebe1fe]',
}

const initials = (name: string) =>
  name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

const formatJoining = (date: string) =>
  new Date(date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })

const salaryLabel = (type: string) => {
  if (type === 'daily') return 'Daily Wage'
  if (type === 'commission') return 'Base Salary'
  return 'Monthly CTC'
}

const formatSalary = (emp: Employee) => {
  if (emp.worker_type === 'daily')
    return emp.daily_rate ? `₹${Number(emp.daily_rate).toLocaleString('en-IN')}/day` : '—'
  if (emp.worker_type === 'commission' && emp.monthly_salary === 0)
    return 'Commission only'
  return `₹${emp.monthly_salary.toLocaleString('en-IN')}`
}

interface Props {
  employees: Employee[]
  userRole: 'admin' | 'viewer'
  atSeatLimit: boolean
  employeeLimit: number
  isSubscribed: boolean
}

export default function EmployeeListClient({
  employees, userRole, atSeatLimit, employeeLimit, isSubscribed,
}: Props) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('All')
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

  return (
    <div className="min-h-screen bg-[#100b1f] pb-20">

      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed top-[-10%] right-[-10%] w-[60%] h-[60%] z-0"
        style={{ background: 'radial-gradient(circle, rgba(189,157,255,0.08) 0%, transparent 70%)' }}
      />

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-16">

        {/* Page Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="font-extrabold text-4xl md:text-5xl tracking-tight text-[#ebe1fe]">
              Employees
            </h1>
            <p className="mt-2 text-[#afa7c2] text-sm">
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

        {/* Search + Filter */}
        <section className="flex flex-col lg:flex-row gap-5 mb-12">
          <div
            className="relative flex-grow lg:w-2/3 flex items-center gap-3 px-4 py-4 rounded-2xl border border-[#bd9dff]/10 focus-within:border-[#bd9dff]/30 focus-within:ring-1 focus-within:ring-[#bd9dff]/20 transition-all"
            style={{ background: 'rgba(28,22,46,0.4)', backdropFilter: 'blur(24px)' }}
            onClick={() => searchRef.current?.focus()}
          >
            <Search className="h-5 w-5 text-[#afa7c2] flex-shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or employee ID..."
              className="bg-transparent border-none outline-none text-[#ebe1fe] w-full text-sm placeholder:text-[#afa7c2]/50"
            />
          </div>

          <div
            className="lg:w-1/3 flex p-1.5 rounded-2xl"
            style={{ background: 'rgba(28,22,46,0.4)', backdropFilter: 'blur(24px)', border: '1px solid rgba(189,157,255,0.1)' }}
          >
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-xs transition-all ${
                  filter === f
                    ? 'bg-[#bd9dff] text-[#000000] shadow-lg'
                    : 'text-[#afa7c2] hover:text-[#ebe1fe]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </section>

        {/* Cards Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-28 text-[#afa7c2]">
            <p className="text-xl font-semibold">No employees found</p>
            <p className="text-sm mt-2 opacity-60">Try adjusting your search or filter.</p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {filtered.map(emp => (
              <motion.div
                key={emp.id}
                variants={fadeInUp}
                className="relative flex flex-col h-full p-8 rounded-2xl"
                style={{
                  background: 'rgba(28,22,46,0.6)',
                  backdropFilter: 'blur(24px)',
                  border: '1px solid rgba(189,157,255,0.1)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                whileHover={{ y: -4, boxShadow: '0 0 30px rgba(124,58,237,0.15)', borderColor: 'rgba(189,157,255,0.4)' }}
              >
                {/* Card header */}
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-5">
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${avatarGradient[emp.worker_type] ?? 'from-[#bd9dff] to-[#8a4cfc]'} flex items-center justify-center font-bold text-xl shadow-lg flex-shrink-0 ${avatarText[emp.worker_type] ?? 'text-black'}`}>
                      {initials(emp.full_name)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#ebe1fe] tracking-tight leading-tight">
                        {emp.full_name}
                      </h3>
                      <p className="font-mono text-xs text-[#afa7c2] uppercase tracking-widest mt-1">
                        {emp.employee_id}
                      </p>
                    </div>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase ${typeBadge[emp.worker_type] ?? 'bg-[#28213e] text-[#afa7c2]'}`}>
                    {emp.worker_type}
                  </span>
                </div>

                {/* Salary */}
                <div className="space-y-4 mb-8">
                  <div className="flex items-center justify-between">
                    <span className="text-[#afa7c2] text-sm font-medium">{salaryLabel(emp.worker_type)}</span>
                    <span className="text-[#bd9dff] font-bold text-lg">{formatSalary(emp)}</span>
                  </div>
                  <div className="h-px bg-[#4b455c]/20" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#afa7c2]">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">Joined {formatJoining(emp.joining_date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        {emp.is_active && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        )}
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${emp.is_active ? 'bg-emerald-500' : 'bg-red-400'}`} />
                      </span>
                      <span className={`text-[10px] uppercase font-bold tracking-tight ${emp.is_active ? 'text-emerald-500' : 'text-red-400'}`}>
                        {emp.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-auto flex items-center gap-2">
                  <Link
                    href={`/employees/${emp.id}`}
                    className="flex-1 py-3.5 border border-[#bd9dff]/20 rounded-xl text-[#bd9dff] font-bold text-sm hover:bg-[#bd9dff]/5 transition-colors flex items-center justify-center gap-2 group"
                  >
                    View Details
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  {userRole === 'admin' && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <EditEmployeeModal employee={emp} />
                      <ToggleActiveButton id={emp.id} isActive={emp.is_active} />
                      <DeleteEmployeeButton id={emp.id} name={emp.full_name} />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Footer count */}
        {filtered.length > 0 && (
          <footer className="mt-16 flex justify-center">
            <div
              className="flex items-center gap-3 px-6 py-3 rounded-full border border-[#4b455c]/10"
              style={{ background: 'rgba(28,22,46,0.3)', backdropFilter: 'blur(12px)' }}
            >
              <span className="text-[#afa7c2] text-xs font-medium uppercase tracking-widest">
                Showing {filtered.length} of {employees.length} Employees
              </span>
            </div>
          </footer>
        )}

      </main>
    </div>
  )
}
