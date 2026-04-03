'use client'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#100b1f] flex flex-col items-center justify-center text-center px-6">
      <div className="w-20 h-20 rounded-2xl mb-8 flex items-center justify-center"
        style={{ background: 'rgba(189,157,255,0.1)', border: '1px solid rgba(189,157,255,0.2)' }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#bd9dff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-[#ebe1fe] mb-3">You're offline</h1>
      <p className="text-[#afa7c2] text-sm max-w-xs mb-8">
        PayEase needs an internet connection to load your payroll data. Please check your connection and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 rounded-xl font-semibold text-sm text-[#100b1f] bg-[#bd9dff] hover:bg-[#d4b8ff] transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
