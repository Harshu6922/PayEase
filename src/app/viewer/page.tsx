import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Lock } from 'lucide-react'

export default async function ViewerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('company_id, role, full_name').eq('id', user.id).maybeSingle()
  const companyId = (profileData as any)?.company_id
  if (!companyId) redirect('/login')

  const { data: companyData } = await supabase
    .from('companies').select('name').eq('id', companyId).maybeSingle()
  const companyName = (companyData as any)?.name ?? 'Your Company'

  return (
    <div className="min-h-screen bg-background">
      {/* View-only banner */}
      <div className="bg-warning/10 border-b border-warning/30 px-4 py-2.5 flex items-center gap-2">
        <Lock className="h-3.5 w-3.5 text-warning flex-shrink-0" />
        <p className="text-xs text-warning font-medium">View Only — You have read-only access to {companyName}</p>
      </div>
      {/* Content */}
      <div className="px-4 md:px-6 py-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <p className="text-text-muted text-sm">{companyName}</p>
          <h1 className="text-text font-bold text-2xl mt-1">Viewer Dashboard</h1>
        </div>
        <div className="backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-xl p-8 text-center">
          <Lock className="h-8 w-8 text-text-muted mx-auto mb-3" />
          <p className="text-text font-semibold">Read-only access</p>
          <p className="text-text-muted text-sm mt-1">You can view payroll data but cannot make changes.</p>
        </div>
        <p className="text-center text-xs text-text-muted mt-8">Powered by PayEase</p>
      </div>
    </div>
  )
}
