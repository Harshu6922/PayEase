import { NextRequest, NextResponse } from 'next/server'
import { runNightlySnapshots } from '@/lib/snapshot'
import { verifyBearer } from '@/lib/security'

export async function GET(req: NextRequest) {
  if (!verifyBearer(req.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await runNightlySnapshots()
  return NextResponse.json(result)
}
