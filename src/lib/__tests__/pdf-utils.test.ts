import { describe, it, expect } from 'vitest';
import { getPrevMonth, calcPrevBalance } from '../pdf-utils';

describe('getPrevMonth', () => {
  it('returns previous month in YYYY-MM format', () => {
    expect(getPrevMonth('2024-04')).toBe('2024-03');
  });

  it('wraps year correctly for January', () => {
    expect(getPrevMonth('2024-01')).toBe('2023-12');
  });
});

describe('calcPrevBalance', () => {
  it('calculates outstanding balance for partial month', () => {
    // June 2024 = 30 days, paidUpTo=25, outstanding=5, daily=24000/30=800
    expect(calcPrevBalance(24000, '2024-06', 25)).toBe(4000);
  });

  it('returns 0 when paidUpToDay equals days in month', () => {
    expect(calcPrevBalance(24000, '2024-06', 30)).toBe(0);
  });

  it('returns 0 when paidUpToDay exceeds days in month (guard)', () => {
    expect(calcPrevBalance(24000, '2024-06', 35)).toBe(0);
  });

  it('handles leap year February correctly', () => {
    // Feb 2024 = 29 days (leap), paidUpTo=25, outstanding=4
    // daily = 24000/29 = 827.5862..., balance = round2(4 * 827.5862) = 3310.34
    expect(calcPrevBalance(24000, '2024-02', 25)).toBe(3310.34);
  });

  it('handles non-leap year February correctly', () => {
    // Feb 2023 = 28 days, paidUpTo=25, outstanding=3
    // daily = 24000/28 = 857.1428..., balance = round2(3 * 857.1428) = 2571.43
    expect(calcPrevBalance(24000, '2023-02', 25)).toBe(2571.43);
  });
});
