'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CommissionItem, AgentItemRate } from '@/types';

interface SetRateModalProps {
  item: CommissionItem;
  existingRate: AgentItemRate | null;
  employeeId: string;
  onSave: (rate: AgentItemRate) => void;
  onClose: () => void;
}

export default function SetRateModal({
  item,
  existingRate,
  employeeId,
  onSave,
  onClose,
}: SetRateModalProps) {
  const [rate, setRate] = useState<string>(existingRate?.commission_rate?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedRate = parseFloat(rate);
    if (rate.trim() === '' || isNaN(parsedRate) || parsedRate < 0) {
      setError('Rate must be a valid non-negative number.');
      return;
    }

    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as unknown as any;

      if (existingRate) {
        const { data, error: updateError } = await supabase
          .from('agent_item_rates')
          .update({ commission_rate: parsedRate })
          .eq('id', existingRate.id)
          .select('*');

        if (updateError) throw updateError;
        if (!data || data.length === 0) throw new Error('No data returned from update.');
        onSave(data[0] as AgentItemRate);
      } else {
        const { data, error: insertError } = await supabase
          .from('agent_item_rates')
          .insert({ employee_id: employeeId, item_id: item.id, commission_rate: parsedRate })
          .select('*');

        if (insertError) throw insertError;
        if (!data || data.length === 0) throw new Error('No data returned from insert.');
        onSave(data[0] as AgentItemRate);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Set Rate — {item.name}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {item.default_rate != null
            ? `Default rate: Rs. ${item.default_rate.toFixed(2)}`
            : 'No default rate'}
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 border border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Custom Rate (Rs. per unit) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="e.g. 3.50"
              min="0"
              step="0.01"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
