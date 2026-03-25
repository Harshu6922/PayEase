import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function filterByRole(data: any, role: string) {
  if (role === 'ca') return data
  if (role === 'manager') {
    const { compliance: _c, ...rest } = data
    return rest
  }
  // partner: payroll + employees only
  const { attendance: _a, compliance: _c2, ...rest } = data
  return rest
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) as any

  const { data: session } = await db.from('viewer_sessions')
    .select('company_id, role, token_expires_at')
    .eq('token', token)
    .maybeSingle()

  if (!session || new Date(session.token_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  const { data: snapshot } = await db.from('business_snapshots')
    .select('data, generated_at')
    .eq('company_id', session.company_id)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!snapshot) return NextResponse.json({ error: 'No snapshot available yet' }, { status: 404 })

  return NextResponse.json({
    role: session.role,
    last_updated: snapshot.generated_at,
    data: filterByRole(snapshot.data, session.role),
  })
}
