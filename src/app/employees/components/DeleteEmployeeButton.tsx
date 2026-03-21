'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2">
        {error && <span className="text-xs text-red-600">{error}</span>}
        <span className="text-xs text-gray-500">Delete &quot;{name}&quot;?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
        >
          {loading ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button
          onClick={() => { setConfirming(false); setError(null) }}
          disabled={loading}
          className="text-xs font-semibold text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="ml-3 text-red-500 hover:text-red-700 font-medium text-sm"
    >
      Delete
    </button>
  )
}
