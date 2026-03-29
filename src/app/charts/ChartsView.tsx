'use client'

import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area,
} from 'recharts'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

const PIE_COLORS = ['#7C3AED', '#10B981', '#F59E0B']
const formatRs = (v: number) => '₹' + Number(v).toLocaleString('en-IN')
// Shorten "Mar 2025" → "Mar" for mobile x-axis labels
const shortMonth = (label: string) => label.split(' ')[0]

interface Props {
  expenseBarData: { name: string; total: number }[]
  expenseRawData: { amount: number; category: string; date: string }[]
  payrollBarData: { name: string; total: number }[]
  summariesRaw: { final_payable_salary: number; month: number; year: number; employees: { worker_type: string } | null }[]
  months: { year: number; month: number; label: string }[]
  defaultMonth: string
}

const glassCard = 'backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-xl p-4'

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#221445] border border-[#7C3AED]/20 rounded-xl px-3 py-2 text-xs text-[#F1F0F5]">
      <p className="font-semibold mb-1 text-[#A855F7]">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i}>{p.name}: <span className="font-mono">{formatRs(Number(p.value))}</span></p>
      ))}
    </div>
  )
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="flex items-center justify-center h-40 text-[#7B7A8E] text-sm">{msg}</div>
  )
}

const yAxisProps = {
  tickFormatter: (v: number) => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v),
  tick: { fontSize: 10, fill: '#7B7A8E' },
  axisLine: { stroke: '#7B7A8E' },
  tickLine: false,
  width: 44,
}

const xAxisProps = {
  tick: { fontSize: 10, fill: '#7B7A8E' },
  axisLine: { stroke: '#7B7A8E' },
  tickLine: false,
}

export default function ChartsView({
  expenseBarData, expenseRawData, payrollBarData, summariesRaw, months, defaultMonth,
}: Props) {
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth)
  const [selYear, selMonthNum] = selectedMonth.split('-').map(Number)

  const selectedLabel = months.find(
    m => m.year === selYear && m.month === selMonthNum
  )?.label ?? selectedMonth

  // Shorten labels for mobile charts
  const payrollBarDataShort = payrollBarData.map(d => ({ ...d, name: shortMonth(d.name) }))
  const expenseBarDataShort = expenseBarData.map(d => ({ ...d, name: shortMonth(d.name) }))

  const expensePieData = (() => {
    const filtered = expenseRawData.filter(e => {
      const d = new Date(e.date)
      return d.getFullYear() === selYear && d.getMonth() + 1 === selMonthNum
    })
    const byCategory: Record<string, number> = {}
    for (const e of filtered) byCategory[e.category] = (byCategory[e.category] ?? 0) + Number(e.amount)
    return Object.entries(byCategory).map(([name, value]) => ({ name, value }))
  })()

  const payrollDonutData = (() => {
    const filtered = summariesRaw.filter(s => s.year === selYear && s.month === selMonthNum)
    const byType: Record<string, number> = {}
    for (const s of filtered) {
      const wt = s.employees?.worker_type ?? 'salaried'
      byType[wt] = (byType[wt] ?? 0) + Number(s.final_payable_salary)
    }
    return Object.entries(byType).map(([name, value]) => ({ name, value }))
  })()

  const monthOptions = months.map(m => ({
    value: `${m.year}-${String(m.month).padStart(2, '0')}`,
    label: m.label,
  }))

  return (
    <div className="min-h-screen bg-[#0F0A1E]">
      {/* Header */}
      <div className="px-4 md:px-8 pt-6 pb-5 border-b border-[#7C3AED]/10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase mb-1 text-[#7B7A8E] tracking-widest">Analytics</p>
            <h1 className="text-2xl md:text-4xl font-extrabold text-[#F1F0F5]" style={{ letterSpacing: '-0.5px' }}>Charts</h1>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-[#7B7A8E] whitespace-nowrap">Month:</label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="flex-1 sm:flex-none rounded-xl px-3 py-2 text-sm focus:outline-none bg-[#1A1035] border border-[#7C3AED]/30 text-[#F1F0F5] focus:border-[#7C3AED]/60"
            >
              {monthOptions.map(o => (
                <option key={o.value} value={o.value} style={{ backgroundColor: '#1A1035', color: '#F1F0F5' }}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-5">
        <Tabs defaultValue="salary-trends">
          {/* Tabs — scrollable on mobile */}
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 mb-5">
            <TabsList className="bg-[#1A1035] border border-[#7C3AED]/20 rounded-xl p-1 flex w-max min-w-full sm:w-auto">
              <TabsTrigger
                value="salary-trends"
                className="flex-1 sm:flex-none rounded-lg text-xs sm:text-sm text-[#7B7A8E] hover:text-[#F1F0F5] data-[state=active]:bg-[#7C3AED] data-[state=active]:text-white transition-all px-3 py-2 whitespace-nowrap"
              >
                Salary Trends
              </TabsTrigger>
              <TabsTrigger
                value="attendance"
                className="flex-1 sm:flex-none rounded-lg text-xs sm:text-sm text-[#7B7A8E] hover:text-[#F1F0F5] data-[state=active]:bg-[#7C3AED] data-[state=active]:text-white transition-all px-3 py-2 whitespace-nowrap"
              >
                Trends
              </TabsTrigger>
              <TabsTrigger
                value="summary"
                className="flex-1 sm:flex-none rounded-lg text-xs sm:text-sm text-[#7B7A8E] hover:text-[#F1F0F5] data-[state=active]:bg-[#7C3AED] data-[state=active]:text-white transition-all px-3 py-2 whitespace-nowrap"
              >
                Summary
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Salary Trends Tab */}
          <TabsContent value="salary-trends">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className={glassCard}>
                <h2 className="text-sm font-semibold text-[#F1F0F5] mb-3">Monthly Payroll</h2>
                {payrollBarData.every(d => d.total === 0) ? <EmptyState msg="No payroll data yet" /> : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={payrollBarDataShort} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#7C3AED" strokeOpacity={0.1} vertical={false} />
                      <XAxis dataKey="name" {...xAxisProps} />
                      <YAxis {...yAxisProps} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="total" name="Payroll" radius={[4, 4, 0, 0]}>
                        {payrollBarDataShort.map((_, i) => (
                          <Cell key={i} fill={i === payrollBarDataShort.length - 1 ? '#D4A847' : '#7C3AED'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className={glassCard}>
                <h2 className="text-sm font-semibold text-[#F1F0F5] mb-3">Monthly Expenses</h2>
                {expenseBarData.every(d => d.total === 0) ? <EmptyState msg="No expense data yet" /> : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={expenseBarDataShort} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#7C3AED" strokeOpacity={0.1} vertical={false} />
                      <XAxis dataKey="name" {...xAxisProps} />
                      <YAxis {...yAxisProps} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="total" name="Expenses" radius={[4, 4, 0, 0]}>
                        {expenseBarDataShort.map((_, i) => (
                          <Cell key={i} fill={i === expenseBarDataShort.length - 1 ? '#D4A847' : '#7C3AED'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="attendance">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className={glassCard}>
                <h2 className="text-sm font-semibold text-[#F1F0F5] mb-3">Payroll Trend</h2>
                {payrollBarData.every(d => d.total === 0) ? <EmptyState msg="No payroll data yet" /> : (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={payrollBarDataShort} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="payrollGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.08} />
                          <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#7C3AED" strokeOpacity={0.1} vertical={false} />
                      <XAxis dataKey="name" {...xAxisProps} />
                      <YAxis {...yAxisProps} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="total" name="Payroll" stroke="#7C3AED" strokeWidth={2}
                        fill="url(#payrollGrad)" dot={{ fill: '#7C3AED', r: 3 }} activeDot={{ fill: '#A855F7', r: 5 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className={glassCard}>
                <h2 className="text-sm font-semibold text-[#F1F0F5] mb-3">Expense Trend</h2>
                {expenseBarData.every(d => d.total === 0) ? <EmptyState msg="No expense data yet" /> : (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={expenseBarDataShort} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.08} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#7C3AED" strokeOpacity={0.1} vertical={false} />
                      <XAxis dataKey="name" {...xAxisProps} />
                      <YAxis {...yAxisProps} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="total" name="Expenses" stroke="#10B981" strokeWidth={2}
                        fill="url(#expenseGrad)" dot={{ fill: '#10B981', r: 3 }} activeDot={{ fill: '#34D399', r: 5 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className={glassCard}>
                <h2 className="text-sm font-semibold text-[#F1F0F5] mb-3">Expense Breakdown — {selectedLabel}</h2>
                {expensePieData.length === 0 ? <EmptyState msg="No expenses for this month" /> : (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={expensePieData} dataKey="value" nameKey="name"
                          cx="50%" cy="50%" innerRadius={55} outerRadius={85}>
                          {expensePieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-2 mt-2 justify-center">
                      {expensePieData.map((entry, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-[#F1F0F5]">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          {entry.name}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className={glassCard}>
                <h2 className="text-sm font-semibold text-[#F1F0F5] mb-3">Payroll by Worker Type — {selectedLabel}</h2>
                {payrollDonutData.length === 0 ? <EmptyState msg="No payroll data for this month" /> : (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={payrollDonutData} dataKey="value" nameKey="name"
                          cx="50%" cy="50%" innerRadius={55} outerRadius={85}>
                          {payrollDonutData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-2 mt-2 justify-center">
                      {payrollDonutData.map((entry, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-[#F1F0F5]">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="capitalize">{entry.name}</span>
                          <span className="font-mono text-[#7B7A8E]">{formatRs(entry.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
