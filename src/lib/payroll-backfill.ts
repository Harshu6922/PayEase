import { Employee, AttendanceRecord } from "@/types";
import { calculateDailyPayroll, calculateRates } from "./payroll-utils";

/**
 * Payroll columns of an attendance row that depend on the salary divisor.
 */
export type RecomputedRow = Pick<
  AttendanceRecord,
  | "daily_wage"
  | "hourly_rate"
  | "worked_hours"
  | "daily_pay"
  | "overtime_hours"
  | "overtime_amount"
  | "deduction_hours"
  | "deduction_amount"
>;

/**
 * Recomputes the divisor-dependent payroll columns for a single stored
 * attendance row using the employee's current `salary_divisor`.
 *
 * Absent rows are forced to zero pay/deduction (the day is already excluded
 * from earnings by the per-day formula, so deducting again would double-count
 * — see commit 695a54d7).
 */
export function recomputeAttendanceRow(
  employee: Employee,
  row: Pick<AttendanceRecord, "status" | "date" | "start_time" | "end_time">
): RecomputedRow {
  const [yearStr, monthStr] = row.date.split("-");
  const { dailyWage, hourlyRate } = calculateRates(
    employee,
    parseInt(monthStr, 10),
    parseInt(yearStr, 10)
  );

  if (row.status === "Absent") {
    return {
      daily_wage: dailyWage,
      hourly_rate: hourlyRate,
      worked_hours: 0,
      daily_pay: 0,
      overtime_hours: 0,
      overtime_amount: 0,
      deduction_hours: 0,
      deduction_amount: 0,
    };
  }

  const p = calculateDailyPayroll(employee, row.date, row.start_time, row.end_time);
  return {
    daily_wage: p.daily_wage,
    hourly_rate: p.hourly_rate,
    worked_hours: p.worked_hours,
    daily_pay: p.daily_pay,
    overtime_hours: p.overtime_hours,
    overtime_amount: p.overtime_amount,
    deduction_hours: p.deduction_hours,
    deduction_amount: p.deduction_amount,
  };
}
