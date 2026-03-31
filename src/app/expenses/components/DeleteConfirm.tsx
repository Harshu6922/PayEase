'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
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

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <motion.div
        className="fixed inset-0"
        style={{ background: 'rgba(10,7,20,0.7)', backdropFilter: 'blur(6px)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        style={{
          position: 'relative', width: '100%', maxWidth: 360,
          background: 'rgba(22,17,38,0.97)',
          backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(255,110,132,0.2)',
          borderRadius: 20, boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          padding: '24px',
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#ebe1fe', margin: '0 0 8px' }}>
          Delete Expense
        </h2>
        <p style={{ fontSize: 13, color: '#afa7c2', margin: '0 0 20px', lineHeight: 1.5 }}>
          Delete{' '}
          <span style={{ color: '#ebe1fe', fontWeight: 600 }}>&quot;{description}&quot;</span>?
          {' '}This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} disabled={deleting}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 600,
              color: '#afa7c2', background: 'transparent',
              border: '1px solid rgba(189,157,255,0.15)', cursor: 'pointer', opacity: deleting ? 0.5 : 1,
            }}>
            Cancel
          </button>
          <button onClick={handle} disabled={deleting}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 700,
              color: '#ff6e84', background: 'rgba(255,110,132,0.12)',
              border: '1px solid rgba(255,110,132,0.25)', cursor: 'pointer', opacity: deleting ? 0.6 : 1,
            }}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null
}
