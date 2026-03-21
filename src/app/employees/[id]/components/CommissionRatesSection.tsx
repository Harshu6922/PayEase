'use client';

import { useState } from 'react';
import type { Employee, CommissionItem, AgentItemRate } from '@/types';
import SetRateModal from './SetRateModal';

interface CommissionRatesSectionProps {
  employee: Employee;
  commissionItems: CommissionItem[];
  agentRates: AgentItemRate[];
}

export default function CommissionRatesSection({
  employee,
  commissionItems,
  agentRates: initialRates,
}: CommissionRatesSectionProps) {
  const [rates, setRates] = useState<AgentItemRate[]>(initialRates);
  const [editingItem, setEditingItem] = useState<{
    item: CommissionItem;
    existingRate: AgentItemRate | null;
  } | null>(null);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Commission Rates</h2>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Default Rate</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Custom Rate</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white">
            {commissionItems.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                  No commission items found. Add items in the Commission Items page.
                </td>
              </tr>
            ) : (
              commissionItems.map((item) => {
                const existingRate = rates.find((r) => r.item_id === item.id) ?? null;
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {item.default_rate != null ? `Rs. ${item.default_rate.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {existingRate != null
                        ? `Rs. ${existingRate.commission_rate.toFixed(2)}`
                        : <span className="text-gray-400 italic">Not set</span>}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => setEditingItem({ item, existingRate })}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {existingRate != null ? 'Edit Rate' : 'Set Rate'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {editingItem && (
        <SetRateModal
          item={editingItem.item}
          existingRate={editingItem.existingRate}
          employeeId={employee.id}
          onSave={(saved) => {
            setRates((prev) => {
              const exists = prev.find((r) => r.id === saved.id);
              if (exists) return prev.map((r) => (r.id === saved.id ? saved : r));
              return [...prev, saved];
            });
            setEditingItem(null);
          }}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}
