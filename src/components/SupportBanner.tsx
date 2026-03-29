'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'

export default function SupportBanner() {
  const [companyName, setCompanyName] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const val = sessionStorage.getItem('support_mode')
    if (val) setCompanyName(val)
  }, [])

  if (!companyName) return null

  async function exit() {
    sessionStorage.removeItem('support_mode')
    const supabase = createClient() as any
    await supabase.auth.signOut()
    router.push('/super-admin')
  }

  return (
    <div className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold z-50"
      style={{ background: '#D97706', color: '#000' }}>
      <div className="flex items-center gap-2">
        <ShieldAlert size={14} />
        Support Mode — acting as <span className="font-bold ml-1">{companyName}</span>
      </div>
      <button
        onClick={exit}
        className="px-3 py-1 rounded-lg font-bold text-xs transition-colors"
        style={{ background: 'rgba(0,0,0,0.2)' }}
      >
        Exit Support Mode
      </button>
    </div>
  )
}
