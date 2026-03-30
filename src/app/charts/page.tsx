'use client'

import { useCharts } from '@/lib/hooks/useAppData'
import ChartsView from './ChartsView'

export default function ChartsPage() {
  const { data } = useCharts()

  if (!data) return null

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#F7F6F3' }}>
      <ChartsView
        expenseBarData={data.expenseBarData}
        expenseRawData={data.expenseRawData}
        payrollBarData={data.payrollBarData}
        summariesRaw={data.summariesRaw}
        months={data.months}
        defaultMonth={data.defaultMonth}
      />
    </div>
  )
}
