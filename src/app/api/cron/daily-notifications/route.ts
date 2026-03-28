import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// Runs daily at 12:30 UTC (6:00 PM IST)
// Routing: notification_method per employee
//   'whatsapp' → Meta Cloud API (needs template approval)
//   'sms'      → Fast2SMS (plain text, works on any phone)
//   'none'     → skip
// Admin digest: one summary message to admin phone covering ALL employees

const adminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('91') && digits.length === 12) return digits
  if (digits.startsWith('0') && digits.length === 11) return '91' + digits.slice(1)
  if (digits.length === 10) return '91' + digits
  return digits
}

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
  token: string, phoneNumberId: string, templateName: string,
  toPhone: string, params: string[]
): Promise<boolean> {
  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: toPhone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en' },
        components: [{ type: 'body', parameters: params.map(text => ({ type: 'text', text })) }],
      },
    }),
  })
  return res.ok
}

async function sendSMS(apiKey: string, toPhone: string, message: string): Promise<boolean> {
  const digits = formatPhone(toPhone).replace(/^91/, '') // Fast2SMS expects 10-digit
  const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
    method: 'POST',
    headers: { authorization: apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      route: 'q',
      message,
      language: 'english',
      flash: '0',
      numbers: digits,
    }),
  })
  return res.ok
}

async function calcEmployeeData(empId: string, workerType: string, monthlySalary: number,
  dailyRate: number, stdHours: number, today: string, monthStart: string) {
  const { data: todayAtt } = await adminClient.from('attendance')
    .select('status, time_in, time_out').eq('employee_id', empId).eq('date', today).maybeSingle()
  const hrs = hoursToday(todayAtt, stdHours ?? 8)

  let monthlyEarnings = 0
  if (workerType === 'salaried') {
    const { data: monthAtt } = await adminClient.from('attendance').select('status')
      .eq('employee_id', empId).gte('date', monthStart).lte('date', today)
    const days = (monthAtt ?? []).reduce(
      (s: number, a: any) => s + (a.status === 'Half Day' ? 0.5 : a.status === 'Present' ? 1 : 0), 0)
    monthlyEarnings = Math.round((days / 26) * (monthlySalary ?? 0))
  } else if (workerType === 'daily') {
    const { data: monthAtt } = await adminClient.from('attendance').select('status')
      .eq('employee_id', empId).gte('date', monthStart).lte('date', today)
    const days = (monthAtt ?? []).reduce(
      (s: number, a: any) => s + (a.status === 'Half Day' ? 0.5 : a.status === 'Present' ? 1 : 0), 0)
    monthlyEarnings = Math.round(days * (dailyRate ?? 0))
  } else if (workerType === 'commission') {
    const { data: entries } = await adminClient.from('work_entries').select('total_amount')
      .eq('employee_id', empId).gte('date', monthStart).lte('date', today)
    monthlyEarnings = (entries ?? []).reduce((s: number, e: any) => s + Number(e.total_amount ?? 0), 0)
  }

  const { data: advances } = await adminClient.from('employee_advances').select('amount')
    .eq('employee_id', empId).eq('is_repaid', false)
  const advanceBalance = (advances ?? []).reduce((s: number, a: any) => s + Number(a.amount ?? 0), 0)

  return { hrs, monthlyEarnings, advanceBalance }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]
  const monthStart = today.slice(0, 7) + '-01'

  const { data: configs } = await adminClient
    .from('notification_settings')
    .select('company_id, whatsapp_token, whatsapp_phone_number_id, template_name, sms_api_key')
    .eq('enabled', true)

  if (!configs || configs.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No companies with notifications enabled' })
  }

  let totalSent = 0, totalFailed = 0

  for (const config of configs) {
    const { company_id, whatsapp_token, whatsapp_phone_number_id, template_name, sms_api_key } = config as any

    const { data: company } = await adminClient.from('companies').select('name').eq('id', company_id).maybeSingle()
    const companyName = (company as any)?.name ?? 'Your Company'

    const { data: employees } = await adminClient.from('employees')
      .select('id, full_name, phone_number, worker_type, monthly_salary, daily_rate, standard_working_hours, notification_method')
      .eq('company_id', company_id).eq('is_active', true)

    if (!employees || employees.length === 0) continue

    for (const emp of employees) {
      const e = emp as any
      const method = e.notification_method ?? 'whatsapp'
      if (method === 'none' || !e.phone_number) continue

      const { hrs, monthlyEarnings, advanceBalance } = await calcEmployeeData(
        e.id, e.worker_type, e.monthly_salary, e.daily_rate, e.standard_working_hours, today, monthStart
      )

      const phone = formatPhone(e.phone_number)
      let sent = false

      if (method === 'whatsapp' && whatsapp_token && whatsapp_phone_number_id) {
        sent = await sendWhatsApp(
          whatsapp_token, whatsapp_phone_number_id, template_name, phone,
          [e.full_name, companyName, `${hrs} hrs`,
            `₹${monthlyEarnings.toLocaleString('en-IN')}`,
            `₹${advanceBalance.toLocaleString('en-IN')}`]
        )
      } else if (method === 'sms' && sms_api_key) {
        const msg = `Hi ${e.full_name}, update from ${companyName}:\nHours today: ${hrs} hrs\nThis month: Rs.${monthlyEarnings.toLocaleString('en-IN')}\nAdvance: Rs.${advanceBalance.toLocaleString('en-IN')}\n- PayEase`
        sent = await sendSMS(sms_api_key, phone, msg)
      }

      if (sent) totalSent++
      else totalFailed++
    }
  }

  return NextResponse.json({ sent: totalSent, failed: totalFailed })
}
