'use client';

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format, parse } from 'date-fns';
import type { PayrollRow } from '@/types';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10 },
  companyName: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  reportTitle: { fontSize: 11, color: '#374151', marginBottom: 20 },
  employeeName: { fontSize: 12, fontWeight: 'bold' },
  employeeId: { fontSize: 10, color: '#6b7280', marginBottom: 16 },
  divider: { borderBottom: 1, borderColor: '#d1d5db', marginVertical: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  label: { color: '#6b7280', fontSize: 10 },
  value: { fontSize: 10 },
  prevNote: { fontSize: 8, color: '#9ca3af' },
  netLabel: { fontSize: 12, fontWeight: 'bold' },
  netValue: { fontSize: 12, fontWeight: 'bold' },
  footer: { marginTop: 20, fontSize: 8, color: '#9ca3af' },
});

function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n);
}

export interface EmployeeDetailPDFProps {
  month: string;
  companyName: string;
  row: PayrollRow;
  monthlySalary: number;
  dailyRate?: number;
  workerType?: string;
  daysInMonth: number;
  prevBalance: number;
  outstandingDays: number;
  prevMonthName: string;
}

export default function EmployeeDetailPDF({
  month,
  companyName,
  row,
  monthlySalary,
  dailyRate = 0,
  workerType = 'salaried',
  daysInMonth,
  prevBalance,
  outstandingDays,
  prevMonthName,
}: EmployeeDetailPDFProps) {
  const monthLabel = format(parse(month, 'yyyy-MM', new Date()), 'MMMM yyyy');
  const isDaily = workerType === 'daily';
  const isCommission = workerType === 'commission';
  const dailyWage = isDaily ? dailyRate : (daysInMonth > 0 ? monthlySalary / daysInMonth : 0);
  const netPayable = row.final_payable_salary + prevBalance;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.companyName}>{companyName}</Text>
        <Text style={styles.reportTitle}>Employee Payroll Detail — {monthLabel}</Text>

        <Text style={styles.employeeName}>{row.full_name}</Text>
        <Text style={styles.employeeId}>ID: {row.display_id}</Text>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>Days Worked</Text>
          <Text style={styles.value}>{row.total_worked_days}</Text>
        </View>
        {!isDaily && !isCommission && (
          <View style={styles.row}>
            <Text style={styles.label}>Monthly Salary</Text>
            <Text style={styles.value}>{formatINR(monthlySalary)}</Text>
          </View>
        )}
        {isDaily && (
          <View style={styles.row}>
            <Text style={styles.label}>Daily Rate</Text>
            <Text style={styles.value}>{formatINR(dailyRate)}/day</Text>
          </View>
        )}
        {!isCommission && (
          <View style={styles.row}>
            <Text style={styles.label}>Daily Wage</Text>
            <Text style={styles.value}>{formatINR(dailyWage)}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Earnings</Text>
          <Text style={styles.value}>{formatINR(row.earned_salary)}</Text>
        </View>

        {row.total_overtime_amount > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>Overtime</Text>
            <Text style={[styles.value, { color: '#16a34a' }]}>
              +{formatINR(row.total_overtime_amount)}
            </Text>
          </View>
        )}

        {row.total_deduction_amount > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>Deductions</Text>
            <Text style={[styles.value, { color: '#dc2626' }]}>
              -{formatINR(row.total_deduction_amount)}
            </Text>
          </View>
        )}

        {row.total_advances > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>Advances</Text>
            <Text style={[styles.value, { color: '#f97316' }]}>
              -{formatINR(row.total_advances)}
            </Text>
          </View>
        )}

        {prevBalance > 0 && (
          <View style={styles.row}>
            <View>
              <Text style={styles.label}>Prev. Month Balance</Text>
              <Text style={styles.prevNote}>
                {outstandingDays} unpaid days from {prevMonthName}
              </Text>
            </View>
            <Text style={[styles.value, { color: '#2563eb' }]}>
              +{formatINR(prevBalance)}
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.netLabel}>Net Payable</Text>
          <Text style={[styles.netValue, { color: netPayable < 0 ? '#dc2626' : '#16a34a' }]}>
            {netPayable < 0
              ? `(${formatINR(Math.abs(netPayable))})`
              : formatINR(netPayable)}
          </Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.footer}>
          Generated: {format(new Date(), 'dd MMM yyyy, HH:mm')}
        </Text>
      </Page>
    </Document>
  );
}
