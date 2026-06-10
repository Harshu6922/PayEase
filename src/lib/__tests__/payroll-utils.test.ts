import { describe, it, expect } from 'vitest';
import { calculateRates, effectiveDivisor, calculateDailyPayroll } from '../payroll-utils';

const base = {
  monthly_salary: 26000,
  standard_working_hours: 8,
} as any;

describe('calculateRates salary divisor', () => {
  it('falls back to actual days in month when salary_divisor is null', () => {
    // June 2026 has 30 days -> 26000 / 30 = 866.67
    expect(calculateRates({ ...base, salary_divisor: null }, 6, 2026).dailyWage).toBeCloseTo(866.67, 2);
  });

  it('falls back to actual days in month when salary_divisor is undefined', () => {
    // February 2026 has 28 days -> 26000 / 28 = 928.57
    expect(calculateRates({ ...base }, 2, 2026).dailyWage).toBeCloseTo(928.57, 2);
  });

  it('uses the fixed divisor when set', () => {
    // 26000 / 26 = 1000 regardless of month length
    expect(calculateRates({ ...base, salary_divisor: 26 }, 6, 2026).dailyWage).toBe(1000);
    expect(calculateRates({ ...base, salary_divisor: 26 }, 2, 2026).dailyWage).toBe(1000);
  });

  it('derives hourly rate from the divisor-based daily wage', () => {
    // dailyWage 1000 / 8h = 125
    expect(calculateRates({ ...base, salary_divisor: 26 }, 6, 2026).hourlyRate).toBe(125);
  });
});

describe('effectiveDivisor', () => {
  it('returns the fixed divisor when set', () => {
    expect(effectiveDivisor({ ...base, salary_divisor: 26 }, 6, 2026)).toBe(26);
  });
  it('returns days in month when null', () => {
    expect(effectiveDivisor({ ...base, salary_divisor: null }, 6, 2026)).toBe(30);
  });
});

describe('calculateDailyPayroll scales with divisor', () => {
  it('a full standard day pays salary/divisor', () => {
    const r = calculateDailyPayroll({ ...base, salary_divisor: 26 }, '2026-06-10', '09:00', '17:00');
    expect(r.daily_pay).toBe(1000);
    expect(r.deduction_amount).toBe(0);
    expect(r.overtime_amount).toBe(0);
  });

  it('a short day deducts at the divisor-based hourly rate', () => {
    // worked 4h of 8h standard -> deduction 4h * 125 = 500
    const r = calculateDailyPayroll({ ...base, salary_divisor: 26 }, '2026-06-10', '09:00', '13:00');
    expect(r.deduction_amount).toBe(500);
  });
});
