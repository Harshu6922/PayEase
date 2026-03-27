'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { calculateRates } from '@/lib/payroll-utils';
import type { Database } from '@/types/supabase';
import type { Employee, AttendanceRecord } from '@/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import BiometricImportModal from './BiometricImportModal';

type AttendanceStatus = 'Present' | 'Absent' | 'Half Day';

interface EmployeeState {
  status: AttendanceStatus;
  overrideStartTime?: string;
  overrideEndTime?: string;
}

export default function AttendanceManager({ employees, userRole = 'admin' }: { employees: Employee[]; userRole?: 'admin' | 'viewer' }) {
  const router = useRouter();
  const supabase = createClient() as unknown as SupabaseClient<Database>;

  // App State
  const [globalDate, setGlobalDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [globalStartTime, setGlobalStartTime] = useState('09:00');
  const [globalEndTime, setGlobalEndTime] = useState('17:00');

  // Attendance State mapping employee_id to their local modifications
  const [records, setRecords] = useState<Record<string, EmployeeState>>(() => {
    const initial: Record<string, EmployeeState> = {};
    employees.forEach(emp => {
      initial[emp.id] = { status: 'Absent' };
    });
    return initial;
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Fetch Existing Data when Date Changes
  const fetchExistingRecords = useCallback(async (dateStr: string) => {
    setFetching(true);
    setError(null);
    setSuccess(null);

    try {
      // Get User Auth
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return; // Silent return for now, handled on save

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.company_id) return;

      const { data: existing, error: fetchErr } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('date', dateStr);

      if (fetchErr) throw fetchErr;

      // Map back to dictionary
      const newRecords: Record<string, EmployeeState> = {};

      // Initialize everyone to Absent by default if no saved record exists
      employees.forEach(emp => {
        newRecords[emp.id] = { status: 'Absent' };
      });

      // Override defaults with saved DB data
      if (existing && existing.length > 0) {
        existing.forEach((record: AttendanceRecord) => {
          if (newRecords[record.employee_id]) {
            // Read status directly from database record
            // Fallback to Absent if undefined for older records
            const savedStatus = (record.status as AttendanceStatus) || 'Absent';

            newRecords[record.employee_id] = {
              status: savedStatus,
              overrideStartTime: record.start_time.substring(0, 5) !== globalStartTime ? record.start_time.substring(0, 5) : undefined,
              overrideEndTime: record.end_time.substring(0, 5) !== globalEndTime ? record.end_time.substring(0, 5) : undefined,
            };
          }
        });
      }

      setRecords(newRecords);

    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(`Failed to fetch records: ${err.message}`);
      }
    } finally {
      setFetching(false);
    }
  }, [supabase, employees, globalStartTime, globalEndTime]);

  // Hook trigger
  useEffect(() => {
    fetchExistingRecords(globalDate);
  }, [globalDate, fetchExistingRecords]);

  useEffect(() => {
    async function fetchCompanyId() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.company_id) setCompanyId(profile.company_id);
    }
    fetchCompanyId();
  }, [supabase]);

  // Handle Status Toggle
  const handleStatusChange = (empId: string, status: AttendanceStatus) => {
    const emp = employees.find(e => e.id === empId);
    setRecords(prev => {
      const current = prev[empId] || { status: 'Absent' };
      // Auto-fill employee's default times when marking present/half-day for the first time
      const wasAbsent = current.status === 'Absent';
      const nowPresent = status === 'Present' || status === 'Half Day';
      let overrideStartTime = current.overrideStartTime;
      let overrideEndTime = current.overrideEndTime;
      if (wasAbsent && nowPresent && emp?.default_start_time && !overrideStartTime) {
        overrideStartTime = emp.default_start_time.substring(0, 5);
      }
      if (wasAbsent && nowPresent && emp?.default_end_time && !overrideEndTime) {
        overrideEndTime = emp.default_end_time.substring(0, 5);
      }
      return {
        ...prev,
        [empId]: { status, overrideStartTime, overrideEndTime },
      };
    });
  };

  // Handle Time Override
  const handleTimeChange = (empId: string, field: 'overrideStartTime' | 'overrideEndTime', value: string) => {
    setRecords(prev => ({
      ...prev,
      [empId]: { ...prev[empId], [field]: value },
    }));
  };

  const handleBulkMark = (status: AttendanceStatus) => {
    setRecords(prev => {
      const updated = { ...prev }
      employees.forEach(emp => {
        const current = prev[emp.id] || { status: 'Absent' }
        const nowPresent = status === 'Present' || status === 'Half Day'
        let overrideStartTime = current.overrideStartTime
        let overrideEndTime = current.overrideEndTime
        if (nowPresent && emp.default_start_time && !overrideStartTime) {
          overrideStartTime = emp.default_start_time.substring(0, 5)
        }
        if (nowPresent && emp.default_end_time && !overrideEndTime) {
          overrideEndTime = emp.default_end_time.substring(0, 5)
        }
        if (status === 'Absent') {
          overrideStartTime = undefined
          overrideEndTime = undefined
        }
        updated[emp.id] = { status, overrideStartTime, overrideEndTime }
      })
      return updated
    })
  };

  // Calculate total hours exactly
  const calculateHours = (start: string, end: string) => {
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    const totalHours = (eH + eM / 60) - (sH + sM / 60);
    return Math.max(0, totalHours); // Prevent negative
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Verify User Auth & Company
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Active session not found. Please log in again.');

      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileErr || !profile?.company_id) throw new Error('Could not verify company association.');

      const verifiedCompanyId = profile.company_id;

      // 2. Build full payload for all employees (upsert handles insert vs update automatically)
      // Calculate actual days in month from globalDate (YYYY-MM-DD format)
      const [yearStr, monthStr] = globalDate.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const daysInMonth = new Date(year, month, 0).getDate();

      const payload = employees.map((emp) => {
        const state        = records[emp.id];
        const status       = state?.status || 'Absent';
        const standardHours = Number(emp.standard_working_hours) || 8;
        // Use actual days in month for accurate daily wage calculation
        const dailyWage    = Number(emp.monthly_salary) / daysInMonth;
        const hourlyRate   = dailyWage / standardHours;

        // Resolve times
        let startTime = state?.overrideStartTime || (status === 'Absent' ? '00:00' : globalStartTime);
        let endTime   = state?.overrideEndTime   || (status === 'Absent' ? '00:00' : globalEndTime);
        if (status === 'Half Day' && !state?.overrideEndTime) {
          const [sH] = startTime.split(':').map(Number);
          endTime = `${String(sH + Math.floor(standardHours / 2)).padStart(2, '0')}:00`;
        }

        // Compute hours & pay
        let workedHours = 0;
        let dailyPay    = dailyWage;
        if (status === 'Absent') {
          workedHours = 0; dailyPay = 0;
        } else if (status === 'Half Day') {
          workedHours = standardHours / 2; dailyPay = dailyWage / 2;
        } else {
          workedHours = calculateHours(startTime, endTime);
          const short = standardHours - workedHours;
          if (short > 0) dailyPay = dailyWage - short * hourlyRate;
        }

        const deductionHours  = status === 'Absent' ? standardHours
                              : status === 'Half Day' ? standardHours / 2
                              : Math.max(0, standardHours - workedHours);
        const deductionAmount = dailyWage - dailyPay;

        return {
          company_id:       verifiedCompanyId,
          employee_id:      emp.id,
          date:             globalDate,
          status,
          start_time:       startTime,
          end_time:         endTime,
          daily_wage:       dailyWage,
          hourly_rate:      hourlyRate,
          worked_hours:     workedHours,
          daily_pay:        dailyPay,
          overtime_hours:   0,
          overtime_amount:  0,
          deduction_hours:  deductionHours,
          deduction_amount: deductionAmount,
        };
      });

      // 3. Single upsert — insert new rows, update on conflict
      const { error: upsertErr } = await supabase
        .from('attendance_records')
        .upsert(payload, { onConflict: 'employee_id,date' });

      if (upsertErr) throw upsertErr;

      setSuccess(`Successfully saved attendance for ${globalDate}.`);
      router.refresh(); // Tells Next.js to revalidate server state caching

    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(`Failed to save: ${err.message}`);
      } else {
        setError('An unknown unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Date navigation helpers
  const navigateDate = (direction: 'prev' | 'next') => {
    const d = new Date(globalDate);
    d.setDate(d.getDate() + (direction === 'next' ? 1 : -1));
    setGlobalDate(d.toISOString().split('T')[0]);
  };

  const formattedDate = (() => {
    const d = new Date(globalDate + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  })();

  const isToday = globalDate === new Date().toISOString().split('T')[0];

  // Get initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-4 md:px-6 pt-6 pb-4 border-b border-[#7C3AED]/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateDate('prev')}
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-white/5 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-text font-semibold">{formattedDate}</span>
            {isToday && (
              <span className="bg-primary/20 text-primary-light text-xs px-2 py-0.5 rounded-full">Today</span>
            )}
          </div>
          <button
            onClick={() => navigateDate('next')}
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-white/5 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {fetching && <span className="text-text-muted text-xs">Loading...</span>}
        </div>

        <div className="flex items-center gap-2">
          {userRole === 'admin' && (
            <>
              <button
                type="button"
                onClick={() => handleBulkMark('Present')}
                className="border border-[#7C3AED]/30 text-text-muted hover:text-text text-sm px-3 py-1.5 rounded-lg transition-colors hidden md:block"
              >
                Mark All Present
              </button>
              <button
                type="button"
                onClick={() => handleBulkMark('Absent')}
                className="border border-[#7C3AED]/30 text-text-muted hover:text-text text-sm px-3 py-1.5 rounded-lg transition-colors hidden md:block"
              >
                Mark All Absent
              </button>
              {companyId && (
                <button
                  onClick={() => setIsImportOpen(true)}
                  className="border border-[#7C3AED]/30 text-text-muted hover:text-text text-sm px-3 py-1.5 rounded-lg transition-colors"
                >
                  Import Biometric
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Global time defaults */}
      <div className="px-4 md:px-6 py-3 flex flex-wrap items-center gap-4 border-b border-[#7C3AED]/10">
        <div className="flex items-center gap-2">
          <label className="text-text-muted text-xs uppercase tracking-wide font-medium">Default Start</label>
          <input
            type="time"
            value={globalStartTime}
            onChange={(e) => setGlobalStartTime(e.target.value)}
            className="bg-background border border-[#7C3AED]/30 rounded-lg px-2 py-1 text-sm text-text font-mono focus:outline-none focus:border-primary/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-text-muted text-xs uppercase tracking-wide font-medium">Default End</label>
          <input
            type="time"
            value={globalEndTime}
            onChange={(e) => setGlobalEndTime(e.target.value)}
            className="bg-background border border-[#7C3AED]/30 rounded-lg px-2 py-1 text-sm text-text font-mono focus:outline-none focus:border-primary/50"
          />
        </div>
        {/* Mobile bulk actions */}
        {userRole === 'admin' && (
          <div className="flex gap-2 md:hidden">
            <button
              type="button"
              onClick={() => handleBulkMark('Present')}
              className="border border-[#7C3AED]/30 text-text-muted hover:text-text text-xs px-2 py-1 rounded-lg transition-colors"
            >
              All Present
            </button>
            <button
              type="button"
              onClick={() => handleBulkMark('Absent')}
              className="border border-[#7C3AED]/30 text-text-muted hover:text-text text-xs px-2 py-1 rounded-lg transition-colors"
            >
              All Absent
            </button>
          </div>
        )}
      </div>

      {/* Status / Error messages */}
      {error && (
        <div className="mx-4 md:mx-6 mt-4 rounded-xl bg-danger/10 border border-danger/30 p-4">
          <p className="text-sm font-medium text-danger">{error}</p>
        </div>
      )}
      {success && (
        <div className="mx-4 md:mx-6 mt-4 rounded-xl bg-success/10 border border-success/30 p-4">
          <p className="text-sm font-medium text-success">{success}</p>
        </div>
      )}

      {/* Employee list */}
      <div className="space-y-2 px-4 md:px-6 py-4 relative">
        {fetching && (
          <div className="absolute inset-0 bg-background/60 z-10 flex items-center justify-center backdrop-blur-sm rounded-xl">
            <span className="text-primary-light font-medium text-sm">Fetching records...</span>
          </div>
        )}

        {!employees || employees.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-text-muted font-medium">No active employees found.</p>
            <p className="text-text-muted text-sm mt-1 opacity-60">Add employees to mark attendance.</p>
          </div>
        ) : (
          employees.map((emp) => {
            const state = records[emp.id] || { status: 'Absent' };
            const isAbsent = state.status === 'Absent';

            return (
              <div
                key={emp.id}
                className="backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-xl px-4 py-3 flex flex-col md:flex-row md:items-center gap-3"
              >
                {/* Avatar + Name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/20 text-primary-light text-sm font-semibold flex items-center justify-center flex-shrink-0">
                    {getInitials(emp.full_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-text font-semibold text-sm truncate">{emp.full_name}</p>
                    <p className="text-text-muted text-xs">{emp.employee_id}</p>
                  </div>
                </div>

                {/* Status pills */}
                <div className="flex items-center gap-1.5">
                  {(['Present', 'Half Day', 'Absent'] as AttendanceStatus[]).map((s) => {
                    const active = state.status === s;
                    const colors =
                      s === 'Present'  ? 'bg-success/20 text-success border-success/30' :
                      s === 'Half Day' ? 'bg-warning/20 text-warning border-warning/30' :
                                         'bg-danger/20 text-danger border-danger/30';
                    return (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(emp.id, s)}
                        disabled={userRole !== 'admin'}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                          active
                            ? colors
                            : 'bg-white/5 text-text-muted border-[#7C3AED]/20 hover:bg-white/10'
                        }`}
                      >
                        {s === 'Half Day' ? 'Half' : s}
                      </button>
                    );
                  })}
                </div>

                {/* Time overrides */}
                {!isAbsent && (
                  <div className="flex items-center gap-2 text-xs">
                    <input
                      type="time"
                      value={state.overrideStartTime || ''}
                      onChange={(e) => handleTimeChange(emp.id, 'overrideStartTime', e.target.value)}
                      placeholder={globalStartTime}
                      className="bg-background border border-[#7C3AED]/30 rounded-lg px-2 py-1 text-sm text-text font-mono focus:outline-none focus:border-primary/50 w-[100px]"
                    />
                    <span className="text-text-muted">–</span>
                    <input
                      type="time"
                      value={state.overrideEndTime || ''}
                      onChange={(e) => handleTimeChange(emp.id, 'overrideEndTime', e.target.value)}
                      placeholder={globalEndTime}
                      className="bg-background border border-[#7C3AED]/30 rounded-lg px-2 py-1 text-sm text-text font-mono focus:outline-none focus:border-primary/50 w-[100px]"
                    />
                    {(state.overrideStartTime || state.overrideEndTime) && (
                      <button
                        onClick={() => {
                          handleTimeChange(emp.id, 'overrideStartTime', '');
                          handleTimeChange(emp.id, 'overrideEndTime', '');
                        }}
                        className="text-xs text-primary-light hover:text-text-muted transition-colors font-medium"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Sticky save button */}
      {userRole === 'admin' && (
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 md:left-60 p-4 bg-background/90 backdrop-blur-md border-t border-[#7C3AED]/10">
          <button
            onClick={handleSave}
            disabled={loading || fetching}
            className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary/80 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      )}

      {isImportOpen && companyId && (
        <BiometricImportModal
          employees={employees}
          companyId={companyId}
          onImportComplete={(date) => {
            setGlobalDate(date);
            setIsImportOpen(false);
          }}
          onClose={() => setIsImportOpen(false)}
        />
      )}
    </div>
  );
}
