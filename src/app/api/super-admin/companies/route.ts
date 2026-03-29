import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function authCheck(req: NextRequest) {
  const secret = req.headers.get('x-super-admin-secret')
  return secret === process.env.SUPER_ADMIN_SECRET
}

export async function GET(req: NextRequest) {
  if (!authCheck(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  ) as any

  // Get all companies with their subscription and employee count
  const { data: companies } = await db.from('companies').select('id, name, created_at')
  if (!companies) return NextResponse.json({ companies: [] })

  const results = await Promise.all(companies.map(async (company: any) => {
    const [{ data: sub }, { count: empCount }, { data: adminProfile }] = await Promise.all([
      db.from('subscriptions').select('status, plan, trial_ends_at').eq('company_id', company.id).maybeSingle(),
      db.from('employees').select('*', { count: 'exact', head: true }).eq('company_id', company.id).eq('is_active', true),
      db.from('profiles').select('id').eq('company_id', company.id).eq('role', 'admin').maybeSingle(),
    ])

    let adminEmail = null
    if (adminProfile?.id) {
      const { data: authUser } = await db.auth.admin.getUserById(adminProfile.id)
      adminEmail = authUser?.user?.email ?? null
    }

    const trialDaysLeft = sub?.status === 'trial' && sub?.trial_ends_at
      ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / 86400000))
      : null

    return {
      id: company.id,
      name: company.name,
      created_at: company.created_at,
      adminEmail,
      adminUserId: adminProfile?.id ?? null,
      status: sub?.status ?? 'no subscription',
      plan: sub?.plan ?? null,
      trialDaysLeft,
      employeeCount: empCount ?? 0,
    }
  }))

  results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json({ companies: results })
}
