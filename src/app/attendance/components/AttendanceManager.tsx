'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
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

const avatarGradient: Record<string, string> = {
  salaried: 'from-[#bd9dff]/20 to-[#8a4cfc]/40 text-[#bd9dff] ring-[#bd9dff]/20',
  commission: 'from-blue-500/20 to-indigo-500/40 text-blue-300 ring-blue-500/20',
  daily: 'from-teal-500/20 to-emerald-500/40 text-teal-300 ring-teal-500/20',
};

const typeBadge: Record<string, string> = {
  salaried: 'bg-[#4b4168] text-[#d7c9f9]',
  commission: 'bg-[#221b36] text-[#afa7c2]',
  daily: 'bg-[#2f2747] text-[#ebe1fe]',
};

const getInitials = (name: string) => {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
};

export default function AttendanceManager({
  employees,
  userRole = 'admin',
}: {
  employees: Employee[];
  userRole?: 'admin' | 'viewer';
}) {
  const router = useRouter();
  const supabase = createClient() as unknown as SupabaseClient<Database>;

  const [globalDate, setGlobalDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [globalStartTime, setGlobalStartTime] = useState('09:00');
  const [globalEndTime, setGlobalEndTime] = useState('17:00');

  const [records, setRecords] = useState<Record<string, EmployeeState>>(() => {
    const initial: Record<string, EmployeeState> = {};
    employees.forEach(emp => { initial[emp.id] = { status: 'Absent' }; });
    return initial;
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const fetchExistingRecords = useCallback(async (dateStr: string) => {
    setFetching(true);
    setError(null);
    setSuccess(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).maybeSingle();
      if (!profile?.company_id) return;
      const { data: existing, error: fetchErr } = await supabase
        .from('attendance_records').select('*').eq('company_id', profile.company_id).eq('date', dateStr);
      if (fetchErr) throw fetchErr;
      const newRecords: Record<string, EmployeeState> = {};
      employees.forEach(emp => { newRecords[emp.id] = { status: 'Absent' }; });
      if (existing && existing.length > 0) {
        existing.forEach((record: AttendanceRecord) => {
          if (newRecords[record.employee_id]) {
            newRecords[record.employee_id] = {
              status: (record.status as AttendanceStatus) || 'Absent',
              overrideStartTime: record.start_time.substring(0, 5) !== globalStartTime ? record.start_time.substring(0, 5) : undefined,
              overrideEndTime: record.end_time.substring(0, 5) !== globalEndTime ? record.end_time.substring(0, 5) : undefined,
            };
          }
        });
      }
      setRecords(newRecords);
    } catch (err: unknown) {
      if (err instanceof Error) setError(`Failed to fetch records: ${err.message}`);
    } finally {
      setFetching(false);
    }
  }, [supabase, employees, globalStartTime, globalEndTime]);

  useEffect(() => { fetchExistingRecords(globalDate); }, [globalDate, fetchExistingRecords]);

  useEffect(() => {
    async function fetchCompanyId() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).maybeSingle();
      if (profile?.company_id) setCompanyId(profile.company_id);
    }
    fetchCompanyId();
  }, [supabase]);

  const handleStatusChange = (empId: string, status: AttendanceStatus) => {
    const emp = employees.find(e => e.id === empId);
    setRecords(prev => {
      const current = prev[empId] || { status: 'Absent' };
      const wasAbsent = current.status === 'Absent';
      const nowPresent = status === 'Present' || status === 'Half Day';
      let overrideStartTime = current.overrideStartTime;
      let overrideEndTime = current.overrideEndTime;
      if (wasAbsent && nowPresent && emp?.default_start_time && !overrideStartTime)
        overrideStartTime = emp.default_start_time.substring(0, 5);
      if (wasAbsent && nowPresent && emp?.default_end_time && !overrideEndTime)
        overrideEndTime = emp.default_end_time.substring(0, 5);
      return { ...prev, [empId]: { status, overrideStartTime, overrideEndTime } };
    });
  };

  const handleTimeChange = (empId: string, field: 'overrideStartTime' | 'overrideEndTime', value: string) => {
    setRecords(prev => ({ ...prev, [empId]: { ...prev[empId], [field]: value } }));
  };

  const handleBulkMark = (status: AttendanceStatus) => {
    setRecords(prev => {
      const updated = { ...prev };
      employees.forEach(emp => {
        const current = prev[emp.id] || { status: 'Absent' };
        const nowPresent = status === 'Present' || status === 'Half Day';
        let overrideStartTime = current.overrideStartTime;
        let overrideEndTime = current.overrideEndTime;
        if (nowPresent && emp.default_start_time && !overrideStartTime)
          overrideStartTime = emp.default_start_time.substring(0, 5);
        if (nowPresent && emp.default_end_time && !overrideEndTime)
          overrideEndTime = emp.default_end_time.substring(0, 5);
        if (status === 'Absent') { overrideStartTime = undefined; overrideEndTime = undefined; }
        updated[emp.id] = { status, overrideStartTime, overrideEndTime };
      });
      return updated;
    });
  };

  const calculateHours = (start: string, end: string) => {
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    return Math.max(0, (eH + eM / 60) - (sH + sM / 60));
  };

  const handleSave = async () => {
    setLoading(true); setError(null); setSuccess(null);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Active session not found. Please log in again.');
      const { data: profile, error: profileErr } = await supabase.from('profiles').select('company_id').eq('id', user.id).maybeSingle();
      if (profileErr || !profile?.company_id) throw new Error('Could not verify company association.');
      const verifiedCompanyId = profile.company_id;
      const [yearStr, monthStr] = globalDate.split('-');
      const daysInMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate();

      const payload = employees.map((emp) => {
        const state = records[emp.id];
        const status = state?.status || 'Absent';
        const standardHours = Number(emp.standard_working_hours) || 8;
        const dailyWage = Number(emp.monthly_salary) / daysInMonth;
        const hourlyRate = dailyWage / standardHours;
        let startTime = state?.overrideStartTime || (status === 'Absent' ? '00:00' : globalStartTime);
        let endTime = state?.overrideEndTime || (status === 'Absent' ? '00:00' : globalEndTime);
        if (status === 'Half Day' && !state?.overrideEndTime) {
          const [sH] = startTime.split(':').map(Number);
          endTime = `${String(sH + Math.floor(standardHours / 2)).padStart(2, '0')}:00`;
        }
        let workedHours = 0, dailyPay = dailyWage;
        if (status === 'Absent') { workedHours = 0; dailyPay = 0; }
        else if (status === 'Half Day') { workedHours = standardHours / 2; dailyPay = dailyWage / 2; }
        else {
          workedHours = calculateHours(startTime, endTime);
          const short = standardHours - workedHours;
          if (short > 0) dailyPay = dailyWage - short * hourlyRate;
        }
        const deductionHours = status === 'Absent' ? standardHours : status === 'Half Day' ? standardHours / 2 : Math.max(0, standardHours - workedHours);
        return {
          company_id: verifiedCompanyId, employee_id: emp.id, date: globalDate, status,
          start_time: startTime, end_time: endTime, daily_wage: dailyWage, hourly_rate: hourlyRate,
          worked_hours: workedHours, daily_pay: dailyPay, overtime_hours: 0, overtime_amount: 0,
          deduction_hours: deductionHours, deduction_amount: dailyWage - dailyPay,
        };
      });

      const { error: upsertErr } = await supabase.from('attendance_records').upsert(payload, { onConflict: 'employee_id,date' });
      if (upsertErr) throw upsertErr;
      setSuccess(`Attendance saved for ${globalDate}.`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? `Failed to save: ${err.message}` : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const d = new Date(globalDate);
    d.setDate(d.getDate() + (direction === 'next' ? 1 : -1));
    setGlobalDate(d.toISOString().split('T')[0]);
  };

  const formattedDate = new Date(globalDate + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const isToday = globalDate === new Date().toISOString().split('T')[0];

  // Stats
  const presentCount = Object.values(records).filter(r => r.status === 'Present').length;
  const absentCount = Object.values(records).filter(r => r.status === 'Absent').length;
  const halfDayCount = Object.values(records).filter(r => r.status === 'Half Day').length;

  return (
    <div className="min-h-screen bg-[#0F0A1E] pb-32 relative">

      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed top-[-10%] right-[-10%] w-[600px] h-[600px] z-0"
        style={{ background: 'radial-gradient(circle, rgba(189,157,255,0.15) 0%, transparent 70%)' }}
      />

      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-12 space-y-10">

        {/* ROW 1: Header */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#ebe1fe]">
              Attendance
            </h1>
            <p className="text-[#afa7c2] text-lg">Mark today's attendance for your team</p>
          </div>

          {/* Date pill with navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 rounded-full bg-[rgba(28,22,46,0.6)] border border-[#bd9dff]/10 text-[#afa7c2] hover:text-[#ebe1fe] transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-[rgba(28,22,46,0.6)] backdrop-blur-xl border border-[#bd9dff]/10">
              <Calendar className="h-4 w-4 text-[#bd9dff]" />
              <span className="font-medium text-[#ebe1fe] text-sm">{formattedDate}</span>
              {isToday && (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#bd9dff]/20 text-[#bd9dff] px-2 py-0.5 rounded-full">Today</span>
              )}
            </div>
            <button
              onClick={() => navigateDate('next')}
              className="p-2 rounded-full bg-[rgba(28,22,46,0.6)] border border-[#bd9dff]/10 text-[#afa7c2] hover:text-[#ebe1fe] transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* ROW 2: Stats */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Present', count: presentCount, color: 'text-emerald-400', glow: 'bg-emerald-500/10' },
            { label: 'Absent', count: absentCount, color: 'text-red-400', glow: 'bg-red-500/10' },
            { label: 'Half Day', count: halfDayCount, color: 'text-amber-400', glow: 'bg-amber-500/10' },
          ].map(({ label, count, color, glow }) => (
            <div
              key={label}
              className="relative overflow-hidden p-8 rounded-3xl bg-[rgba(28,22,46,0.6)] backdrop-blur-xl border border-[#bd9dff]/10 group hover:bg-[#1c162e]/80 transition-all duration-300"
            >
              <div className={`absolute top-0 right-0 w-24 h-24 ${glow} rounded-bl-full -mr-8 -mt-8 group-hover:scale-110 transition-transform`} />
              <span className="text-[#afa7c2] text-xs uppercase tracking-widest font-bold">{label}</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className={`text-5xl font-bold ${color}`}>{count}</span>
                <span className="text-[#afa7c2]">employees</span>
              </div>
            </div>
          ))}
        </section>

        {/* Global time defaults + bulk actions */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-[rgba(28,22,46,0.6)] border border-[#bd9dff]/10 rounded-xl px-4 py-2">
            <span className="text-[#afa7c2] text-xs font-bold uppercase tracking-wider">Start</span>
            <input
              type="time"
              value={globalStartTime}
              onChange={e => setGlobalStartTime(e.target.value)}
              className="bg-transparent border-none outline-none text-[#ebe1fe] text-sm font-mono"
            />
          </div>
          <div className="flex items-center gap-2 bg-[rgba(28,22,46,0.6)] border border-[#bd9dff]/10 rounded-xl px-4 py-2">
            <span className="text-[#afa7c2] text-xs font-bold uppercase tracking-wider">End</span>
            <input
              type="time"
              value={globalEndTime}
              onChange={e => setGlobalEndTime(e.target.value)}
              className="bg-transparent border-none outline-none text-[#ebe1fe] text-sm font-mono"
            />
          </div>
          {userRole === 'admin' && (
            <>
              <button onClick={() => handleBulkMark('Present')} className="text-xs font-bold px-4 py-2 rounded-xl border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                All Present
              </button>
              <button onClick={() => handleBulkMark('Absent')} className="text-xs font-bold px-4 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">
                All Absent
              </button>
              {companyId && (
                <button onClick={() => setIsImportOpen(true)} className="text-xs font-bold px-4 py-2 rounded-xl border border-[#bd9dff]/20 text-[#bd9dff] hover:bg-[#bd9dff]/10 transition-colors">
                  Import Biometric
                </button>
              )}
            </>
          )}
          {fetching && <span className="text-[#afa7c2] text-xs">Loading...</span>}
        </div>

        {/* Error / Success */}
        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-5 py-4">
            <p className="text-sm font-medium text-red-400">{error}</p>
          </div>
        )}
        {success && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-5 py-4">
            <p className="text-sm font-medium text-emerald-400">{success}</p>
          </div>
        )}

        {/* ROW 3: Attendance marking card */}
        <section className="bg-[rgba(28,22,46,0.6)] backdrop-blur-xl border border-[#bd9dff]/10 rounded-[2.5rem] p-2 md:p-8">
          <div className="px-6 py-6 md:px-0 md:pt-0 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[#ebe1fe]">Mark Attendance</h2>
          </div>

          {employees.length === 0 ? (
            <div className="text-center py-20 text-[#afa7c2]">
              <p className="text-lg font-medium">No active employees found.</p>
              <p className="text-sm mt-1 opacity-60">Add employees to mark attendance.</p>
            </div>
          ) : (
            <div className="relative space-y-2">
              {fetching && (
                <div className="absolute inset-0 bg-[#0F0A1E]/60 z-10 flex items-center justify-center backdrop-blur-sm rounded-2xl">
                  <span className="text-[#bd9dff] font-medium text-sm">Fetching records...</span>
                </div>
              )}
              {employees.map(emp => {
                const state = records[emp.id] || { status: 'Absent' };
                const isAbsent = state.status === 'Absent';
                const gradient = avatarGradient[emp.worker_type] ?? 'from-[#bd9dff]/20 to-[#8a4cfc]/40 text-[#bd9dff] ring-[#bd9dff]/20';

                return (
                  <div
                    key={emp.id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-3xl hover:bg-white/5 transition-all duration-300 border border-transparent hover:border-[#bd9dff]/10 gap-4"
                  >
                    {/* Avatar + Name + Badge */}
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-bold text-lg ring-2 flex-shrink-0`}>
                        {getInitials(emp.full_name)}
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-[#ebe1fe]">{emp.full_name}</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${typeBadge[emp.worker_type] ?? 'bg-[#28213e] text-[#afa7c2]'}`}>
                          {emp.worker_type.charAt(0).toUpperCase() + emp.worker_type.slice(1)}
                        </span>
                      </div>
                    </div>

                    {/* Status buttons + time overrides */}
                    <div className="flex flex-col gap-2 md:items-end">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStatusChange(emp.id, 'Present')}
                          disabled={userRole !== 'admin'}
                          className={`flex-1 md:flex-none px-5 py-2.5 rounded-2xl font-medium text-sm transition-all ${
                            state.status === 'Present'
                              ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                              : 'bg-[#28213e] text-[#afa7c2] hover:text-emerald-400'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => handleStatusChange(emp.id, 'Absent')}
                          disabled={userRole !== 'admin'}
                          className={`flex-1 md:flex-none px-5 py-2.5 rounded-2xl font-medium text-sm transition-all ${
                            state.status === 'Absent'
                              ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                              : 'bg-[#28213e] text-[#afa7c2] hover:text-red-400'
                          }`}
                        >
                          Absent
                        </button>
                        <button
                          onClick={() => handleStatusChange(emp.id, 'Half Day')}
                          disabled={userRole !== 'admin'}
                          className={`flex-1 md:flex-none px-5 py-2.5 rounded-2xl font-medium text-sm transition-all ${
                            state.status === 'Half Day'
                              ? 'bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                              : 'bg-[#28213e] text-[#afa7c2] hover:text-amber-400'
                          }`}
                        >
                          Half Day
                        </button>
                      </div>

                      {/* Time overrides */}
                      {!isAbsent && (
                        <div className="flex items-center gap-2 text-xs">
                          <input
                            type="time"
                            value={state.overrideStartTime || ''}
                            onChange={e => handleTimeChange(emp.id, 'overrideStartTime', e.target.value)}
                            placeholder={globalStartTime}
                            className="bg-[#0F0A1E] border border-[#bd9dff]/20 rounded-lg px-2 py-1 text-sm text-[#ebe1fe] font-mono focus:outline-none focus:border-[#bd9dff]/50 w-[100px]"
                          />
                          <span className="text-[#afa7c2]">–</span>
                          <input
                            type="time"
                            value={state.overrideEndTime || ''}
                            onChange={e => handleTimeChange(emp.id, 'overrideEndTime', e.target.value)}
                            placeholder={globalEndTime}
                            className="bg-[#0F0A1E] border border-[#bd9dff]/20 rounded-lg px-2 py-1 text-sm text-[#ebe1fe] font-mono focus:outline-none focus:border-[#bd9dff]/50 w-[100px]"
                          />
                          {(state.overrideStartTime || state.overrideEndTime) && (
                            <button
                              onClick={() => { handleTimeChange(emp.id, 'overrideStartTime', ''); handleTimeChange(emp.id, 'overrideEndTime', ''); }}
                              className="text-xs text-[#bd9dff] hover:text-[#afa7c2] transition-colors font-medium"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Save button */}
          {userRole === 'admin' && (
            <div className="mt-10 px-2">
              <button
                onClick={handleSave}
                disabled={loading || fetching}
                className="w-full bg-[#b28cff] text-[#2e006c] font-bold text-xl py-6 rounded-3xl hover:shadow-[0_0_40px_rgba(189,157,255,0.4)] transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          )}
        </section>

      </main>

      {isImportOpen && companyId && (
        <BiometricImportModal
          employees={employees}
          companyId={companyId}
          onImportComplete={(date) => { setGlobalDate(date); setIsImportOpen(false); }}
          onClose={() => setIsImportOpen(false)}
        />
      )}
    </div>
  );
}
