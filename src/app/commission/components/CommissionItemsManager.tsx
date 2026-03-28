'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
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
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <div className="px-4 md:px-6 pt-6 pb-4 border-b border-[#7C3AED]/10 flex items-center justify-between">
        <h1 className="text-text font-bold text-xl">Commission Items</h1>
        {userRole === 'admin' && (
          <button
            onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
            className="bg-primary text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-primary/80 transition-colors"
          >
            + Add Item
          </button>
        )}
      </div>

      {/* Item list */}
      <div className="space-y-2 px-4 md:px-6 py-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-text-muted font-medium text-lg">No commission items yet</p>
            <p className="text-text-muted text-sm mt-1 opacity-60">Commission items define what workers earn per piece.</p>
            {userRole === 'admin' && (
              <button
                onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
                className="mt-6 bg-primary text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-primary/80 transition-colors"
              >
                Add your first item
              </button>
            )}
          </div>
        ) : (
          items.map(item => (
            <div
              key={item.id}
              className="backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-xl px-4 py-3 flex items-center gap-4"
            >
              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-text font-medium truncate">{item.name}</p>
              </div>

              {/* Rate */}
              <span className="font-mono text-rupee-gold text-sm font-semibold flex-shrink-0">
                {item.default_rate != null ? `Rs. ${item.default_rate.toFixed(2)}` : '—'}
              </span>

              {/* Actions */}
              {userRole === 'admin' && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                    className="text-xs text-primary-light hover:text-text transition-colors font-medium px-2 py-1"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteItem(item)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-danger transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

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
  );
}
