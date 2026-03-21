import React from 'react'

interface PageShellProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
  daysLeftInTrial?: number | null
}

export default function PageShell({ title, subtitle, actions, children, daysLeftInTrial }: PageShellProps) {
  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#F7F6F3' }}>
      {/* Trial countdown banner */}
      {daysLeftInTrial !== null && daysLeftInTrial !== undefined && daysLeftInTrial <= 3 && (
        <div className="bg-amber-50 border-b border-amber-200 px-8 py-2.5 flex items-center justify-between text-sm text-amber-800">
          <span>
            ⚠️ Your free trial ends in{' '}
            <strong>{daysLeftInTrial} day{daysLeftInTrial !== 1 ? 's' : ''}</strong>.
          </span>
          <a
            href="/billing"
            className="font-semibold underline underline-offset-2 hover:text-amber-900 ml-4"
          >
            Subscribe now →
          </a>
        </div>
      )}

      {/* Dark header band */}
      <div className="px-8 pt-8 pb-7 flex-shrink-0" style={{ backgroundColor: '#1C2333' }}>
        <div className="flex items-end justify-between gap-4">
          <div>
            {subtitle && (
              <p className="text-xs font-semibold uppercase mb-1.5" style={{ color: '#6B7A99', letterSpacing: '0.1em' }}>
                {subtitle}
              </p>
            )}
            <h1 className="font-display text-4xl font-extrabold text-white" style={{ letterSpacing: '-0.5px' }}>
              {title}
            </h1>
          </div>
          {actions && <div className="flex items-center gap-3 mb-1">{actions}</div>}
        </div>
      </div>

      {/* Page body */}
      <div className="flex-1 px-8 py-6">
        {children}
      </div>
    </div>
  )
}
