import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profileData } = await supabase
    .from('profiles').select('company_id, role').eq('id', user.id).maybeSingle()
  const companyId = (profileData as any)?.company_id
  const userRole = (profileData as any)?.role ?? 'viewer'
  if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const [{ data: employees }, { data: subData }] = await Promise.all([
    supabase.from('employees').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
    supabase.from('subscriptions').select('plan, razorpay_subscription_id').eq('company_id', companyId).maybeSingle(),
  ])

  return NextResponse.json({ employees: employees ?? [], userRole, subscription: subData })
}
