'use client'

import Link from 'next/link'
import { X, Zap } from 'lucide-react'
import { useState } from 'react'

export default function TrialBannerUI({ daysLeft }: { daysLeft: number | null }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div className="bg-[#1A1035] border-b border-[#7C3AED]/20 px-4 py-2 flex items-center justify-between gap-3 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <Zap className="h-3.5 w-3.5 text-primary-light flex-shrink-0" />
        <p className="text-xs text-text-muted truncate">
          You&apos;re on a free trial
          {daysLeft !== null ? ` — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left` : ''}.{' '}
          <Link href="/billing" className="text-primary-light font-medium hover:underline">
            Upgrade
          </Link>{' '}
          to unlock all features.
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-text-muted hover:text-text flex-shrink-0 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
