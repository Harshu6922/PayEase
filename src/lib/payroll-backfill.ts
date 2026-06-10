import { Employee, AttendanceRecord } from "@/types";
import { calculateRates } from "./payroll-utils";

function round2(num: number): number {
  return Math.round(num * 100) / 100;
}

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

type StoredRow = Pick<
  AttendanceRecord,
  | "status"
  | "date"
  | "daily_wage"
  | "worked_hours"
  | "daily_pay"
  | "overtime_hours"
  | "overtime_amount"
  | "deduction_hours"
  | "deduction_amount"
>;

/**
 * Recomputes the divisor-dependent payroll columns for a stored attendance row
 * when the employee's `salary_divisor` changes.
 *
 * Every monetary field the app records is linear in the daily wage (the two
 * attendance save paths always set `overtime = 0` and
 * `deduction = daily_wage - daily_pay`). So rather than recomputing from times
 * — which would inject overtime the app never records — we **rescale** the
 * stored amounts by `newDailyWage / oldDailyWage`, preserving worked/overtime/
 * deduction hours and the recording logic exactly.
 *
 * Absent rows keep zero pay/deduction (the day is already excluded from
 * earnings; deducting again would double-count — see commit 695a54d7).
 */
export function recomputeAttendanceRow(employee: Employee, row: StoredRow): RecomputedRow {
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

  const oldWage = Number(row.daily_wage) || 0;
  const ratio = oldWage > 0 ? dailyWage / oldWage : 0;

  return {
    daily_wage: dailyWage,
    hourly_rate: hourlyRate,
    worked_hours: Number(row.worked_hours) || 0,
    daily_pay: round2((Number(row.daily_pay) || 0) * ratio),
    overtime_hours: Number(row.overtime_hours) || 0,
    overtime_amount: round2((Number(row.overtime_amount) || 0) * ratio),
    deduction_hours: Number(row.deduction_hours) || 0,
    deduction_amount: round2((Number(row.deduction_amount) || 0) * ratio),
  };
}
