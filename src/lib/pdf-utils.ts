import { getDaysInMonth, subMonths, format, parse } from 'date-fns';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Returns the previous month as 'YYYY-MM'.
 * e.g. getPrevMonth('2024-04') → '2024-03'
 */
export function getPrevMonth(monthStr: string): string {
  const date = parse(monthStr, 'yyyy-MM', new Date());
  return format(subMonths(date, 1), 'yyyy-MM');
}

/**
 * Calculates outstanding wages owed from a partial prior pay cycle.
 * Returns 0 if paidUpToDay >= days in the previous month.
 */
export function calcPrevBalance(
  monthlySalary: number,
  prevMonth: string,    // 'YYYY-MM'
  paidUpToDay: number,
): number {
  const [yearStr, monthStr] = prevMonth.split('-');
  const daysInPrevMonth = getDaysInMonth(
    new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1)
  );
  const outstandingDays = Math.max(0, daysInPrevMonth - paidUpToDay);
  if (outstandingDays === 0) return 0;
  return round2(outstandingDays * (monthlySalary / daysInPrevMonth));
}

/**
 * Triggers a browser download for a PDF Blob.
 * Note: browser-only — not callable in Node/test environments.
 */
export function downloadPdf(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
