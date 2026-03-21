'use client';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format, parse } from 'date-fns';

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', fontSize: 9 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  companyName: { fontSize: 13, fontWeight: 'bold' },
  title: { fontSize: 11, fontWeight: 'bold' },
  generated: { fontSize: 8, color: '#6b7280', marginBottom: 18 },
  sectionTitle: { fontSize: 9, fontWeight: 'bold', color: '#374151', marginBottom: 4, marginTop: 12 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', paddingVertical: 4, paddingHorizontal: 6, borderBottom: 1, borderColor: '#e5e7eb' },
  tableRow: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, borderBottom: 1, borderColor: '#f3f4f6' },
  footerRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, backgroundColor: '#111827', marginTop: 4 },
  colDate:   { width: '14%' },
  colCat:    { width: '14%' },
  colDesc:   { width: '36%' },
  colPaidTo: { width: '20%' },
  colAmt:    { width: '16%', textAlign: 'right' },
  th: { fontSize: 8, fontWeight: 'bold', color: '#374151' },
  td: { fontSize: 8, color: '#111827' },
  tdGray: { fontSize: 8, color: '#6b7280' },
  totalLabel: { flex: 1, textAlign: 'right', fontSize: 9, fontWeight: 'bold', color: '#ffffff' },
  totalValue: { width: '16%', textAlign: 'right', fontSize: 9, fontWeight: 'bold', color: '#ffffff' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  summaryLabel: { fontSize: 9, color: '#6b7280' },
  summaryValue: { fontSize: 9, fontWeight: 'bold', color: '#111827' },
});

function formatRs(n: number) {
  return 'Rs. ' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Expense {
  id: string; date: string; category: string; description: string;
  amount: number; paid_to: string | null; note: string | null;
}

interface Props {
  month: string;
  companyName: string;
  expenses: Expense[];
}

export default function ExpensesPDF({ month, companyName, expenses }: Props) {
  const monthLabel = format(parse(month, 'yyyy-MM', new Date()), 'MMMM yyyy');
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  // Category totals
  const catTotals: Record<string, number> = {};
  expenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] ?? 0) + Number(e.amount); });
  const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.companyName}>{companyName}</Text>
          <Text style={styles.title}>Expense Report — {monthLabel}</Text>
        </View>
        <Text style={styles.generated}>Generated: {format(new Date(), 'dd MMM yyyy')}</Text>

        {/* Category summary */}
        <Text style={styles.sectionTitle}>Summary by Category</Text>
        {sortedCats.map(([cat, amt]) => (
          <View key={cat} style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{cat}</Text>
            <Text style={styles.summaryValue}>{formatRs(amt)}</Text>
          </View>
        ))}

        {/* Itemized list */}
        <Text style={styles.sectionTitle}>All Expenses</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.colDate, styles.th]}>Date</Text>
          <Text style={[styles.colCat, styles.th]}>Category</Text>
          <Text style={[styles.colDesc, styles.th]}>Description</Text>
          <Text style={[styles.colPaidTo, styles.th]}>Paid To</Text>
          <Text style={[styles.colAmt, styles.th]}>Amount</Text>
        </View>
        {expenses.map(e => (
          <View key={e.id} style={styles.tableRow}>
            <Text style={[styles.colDate, styles.td]}>{format(new Date(e.date + 'T00:00:00'), 'dd MMM')}</Text>
            <Text style={[styles.colCat, styles.tdGray]}>{e.category}</Text>
            <Text style={[styles.colDesc, styles.td]}>{e.description}{e.note ? ` (${e.note})` : ''}</Text>
            <Text style={[styles.colPaidTo, styles.tdGray]}>{e.paid_to ?? '—'}</Text>
            <Text style={[styles.colAmt, styles.td]}>{formatRs(Number(e.amount))}</Text>
          </View>
        ))}
        <View style={styles.footerRow}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>{formatRs(total)}</Text>
        </View>
      </Page>
    </Document>
  );
}
