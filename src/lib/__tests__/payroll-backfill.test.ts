import { describe, it, expect } from 'vitest';
import { recomputeAttendanceRow } from '../payroll-backfill';

const emp = {
  monthly_salary: 26000,
  standard_working_hours: 8,
  salary_divisor: 26,
} as any;

// A "present full day" row originally recorded in June 2026 (30 days):
// old daily_wage = 26000/30 = 866.67, daily_pay = 866.67, deduction 0.
const presentFull = {
  status: 'Present', date: '2026-06-10',
  daily_wage: 866.67, worked_hours: 8, daily_pay: 866.67,
  overtime_hours: 0, overtime_amount: 0, deduction_hours: 0, deduction_amount: 0,
} as any;

// A "short day" row: worked 4h, deduction = 866.67/2 = 433.34, pay = 433.33.
const shortDay = {
  status: 'Present', date: '2026-06-10',
  daily_wage: 866.67, worked_hours: 4, daily_pay: 433.33,
  overtime_hours: 0, overtime_amount: 0, deduction_hours: 4, deduction_amount: 433.34,
} as any;

describe('recomputeAttendanceRow (rescale to new divisor)', () => {
  it('rescales a full present day to the new divisor rate', () => {
    const r = recomputeAttendanceRow(emp, presentFull);
    expect(r.daily_wage).toBe(1000);          // 26000/26
    expect(r.hourly_rate).toBe(125);
    expect(r.daily_pay).toBeCloseTo(1000, 0);  // 866.67 * (1000/866.67)
    expect(r.deduction_amount).toBe(0);
    expect(r.worked_hours).toBe(8);            // hours preserved
  });

  it('rescales a short-day deduction proportionally', () => {
    const r = recomputeAttendanceRow(emp, shortDay);
    // ratio = 1000/866.67 = 1.1538; deduction 433.34 -> ~500
    expect(r.deduction_amount).toBeCloseTo(500, 0);
    expect(r.daily_pay).toBeCloseTo(500, 0);
    expect(r.deduction_hours).toBe(4);         // hours preserved
  });

  it('never injects overtime (records keep overtime = 0)', () => {
    const r = recomputeAttendanceRow(emp, presentFull);
    expect(r.overtime_amount).toBe(0);
    expect(r.overtime_hours).toBe(0);
  });

  it('forces zero pay/deduction for Absent rows', () => {
    const row = { ...presentFull, status: 'Absent', daily_pay: 0, deduction_amount: 0 };
    const r = recomputeAttendanceRow(emp, row);
    expect(r.deduction_amount).toBe(0);
    expect(r.deduction_hours).toBe(0);
    expect(r.daily_pay).toBe(0);
    expect(r.worked_hours).toBe(0);
    expect(r.daily_wage).toBe(1000); // rate still refreshed
  });

  it('rescales to actual days in month when divisor is null', () => {
    // new divisor null -> June = 30 days -> new wage 866.67, ratio ~1, unchanged
    const r = recomputeAttendanceRow({ ...emp, salary_divisor: null }, presentFull);
    expect(r.daily_wage).toBeCloseTo(866.67, 2);
    expect(r.daily_pay).toBeCloseTo(866.67, 1);
  });
});
