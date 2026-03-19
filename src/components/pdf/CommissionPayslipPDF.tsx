'use client'

import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { format, parse } from 'date-fns'
import type { WorkEntry, AgentItemRate } from '@/types'

interface CommissionPayslipPDFProps {
  month: string
  companyName: string
  employee: { full_name: string; employee_id: string }
  entries: WorkEntry[]
  agentRates: AgentItemRate[]
}

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#111827' },
  companyName: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  reportTitle: { fontSize: 11, color: '#6b7280', marginBottom: 16 },
  employeeName: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  employeeSub: { fontSize: 10, color: '#6b7280', marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', padding: '4 6', marginBottom: 2 },
  sectionHeaderText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', padding: '4 6', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  cell: { fontSize: 9 },
  totalRow: { flexDirection: 'row', padding: '5 6', borderTopWidth: 1, borderTopColor: '#d1d5db', marginTop: 2 },
  totalText: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  spacer: { height: 16 },
  footer: { marginTop: 'auto', fontSize: 8, color: '#9ca3af' },
})

const formatRs = (n: number) =>
  'Rs. ' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function CommissionPayslipPDF({
  month, companyName, employee, entries, agentRates,
}: CommissionPayslipPDFProps) {
  const monthLabel = format(parse(month + '-01', 'yyyy-MM-dd', new Date()), 'MMMM yyyy')

  // Build item name lookup
  const itemNames = new Map<string, string>()
  agentRates.forEach(r => {
    itemNames.set(r.item_id, r.commission_items?.name ?? 'Unknown')
  })

  // Summary: group by item_id
  const summaryMap = new Map<string, { name: string; qty: number; rate: number; total: number }>()
  entries.forEach(e => {
    const name = itemNames.get(e.item_id) ?? 'Unknown'
    const existing = summaryMap.get(e.item_id)
    if (existing) {
      existing.qty += Number(e.quantity)
      existing.total += Number(e.total_amount)
    } else {
      summaryMap.set(e.item_id, { name, qty: Number(e.quantity), rate: Number(e.rate), total: Number(e.total_amount) })
    }
  })
  const summaryRows = Array.from(summaryMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  const grandTotal = entries.reduce((sum, e) => sum + Number(e.total_amount), 0)

  // Daily breakdown: sort by date asc, then item name asc
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return (itemNames.get(a.item_id) ?? '').localeCompare(itemNames.get(b.item_id) ?? '')
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <Text style={styles.companyName}>{companyName}</Text>
        <Text style={styles.reportTitle}>Commission Payslip — {monthLabel}</Text>

        {/* Employee */}
        <Text style={styles.employeeName}>{employee.full_name}</Text>
        <Text style={styles.employeeSub}>{employee.employee_id} · Commission Worker</Text>

        {/* Summary section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionHeaderText, { flex: 3 }]}>Item Name</Text>
          <Text style={[styles.sectionHeaderText, { flex: 1, textAlign: 'right' }]}>Qty</Text>
          <Text style={[styles.sectionHeaderText, { flex: 2, textAlign: 'right' }]}>Rate</Text>
          <Text style={[styles.sectionHeaderText, { flex: 2, textAlign: 'right' }]}>Total</Text>
        </View>
        {summaryRows.map((row, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={[styles.cell, { flex: 3 }]}>{row.name}</Text>
            <Text style={[styles.cell, { flex: 1, textAlign: 'right' }]}>{row.qty}</Text>
            <Text style={[styles.cell, { flex: 2, textAlign: 'right' }]}>{formatRs(row.rate)}</Text>
            <Text style={[styles.cell, { flex: 2, textAlign: 'right' }]}>{formatRs(row.total)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={[styles.totalText, { flex: 6 }]}>Grand Total</Text>
          <Text style={[styles.totalText, { flex: 2, textAlign: 'right' }]}>{formatRs(grandTotal)}</Text>
        </View>

        <View style={styles.spacer} />

        {/* Daily breakdown section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionHeaderText, { flex: 2 }]}>Date</Text>
          <Text style={[styles.sectionHeaderText, { flex: 2 }]}>Item</Text>
          <Text style={[styles.sectionHeaderText, { flex: 1, textAlign: 'right' }]}>Qty</Text>
          <Text style={[styles.sectionHeaderText, { flex: 2, textAlign: 'right' }]}>Rate</Text>
          <Text style={[styles.sectionHeaderText, { flex: 2, textAlign: 'right' }]}>Amount</Text>
        </View>
        {sortedEntries.map((e, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={[styles.cell, { flex: 2 }]}>
              {format(new Date(e.date + 'T00:00:00'), 'MMM d, yyyy')}
            </Text>
            <Text style={[styles.cell, { flex: 2 }]}>{itemNames.get(e.item_id) ?? 'Unknown'}</Text>
            <Text style={[styles.cell, { flex: 1, textAlign: 'right' }]}>{Number(e.quantity)}</Text>
            <Text style={[styles.cell, { flex: 2, textAlign: 'right' }]}>{formatRs(Number(e.rate))}</Text>
            <Text style={[styles.cell, { flex: 2, textAlign: 'right' }]}>{formatRs(Number(e.total_amount))}</Text>
          </View>
        ))}

        {/* Footer */}
        <Text style={styles.footer}>
          Generated on {format(new Date(), 'd MMMM yyyy')}
        </Text>
      </Page>
    </Document>
  )
}
