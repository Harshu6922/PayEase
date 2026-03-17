import { Employee } from "@/types";
import { getDaysInMonth, parse, differenceInMinutes } from "date-fns";

/**
 * Rounds a number to exactly 2 decimal places.
 */
function round2(num: number): number {
  return Math.round(num * 100) / 100;
}

/**
 * Calculates standard rates for the employee for a given month and year.
 */
export function calculateRates(employee: Employee, month: number, year: number) {
  // Ensure we use Date considering month is 1-12
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const dailyWage = round2(employee.monthly_salary / daysInMonth);
  const hourlyRate = round2(dailyWage / employee.standard_working_hours);

  return { dailyWage, hourlyRate };
}

/**
 * Calculates exact daily payroll details based on times and standard rates.
 */
export function calculateDailyPayroll(
  employee: Employee,
  dateString: string,
  startTimeStr: string,
  endTimeStr: string
) {
  // Extract year and month from YYYY-MM-DD
  const [yearStr, monthStr] = dateString.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const { dailyWage, hourlyRate } = calculateRates(employee, month, year);

  // Parse times
  const baseDate = new Date();
  const start = parse(startTimeStr, "HH:mm", baseDate);
  const end = parse(endTimeStr, "HH:mm", baseDate);

  let minutesWorked = differenceInMinutes(end, start);
  if (minutesWorked < 0) {
    // Handling night shift logic across midnight if needed
    minutesWorked += 24 * 60;
  }
  
  const workedHours = round2(minutesWorked / 60);
  const dailyPay = round2(workedHours * hourlyRate);

  let overtimeHours = 0;
  let overtimeAmount = 0;
  let deductionHours = 0;
  let deductionAmount = 0;

  if (workedHours > employee.standard_working_hours) {
    overtimeHours = round2(workedHours - employee.standard_working_hours);
    overtimeAmount = round2(overtimeHours * hourlyRate);
  } else if (workedHours < employee.standard_working_hours) {
    deductionHours = round2(employee.standard_working_hours - workedHours);
    deductionAmount = round2(deductionHours * hourlyRate);
  }

  return {
    daily_wage: dailyWage,
    hourly_rate: hourlyRate,
    worked_hours: workedHours,
    daily_pay: dailyPay,
    overtime_hours: overtimeHours,
    overtime_amount: overtimeAmount,
    deduction_hours: deductionHours,
    deduction_amount: deductionAmount,
  };
}

/**
 * Formats amount into INR format (e.g. ₹ 1,50,000.00)
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
}
