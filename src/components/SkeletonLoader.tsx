'use client'

/** Shimmer pulse skeleton block */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[#1c162e] ${className}`}
      style={{ backgroundImage: 'linear-gradient(90deg, #1c162e 25%, #261e3e 50%, #1c162e 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }}
    />
  )
}

export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[#100b1f] p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      {/* Cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      {/* Table */}
      <Skeleton className="h-10 rounded-xl mb-3" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-14 rounded-xl mb-2" />
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="min-h-screen bg-[#100b1f] p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>
      <Skeleton className="h-11 rounded-xl mb-3" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-xl mb-2" />
      ))}
    </div>
  )
}
