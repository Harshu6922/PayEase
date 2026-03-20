'use client'

import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const COLORS = ['#4f46e5', '#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']
const formatRs = (v: number) => '₹' + Number(v).toLocaleString('en-IN')

interface Props {
  expenseBarData: { name: string; total: number }[]
  expenseRawData: { amount: number; category: string; date: string }[]
  payrollBarData: { name: string; total: number }[]
  summariesRaw: { final_payable_salary: number; month: number; year: number; employees: { worker_type: string } | null }[]
  months: { year: number; month: number; label: string }[]
  defaultMonth: string  // 'YYYY-MM'
}

export default function ChartsView({
  expenseBarData, expenseRawData, payrollBarData, summariesRaw, months, defaultMonth,
}: Props) {
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth)
  const [selYear, selMonthNum] = selectedMonth.split('-').map(Number)

  const selectedLabel = months.find(
    m => m.year === selYear && m.month === selMonthNum
  )?.label ?? selectedMonth

  // Expense pie for selected month
  const expensePieData = (() => {
    const filtered = expenseRawData.filter(e => {
      const d = new Date(e.date)
      return d.getFullYear() === selYear && d.getMonth() + 1 === selMonthNum
    })
    const byCategory: Record<string, number> = {}
    for (const e of filtered) {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + Number(e.amount)
    }
    return Object.entries(byCategory).map(([name, value]) => ({ name, value }))
  })()

  // Payroll donut for selected month — group by worker_type
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

  const cardCls = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6'
  const titleCls = 'text-base font-semibold text-gray-900 dark:text-white mb-4'
  const emptyState = (msg: string) => (
    <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-sm">{msg}</div>
  )

  return (
    <div className="space-y-6">
      {/* Month selector for pie/donut charts */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Month:</label>
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {monthOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Bar — last 6 months */}
        <div className={cardCls}>
          <h2 className={titleCls}>Monthly Expenses (Last 6 Months)</h2>
          {expenseBarData.every(d => d.total === 0) ? emptyState('No expense data yet') : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={expenseBarData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => '₹' + (v / 1000).toFixed(0) + 'k'} tick={{ fontSize: 11 }} width={55} />
                <Tooltip formatter={(v) => [formatRs(Number(v)), 'Total']} />
                <Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Expense Pie — selected month */}
        <div className={cardCls}>
          <h2 className={titleCls}>Expense Breakdown — {selectedLabel}</h2>
          {expensePieData.length === 0 ? emptyState('No expenses for this month') : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={expensePieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {expensePieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [formatRs(Number(v)), 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Payroll Bar — last 6 months */}
        <div className={cardCls}>
          <h2 className={titleCls}>Monthly Payroll (Last 6 Months)</h2>
          {payrollBarData.every(d => d.total === 0) ? emptyState('No payroll data yet') : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={payrollBarData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => '₹' + (v / 1000).toFixed(0) + 'k'} tick={{ fontSize: 11 }} width={55} />
                <Tooltip formatter={(v) => [formatRs(Number(v)), 'Total']} />
                <Bar dataKey="total" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Payroll Donut — selected month by worker type */}
        <div className={cardCls}>
          <h2 className={titleCls}>Payroll by Worker Type — {selectedLabel}</h2>
          {payrollDonutData.length === 0 ? emptyState('No payroll data for this month') : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={payrollDonutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {payrollDonutData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [formatRs(Number(v)), 'Amount']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
