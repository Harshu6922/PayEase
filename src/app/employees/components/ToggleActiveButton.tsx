'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Power } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ToggleActiveButton({ id, isActive }: { id: string; isActive: boolean }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient() as unknown as any

  const toggle = async () => {
    setLoading(true)
    await supabase.from('employees').update({ is_active: !isActive }).eq('id', id)
    router.refresh()
    setLoading(false)
  }

  return isActive ? (
    <button
      onClick={toggle}
      disabled={loading}
      title="Deactivate"
      className="p-2 rounded-lg border transition-all disabled:opacity-50"
      style={{
        color: 'rgba(255,110,132,0.7)',
        borderColor: 'rgba(255,110,132,0.2)',
        background: 'transparent',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,110,132,0.1)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
      }}
    >
      <Power className="w-4 h-4" />
    </button>
  ) : (
    <button
      onClick={toggle}
      disabled={loading}
      title="Reactivate"
      className="p-2 rounded-lg border transition-all disabled:opacity-50"
      style={{
        color: 'rgba(16,185,129,0.7)',
        borderColor: 'rgba(16,185,129,0.2)',
        background: 'transparent',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.1)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
      }}
    >
      <Power className="w-4 h-4" />
    </button>
  )
}
