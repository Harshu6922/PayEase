'use client'

import { useState } from 'react'
import { Tag } from 'lucide-react'
import type { Employee, CommissionItem, AgentItemRate } from '@/types'
import SetRateModal from './SetRateModal'

interface Props {
  employee: Employee
  commissionItems: CommissionItem[]
  agentRates: AgentItemRate[]
}

const glassCard: React.CSSProperties = {
  background: 'rgba(28,22,46,0.6)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(189,157,255,0.1)',
}

export default function CommissionRatesSection({ employee, commissionItems, agentRates: initialRates }: Props) {
  const [rates, setRates] = useState<AgentItemRate[]>(initialRates)
  const [editingItem, setEditingItem] = useState<{ item: CommissionItem; existingRate: AgentItemRate | null } | null>(null)

  return (
    <section className="rounded-[20px] overflow-hidden" style={glassCard}>
      {/* Header */}
      <div className="flex items-center gap-4 px-8 py-6"
        style={{ borderBottom: '1px solid rgba(189,157,255,0.08)' }}>
        <div className="p-3 rounded-2xl" style={{ background: 'rgba(189,157,255,0.1)' }}>
          <Tag className="w-5 h-5" style={{ color: '#bd9dff' }} />
        </div>
        <div>
          <h3 className="font-bold text-xl" style={{ color: '#ebe1fe' }}>Commission Rates</h3>
          <p className="text-sm" style={{ color: '#afa7c2' }}>Custom rates override item defaults</p>
        </div>
      </div>

      {commissionItems.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm font-medium mb-1" style={{ color: '#afa7c2' }}>No commission items found.</p>
          <p className="text-xs" style={{ color: '#6b6483' }}>
            Add items in the{' '}
            <a href="/commission" className="underline" style={{ color: '#bd9dff' }}>Commission Items</a>{' '}
            page.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ background: 'rgba(189,157,255,0.04)' }}>
                {['Item Name', 'Default Rate', 'Custom Rate', 'Action'].map(h => (
                  <th key={h} className="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em]"
                    style={{ color: '#afa7c2' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {commissionItems.map(item => {
                const existingRate = rates.find(r => r.item_id === item.id) ?? null
                return (
                  <tr
                    key={item.id}
                    style={{ borderBottom: '1px solid rgba(189,157,255,0.06)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(47,39,71,0.2)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                  >
                    <td className="px-8 py-5 text-sm font-medium" style={{ color: '#ebe1fe' }}>{item.name}</td>
                    <td className="px-8 py-5 text-sm" style={{ color: '#afa7c2' }}>
                      {item.default_rate != null ? (
                        <span className="font-mono" style={{ color: '#D4A847' }}>₹{item.default_rate.toFixed(2)}</span>
                      ) : '—'}
                    </td>
                    <td className="px-8 py-5 text-sm">
                      {existingRate != null ? (
                        <span className="font-mono font-bold" style={{ color: '#bd9dff' }}>₹{existingRate.commission_rate.toFixed(2)}</span>
                      ) : (
                        <span className="italic text-xs" style={{ color: '#6b6483' }}>Not set</span>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      <button
                        onClick={() => setEditingItem({ item, existingRate })}
                        className="text-sm font-semibold transition-colors hover:opacity-80"
                        style={{ color: '#bd9dff' }}
                      >
                        {existingRate != null ? 'Edit Rate' : 'Set Rate'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {editingItem && (
        <SetRateModal
          item={editingItem.item}
          existingRate={editingItem.existingRate}
          employeeId={employee.id}
          onSave={saved => {
            setRates(prev => {
              const exists = prev.find(r => r.id === saved.id)
              if (exists) return prev.map(r => r.id === saved.id ? saved : r)
              return [...prev, saved]
            })
            setEditingItem(null)
          }}
          onClose={() => setEditingItem(null)}
        />
      )}
    </section>
  )
}
