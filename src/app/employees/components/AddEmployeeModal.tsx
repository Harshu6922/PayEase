'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Plus, X } from 'lucide-react';
import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

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
    standard_working_hours: '8', // default
    overtime_multiplier: '1.0',
    joining_date: new Date().toISOString().split('T')[0], // today
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

  if (atSeatLimit) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-md px-3 py-2">
          {employeeLimit}-employee limit reached.{' '}
          <a href="/billing" className="font-semibold underline underline-offset-2 hover:text-orange-900">
            Upgrade plan
          </a>
        </span>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => {
          if (!isSubscribed && atSeatLimit) {
            router.push('/billing')
            return
          }
          if (atSeatLimit) return
          setIsOpen(true)
        }}
        className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
      >
        <Plus className="h-4 w-4" />
        Add Employee
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Add New Employee</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {error && (
                <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    name="full_name"
                    required
                    value={formData.full_name}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Employee ID</label>
                  <input
                    type="text"
                    name="employee_id"
                    required
                    value={formData.employee_id}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Worker Type</label>
                  <select
                    name="worker_type"
                    value={formData.worker_type}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="salaried">Salaried</option>
                    <option value="commission">Commission</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>

                {/* Monthly Salary - only salaried */}
                {formData.worker_type === 'salaried' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monthly Salary (INR)</label>
                    <input
                      type="number"
                      value={formData.monthly_salary}
                      onChange={e => setFormData(prev => ({ ...prev, monthly_salary: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                )}

                {/* Daily Rate - only daily */}
                {formData.worker_type === 'daily' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Daily Rate (INR)</label>
                    <input
                      type="number"
                      value={formData.daily_rate}
                      onChange={e => setFormData(prev => ({ ...prev, daily_rate: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2"
                      min="0.01"
                      step="0.01"
                      required
                    />
                  </div>
                )}

                {/* Working Hours + OT Multiplier - salaried and daily only */}
                {(formData.worker_type === 'salaried' || formData.worker_type === 'daily') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Working Hours/Day</label>
                      <input
                        type="number"
                        value={formData.standard_working_hours}
                        onChange={e => setFormData(prev => ({ ...prev, standard_working_hours: e.target.value }))}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2"
                        required
                      />
                    </div>
                    {formData.worker_type === 'salaried' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">OT Multiplier</label>
                        <input
                          type="number"
                          value={formData.overtime_multiplier}
                          onChange={e => setFormData(prev => ({ ...prev, overtime_multiplier: e.target.value }))}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2"
                          step="0.1"
                          required
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Default shift times — salaried and daily only */}
                {(formData.worker_type === 'salaried' || formData.worker_type === 'daily') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Start Time</label>
                      <input
                        type="time"
                        value={formData.default_start_time}
                        onChange={e => setFormData(prev => ({ ...prev, default_start_time: e.target.value }))}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default End Time</label>
                      <input
                        type="time"
                        value={formData.default_end_time}
                        onChange={e => setFormData(prev => ({ ...prev, default_end_time: e.target.value }))}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center pt-2">
                  <input
                    type="checkbox"
                    name="is_active"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                    Active Employee
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-md border border-gray-300 dark:border-gray-600 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
