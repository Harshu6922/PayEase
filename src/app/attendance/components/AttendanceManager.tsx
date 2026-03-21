'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
    setRecords(prev => ({
      ...prev,
      [empId]: { ...prev[empId], status },
    }));
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
        updated[emp.id] = { ...prev[emp.id], status }
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-xl border shadow-sm">
        <div className="flex flex-wrap items-end gap-6 text-sm text-gray-700">
          <div>
            <label className="block font-semibold mb-1">Global Date</label>
            <input 
              type="date"
              value={globalDate}
              onChange={(e) => setGlobalDate(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm border px-3 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Default Start Time</label>
            <input 
              type="time" 
              value={globalStartTime}
              onChange={(e) => setGlobalStartTime(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm border px-3 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Default End Time</label>
            <input 
              type="time" 
              value={globalEndTime}
              onChange={(e) => setGlobalEndTime(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm border px-3 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleBulkMark('Present')}
              className="rounded-lg bg-green-50 border border-green-200 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors"
            >
              Mark All Present
            </button>
            <button
              type="button"
              onClick={() => handleBulkMark('Absent')}
              className="rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
            >
              Mark All Absent
            </button>
          </div>
          {userRole === 'admin' && (
            <button
              onClick={() => setIsImportOpen(true)}
              disabled={!companyId}
              className="flex items-center gap-2 rounded-md bg-gray-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-600 disabled:opacity-50 transition-colors"
            >
              Import Biometric
            </button>
          )}
          {userRole === 'admin' && (
            <button
              onClick={handleSave}
              disabled={loading || fetching}
              className="flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving securely...' : 'Save All Attendance'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="rounded-md bg-green-50 p-4 border border-green-200">
          <p className="text-sm font-medium text-green-800">{success}</p>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm relative">
        {fetching && (
          <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center backdrop-blur-sm">
            <span className="text-indigo-600 font-medium">Fetching existing records...</span>
          </div>
        )}
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Overrides (Optional)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {!employees || employees.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-500">
                  No active employees found to mark attendance.
                </td>
              </tr>
            ) : (
              employees.map((emp) => {
                const state = records[emp.id] || { status: 'Absent' };
                const isAbsent = state.status === 'Absent';
                return (
                  <tr key={emp.id} className={isAbsent ? 'bg-gray-50' : ''}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {emp.full_name} <span className="text-gray-400 text-xs font-normal block">{emp.employee_id}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <select
                        value={state.status}
                        onChange={(e) => handleStatusChange(emp.id, e.target.value as AttendanceStatus)}
                        className={`rounded-md border-gray-300 text-sm font-semibold px-3 py-1.5 border shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                          state.status === 'Present' ? 'text-green-700 bg-green-50 border-green-200' :
                          state.status === 'Absent' ? 'text-red-700 bg-red-50 border-red-200' :
                          'text-orange-700 bg-orange-50 border-orange-200'
                        }`}
                      >
                        <option value="Present">Present</option>
                        <option value="Half Day">Half Day</option>
                        <option value="Absent">Absent</option>
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <input 
                          type="time" 
                          value={state.overrideStartTime || ''}
                          onChange={(e) => handleTimeChange(emp.id, 'overrideStartTime', e.target.value)}
                          placeholder="Default"
                          disabled={isAbsent}
                          className="rounded-md border-gray-300 shadow-sm text-sm px-2 py-1 border text-gray-900 disabled:opacity-50 disabled:bg-gray-100"
                        />
                        <span>to</span>
                        <input 
                          type="time" 
                          value={state.overrideEndTime || ''}
                          onChange={(e) => handleTimeChange(emp.id, 'overrideEndTime', e.target.value)}
                          placeholder="Default"
                          disabled={isAbsent}
                          className="rounded-md border-gray-300 shadow-sm text-sm px-2 py-1 border text-gray-900 disabled:opacity-50 disabled:bg-gray-100"
                        />
                        {(state.overrideStartTime || state.overrideEndTime) && (
                           <button 
                             onClick={() => {
                               handleTimeChange(emp.id, 'overrideStartTime', '');
                               handleTimeChange(emp.id, 'overrideEndTime', '');
                             }}
                             className="text-xs text-indigo-600 hover:text-indigo-800 ml-2 font-medium"
                           >
                              Clear
                           </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

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
