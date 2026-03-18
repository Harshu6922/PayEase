'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { parseBiometricCsv } from '@/lib/biometric-utils';
import { calculateDailyPayroll } from '@/lib/payroll-utils';
import type { Employee, ParsedPunchRow } from '@/types';
import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

interface ImportRow {
  parsed: ParsedPunchRow;
  matchedEmployee: Employee | null;
  /** Status precedence: missing-punch-out > conflict > matched/unmatched */
  status: 'matched' | 'unmatched' | 'missing-punch-out' | 'conflict';
  action: 'import' | 'skip' | 'overwrite';
  manualOutTime: string; // 'HH:mm' from <input type="time">
}

interface Props {
  employees: Employee[];
  companyId: string;
  onImportComplete: (earliestDate: string) => void;
  onClose: () => void;
}

export default function BiometricImportModal({
  employees,
  companyId,
  onImportComplete,
  onClose,
}: Props) {
  const supabase = createClient() as unknown as SupabaseClient<Database>;
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────

  function matchEmployee(name: string): Employee | null {
    return (
      employees.find(
        e => e.full_name.toLowerCase() === name.toLowerCase(),
      ) ?? null
    );
  }

  function computeStatus(
    parsed: ParsedPunchRow,
    matched: Employee | null,
    conflictSet: Set<string>,
  ): ImportRow['status'] {
    if (parsed.outTime === null) return 'missing-punch-out'; // highest precedence
    if (matched && conflictSet.has(`${matched.id}|${parsed.date}`)) return 'conflict';
    if (matched) return 'matched';
    return 'unmatched';
  }

  function defaultAction(status: ImportRow['status']): ImportRow['action'] {
    if (status === 'conflict') return 'skip';
    if (status === 'missing-punch-out') return 'skip';
    if (status === 'unmatched') return 'skip';
    return 'import';
  }

  // ── File Upload ───────────────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError(null);
    setIsFetching(true);

    try {
      const text = await file.text();
      const parsed = parseBiometricCsv(text);

      if (parsed.length === 0) {
        setParseError('No rows found in CSV. Check that the file has Name, Date, Time columns.');
        setIsFetching(false);
        return;
      }

      // Fetch existing records for conflict detection
      const distinctDates = Array.from(new Set(parsed.map(r => r.date)));
      const { data: existing } = await supabase
        .from('attendance_records')
        .select('employee_id, date')
        .eq('company_id', companyId)
        .in('date', distinctDates);

      const conflictSet = new Set(
        (existing ?? []).map(r => `${r.employee_id}|${r.date}`),
      );

      const importRows: ImportRow[] = parsed.map(p => {
        const matched = matchEmployee(p.biometricName);
        const status = computeStatus(p, matched, conflictSet);
        return {
          parsed: p,
          matchedEmployee: matched,
          status,
          action: defaultAction(status),
          manualOutTime: '',
        };
      });

      setRows(importRows);
      setStep('preview');
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse CSV.');
    } finally {
      setIsFetching(false);
    }
  };

  // ── Row Updates ───────────────────────────────────────────────────────────

  const updateRow = (idx: number, patch: Partial<ImportRow>) => {
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  // Import button is disabled if any non-skipped row is still unresolved
  const canImport = rows.every(r => {
    if (r.action === 'skip') return true;
    if (r.matchedEmployee === null) return false;
    if (r.parsed.outTime === null && r.manualOutTime === '') return false;
    return true;
  });

  // ── Confirm Import ────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    setIsImporting(true);
    setImportError(null);

    const toProcess = rows.filter(r => r.action !== 'skip' && r.matchedEmployee !== null);
    const failedLabels: string[] = [];

    for (const row of toProcess) {
      const emp = row.matchedEmployee!;
      const inTime = row.parsed.inTime!;
      const outTime = row.parsed.outTime ?? row.manualOutTime;

      try {
        const computed = calculateDailyPayroll(emp, row.parsed.date, inTime, outTime);
        const { error } = await supabase.from('attendance_records').upsert(
          {
            company_id: companyId,
            employee_id: emp.id,
            date: row.parsed.date,
            status: 'present',
            start_time: inTime,
            end_time: outTime,
            daily_wage: computed.daily_wage,
            hourly_rate: computed.hourly_rate,
            worked_hours: computed.worked_hours,
            daily_pay: computed.daily_pay,
            overtime_hours: computed.overtime_hours,
            overtime_amount: computed.overtime_amount,
            deduction_hours: computed.deduction_hours,
            deduction_amount: computed.deduction_amount,
          },
          { onConflict: 'employee_id,date' },
        );
        if (error) failedLabels.push(`${emp.full_name} (${row.parsed.date})`);
      } catch {
        failedLabels.push(`${emp.full_name} (${row.parsed.date})`);
      }
    }

    setIsImporting(false);

    if (failedLabels.length > 0) {
      setImportError(`Failed to import: ${failedLabels.join(', ')}`);
      return; // Stay open so user can see errors
    }

    // All succeeded — navigate to earliest imported date and close
    if (toProcess.length > 0) {
      const earliestDate = toProcess.reduce(
        (min, r) => (r.parsed.date < min ? r.parsed.date : min),
        toProcess[0].parsed.date,
      );
      onImportComplete(earliestDate);
    }
    onClose();
  };

  // ── Status Badge ──────────────────────────────────────────────────────────

  function StatusBadge({ status }: { status: ImportRow['status'] }) {
    const map: Record<ImportRow['status'], { label: string; className: string }> = {
      matched: { label: 'Matched', className: 'bg-green-100 text-green-800' },
      unmatched: { label: 'Unmatched', className: 'bg-amber-100 text-amber-800' },
      'missing-punch-out': { label: 'Missing out', className: 'bg-amber-100 text-amber-800' },
      conflict: { label: 'Conflict', className: 'bg-blue-100 text-blue-800' },
    };
    const { label, className } = map[status];
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
        {label}
      </span>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-5xl rounded-xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {step === 'upload' ? 'Import from Biometric Device' : 'Preview & Confirm Import'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* ── Step 1: Upload ── */}
          {step === 'upload' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Upload a CSV exported from your biometric device. Required columns:{' '}
                <code className="bg-gray-100 px-1 rounded text-xs">Name, Date, Time</code>
              </p>
              <p className="text-xs text-gray-500">
                Example format: each employee has alternating in/out rows per day.
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isFetching}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
              />
              {isFetching && (
                <p className="text-sm text-indigo-600">Parsing and checking for conflicts…</p>
              )}
              {parseError && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-800">{parseError}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Preview ── */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>{rows.length} rows parsed</span>
                <span className="text-green-700">{rows.filter(r => r.status === 'matched').length} matched</span>
                <span className="text-amber-700">{rows.filter(r => r.status === 'unmatched').length} unmatched</span>
                <span className="text-amber-700">{rows.filter(r => r.status === 'missing-punch-out').length} missing out</span>
                <span className="text-blue-700">{rows.filter(r => r.status === 'conflict').length} conflicts</span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Biometric Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Matched Employee</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">In</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Out</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {rows.map((row, idx) => (
                      <tr key={idx} className={row.action === 'skip' ? 'opacity-40' : ''}>
                        <td className="px-4 py-2 text-gray-900">{row.parsed.biometricName}</td>

                        {/* Matched Employee — dropdown if unmatched */}
                        <td className="px-4 py-2">
                          {row.status === 'unmatched' ? (
                            <select
                              value={row.matchedEmployee?.id ?? ''}
                              onChange={e => {
                                const emp = employees.find(emp => emp.id === e.target.value) ?? null;
                                updateRow(idx, {
                                  matchedEmployee: emp,
                                  status: emp ? 'matched' : 'unmatched',
                                  action: emp ? 'import' : 'skip',
                                });
                              }}
                              className="rounded border border-gray-300 px-2 py-1 text-xs"
                            >
                              <option value="">Select employee…</option>
                              {employees.map(e => (
                                <option key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-gray-700">
                              {row.matchedEmployee?.full_name ?? '—'}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{row.parsed.date}</td>
                        <td className="px-4 py-2 text-gray-700">{row.parsed.inTime ?? '—'}</td>

                        {/* Out time — editable if missing */}
                        <td className="px-4 py-2">
                          {row.status === 'missing-punch-out' && row.action !== 'skip' ? (
                            <input
                              type="time"
                              value={row.manualOutTime}
                              onChange={e => updateRow(idx, { manualOutTime: e.target.value })}
                              className="rounded border border-amber-300 px-2 py-1 text-xs"
                            />
                          ) : (
                            <span className="text-gray-700">{row.parsed.outTime ?? '—'}</span>
                          )}
                        </td>

                        <td className="px-4 py-2">
                          <StatusBadge status={row.status} />
                        </td>

                        {/* Action toggle */}
                        <td className="px-4 py-2">
                          {row.status === 'conflict' ? (
                            <select
                              value={row.action}
                              onChange={e => updateRow(idx, { action: e.target.value as ImportRow['action'] })}
                              className="rounded border border-gray-300 px-2 py-1 text-xs"
                            >
                              <option value="skip">Skip</option>
                              <option value="overwrite">Overwrite</option>
                            </select>
                          ) : (
                            <button
                              onClick={() => updateRow(idx, { action: row.action === 'skip' ? defaultAction(row.status) : 'skip' })}
                              className={`text-xs font-medium px-2 py-1 rounded ${
                                row.action === 'skip'
                                  ? 'text-gray-500 hover:text-gray-700'
                                  : 'text-red-600 hover:text-red-800'
                              }`}
                            >
                              {row.action === 'skip' ? 'Include' : 'Skip'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {importError && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-800">{importError}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          {step === 'preview' && (
            <button
              onClick={handleConfirm}
              disabled={!canImport || isImporting}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting
                ? 'Importing…'
                : `Import ${rows.filter(r => r.action !== 'skip').length} records`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
