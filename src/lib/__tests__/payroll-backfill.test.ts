import { describe, it, expect } from 'vitest';
import { recomputeAttendanceRow } from '../payroll-backfill';

const emp = {
  monthly_salary: 26000,
  standard_working_hours: 8,
  salary_divisor: 26,
} as any;

describe('recomputeAttendanceRow', () => {
  it('recomputes a full present day at the divisor rate', () => {
    const row = { status: 'Present', date: '2026-06-10', start_time: '09:00', end_time: '17:00' } as any;
    const r = recomputeAttendanceRow(emp, row);
    expect(r.daily_pay).toBe(1000);
    expect(r.daily_wage).toBe(1000);
    expect(r.hourly_rate).toBe(125);
    expect(r.deduction_amount).toBe(0);
    expect(r.overtime_amount).toBe(0);
  });

  it('scales a short day deduction with the divisor', () => {
    const row = { status: 'Present', date: '2026-06-10', start_time: '09:00', end_time: '13:00' } as any;
    const r = recomputeAttendanceRow(emp, row);
    // 4h worked, 4h short * 125 = 500
    expect(r.deduction_amount).toBe(500);
  });

  it('forces zero deduction and pay for Absent rows', () => {
    const row = { status: 'Absent', date: '2026-06-10', start_time: '', end_time: '' } as any;
    const r = recomputeAttendanceRow(emp, row);
    expect(r.deduction_amount).toBe(0);
    expect(r.deduction_hours).toBe(0);
    expect(r.daily_pay).toBe(0);
    expect(r.worked_hours).toBe(0);
    expect(r.overtime_amount).toBe(0);
  });

  it('uses actual days in month when divisor is null', () => {
    const row = { status: 'Present', date: '2026-06-10', start_time: '09:00', end_time: '17:00' } as any;
    const r = recomputeAttendanceRow({ ...emp, salary_divisor: null }, row);
    // June = 30 days -> 26000/30 = 866.67 (double-rounding via hourly rate ~= 866.64)
    expect(r.daily_pay).toBeCloseTo(866.67, 1);
  });
});
