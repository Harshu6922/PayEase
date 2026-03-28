import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// Runs daily at 12:30 UTC (6:00 PM IST)
// Sends WhatsApp template messages to employees with phone numbers

const adminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Format phone to E.164 for India (strips +, ensures 91 prefix)
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('91') && digits.length === 12) return digits
  if (digits.startsWith('0') && digits.length === 11) return '91' + digits.slice(1)
  if (digits.length === 10) return '91' + digits
  return digits
}

// Hours worked today from an attendance record
function hoursToday(att: any, stdHours: number): string {
  if (!att || att.status === 'Absent') return '0'
  if (att.time_in && att.time_out) {
    const [inH, inM] = att.time_in.split(':').map(Number)
    const [outH, outM] = att.time_out.split(':').map(Number)
    const hrs = ((outH * 60 + outM) - (inH * 60 + inM)) / 60
    return Math.max(0, hrs).toFixed(1)
  }
  if (att.status === 'Half Day') return (stdHours / 2).toFixed(1)
  return stdHours.toFixed(1)
}

async function sendWhatsApp(
  token: string,
  phoneNumberId: string,
  templateName: string,
  toPhone: string,
  params: string[]
) {
  const components = params.map((text, i) => ({
    type: 'text',
    text,
  }))

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: components,
            },
          ],
        },
      }),
    }
  )
  return res.ok
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]
  const monthStart = today.slice(0, 7) + '-01'

  // Get all companies with notifications enabled and credentials set
  const { data: configs } = await adminClient
    .from('notification_settings')
    .select('company_id, whatsapp_token, whatsapp_phone_number_id, template_name')
    .eq('enabled', true)
    .not('whatsapp_token', 'is', null)
    .not('whatsapp_phone_number_id', 'is', null)

  if (!configs || configs.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No companies with notifications enabled' })
  }

  let totalSent = 0
  let totalFailed = 0

  for (const config of configs) {
    const { company_id, whatsapp_token, whatsapp_phone_number_id, template_name } = config as any

    // Get company name
    const { data: company } = await adminClient
      .from('companies').select('name').eq('id', company_id).maybeSingle()
    const companyName = (company as any)?.name ?? 'Your Company'

    // Get active employees with phone numbers
    const { data: employees } = await adminClient
      .from('employees')
      .select('id, full_name, phone_number, worker_type, monthly_salary, daily_rate, standard_working_hours')
      .eq('company_id', company_id)
      .eq('is_active', true)
      .not('phone_number', 'is', null)

    if (!employees || employees.length === 0) continue

    for (const emp of employees) {
      const e = emp as any
      if (!e.phone_number) continue

      // Today's attendance
      const { data: todayAtt } = await adminClient
        .from('attendance')
        .select('status, time_in, time_out')
        .eq('employee_id', e.id)
        .eq('date', today)
        .maybeSingle()

      const hrs = hoursToday(todayAtt, e.standard_working_hours ?? 8)

      // This month's earnings
      let monthlyEarnings = 0

      if (e.worker_type === 'salaried') {
        const { data: monthAtt } = await adminClient
          .from('attendance')
          .select('status')
          .eq('employee_id', e.id)
          .gte('date', monthStart)
          .lte('date', today)
        const present = (monthAtt ?? []).filter(
          (a: any) => a.status === 'Present' || a.status === 'Half Day'
        )
        const days = present.reduce(
          (sum: number, a: any) => sum + (a.status === 'Half Day' ? 0.5 : 1), 0
        )
        const workingDaysInMonth = 26
        monthlyEarnings = Math.round((days / workingDaysInMonth) * (e.monthly_salary ?? 0))

      } else if (e.worker_type === 'daily') {
        const { data: monthAtt } = await adminClient
          .from('attendance')
          .select('status')
          .eq('employee_id', e.id)
          .gte('date', monthStart)
          .lte('date', today)
        const days = (monthAtt ?? []).filter(
          (a: any) => a.status === 'Present' || a.status === 'Half Day'
        ).reduce((sum: number, a: any) => sum + (a.status === 'Half Day' ? 0.5 : 1), 0)
        monthlyEarnings = Math.round(days * (e.daily_rate ?? 0))

      } else if (e.worker_type === 'commission') {
        const { data: entries } = await adminClient
          .from('work_entries')
          .select('total_amount')
          .eq('employee_id', e.id)
          .gte('date', monthStart)
          .lte('date', today)
        monthlyEarnings = (entries ?? []).reduce(
          (sum: number, en: any) => sum + Number(en.total_amount ?? 0), 0
        )
      }

      // Pending advance balance
      const { data: advances } = await adminClient
        .from('employee_advances')
        .select('amount')
        .eq('employee_id', e.id)
        .eq('is_repaid', false)
      const advanceBalance = (advances ?? []).reduce(
        (sum: number, a: any) => sum + Number(a.amount ?? 0), 0
      )

      // Send WhatsApp message
      const phone = formatPhone(e.phone_number)
      const sent = await sendWhatsApp(
        whatsapp_token,
        whatsapp_phone_number_id,
        template_name,
        phone,
        [
          e.full_name,           // {{1}} employee name
          companyName,           // {{2}} company name
          `${hrs} hrs`,          // {{3}} hours today
          `₹${monthlyEarnings.toLocaleString('en-IN')}`, // {{4}} monthly earnings
          `₹${advanceBalance.toLocaleString('en-IN')}`,  // {{5}} advance balance
        ]
      )

      if (sent) totalSent++
      else totalFailed++
    }
  }

  return NextResponse.json({ sent: totalSent, failed: totalFailed })
}
