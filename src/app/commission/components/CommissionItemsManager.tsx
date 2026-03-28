'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Pencil, Trash2, Tag, Plus } from 'lucide-react'
import type { CommissionItem } from '@/types'
import { createClient } from '@/lib/supabase/client'
import CommissionItemModal from './CommissionItemModal'
import DeleteConfirmModal from './DeleteConfirmModal'
import { staggerContainer, fadeInUp } from '@/lib/animations'

interface Props {
  items: CommissionItem[]
  companyId: string
  userRole?: 'admin' | 'viewer'
}

const glassCard: React.CSSProperties = {
  background: 'rgba(28,22,46,0.6)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(189,157,255,0.1)',
}

const formatRs = (n: number) =>
  '₹' + n.toFixed(2)

export default function CommissionItemsManager({ items: initialItems, companyId, userRole = 'admin' }: Props) {
  const [items, setItems] = useState<CommissionItem[]>(initialItems)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CommissionItem | null>(null)
  const [deleteItem, setDeleteItem] = useState<CommissionItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const avgRate = items.length
    ? items.filter(i => i.default_rate != null).reduce((s, i) => s + (i.default_rate ?? 0), 0) /
      (items.filter(i => i.default_rate != null).length || 1)
    : 0

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F0A1E' }}>
      {/* Ambient glow */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none -z-10"
        style={{ background: 'radial-gradient(circle, rgba(189,157,255,0.12) 0%, transparent 70%)' }} />

      <motion.div
        className="max-w-4xl mx-auto px-6 py-10 md:py-16"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {/* Header */}
        <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <h1 className="font-extrabold text-4xl md:text-5xl tracking-tight mb-2" style={{ color: '#ebe1fe' }}>
              Commission Items
            </h1>
            <p style={{ color: '#afa7c2' }} className="text-lg">Define piece-rate items for commission workers</p>
          </div>
          {userRole === 'admin' && (
            <button
              onClick={() => { setEditingItem(null); setIsModalOpen(true) }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: 'rgba(189,157,255,0.12)',
                border: '1px solid rgba(189,157,255,0.3)',
                color: '#bd9dff',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(189,157,255,0.22)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(189,157,255,0.12)' }}
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          )}
        </motion.div>

        {/* Stat Cards */}
        <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-12">
          {/* Total Items */}
          <div className="md:col-span-4 p-8 rounded-2xl relative overflow-hidden" style={glassCard}>
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full pointer-events-none"
              style={{ background: 'rgba(189,157,255,0.06)', filter: 'blur(20px)' }} />
            <p className="text-sm font-medium uppercase tracking-widest mb-4" style={{ color: '#afa7c2' }}>Total Items</p>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black" style={{ color: '#bd9dff' }}>
                {String(items.length).padStart(2, '0')}
              </span>
              <span className="font-medium" style={{ color: '#afa7c2' }}>items</span>
            </div>
          </div>

          {/* Avg Rate */}
          <div className="md:col-span-8 p-8 rounded-2xl relative overflow-hidden" style={glassCard}>
            <div className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full pointer-events-none"
              style={{ background: 'rgba(212,168,71,0.06)', filter: 'blur(30px)' }} />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium uppercase tracking-widest mb-4" style={{ color: '#afa7c2' }}>Avg. Rate per Piece</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black" style={{ color: '#D4A847' }}>
                    {items.filter(i => i.default_rate != null).length ? formatRs(avgRate) : '—'}
                  </span>
                  {items.filter(i => i.default_rate != null).length > 0 && (
                    <span className="text-xl font-medium" style={{ color: '#afa7c2' }}>/ avg</span>
                  )}
                </div>
              </div>
              <div className="p-4 rounded-2xl" style={{ background: 'rgba(212,168,71,0.1)' }}>
                <svg className="w-8 h-8" fill="none" stroke="#D4A847" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>

        {/* List header */}
        <motion.div variants={fadeInUp} className="flex items-center justify-between mb-6 px-1">
          <h3 className="text-xl font-bold" style={{ color: '#ebe1fe' }}>Active Commission Rates</h3>
          <span className="text-sm" style={{ color: '#afa7c2' }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
        </motion.div>

        {/* Items */}
        {items.length === 0 ? (
          <motion.div variants={fadeInUp} className="py-20 text-center rounded-2xl" style={glassCard}>
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(189,157,255,0.08)' }}>
              <Tag className="w-7 h-7" style={{ color: '#bd9dff' }} />
            </div>
            <p className="font-medium mb-1" style={{ color: '#afa7c2' }}>No commission items yet</p>
            <p className="text-sm mb-6" style={{ color: '#6b6483' }}>Items define what workers earn per piece</p>
            {userRole === 'admin' && (
              <button
                onClick={() => { setEditingItem(null); setIsModalOpen(true) }}
                className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: 'rgba(189,157,255,0.15)', border: '1px solid rgba(189,157,255,0.3)', color: '#bd9dff' }}
              >
                Add your first item
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            className="flex flex-col gap-4"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            {items.map(item => (
              <motion.div
                key={item.id}
                variants={fadeInUp}
                className="p-5 rounded-[14px] flex items-center justify-between group transition-all duration-300"
                style={glassCard}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(28,22,46,0.9)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(28,22,46,0.6)' }}
              >
                {/* Left: icon + name */}
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(189,157,255,0.1)' }}>
                    <Tag className="w-5 h-5" style={{ color: '#bd9dff' }} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold" style={{ color: '#ebe1fe' }}>{item.name}</h4>
                    <p className="text-xs" style={{ color: '#afa7c2' }}>Commission item</p>
                  </div>
                </div>

                {/* Right: rate + actions */}
                <div className="flex items-center gap-6">
                  <div className="px-4 py-2 rounded-full"
                    style={{ background: 'rgba(212,168,71,0.1)', border: '1px solid rgba(212,168,71,0.2)' }}>
                    <span className="font-mono font-bold tracking-tight" style={{ color: '#D4A847' }}>
                      {item.default_rate != null ? `${formatRs(item.default_rate)} / piece` : '— / piece'}
                    </span>
                  </div>

                  {userRole === 'admin' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditingItem(item); setIsModalOpen(true) }}
                        className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors"
                        style={{ color: '#bd9dff' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(189,157,255,0.1)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteItem(item)}
                        className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors"
                        style={{ color: '#ff6e84' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,110,132,0.1)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Modals */}
      {isModalOpen && (
        <CommissionItemModal
          item={editingItem}
          companyId={companyId}
          onSave={(saved) => {
            if (editingItem) {
              setItems(prev => prev.map(i => i.id === saved.id ? saved : i))
            } else {
              setItems(prev => [...prev, saved])
            }
            setIsModalOpen(false)
          }}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {deleteItem && (
        <DeleteConfirmModal
          itemName={deleteItem.name}
          error={deleteError}
          onConfirm={async () => {
            const supabase = createClient()
            const { error } = await supabase.from('commission_items').delete().eq('id', deleteItem.id)
            if (error) { setDeleteError('Failed to delete item. It may be in use.'); return }
            setItems(prev => prev.filter(i => i.id !== deleteItem.id))
            setDeleteItem(null)
            setDeleteError(null)
          }}
          onClose={() => { setDeleteItem(null); setDeleteError(null) }}
        />
      )}
    </div>
  )
}
