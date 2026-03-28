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
    <div className="flex flex-col min-h-screen bg-background">
      {/* Trial countdown banner */}
      {daysLeftInTrial !== null && daysLeftInTrial !== undefined && daysLeftInTrial <= 3 && (
        <div className="bg-warning/10 border-b border-warning/30 px-4 py-2 flex items-center justify-between text-xs text-warning">
          <span>
            Your free trial ends in{' '}
            <strong>{daysLeftInTrial} day{daysLeftInTrial !== 1 ? 's' : ''}</strong>.
          </span>
          <a
            href="/billing"
            className="font-semibold underline underline-offset-2 hover:opacity-80 ml-4 transition-opacity"
          >
            Subscribe now →
          </a>
        </div>
      )}

      {/* Header band */}
      <div className="px-4 md:px-6 pt-6 pb-5 flex-shrink-0 border-b border-[#7C3AED]/10">
        <div className="flex items-end justify-between gap-4">
          <div>
            {subtitle && (
              <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-1">
                {subtitle}
              </p>
            )}
            <h1 className="text-text font-bold text-2xl md:text-3xl">
              {title}
            </h1>
          </div>
          {actions && <div className="flex items-center gap-3 mb-1">{actions}</div>}
        </div>
      </div>

      {/* Page body */}
      <div className="flex-1 px-4 md:px-6 py-6">
        {children}
      </div>
    </div>
  )
}
