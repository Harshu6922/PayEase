'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function DeleteEmployeeButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const supabase = createClient() as any
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  function openConfirm() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.top + window.scrollY, right: window.innerWidth - r.right })
    }
    setConfirming(true)
    setError(null)
  }

  useEffect(() => {
    if (!confirming) return
    function handleScroll() { setConfirming(false) }
    window.addEventListener('scroll', handleScroll, true)
    return () => window.removeEventListener('scroll', handleScroll, true)
  }, [confirming])

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

  const panel = confirming ? (
    <>
      <div className="fixed inset-0 z-[9998]" onClick={() => { setConfirming(false); setError(null) }} />
      <div
        style={{
          position: 'absolute',
          top: pos.top - 8,
          right: pos.right,
          transform: 'translateY(-100%)',
          zIndex: 9999,
          background: 'rgba(22,17,38,0.98)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,110,132,0.3)',
          borderRadius: 12,
          padding: 16,
          minWidth: 200,
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        {error && <p className="text-xs mb-2" style={{ color: '#ff6e84' }}>{error}</p>}
        <p className="text-sm mb-3" style={{ color: '#ebe1fe' }}>
          Delete &quot;{name}&quot;?
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setConfirming(false); setError(null) }}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
            style={{ border: '1px solid rgba(189,157,255,0.15)', color: '#afa7c2', background: 'transparent' }}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
            style={{ background: 'rgba(255,110,132,0.15)', border: '1px solid rgba(255,110,132,0.3)', color: '#ff6e84' }}
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </>
  ) : null

  return (
    <>
      <button
        ref={btnRef}
        onClick={openConfirm}
        className="p-2 rounded-lg border transition-all"
        style={{ color: 'rgba(255,110,132,0.6)', borderColor: 'rgba(255,110,132,0.15)', background: 'transparent' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,110,132,0.1)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
      >
        <Trash2 className="w-4 h-4" />
      </button>
      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : null}
    </>
  )
}
