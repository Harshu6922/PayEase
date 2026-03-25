import { NextRequest, NextResponse } from 'next/server'
import { runNightlySnapshots } from '@/lib/snapshot'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await runNightlySnapshots()
  return NextResponse.json(result)
}
