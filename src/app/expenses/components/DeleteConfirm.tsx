'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

export default function DeleteConfirm({ description, onConfirm, onClose }: {
  description: string
  onConfirm: () => Promise<void>
  onClose: () => void
}) {
  const [deleting, setDeleting] = useState(false)

  const handle = async () => {
    setDeleting(true)
    await onConfirm()
    setDeleting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />
      <motion.div
        className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      >
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Delete Expense</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Delete <span className="font-medium text-gray-700">&quot;{description}&quot;</span>? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={deleting}
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            Cancel
          </button>
          <button onClick={handle} disabled={deleting}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition-colors">
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
