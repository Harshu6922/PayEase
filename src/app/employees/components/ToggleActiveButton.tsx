'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-xs font-medium px-2 py-1 rounded transition-colors disabled:opacity-50 ${
        isActive
          ? 'text-red-600 hover:bg-red-50'
          : 'text-green-600 hover:bg-green-50'
      }`}
    >
      {loading ? '…' : isActive ? 'Deactivate' : 'Reactivate'}
    </button>
  )
}
