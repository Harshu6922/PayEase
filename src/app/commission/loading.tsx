export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0F0A1E] p-6 md:p-8">
      <div className="h-8 w-40 bg-white/5 rounded-xl animate-pulse mb-8" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}
