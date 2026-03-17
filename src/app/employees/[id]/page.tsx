import { createClient } from '@/lib/supabase/server'
import { formatINR } from '@/lib/payroll-utils'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User, Briefcase, Calendar } from 'lucide-react'

// Define params for Next.js dynamic routes
export default async function EmployeeDetailsPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { month?: string; year?: string }
}) {
  const supabase = await createClient()

  // Handle Month/Year routing state (default to current if missing in URL search params)
  const today = new Date()
  const selectedMonth = searchParams?.month ? parseInt(searchParams.month) : today.getMonth() + 1
  const selectedYear = searchParams?.year ? parseInt(searchParams.year) : today.getFullYear()

  // Validate formatting
  if (isNaN(selectedMonth) || isNaN(selectedYear)) {
    return notFound()
  }

  // 1. Fetch exact isolated employee target
  const { data: employeeRaw } = await supabase
    .from('employees')
    .select('*')
    .eq('id', params.id)
    .single()

  const employee = employeeRaw as any;

  if (!employee) {
    return notFound()
  }

  // Handle pagination values cleanly for the selector UI
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const currentYear = today.getFullYear()
  const recentYears = [currentYear - 1, currentYear, currentYear + 1]

  // 2. Fetch specific monthly attendance for this employee
  const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
  const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${daysInMonth}`

  const { data: attendanceRaw } = await supabase
    .from('attendance_records')
    .select('date, worked_hours')
    .eq('employee_id', employee.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  const attendance = (attendanceRaw || []) as { date: string, worked_hours: number }[]

  // 3. Process Attendance Analytics
  const presentDates: string[] = []
  const absentDates: string[] = []

  let totalWorkedDays = 0

  attendance.forEach(record => {
    if (Number(record.worked_hours) > 0) {
      presentDates.push(record.date)
      totalWorkedDays++
    }
  })

  // How are absent days determined?
  // We check every day from the 1st of the selected month
  // up to MIN(daysInMonth, yesterday if looking at current month).
  // If the day is a weekday (Mon-Fri) and lacks a >0 hour attendance record, it's counted as "Absent".
  
  // Set cutoff bounds for absenteeism: We can't be absent for future days.
  const isFutureMonth = selectedYear > today.getFullYear() || (selectedYear === today.getFullYear() && selectedMonth > (today.getMonth() + 1))
  const isCurrentMonth = selectedYear === today.getFullYear() && selectedMonth === (today.getMonth() + 1)
  
  // For future months, check 0 days. For current month, check up to yesterday. For past months, check all days.
  const daysToCheck = isFutureMonth ? 0 : (isCurrentMonth ? Math.max(0, today.getDate() - 1) : daysInMonth)

  let totalAbsentDays = 0

  for (let i = 1; i <= daysToCheck; i++) {
    const checkDate = new Date(selectedYear, selectedMonth - 1, i)
    const dateString = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    
    // Simplistic MVP Rule: Treat Monday-Friday (1-5) as required working days.
    const isWeekday = checkDate.getDay() !== 0 && checkDate.getDay() !== 6

    if (isWeekday && !presentDates.includes(dateString)) {
      absentDates.push(dateString)
      totalAbsentDays++
    }
  }

  // 4. Fetch and Process Advances
  const { data: advancesRaw } = await supabase
    .from('employee_advances')
    .select('advance_date, amount, note')
    .eq('employee_id', employee.id)
    .gte('advance_date', startDate)
    .lte('advance_date', endDate)
    .order('advance_date', { ascending: true })

  const advances = (advancesRaw || []) as { advance_date: string, amount: number, note: string | null }[]
  const totalAdvances = advances.reduce((sum, adv) => sum + Number(adv.amount), 0)

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* 1. Page Header & Back Navigation */}
      <div className="mb-8">
        <Link 
          href="/employees" 
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Employees
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{employee.full_name}</h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
              <User className="h-4 w-4" /> ID: {employee.employee_id}
            </p>
          </div>

          {/* 2. Month/Year Selector Form */}
          <form className="flex items-center gap-3 bg-white p-2 rounded-lg border shadow-sm">
             <select
               name="month"
               defaultValue={selectedMonth}
               className="block rounded-md border-0 py-1.5 pl-3 pr-8 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 cursor-pointer"
             >
               {months.map((m, i) => (
                 <option key={i + 1} value={i + 1}>{m}</option>
               ))}
             </select>
             <select
               name="year"
               defaultValue={selectedYear}
               className="block rounded-md border-0 py-1.5 pl-3 pr-8 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 cursor-pointer"
             >
               {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                 <option key={y} value={y}>{y}</option>
               ))}
             </select>
             <button
               type="submit"
               className="rounded-md bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-100 transition-colors"
             >
               View Period
             </button>
          </form>
        </div>
      </div>

      {/* 3. Base Identity Detail Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mt-8">
        <div className="rounded-xl border bg-white p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-green-50">
            <Briefcase className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Monthly Salary Base</p>
            <p className="text-2xl font-bold text-gray-900">{formatINR(employee.monthly_salary)}</p>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-50">
            <Calendar className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Standard Working Hours</p>
            <p className="text-2xl font-bold text-gray-900">{employee.standard_working_hours} <span className="text-gray-400 text-sm font-normal">hours/day</span></p>
          </div>
        </div>
      </div>

      {/* 4. Attendance Summary Rows & Details */}
      <h2 className="text-lg font-semibold text-gray-900 mt-12 mb-4">Attendance Summary ({months[selectedMonth - 1]} {selectedYear})</h2>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Present Card */}
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="bg-indigo-50 px-6 py-4 flex items-center justify-between border-b border-indigo-100">
            <span className="font-semibold text-indigo-900">Total Days Present</span>
            <span className="bg-indigo-200 text-indigo-800 text-xs font-bold px-2 py-1 rounded-full">{totalWorkedDays}</span>
          </div>
          <div className="p-6 max-h-60 overflow-y-auto">
            {presentDates.length === 0 ? (
               <p className="text-sm text-gray-500 italic">No present days recorded this month.</p>
            ) : (
               <ul className="space-y-2">
                 {presentDates.map(d => (
                   <li key={d} className="text-sm text-gray-700 flex items-center gap-2">
                     <span className="h-2 w-2 rounded-full bg-indigo-400"></span> {d}
                   </li>
                 ))}
               </ul>
            )}
          </div>
        </div>

        {/* Absent Card */}
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="bg-red-50 px-6 py-4 flex items-center justify-between border-b border-red-100">
            <span className="font-semibold text-red-900">Total Weekdays Absent</span>
            <span className="bg-red-200 text-red-800 text-xs font-bold px-2 py-1 rounded-full">{totalAbsentDays}</span>
          </div>
          <div className="p-6 max-h-60 overflow-y-auto">
            {absentDates.length === 0 ? (
               <p className="text-sm text-gray-500 italic">No absent weekdays recorded yet.</p>
            ) : (
               <ul className="space-y-2">
                 {absentDates.map(d => (
                   <li key={d} className="text-sm text-gray-700 flex items-center gap-2">
                     <span className="h-2 w-2 rounded-full bg-red-400"></span> {d}
                   </li>
                 ))}
               </ul>
            )}
          </div>
        </div>
      </div>

      {/* 5. Advances Summary */}
      <h2 className="text-lg font-semibold text-gray-900 mt-12 mb-4">Advances ({months[selectedMonth - 1]} {selectedYear})</h2>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden sm:col-span-2">
          <div className="bg-amber-50 px-6 py-4 flex items-center justify-between border-b border-amber-100">
            <span className="font-semibold text-amber-900">Total Advances</span>
            <span className="bg-amber-200 text-amber-800 text-sm font-bold px-3 py-1 rounded-full">{formatINR(totalAdvances)}</span>
          </div>
          <div className="p-6 max-h-60 overflow-y-auto">
            {advances.length === 0 ? (
               <p className="text-sm text-gray-500 italic">No advances recorded this month.</p>
            ) : (
               <ul className="space-y-3">
                 {advances.map((a, i) => (
                   <li key={i} className="text-sm text-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                     <div className="flex items-center gap-2">
                       <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                       <span className="font-medium">{a.advance_date}</span>
                       {a.note && <span className="text-gray-500 text-xs ml-2 text-wrap break-words max-w-[200px] sm:max-w-md">- {a.note}</span>}
                     </div>
                     <span className="font-semibold mt-1 sm:mt-0 text-gray-900">{formatINR(a.amount)}</span>
                   </li>
                 ))}
               </ul>
            )}
          </div>
        </div>
      </div>
      
    </div>
  )
}
