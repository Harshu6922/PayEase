import { describe, it, expect } from 'vitest';
import { parseBiometricCsv } from '../biometric-utils';

describe('parseBiometricCsv', () => {
  it('parses a normal two-punch-per-day CSV', () => {
    const csv = `Name,Date,Time
Ravi Kumar,2026-03-18,09:02:34
Ravi Kumar,2026-03-18,17:45:21`;
    const result = parseBiometricCsv(csv);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      biometricName: 'Ravi Kumar',
      date: '2026-03-18',
      inTime: '09:02',
      outTime: '17:45',
    });
  });

  it('strips seconds from times', () => {
    const csv = `Name,Date,Time
Ahmed,2026-03-18,08:00:00
Ahmed,2026-03-18,16:30:59`;
    const result = parseBiometricCsv(csv);
    expect(result[0].inTime).toBe('08:00');
    expect(result[0].outTime).toBe('16:30');
  });

  it('sets outTime to null for single punch', () => {
    const csv = `Name,Date,Time
Ravi Kumar,2026-03-18,09:02:34`;
    const result = parseBiometricCsv(csv);
    expect(result[0].inTime).toBe('09:02');
    expect(result[0].outTime).toBeNull();
  });

  it('handles multiple employees and multiple days', () => {
    const csv = `Name,Date,Time
Ravi Kumar,2026-03-18,09:00:00
Ravi Kumar,2026-03-18,17:00:00
Ahmed Khan,2026-03-18,08:30:00
Ahmed Khan,2026-03-18,16:30:00
Ravi Kumar,2026-03-19,09:05:00
Ravi Kumar,2026-03-19,17:10:00`;
    const result = parseBiometricCsv(csv);
    expect(result).toHaveLength(3);
    const raviMar18 = result.find(r => r.biometricName === 'Ravi Kumar' && r.date === '2026-03-18');
    expect(raviMar18?.inTime).toBe('09:00');
    expect(raviMar18?.outTime).toBe('17:00');
    const ahmed = result.find(r => r.biometricName === 'Ahmed Khan');
    expect(ahmed?.inTime).toBe('08:30');
  });

  it('returns empty array for header-only CSV', () => {
    expect(parseBiometricCsv('Name,Date,Time')).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseBiometricCsv('')).toEqual([]);
  });

  it('throws a descriptive error for missing required columns', () => {
    const csv = `Employee,Date,Time
Ravi,2026-03-18,09:00:00`;
    expect(() => parseBiometricCsv(csv)).toThrow('CSV must have columns: Name, Date, Time');
  });

  it('uses last punch as outTime when more than 2 punches exist', () => {
    const csv = `Name,Date,Time
Ravi,2026-03-18,09:00:00
Ravi,2026-03-18,13:00:00
Ravi,2026-03-18,17:30:00`;
    const result = parseBiometricCsv(csv);
    expect(result[0].inTime).toBe('09:00');
    expect(result[0].outTime).toBe('17:30');
  });
});
