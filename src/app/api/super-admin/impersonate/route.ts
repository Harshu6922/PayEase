import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-super-admin-secret')
  if (secret !== process.env.SUPER_ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { admin_user_id } = await req.json()
  if (!admin_user_id) return NextResponse.json({ error: 'Missing admin_user_id' }, { status: 400 })

  const db = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  ) as any

  const { data: authUser } = await db.auth.admin.getUserById(admin_user_id)
  if (!authUser?.user?.email) {
    return NextResponse.json({ error: 'Admin user not found' }, { status: 404 })
  }

  const origin = req.headers.get('origin') ?? ''
  const { data, error } = await db.auth.admin.generateLink({
    type: 'magiclink',
    email: authUser.user.email,
    options: { redirectTo: `${origin}/dashboard` },
  })

  if (error || !data?.properties?.action_link) {
    return NextResponse.json({ error: error?.message ?? 'Failed to generate link' }, { status: 500 })
  }

  return NextResponse.json({ magic_link: data.properties.action_link })
}
