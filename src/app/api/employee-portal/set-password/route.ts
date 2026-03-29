import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { hashPassword } from '@/lib/viewer-auth'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('company_id, role').eq('id', user.id).maybeSingle()
  if ((profile as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Admins only' }, { status: 403 })
  }
  const companyId = (profile as any).company_id

  const { employee_uuid, password } = await req.json()
  if (!employee_uuid || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (password.length < 4) {
    return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 })
  }

  const db = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  ) as any

  // Verify employee belongs to this company
  const { data: emp } = await db
    .from('employees').select('id').eq('id', employee_uuid).eq('company_id', companyId).maybeSingle()
  if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

  const { error } = await db
    .from('employees')
    .update({ portal_password_hash: hashPassword(password) })
    .eq('id', employee_uuid)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
