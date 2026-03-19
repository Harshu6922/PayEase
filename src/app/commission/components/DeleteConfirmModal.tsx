'use client';

import { useState } from 'react';

interface DeleteConfirmModalProps {
  itemName: string;
  error?: string | null;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export default function DeleteConfirmModal({ itemName, error, onConfirm, onClose }: DeleteConfirmModalProps) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Confirm Delete</h2>
        <p className="text-gray-600 mb-4">
          Are you sure you want to delete &apos;{itemName}&apos;? This cannot be undone.
        </p>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
