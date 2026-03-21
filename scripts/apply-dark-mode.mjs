import { readFileSync, writeFileSync } from 'fs'

const FILES = [
  // Task 10
  'src/app/dashboard/components/DashboardCards.tsx',
  'src/app/employees/page.tsx',
  'src/app/employees/components/AddEmployeeModal.tsx',
  'src/app/employees/components/EditEmployeeModal.tsx',
  'src/app/employees/components/ToggleActiveButton.tsx',
  'src/app/employees/[id]/page.tsx',
  'src/app/employees/[id]/components/CommissionRatesSection.tsx',
  'src/app/employees/[id]/components/SetRateModal.tsx',
  'src/app/attendance/components/AttendanceManager.tsx',
  'src/app/attendance/components/BiometricImportModal.tsx',
  'src/app/attendance/summary/components/AttendanceSummaryClient.tsx',
  'src/app/advances/components/AdvancesClient.tsx',
  'src/app/advances/components/AddAdvanceModal.tsx',
  'src/app/advances/components/LogRepaymentModal.tsx',
  // Task 11
  'src/app/expenses/components/ExpensesManager.tsx',
  'src/app/expenses/components/ExpenseModal.tsx',
  'src/app/expenses/components/TemplatesModal.tsx',
  'src/app/expenses/components/DeleteConfirm.tsx',
  'src/app/commission/components/CommissionItemsManager.tsx',
  'src/app/commission/components/CommissionItemModal.tsx',
  'src/app/commission/components/DeleteConfirmModal.tsx',
  'src/app/work-entries/components/WorkerListClient.tsx',
  'src/app/daily-attendance/components/DailyAttendanceManager.tsx',
  'src/app/payments/components/PaymentHistoryClient.tsx',
  'src/app/reports/page.tsx',
  'src/app/reports/components/PayrollComparison.tsx',
  'src/app/login/page.tsx',
]

// Substitution rules applied in order. Each is [searchStr, replaceStr].
// Rules are exact string replacements (not regex) for precision.
const RULES = [
  // Text colors
  ['"text-gray-900"', '"text-gray-900 dark:text-white"'],
  ["'text-gray-900'", "'text-gray-900 dark:text-white'"],
  [' text-gray-900 ', ' text-gray-900 dark:text-white '],
  [' text-gray-900}', ' text-gray-900 dark:text-white}'],
  [' text-gray-900`', ' text-gray-900 dark:text-white`'],
  ['>text-gray-900<', '>text-gray-900 dark:text-white<'],
  [' text-gray-700 ', ' text-gray-700 dark:text-gray-300 '],
  [' text-gray-700}', ' text-gray-700 dark:text-gray-300}'],
  [' text-gray-700`', ' text-gray-700 dark:text-gray-300`'],
  [' text-gray-600 ', ' text-gray-600 dark:text-gray-400 '],
  [' text-gray-600}', ' text-gray-600 dark:text-gray-400}'],
  [' text-gray-600`', ' text-gray-600 dark:text-gray-400`'],
  [' text-gray-500 ', ' text-gray-500 dark:text-gray-400 '],
  [' text-gray-500}', ' text-gray-500 dark:text-gray-400}'],
  [' text-gray-500`', ' text-gray-500 dark:text-gray-400`'],
  [' text-gray-400 ', ' text-gray-400 dark:text-gray-500 '],
  [' text-gray-400}', ' text-gray-400 dark:text-gray-500}'],
  [' text-gray-400`', ' text-gray-400 dark:text-gray-500`'],
  // Borders
  [' border-gray-200 ', ' border-gray-200 dark:border-gray-700 '],
  [' border-gray-200}', ' border-gray-200 dark:border-gray-700}'],
  [' border-gray-200`', ' border-gray-200 dark:border-gray-700`'],
  [' border-gray-300 ', ' border-gray-300 dark:border-gray-600 '],
  [' border-gray-300}', ' border-gray-300 dark:border-gray-600}'],
  [' border-gray-300`', ' border-gray-300 dark:border-gray-600`'],
  [' divide-gray-200 ', ' divide-gray-200 dark:divide-gray-700 '],
  [' divide-gray-200}', ' divide-gray-200 dark:divide-gray-700}'],
  // Backgrounds
  [' bg-gray-50 ', ' bg-gray-50 dark:bg-gray-800 '],
  [' bg-gray-50}', ' bg-gray-50 dark:bg-gray-800}'],
  [' bg-gray-50`', ' bg-gray-50 dark:bg-gray-800`'],
  [' bg-gray-100 ', ' bg-gray-100 dark:bg-gray-700 '],
  [' bg-gray-100}', ' bg-gray-100 dark:bg-gray-700}'],
  [' bg-gray-100`', ' bg-gray-100 dark:bg-gray-700`'],
  // ring colors
  [' ring-gray-300 ', ' ring-gray-300 dark:ring-gray-600 '],
]

let changed = 0
for (const file of FILES) {
  let src
  try {
    src = readFileSync(file, 'utf8')
  } catch {
    console.warn(`SKIP (not found): ${file}`)
    continue
  }
  let out = src
  for (const [search, replace] of RULES) {
    // Only replace if dark: variant not already present
    if (!replace.includes('dark:') || !out.includes(replace)) {
      while (out.includes(search)) {
        out = out.replace(search, replace)
      }
    }
  }
  if (out !== src) {
    writeFileSync(file, out, 'utf8')
    console.log(`✓ ${file}`)
    changed++
  } else {
    console.log(`- ${file} (no changes)`)
  }
}
console.log(`\nDone. ${changed} files updated.`)
