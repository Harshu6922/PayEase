'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { CommissionItem } from '@/types';

interface CommissionItemModalProps {
  item: CommissionItem | null;
  companyId: string;
  onSave: (item: CommissionItem) => void;
  onClose: () => void;
}

export default function CommissionItemModal({ item, companyId, onSave, onClose }: CommissionItemModalProps) {
  const [name, setName] = useState('');
  const [defaultRate, setDefaultRate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(item?.name ?? '');
    setDefaultRate(item?.default_rate?.toString() ?? '');
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Item name is required.');
      return;
    }

    let parsedRate: number | null = null;
    if (defaultRate.trim() !== '') {
      const val = parseFloat(defaultRate);
      if (isNaN(val) || val < 0) {
        setError('Default rate must be a valid non-negative number.');
        return;
      }
      parsedRate = val;
    }

    setSaving(true);
    try {
      const supabase = createClient() as unknown as SupabaseClient<Database>;

      if (item) {
        // Update existing
        const { data, error: updateError } = await supabase
          .from('commission_items')
          .update({ name: name.trim(), default_rate: parsedRate })
          .eq('id', item.id)
          .select('*')
          .single();

        if (updateError) throw updateError;
        onSave(data as CommissionItem);
      } else {
        // Insert new
        const { data, error: insertError } = await supabase
          .from('commission_items')
          .insert({ company_id: companyId, name: name.trim(), default_rate: parsedRate })
          .select('*');

        if (insertError) throw insertError;
        if (!data || data.length === 0) throw new Error('No data returned from insert.');
        onSave(data[0] as CommissionItem);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />
      <motion.div
        className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {item ? 'Edit Commission Item' : 'Add Commission Item'}
        </h2>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 border border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Stitching"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Default Rate (optional)
            </label>
            <input
              type="number"
              value={defaultRate}
              onChange={(e) => setDefaultRate(e.target.value)}
              placeholder="e.g. 2.50"
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
      </motion.div>
    </div>
  );
}
