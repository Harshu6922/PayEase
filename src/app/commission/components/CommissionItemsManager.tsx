'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CommissionItem } from '@/types';
import CommissionItemModal from './CommissionItemModal';
import DeleteConfirmModal from './DeleteConfirmModal';

interface CommissionItemsManagerProps {
  items: CommissionItem[];
  companyId: string;
  userRole?: 'admin' | 'viewer';
}

export default function CommissionItemsManager({ items: initialItems, companyId, userRole = 'admin' }: CommissionItemsManagerProps) {
  const [items, setItems] = useState<CommissionItem[]>(initialItems);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CommissionItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<CommissionItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  return (
    <div>
      {/* Header band */}
      <div className="px-8 pt-8 pb-7 flex items-end justify-between" style={{ backgroundColor: '#1C2333' }}>
        <div>
          <p className="text-xs font-semibold uppercase mb-1.5" style={{ color: '#6B7A99', letterSpacing: '0.1em' }}>Commission</p>
          <h1 className="font-display text-4xl font-extrabold text-white" style={{ letterSpacing: '-0.5px' }}>Commission Items</h1>
        </div>
        {userRole === 'admin' && (
          <button
            onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold mb-1 transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#D4A847', color: '#1C2333' }}
          >
            + Add Item
          </button>
        )}
      </div>
      <div className="px-8 py-6" style={{ backgroundColor: '#F7F6F3' }}>

      {items.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No commission items yet. Add your first item.</p>
      ) : (
        <table className="w-full border-collapse bg-white rounded-lg shadow">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4 text-gray-600 font-medium">Item Name</th>
              <th className="text-right p-4 text-gray-600 font-medium">Default Rate</th>
              <th className="text-right p-4 text-gray-600 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-4 font-medium text-gray-900">{item.name}</td>
                <td className="p-4 text-right text-gray-700">
                  {item.default_rate != null ? `Rs. ${item.default_rate.toFixed(2)}` : '—'}
                </td>
                {userRole === 'admin' && (
                  <td className="p-4 text-right">
                    <button
                      onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                      className="text-blue-600 hover:text-blue-800 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteItem(item)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isModalOpen && (
        <CommissionItemModal
          item={editingItem}
          companyId={companyId}
          onSave={(saved) => {
            if (editingItem) {
              setItems(prev => prev.map(i => i.id === saved.id ? saved : i));
            } else {
              setItems(prev => [...prev, saved]);
            }
            setIsModalOpen(false);
          }}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {deleteItem && (
        <DeleteConfirmModal
          itemName={deleteItem.name}
          error={deleteError}
          onConfirm={async () => {
            const supabase = createClient();
            const { error } = await supabase.from('commission_items').delete().eq('id', deleteItem.id);
            if (error) {
              setDeleteError('Failed to delete item. It may be in use.');
              return;
            }
            setItems(prev => prev.filter(i => i.id !== deleteItem.id));
            setDeleteItem(null);
            setDeleteError(null);
          }}
          onClose={() => { setDeleteItem(null); setDeleteError(null); }}
        />
      )}
      </div>
    </div>
  );
}
