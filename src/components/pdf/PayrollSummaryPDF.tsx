'use client';

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format, parse } from 'date-fns';
import type { PayrollRow } from '@/types';

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica', fontSize: 9 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  companyName: { fontSize: 12, fontWeight: 'bold' },
  reportTitle: { fontSize: 11, fontWeight: 'bold' },
  generatedDate: { fontSize: 8, color: '#666666', marginBottom: 16 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottom: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: 1,
    borderColor: '#f3f4f6',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  footerRow: {
    flexDirection: 'row',
    borderTop: 1,
    borderColor: '#d1d5db',
    marginTop: 2,
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: '#f9fafb',
  },
  colName:   { width: '19%' },
  colDays:   { width: '6%', textAlign: 'right' },
  colEarn:   { width: '12%', textAlign: 'right' },
  colOt:     { width: '9%', textAlign: 'right' },
  colDeduct: { width: '10%', textAlign: 'right' },
  colAdv:    { width: '10%', textAlign: 'right' },
  colPrev:   { width: '10%', textAlign: 'right' },
  colPaid:   { width: '11%', textAlign: 'right' },
  colNet:    { width: '13%', textAlign: 'right' },
  th: { fontSize: 8, fontWeight: 'bold', color: '#374151' },
  td: { fontSize: 8, color: '#111827' },
  tdSub: { fontSize: 7, color: '#6b7280' },
  bold: { fontWeight: 'bold' },
  totalLabel: { flex: 1, textAlign: 'right', fontWeight: 'bold', fontSize: 9 },
  totalValue: { width: '13%', textAlign: 'right', fontWeight: 'bold', fontSize: 9 },
});

function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n);
}

export interface PayrollSummaryPDFProps {
  month: string;
  companyName: string;
  rows: PayrollRow[];
  prevBalances: Record<string, number>;
  totalNetPayout: number;
  paidByEmployee?: Record<string, number>;
}

export default function PayrollSummaryPDF({
  month,
  companyName,
  rows,
  prevBalances,
  totalNetPayout,
  paidByEmployee = {},
}: PayrollSummaryPDFProps) {
  const monthLabel = format(parse(month, 'yyyy-MM', new Date()), 'MMMM yyyy');
  const hasPrevBalance = rows.some(r => (prevBalances[r.employee_id] ?? 0) > 0);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.companyName}>{companyName}</Text>
          <Text style={styles.reportTitle}>Payroll Report — {monthLabel}</Text>
        </View>
        <Text style={styles.generatedDate}>
          Generated: {format(new Date(), 'dd MMM yyyy')}
        </Text>

        <View style={styles.tableHeader}>
          <Text style={[styles.colName, styles.th]}>Employee</Text>
          <Text style={[styles.colDays, styles.th]}>Days</Text>
          <Text style={[styles.colEarn, styles.th]}>Earnings</Text>
          <Text style={[styles.colOt, styles.th]}>Overtime</Text>
          <Text style={[styles.colDeduct, styles.th]}>Deductions</Text>
          <Text style={[styles.colAdv, styles.th]}>Advances</Text>
          {hasPrevBalance && <Text style={[styles.colPrev, styles.th]}>Prev Bal</Text>}
          <Text style={[styles.colPaid, styles.th]}>Paid</Text>
          <Text style={[styles.colNet, styles.th]}>Remaining</Text>
        </View>

        {rows.map(row => {
          const prev = prevBalances[row.employee_id] ?? 0;
          const paid = paidByEmployee[row.employee_id] ?? 0;
          const grossNet = row.final_payable_salary + prev;
          const netInPdf = grossNet - paid;
          return (
            <View key={row.employee_id} style={styles.tableRow}>
              <View style={styles.colName}>
                <Text style={[styles.td, styles.bold]}>{row.full_name}</Text>
                <Text style={styles.tdSub}>{row.display_id}</Text>
              </View>
              <Text style={[styles.colDays, styles.td]}>{row.total_worked_days}</Text>
              <Text style={[styles.colEarn, styles.td]}>{formatINR(row.earned_salary)}</Text>
              <Text style={[styles.colOt, styles.td]}>
                {row.total_overtime_amount > 0 ? formatINR(row.total_overtime_amount) : '—'}
              </Text>
              <Text style={[styles.colDeduct, styles.td]}>
                {row.total_deduction_amount > 0 ? `-${formatINR(row.total_deduction_amount)}` : '—'}
              </Text>
              <Text style={[styles.colAdv, styles.td]}>
                {row.total_advances > 0 ? `-${formatINR(row.total_advances)}` : '—'}
              </Text>
              {hasPrevBalance && (
                <Text style={[styles.colPrev, styles.td]}>
                  {prev > 0 ? `+${formatINR(prev)}` : '—'}
                </Text>
              )}
              <Text style={[styles.colPaid, styles.td, { color: paid > 0 ? '#16a34a' : '#9ca3af' }]}>
                {paid > 0 ? formatINR(paid) : '—'}
              </Text>
              <Text style={[styles.colNet, styles.td, { color: netInPdf < -0.01 ? '#f97316' : netInPdf <= 0.01 ? '#16a34a' : '#111827' }]}>
                {netInPdf < -0.01
                  ? `+${formatINR(Math.abs(netInPdf))} over`
                  : netInPdf <= 0.01
                  ? 'Paid'
                  : formatINR(netInPdf)}
              </Text>
            </View>
          );
        })}

        <View style={styles.footerRow}>
          <Text style={styles.totalLabel}>Total Net Payout:</Text>
          <Text style={[styles.totalValue, { color: totalNetPayout < 0 ? '#dc2626' : '#16a34a' }]}>
            {totalNetPayout < 0
              ? `(${formatINR(Math.abs(totalNetPayout))})`
              : formatINR(totalNetPayout)}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
