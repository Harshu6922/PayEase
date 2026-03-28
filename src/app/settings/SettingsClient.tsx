'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { inviteUser, changeRole, removeMember, updateMyName } from './actions'
import { createClient } from '@/lib/supabase/client'
import { Copy, Check, LogOut, Trash2, Shield, UserPlus, MessageCircle, Eye, EyeOff } from 'lucide-react'
import { staggerContainer, fadeInUp } from '@/lib/animations'

interface Member {
  id: string
  full_name: string | null
  role: 'admin' | 'viewer'
  email: string
}

interface Props {
  companyName: string
  companyId: string
  currentUserId: string
  userEmail: string
  members: Member[]
}

const glassCard: React.CSSProperties = {
  background: 'rgba(28,22,46,0.6)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(189,157,255,0.1)',
}

const inputCls = `w-full px-4 py-3 rounded-xl text-sm text-[#ebe1fe] placeholder:text-[#afa7c2]/50
  focus:outline-none transition-colors`
const inputStyle: React.CSSProperties = {
  background: 'rgba(189,157,255,0.05)',
  border: '1px solid rgba(189,157,255,0.1)',
}
const inputFocusStyle = `focus:border-[rgba(189,157,255,0.4)] focus:bg-[rgba(189,157,255,0.08)]`

const labelCls = 'block text-xs font-semibold text-[#afa7c2] uppercase tracking-widest mb-1.5'
const sectionLabelCls = 'text-[10px] font-bold uppercase tracking-[0.2em] text-[#afa7c2] mb-4 block'

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function SettingsClient({ companyName, companyId, currentUserId, userEmail, members: initialMembers }: Props) {
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteStatus, setInviteStatus] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [signingOut, setSigningOut] = useState(false)

  const currentMember = initialMembers.find(m => m.id === currentUserId)
  const [nameInput, setNameInput] = useState(currentMember?.full_name ?? '')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)

  const handleSaveName = async () => {
    if (!nameInput.trim()) return
    setNameSaving(true)
    const { error } = await updateMyName(nameInput.trim())
    if (error) {
      setActionError(error)
    } else {
      setMembers(prev => prev.map(m => m.id === currentUserId ? { ...m, full_name: nameInput.trim() } : m))
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 2000)
    }
    setNameSaving(false)
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviteStatus(null)
    setActionError(null)
    startTransition(async () => {
      const { error } = await inviteUser(inviteEmail.trim())
      if (error) {
        setActionError(error)
      } else {
        setInviteStatus(`Invite sent to ${inviteEmail.trim()}`)
        setInviteEmail('')
      }
    })
  }

  const handleChangeRole = async (userId: string, newRole: 'admin' | 'viewer') => {
    setActionError(null)
    startTransition(async () => {
      const { error } = await changeRole(userId, newRole, companyId)
      if (error) {
        setActionError(error)
      } else {
        setMembers(prev => prev.map(m => m.id === userId ? { ...m, role: newRole } : m))
      }
    })
  }

  const handleRemove = async (userId: string) => {
    if (!confirm('Remove this member? They will lose access immediately.')) return
    setActionError(null)
    startTransition(async () => {
      const { error } = await removeMember(userId)
      if (error) {
        setActionError(error)
      } else {
        setMembers(prev => prev.filter(m => m.id !== userId))
      }
    })
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    const supabase = createClient() as unknown as any
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: '#0F0A1E' }}>
      {/* Ambient glow */}
      <div className="pointer-events-none fixed top-[-10%] right-[-10%] w-[50%] h-[50%] z-0"
        style={{ background: 'radial-gradient(circle, rgba(189,157,255,0.08) 0%, transparent 70%)' }} />

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 md:py-16">

        {/* Header */}
        <header className="mb-12">
          <h1 className="font-extrabold text-4xl md:text-5xl tracking-tight text-[#ebe1fe]">Settings</h1>
          <p className="mt-2 text-[#afa7c2] text-sm">Company settings and profile management</p>
        </header>

        {actionError && (
          <div className="mb-6 px-4 py-3 rounded-xl text-sm text-red-400"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {actionError}
          </div>
        )}

        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-8">

          {/* Personal Profile */}
          <motion.section variants={fadeInUp}>
            <span className={sectionLabelCls}>Personal Profile</span>
            <div className="p-6 rounded-2xl" style={glassCard}>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl text-[#2e006c] flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #bd9dff 0%, #8a4cfc 100%)', boxShadow: '0 0 20px rgba(189,157,255,0.25)' }}>
                    {currentMember?.full_name ? initials(currentMember.full_name) : userEmail[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <input
                        value={nameInput}
                        onChange={e => setNameInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveName() }}
                        placeholder="Your full name"
                        className={`${inputCls} ${inputFocusStyle} text-base font-bold w-48`}
                        style={inputStyle}
                      />
                      <button onClick={handleSaveName} disabled={nameSaving || !nameInput.trim()}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40 transition-all active:scale-95"
                        style={{ background: nameSaved ? 'rgba(16,185,129,0.15)' : 'rgba(189,157,255,0.15)', border: '1px solid rgba(189,157,255,0.2)', color: nameSaved ? '#10b981' : '#bd9dff' }}>
                        {nameSaving ? 'Saving…' : nameSaved ? '✓ Saved' : 'Save'}
                      </button>
                    </div>
                    <p className="text-sm text-[#afa7c2]">{userEmail}</p>
                  </div>
                </div>
                <button onClick={handleSignOut} disabled={signingOut}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-red-400 disabled:opacity-50 transition-all hover:bg-red-400/10 active:scale-95"
                  style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
                  <LogOut className="h-4 w-4" />
                  {signingOut ? 'Signing out…' : 'Sign Out'}
                </button>
              </div>
            </div>
          </motion.section>

          {/* Organization Details */}
          <motion.section variants={fadeInUp}>
            <span className={sectionLabelCls}>Organization Details</span>
            <div className="p-8 rounded-2xl" style={glassCard}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className={labelCls}>Company Name</label>
                  <input value={companyName} readOnly
                    className={`${inputCls} cursor-not-allowed opacity-50`}
                    style={inputStyle} />
                </div>
                <div>
                  <label className={labelCls}>Company ID</label>
                  <CopyField value={companyId} />
                </div>
              </div>
              <p className="text-[10px] text-[#afa7c2]/60 italic">
                Company name changes require contacting support. Company ID is used for external viewer login.
              </p>
            </div>
          </motion.section>

          {/* Team Members */}
          <motion.section variants={fadeInUp}>
            <span className={sectionLabelCls}>Team Members</span>
            <div className="p-8 rounded-2xl space-y-6" style={glassCard}>

              {/* Members list */}
              {members.length === 0 ? (
                <p className="text-sm text-[#afa7c2] text-center py-4">No members yet.</p>
              ) : (
                <ul className="space-y-2">
                  {members.map(member => (
                    <li key={member.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl"
                      style={{ background: 'rgba(189,157,255,0.04)', border: '1px solid rgba(189,157,255,0.08)' }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: 'rgba(189,157,255,0.15)', color: '#bd9dff' }}>
                          {(member.full_name ?? member.email)[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#ebe1fe] truncate">
                            {member.full_name ?? '(no name)'}
                            {member.id === currentUserId && <span className="text-[#afa7c2] font-normal ml-1 text-xs">(you)</span>}
                          </p>
                          <p className="text-xs text-[#afa7c2] truncate">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                          member.role === 'admin'
                            ? 'bg-[#bd9dff]/15 text-[#bd9dff]'
                            : 'bg-[#afa7c2]/15 text-[#afa7c2]'
                        }`}>
                          {member.role}
                        </span>
                        {member.id !== currentUserId && (
                          <>
                            <button onClick={() => handleChangeRole(member.id, member.role === 'admin' ? 'viewer' : 'admin')}
                              disabled={isPending}
                              className="text-xs text-[#bd9dff] hover:text-[#ebe1fe] disabled:opacity-50 transition-colors px-2 py-1 rounded-lg hover:bg-[#bd9dff]/10">
                              Make {member.role === 'admin' ? 'Viewer' : 'Admin'}
                            </button>
                            <button onClick={() => handleRemove(member.id)} disabled={isPending}
                              className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors px-2 py-1 rounded-lg hover:bg-red-400/10">
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Invite */}
              <div>
                <p className={labelCls}>Invite Team Member</p>
                <form onSubmit={handleInvite} className="flex gap-2">
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    placeholder="colleague@example.com" required
                    className={`${inputCls} ${inputFocusStyle} flex-1`} style={inputStyle} />
                  <button type="submit" disabled={isPending || !inviteEmail.trim()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 transition-all hover:shadow-[0_0_16px_rgba(189,157,255,0.3)] active:scale-95 flex-shrink-0"
                    style={{ background: '#bd9dff', color: '#0F0A1E' }}>
                    <UserPlus className="h-4 w-4" />
                    {isPending ? 'Sending…' : 'Invite'}
                  </button>
                </form>
                {inviteStatus && <p className="mt-2 text-sm text-emerald-400">{inviteStatus}</p>}
                <p className="mt-2 text-xs text-[#afa7c2]/60">
                  Invited users join as Viewers. Promote them to Admin after they accept.
                </p>
              </div>
            </div>
          </motion.section>

          {/* WhatsApp Notifications */}
          <motion.section variants={fadeInUp}>
            <WhatsAppSection />
          </motion.section>

          {/* External Viewers */}
          <motion.section variants={fadeInUp}>
            <ViewersSection companyId={companyId} />
          </motion.section>

          {/* Danger Zone */}
          <motion.section variants={fadeInUp}>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400 mb-4 block">Critical Actions</span>
            <div className="p-8 rounded-2xl" style={{ ...glassCard, border: '1px solid rgba(239,68,68,0.2)' }}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="max-w-md">
                  <h4 className="text-lg font-bold text-[#ebe1fe] mb-1">Delete Company Data</h4>
                  <p className="text-sm text-[#afa7c2]">
                    This action is permanent and cannot be undone. All payroll history, employee records, and data will be permanently deleted.
                  </p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-red-400 hover:bg-red-400/10 transition-all whitespace-nowrap active:scale-95"
                  style={{ border: '1px solid rgba(239,68,68,0.4)' }}
                  onClick={() => alert('Please contact support to delete company data.')}>
                  <Trash2 className="h-4 w-4" />
                  Delete Data
                </button>
              </div>
            </div>
          </motion.section>

        </motion.div>
      </main>
    </div>
  )
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="flex gap-2">
      <input readOnly value={value}
        className={`${inputCls} font-mono opacity-60 cursor-default flex-1`}
        style={inputStyle} />
      <button onClick={copy}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold flex-shrink-0 transition-all"
        style={{ background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(189,157,255,0.1)', border: '1px solid rgba(189,157,255,0.2)', color: copied ? '#10b981' : '#bd9dff' }}>
        {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
      </button>
    </div>
  )
}

function WhatsAppSection() {
  const [enabled, setEnabled] = useState(false)
  const [token, setToken] = useState('')
  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [templateName, setTemplateName] = useState('daily_employee_update')
  const [sendTime, setSendTime] = useState('18:00')
  const [showToken, setShowToken] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/notifications/settings')
      .then(r => r.json())
      .then(d => {
        if (d.settings) {
          setEnabled(d.settings.enabled ?? false)
          setToken(d.settings.whatsapp_token ?? '')
          setPhoneNumberId(d.settings.whatsapp_phone_number_id ?? '')
          setTemplateName(d.settings.template_name ?? 'daily_employee_update')
          setSendTime(d.settings.send_time ?? '18:00')
        }
        setLoaded(true)
      })
  }, [])

  async function save() {
    setSaving(true); setErr(null)
    const res = await fetch('/api/notifications/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled,
        whatsapp_token: token.trim() || null,
        whatsapp_phone_number_id: phoneNumberId.trim() || null,
        template_name: templateName.trim() || 'daily_employee_update',
        send_time: sendTime,
      }),
    })
    const d = await res.json()
    if (!res.ok) { setErr(d.error); setSaving(false); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    setSaving(false)
  }

  if (!loaded) return null

  return (
    <>
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#afa7c2] mb-4 block">
        WhatsApp Notifications
      </span>
      <div className="p-8 rounded-2xl space-y-6" style={glassCard}>

        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="h-4 w-4" style={{ color: '#25D366' }} />
              <p className="text-sm font-semibold text-[#ebe1fe]">Daily Employee Updates</p>
            </div>
            <p className="text-xs text-[#afa7c2] max-w-md">
              Send each employee a WhatsApp message daily with their hours worked today, this month&apos;s earnings, and advance balance. Requires a Meta WhatsApp Business API setup.
            </p>
          </div>
          {/* Toggle */}
          <button
            onClick={() => setEnabled(v => !v)}
            className="flex-shrink-0 w-12 h-6 rounded-full transition-all relative"
            style={{ background: enabled ? '#25D366' : 'rgba(189,157,255,0.15)', border: '1px solid rgba(189,157,255,0.2)' }}
          >
            <span
              className="absolute top-0.5 w-5 h-5 rounded-full transition-all shadow"
              style={{ background: '#fff', left: enabled ? '26px' : '2px' }}
            />
          </button>
        </div>

        {/* Credentials */}
        <div className="space-y-4">
          <div>
            <label className={labelCls}>WhatsApp Access Token</label>
            <div className="flex gap-2">
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="EAAxxxxxxx…"
                className={`${inputCls} ${inputFocusStyle} flex-1 font-mono text-xs`}
                style={inputStyle}
              />
              <button onClick={() => setShowToken(v => !v)}
                className="px-3 rounded-xl flex-shrink-0 transition-colors"
                style={{ background: 'rgba(189,157,255,0.08)', border: '1px solid rgba(189,157,255,0.15)', color: '#afa7c2' }}>
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Phone Number ID</label>
              <input
                value={phoneNumberId}
                onChange={e => setPhoneNumberId(e.target.value)}
                placeholder="1234567890123"
                className={`${inputCls} ${inputFocusStyle} font-mono text-xs`}
                style={inputStyle}
              />
            </div>
            <div>
              <label className={labelCls}>Send Time (IST)</label>
              <input
                type="time"
                value={sendTime}
                onChange={e => setSendTime(e.target.value)}
                className={`${inputCls} ${inputFocusStyle}`}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Template Name</label>
            <input
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              placeholder="daily_employee_update"
              className={`${inputCls} ${inputFocusStyle} font-mono text-sm`}
              style={inputStyle}
            />
            <p className="mt-1.5 text-[11px] text-[#afa7c2]/60">
              Must match the approved template name in your Meta Business Manager.
            </p>
          </div>
        </div>

        {/* Template preview */}
        <div className="rounded-xl p-4 text-xs leading-relaxed"
          style={{ background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.15)', color: '#afa7c2' }}>
          <p className="font-semibold text-[#ebe1fe] mb-2 text-[11px] uppercase tracking-wider">Message Preview</p>
          <p>Hi <span className="text-[#bd9dff]">{'{{employee name}}'}</span>, here&apos;s your daily update from <span className="text-[#bd9dff]">{'{{company name}}'}</span>:</p>
          <p className="mt-1">Hours worked today: <span className="text-[#ebe1fe]">8.0 hrs</span></p>
          <p>This month&apos;s earnings: <span className="text-[#ebe1fe]">₹12,500</span></p>
          <p>Advance balance: <span className="text-[#ebe1fe]">₹2,000</span></p>
        </div>

        {/* Setup guide */}
        <details className="group">
          <summary className="text-xs font-semibold text-[#bd9dff] cursor-pointer list-none flex items-center gap-1 select-none">
            <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
            How to get your WhatsApp API credentials
          </summary>
          <ol className="mt-3 space-y-2 text-xs text-[#afa7c2] list-decimal list-inside pl-2">
            <li>Go to <span className="font-mono text-[#ebe1fe]">developers.facebook.com</span> and create a Meta App (type: Business)</li>
            <li>Add the <span className="font-mono text-[#ebe1fe]">WhatsApp</span> product to your app</li>
            <li>In WhatsApp → API Setup, copy your <span className="text-[#ebe1fe] font-medium">Phone Number ID</span> and generate a permanent <span className="text-[#ebe1fe] font-medium">Access Token</span></li>
            <li>Under Message Templates, create a template named <span className="font-mono text-[#ebe1fe]">{templateName || 'daily_employee_update'}</span> with 5 variables: employee name, company name, hours today, monthly earnings, advance balance</li>
            <li>Wait for Meta to approve the template (~24 hrs), then paste your credentials above and enable notifications</li>
          </ol>
        </details>

        {err && <p className="text-sm text-red-400">{err}</p>}

        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 transition-all hover:shadow-[0_0_16px_rgba(189,157,255,0.3)] active:scale-95"
          style={{ background: saved ? 'rgba(16,185,129,0.15)' : '#bd9dff', border: saved ? '1px solid rgba(16,185,129,0.3)' : 'none', color: saved ? '#10b981' : '#0F0A1E' }}>
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Notification Settings'}
        </button>
      </div>
    </>
  )
}

function ViewersSection(_: { companyId: string }) {
  const [viewers, setViewers] = useState<{ phone: string; role: string }[]>([])
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('ca')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch('/api/viewers').then(r => r.json()).then(d => setViewers(d.viewers ?? []))
  }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr(null); setStatus(null)
    const res = await fetch('/api/viewers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, role, password }),
    })
    const d = await res.json()
    if (!res.ok) { setErr(d.error); setBusy(false); return }
    setViewers(v => [...v, { phone, role }])
    setPhone(''); setPassword(''); setStatus('Viewer added.')
    setBusy(false)
  }

  async function remove(p: string) {
    if (!confirm('Remove this viewer?')) return
    await fetch(`/api/viewers/${encodeURIComponent(p)}`, { method: 'DELETE' })
    setViewers(v => v.filter(x => x.phone !== p))
  }

  const roleBadge: Record<string, string> = {
    ca:      'bg-[#bd9dff]/15 text-[#bd9dff]',
    manager: 'bg-emerald-500/15 text-emerald-400',
    partner: 'bg-amber-500/15 text-amber-400',
  }

  return (
    <>
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#afa7c2] mb-4 block">External Viewers</span>
      <div className="p-8 rounded-2xl space-y-6" style={glassCard}>
        <p className="text-sm text-[#afa7c2]">
          Give read-only access to CAs, managers, or partners. They log in at{' '}
          <span className="font-mono text-[#bd9dff] text-xs">/viewer/dashboard</span>{' '}
          using your company ID, their phone, and the password you set.
        </p>

        {err && <p className="text-sm text-red-400">{err}</p>}
        {status && <p className="text-sm text-emerald-400">{status}</p>}

        {viewers.length > 0 && (
          <ul className="space-y-2">
            {viewers.map(v => (
              <li key={v.phone} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(189,157,255,0.04)', border: '1px solid rgba(189,157,255,0.08)' }}>
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-[#afa7c2]" />
                  <div>
                    <p className="text-sm font-mono text-[#ebe1fe]">{v.phone}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${roleBadge[v.role] ?? 'bg-[#afa7c2]/15 text-[#afa7c2]'}`}>
                      {v.role}
                    </span>
                  </div>
                </div>
                <button onClick={() => remove(v.phone)}
                  className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-400/10 transition-colors">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div>
          <p className={labelCls}>Add External Viewer</p>
          <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input required value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="Phone number"
              className={`${inputCls} sm:col-span-1`} style={inputStyle} />
            <select value={role} onChange={e => setRole(e.target.value)}
              className={`${inputCls}`} style={inputStyle}>
              <option value="ca" style={{ background: '#1c162e' }}>CA (full access)</option>
              <option value="manager" style={{ background: '#1c162e' }}>Manager (payroll + attendance)</option>
              <option value="partner" style={{ background: '#1c162e' }}>Partner (payroll + employees)</option>
            </select>
            <input required type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Set password"
              className={inputCls} style={inputStyle} />
            <button disabled={busy} type="submit"
              className="px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 transition-all hover:shadow-[0_0_16px_rgba(189,157,255,0.3)] active:scale-95"
              style={{ background: '#bd9dff', color: '#0F0A1E' }}>
              {busy ? 'Adding…' : 'Add Viewer'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
