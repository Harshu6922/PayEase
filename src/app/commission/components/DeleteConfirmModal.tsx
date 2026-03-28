'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'

interface Props {
  itemName: string
  error?: string | null
  onConfirm: () => Promise<void>
  onClose: () => void
}

const glassModal: React.CSSProperties = {
  background: 'rgba(22,17,38,0.95)',
  backdropFilter: 'blur(32px)',
  WebkitBackdropFilter: 'blur(32px)',
  border: '1px solid rgba(189,157,255,0.15)',
}

export default function DeleteConfirmModal({ itemName, error, onConfirm, onClose }: Props) {
  const [deleting, setDeleting] = useState(false)

  const handleConfirm = async () => {
    setDeleting(true)
    try { await onConfirm() } finally { setDeleting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />
      <motion.div
        className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={glassModal}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,110,132,0.12)' }}>
              <AlertTriangle className="w-4 h-4" style={{ color: '#ff6e84' }} />
            </div>
            <h2 className="text-base font-bold" style={{ color: '#ebe1fe' }}>Confirm Delete</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: '#afa7c2' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm mb-2" style={{ color: '#afa7c2' }}>
          Are you sure you want to delete{' '}
          <span className="font-semibold" style={{ color: '#ebe1fe' }}>&apos;{itemName}&apos;</span>?
          This cannot be undone.
        </p>

        {error && (
          <p className="text-sm mt-3 mb-1" style={{ color: '#ff6e84' }}>{error}</p>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            style={{ border: '1px solid rgba(189,157,255,0.15)', color: '#afa7c2' }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
            style={{ background: 'rgba(255,110,132,0.15)', border: '1px solid rgba(255,110,132,0.3)', color: '#ff6e84' }}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
