'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Plus } from 'lucide-react';
import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function AddEmployeeModal({ atSeatLimit = false, employeeLimit = 15, isSubscribed = true }: { atSeatLimit?: boolean; employeeLimit?: number; isSubscribed?: boolean }) {
  const router = useRouter();
  const supabase = createClient() as unknown as SupabaseClient<Database>;
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    employee_id: '',
    monthly_salary: '',
    standard_working_hours: '8',
    overtime_multiplier: '1.0',
    joining_date: new Date().toISOString().split('T')[0],
    is_active: true,
    worker_type: 'salaried' as 'salaried' | 'commission' | 'daily',
    daily_rate: '',
    default_start_time: '',
    default_end_time: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (formData.worker_type === 'daily') {
        if (!formData.daily_rate || parseFloat(formData.daily_rate) <= 0) {
          setError('Daily rate must be greater than 0');
          setLoading(false);
          return;
        }
      }

      // 1. Get logged in user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        throw new Error(`Auth error: ${userError.message}`);
      }
      if (!user) {
        throw new Error('Active session not found. Please log in again.');
      }

      // 2. Get company_id from user's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        throw new Error('Could not fetch company profile.');
      }
      if (!profile) {
        throw new Error(`No profile found for logged in user: ${user.id}`);
      }
      if (!profile.company_id) {
        throw new Error(`Profile found but company_id is missing for user: ${user.id}`);
      }

      // 3. Insert new employee
      const { error: insertError } = await supabase.from('employees').insert({
        company_id: profile.company_id,
        full_name: formData.full_name,
        employee_id: formData.employee_id,
        monthly_salary: formData.worker_type === 'daily' || formData.worker_type === 'commission'
          ? 0
          : parseFloat(formData.monthly_salary),
        standard_working_hours: formData.worker_type === 'commission'
          ? 8
          : parseFloat(formData.standard_working_hours),
        overtime_multiplier: formData.worker_type === 'commission' || formData.worker_type === 'daily'
          ? 1
          : parseFloat(formData.overtime_multiplier),
        joining_date: formData.joining_date,
        is_active: formData.is_active,
        worker_type: formData.worker_type,
        daily_rate: formData.worker_type === 'daily'
          ? parseFloat(formData.daily_rate)
          : null,
        default_start_time: formData.default_start_time || null,
        default_end_time: formData.default_end_time || null,
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      // Success
      setIsOpen(false);
      setFormData({
        full_name: '',
        employee_id: '',
        monthly_salary: '',
        standard_working_hours: '8',
        overtime_multiplier: '1.0',
        joining_date: new Date().toISOString().split('T')[0],
        is_active: true,
        worker_type: 'salaried',
        daily_rate: '',
        default_start_time: '',
        default_end_time: '',
      });

      // Refresh list
      router.refresh();

    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'An error occurred while saving.');
      } else {
        setError('An unknown error occurred while saving.');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'bg-background border border-[#7C3AED]/30 rounded-xl px-4 py-3 text-text placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 w-full text-sm';
  const labelClass = 'text-xs font-semibold uppercase tracking-wider text-text-muted mb-1 block';

  if (atSeatLimit) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-warning bg-warning/10 border border-warning/30 rounded-xl px-4 py-2">
          {employeeLimit}-employee limit reached.{' '}
          <a href="/billing" className="font-semibold underline underline-offset-2 hover:text-text">
            Upgrade plan
          </a>
        </span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => {
          if (!isSubscribed && atSeatLimit) {
            router.push('/billing');
            return;
          }
          if (atSeatLimit) return;
          setIsOpen(true);
        }}
        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:opacity-90 transition-opacity"
      >
        <Plus className="h-4 w-4" />
        Add Employee
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-surface-elevated border border-[#7C3AED]/20 text-text max-w-md">
          <DialogHeader>
            <DialogTitle className="text-text font-bold text-lg">Add Employee</DialogTitle>
            <DialogDescription className="text-text-muted text-sm">
              Fill in the details below to add a new employee to your company.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {error && (
              <div className="bg-danger/10 border border-danger/30 text-danger rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className={labelClass}>Full Name</label>
              <input
                type="text"
                name="full_name"
                required
                value={formData.full_name}
                onChange={handleChange}
                placeholder="e.g. Ramesh Kumar"
                className={inputClass}
              />
            </div>

            {/* Employee ID */}
            <div>
              <label className={labelClass}>Employee ID</label>
              <input
                type="text"
                name="employee_id"
                required
                value={formData.employee_id}
                onChange={handleChange}
                placeholder="e.g. EMP-001"
                className={inputClass}
              />
            </div>

            {/* Worker Type Tabs */}
            <div>
              <label className={labelClass}>Worker Type</label>
              <Tabs
                value={formData.worker_type}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, worker_type: val as 'salaried' | 'commission' | 'daily' }))
                }
              >
                <TabsList className="bg-surface border border-[#7C3AED]/20 w-full">
                  <TabsTrigger
                    value="salaried"
                    className="flex-1 data-[state=active]:text-primary-light data-[state=active]:bg-white/5"
                  >
                    Salaried
                  </TabsTrigger>
                  <TabsTrigger
                    value="daily"
                    className="flex-1 data-[state=active]:text-primary-light data-[state=active]:bg-white/5"
                  >
                    Daily
                  </TabsTrigger>
                  <TabsTrigger
                    value="commission"
                    className="flex-1 data-[state=active]:text-primary-light data-[state=active]:bg-white/5"
                  >
                    Commission
                  </TabsTrigger>
                </TabsList>

                {/* Salaried fields */}
                <TabsContent value="salaried" className="mt-4 space-y-4">
                  <div>
                    <label className={labelClass}>Monthly Salary (INR)</label>
                    <input
                      type="number"
                      value={formData.monthly_salary}
                      onChange={(e) => setFormData((prev) => ({ ...prev, monthly_salary: e.target.value }))}
                      placeholder="e.g. 25000"
                      className={inputClass}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Working Hours/Day</label>
                      <input
                        type="number"
                        value={formData.standard_working_hours}
                        onChange={(e) => setFormData((prev) => ({ ...prev, standard_working_hours: e.target.value }))}
                        className={inputClass}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>OT Multiplier</label>
                      <input
                        type="number"
                        value={formData.overtime_multiplier}
                        onChange={(e) => setFormData((prev) => ({ ...prev, overtime_multiplier: e.target.value }))}
                        className={inputClass}
                        step="0.1"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Default Start Time</label>
                      <input
                        type="time"
                        value={formData.default_start_time}
                        onChange={(e) => setFormData((prev) => ({ ...prev, default_start_time: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Default End Time</label>
                      <input
                        type="time"
                        value={formData.default_end_time}
                        onChange={(e) => setFormData((prev) => ({ ...prev, default_end_time: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Daily fields */}
                <TabsContent value="daily" className="mt-4 space-y-4">
                  <div>
                    <label className={labelClass}>Daily Rate (INR)</label>
                    <input
                      type="number"
                      value={formData.daily_rate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, daily_rate: e.target.value }))}
                      placeholder="e.g. 800"
                      className={inputClass}
                      min="0.01"
                      step="0.01"
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Working Hours/Day</label>
                    <input
                      type="number"
                      value={formData.standard_working_hours}
                      onChange={(e) => setFormData((prev) => ({ ...prev, standard_working_hours: e.target.value }))}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Default Start Time</label>
                      <input
                        type="time"
                        value={formData.default_start_time}
                        onChange={(e) => setFormData((prev) => ({ ...prev, default_start_time: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Default End Time</label>
                      <input
                        type="time"
                        value={formData.default_end_time}
                        onChange={(e) => setFormData((prev) => ({ ...prev, default_end_time: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Commission fields — no extra fields needed */}
                <TabsContent value="commission" className="mt-4">
                  <p className="text-sm text-text-muted">
                    Commission-based employees have no fixed salary or daily rate. Earnings are logged separately.
                  </p>
                </TabsContent>
              </Tabs>
            </div>

            {/* Joining Date */}
            <div>
              <label className={labelClass}>Joining Date</label>
              <input
                type="date"
                name="joining_date"
                value={formData.joining_date}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3 pt-1">
              <input
                type="checkbox"
                name="is_active"
                id="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="h-4 w-4 rounded border-[#7C3AED]/30 bg-background text-primary focus:ring-primary/50 accent-primary"
              />
              <label htmlFor="is_active" className="text-sm text-text">
                Active Employee
              </label>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-2 border-t border-[#7C3AED]/10 mt-4">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#7C3AED]/30 text-text-muted hover:text-text text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Add Employee'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
