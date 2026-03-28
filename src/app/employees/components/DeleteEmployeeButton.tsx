'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function DeleteEmployeeButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const supabase = createClient() as any
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.from('employees').delete().eq('id', id)
    if (err) {
      setError(err.message)
      setLoading(false)
      setConfirming(false)
      return
    }
    router.refresh()
  }

  return (
    <div className="relative">
      {confirming && (
        <>
          {/* Backdrop to close on outside click */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => { setConfirming(false); setError(null) }}
          />
          {/* Inline confirmation panel floating above the button */}
          <div
            className="absolute bottom-full mb-2 right-0 z-50 rounded-xl p-4 shadow-xl"
            style={{
              background: 'rgba(22,17,38,0.97)',
              border: '1px solid rgba(255,110,132,0.3)',
              minWidth: '200px',
            }}
          >
            {error && (
              <p className="text-xs mb-2" style={{ color: '#ff6e84' }}>{error}</p>
            )}
            <p className="text-sm mb-3" style={{ color: '#ebe1fe' }}>
              Delete &quot;{name}&quot;?
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setConfirming(false); setError(null) }}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                style={{
                  border: '1px solid rgba(189,157,255,0.15)',
                  color: '#afa7c2',
                  background: 'transparent',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                style={{
                  background: 'rgba(255,110,132,0.15)',
                  border: '1px solid rgba(255,110,132,0.3)',
                  color: '#ff6e84',
                }}
              >
                {loading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </>
      )}

      <button
        onClick={() => setConfirming(true)}
        className="p-2 rounded-lg border transition-all"
        style={{
          color: 'rgba(255,110,132,0.6)',
          borderColor: 'rgba(255,110,132,0.15)',
          background: 'transparent',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,110,132,0.1)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
        }}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
