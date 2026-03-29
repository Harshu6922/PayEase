import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0F0A1E' }}>
      <div className="text-center">
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 text-5xl font-black"
          style={{
            background: 'rgba(189,157,255,0.08)',
            border: '1px solid rgba(189,157,255,0.15)',
            color: '#bd9dff',
          }}
        >
          404
        </div>
        <h1 className="text-3xl font-extrabold mb-3" style={{ color: '#ebe1fe' }}>Page not found</h1>
        <p className="text-sm mb-8 max-w-xs mx-auto" style={{ color: '#afa7c2' }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all"
          style={{ background: '#bd9dff', color: '#0F0A1E' }}
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
