import type { ParsedPunchRow } from '@/types';

/**
 * Strips seconds from a time string.
 * '09:02:34' → '09:02'   |   '09:02' → '09:02'
 */
function toHHmm(time: string): string {
  return time.length >= 5 ? time.substring(0, 5) : time;
}

/**
 * Parses a biometric device punch-log CSV into grouped punch rows.
 *
 * Expected CSV format:
 *   Name,Date,Time
 *   Ravi Kumar,2026-03-18,09:02:34
 *   Ravi Kumar,2026-03-18,17:45:21
 *
 * Rules:
 * - Groups rows by (Name, Date)
 * - First timestamp in a group = inTime
 * - Last timestamp in a group = outTime (null if only one punch)
 * - Seconds are stripped from all times ('HH:mm:ss' → 'HH:mm')
 *
 * @throws Error if required columns (Name, Date, Time) are missing
 */
export function parseBiometricCsv(text: string): ParsedPunchRow[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const lines = trimmed.split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const nameIdx = header.indexOf('name');
  const dateIdx = header.indexOf('date');
  const timeIdx = header.indexOf('time');

  if (nameIdx === -1 || dateIdx === -1 || timeIdx === -1) {
    throw new Error('CSV must have columns: Name, Date, Time');
  }

  // Map: "Name|Date" → [time1, time2, ...]
  const groups = new Map<string, string[]>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(',').map(c => c.trim());
    const name = cols[nameIdx];
    const date = cols[dateIdx];
    const time = cols[timeIdx];
    if (!name || !date || !time) continue;

    const key = `${name}|${date}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(time);
  }

  const result: ParsedPunchRow[] = [];
  groups.forEach((times, key) => {
    const pipeIdx = key.indexOf('|');
    const biometricName = key.substring(0, pipeIdx);
    const date = key.substring(pipeIdx + 1);
    result.push({
      biometricName,
      date,
      inTime: times.length > 0 ? toHHmm(times[0]) : null,
      outTime: times.length > 1 ? toHHmm(times[times.length - 1]) : null,
    });
  });

  return result;
}
