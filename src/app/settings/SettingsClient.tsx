'use client'

import { useState, useTransition, useEffect } from 'react'
import { inviteUser, changeRole, removeMember, updateMyName } from './actions'

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
  members: Member[]
}

const glassSection = 'backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-xl p-6 mb-4'
const sectionTitle = 'text-[#F1F0F5] font-semibold text-base mb-4 pb-3 border-b border-[#7C3AED]/10'
const inputCls = 'bg-[#0F0A1E] border border-[#7C3AED]/30 rounded-xl px-4 py-3 text-[#F1F0F5] placeholder:text-[#7B7A8E]/50 focus:outline-none focus:border-[#7C3AED]/50 focus:ring-1 focus:ring-[#7C3AED]/50 w-full text-sm'
const saveBtnCls = 'bg-[#7C3AED] text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-[#6D28D9] transition-colors disabled:opacity-50'

export default function SettingsClient({ companyName, companyId, currentUserId, members: initialMembers }: Props) {
  const [members, setMembers] = useState(initialMembers)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteStatus, setInviteStatus] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Profile name state
  const currentMember = initialMembers.find(m => m.id === currentUserId)
  const [nameInput, setNameInput] = useState(currentMember?.full_name ?? '')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)

  // Company name state (display only — no server action for company rename in original)
  const [companyInput] = useState(companyName)

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

  return (
    <div className="min-h-screen bg-[#0F0A1E]">
      {/* Header */}
      <div className="px-6 md:px-8 pt-8 pb-7 border-b border-[#7C3AED]/10">
        <p className="text-xs font-semibold uppercase mb-1.5 text-[#7B7A8E] tracking-widest">Company</p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#F1F0F5]" style={{ letterSpacing: '-0.5px' }}>Settings</h1>
        <p className="mt-1 text-sm text-[#7B7A8E]">{companyName}</p>
      </div>

      <div className="px-6 md:px-8 py-6 max-w-2xl">

        {actionError && (
          <div className="rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 px-4 py-3 text-sm text-[#EF4444] mb-4">
            {actionError}
          </div>
        )}

        {/* Section 1 — Profile */}
        <div className={glassSection}>
          <h2 className={sectionTitle}>Profile</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#7B7A8E] mb-1.5 uppercase tracking-wider">Full Name</label>
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName() }}
                placeholder="Your full name"
                className={inputCls}
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSaveName}
                disabled={nameSaving || !nameInput.trim()}
                className={saveBtnCls}
              >
                {nameSaving ? 'Saving…' : nameSaved ? '✓ Saved' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        {/* Section 2 — Company */}
        <div className={glassSection}>
          <h2 className={sectionTitle}>Company</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#7B7A8E] mb-1.5 uppercase tracking-wider">Company Name</label>
              <input
                value={companyInput}
                readOnly
                placeholder="Company name"
                className={`${inputCls} cursor-not-allowed opacity-60`}
              />
            </div>
          </div>
        </div>

        {/* Section 3 — Viewers / Team Members */}
        <div className={glassSection}>
          <h2 className={sectionTitle}>Team Members</h2>

          {members.length === 0 ? (
            <p className="text-sm text-[#7B7A8E] text-center py-4">No members yet.</p>
          ) : (
            <ul className="space-y-2 mb-5">
              {members.map(member => (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-3 bg-[#0F0A1E]/50 rounded-xl px-4 py-3 border border-[#7C3AED]/10"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#F1F0F5] truncate">
                      {member.full_name ?? '(no name)'}
                      {member.id === currentUserId && (
                        <span className="text-xs text-[#7B7A8E] ml-1">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-[#7B7A8E] truncate">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                      member.role === 'admin'
                        ? 'bg-[#7C3AED]/20 text-[#A855F7] border-[#7C3AED]/30'
                        : 'bg-[#7B7A8E]/20 text-[#7B7A8E] border-[#7B7A8E]/30'
                    }`}>
                      {member.role}
                    </span>
                    {member.id !== currentUserId && (
                      <>
                        <button
                          onClick={() => handleChangeRole(member.id, member.role === 'admin' ? 'viewer' : 'admin')}
                          disabled={isPending}
                          className="text-xs text-[#A855F7] hover:text-[#7C3AED] disabled:opacity-50 transition-colors"
                        >
                          Make {member.role === 'admin' ? 'Viewer' : 'Admin'}
                        </button>
                        <button
                          onClick={() => handleRemove(member.id)}
                          disabled={isPending}
                          className="text-xs text-[#EF4444] hover:text-[#EF4444]/80 disabled:opacity-50 transition-colors"
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Add Viewer inline form */}
          <div>
            <p className="text-xs font-medium text-[#7B7A8E] mb-3 uppercase tracking-wider">Add Viewer</p>
            <form onSubmit={handleInvite} className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                required
                className="flex-1 bg-[#0F0A1E] border border-[#7C3AED]/30 rounded-xl px-4 py-3 text-[#F1F0F5] placeholder:text-[#7B7A8E]/50 focus:outline-none focus:border-[#7C3AED]/50 focus:ring-1 focus:ring-[#7C3AED]/50 text-sm"
              />
              <button
                type="submit"
                disabled={isPending || !inviteEmail.trim()}
                className={saveBtnCls}
              >
                {isPending ? 'Sending…' : 'Invite'}
              </button>
            </form>
            {inviteStatus && (
              <p className="mt-2 text-sm text-[#10B981]">{inviteStatus}</p>
            )}
            <p className="mt-2 text-xs text-[#7B7A8E]">
              Invited users receive an email link and join as Viewers. Promote them to Admin after they accept.
            </p>
          </div>
        </div>

        {/* External Viewers Section */}
        <ViewersSection companyId={companyId} />

      </div>
    </div>
  )
}

function ViewersSection({ companyId }: { companyId: string }) {
  const [viewers, setViewers] = useState<{ phone: string; role: string }[]>([])
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('ca')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

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

  function copyCompanyId() {
    navigator.clipboard.writeText(companyId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const inputCls = 'bg-[#0F0A1E] border border-[#7C3AED]/30 rounded-xl px-4 py-3 text-[#F1F0F5] placeholder:text-[#7B7A8E]/50 focus:outline-none focus:border-[#7C3AED]/50 focus:ring-1 focus:ring-[#7C3AED]/50 w-full text-sm'
  const saveBtnCls = 'bg-[#7C3AED] text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-[#6D28D9] transition-colors disabled:opacity-50'

  return (
    <div className="backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-xl p-6 mb-4">
      <h2 className="text-[#F1F0F5] font-semibold text-base mb-4 pb-3 border-b border-[#7C3AED]/10">External Viewers</h2>

      <p className="text-xs text-[#7B7A8E] mb-4">
        Give read-only access to CAs, managers, or partners. They log in at{' '}
        <span className="font-mono text-[#A855F7]">/viewer/dashboard</span> using your company ID, their phone, and the password you set.
      </p>

      {/* Section 4 — Referral (Company ID copy) */}
      <div className="mb-5">
        <label className="block text-xs font-medium text-[#7B7A8E] mb-1.5 uppercase tracking-wider">Your Company ID</label>
        <div className="flex gap-2">
          <input
            readOnly
            value={companyId}
            className={`${inputCls} font-mono cursor-default opacity-70`}
          />
          <button
            onClick={copyCompanyId}
            className={saveBtnCls}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {err && <p className="text-sm text-[#EF4444] mb-3">{err}</p>}
      {status && <p className="text-sm text-[#10B981] mb-3">{status}</p>}

      {/* Existing viewers list */}
      {viewers.length > 0 && (
        <ul className="space-y-2 mb-5">
          {viewers.map(v => (
            <li
              key={v.phone}
              className="flex items-center justify-between gap-3 bg-[#0F0A1E]/50 rounded-xl px-4 py-3 border border-[#7C3AED]/10"
            >
              <div>
                <p className="text-sm font-medium text-[#F1F0F5] font-mono">{v.phone}</p>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border mt-0.5 ${
                  v.role === 'ca'
                    ? 'bg-[#7C3AED]/20 text-[#A855F7] border-[#7C3AED]/30'
                    : v.role === 'manager'
                    ? 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30'
                    : 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30'
                }`}>
                  {v.role}
                </span>
              </div>
              <button
                onClick={() => remove(v.phone)}
                className="text-xs text-[#EF4444] hover:text-[#EF4444]/80 transition-colors"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add viewer form */}
      <p className="text-xs font-medium text-[#7B7A8E] mb-3 uppercase tracking-wider">Add External Viewer</p>
      <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <input
          required
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="Phone"
          className="sm:col-span-1 bg-[#0F0A1E] border border-[#7C3AED]/30 rounded-xl px-4 py-3 text-[#F1F0F5] placeholder:text-[#7B7A8E]/50 focus:outline-none focus:border-[#7C3AED]/50 focus:ring-1 focus:ring-[#7C3AED]/50 text-sm"
        />
        <select
          value={role}
          onChange={e => setRole(e.target.value)}
          className="bg-[#0F0A1E] border border-[#7C3AED]/30 rounded-xl px-4 py-3 text-[#F1F0F5] focus:outline-none focus:border-[#7C3AED]/50 focus:ring-1 focus:ring-[#7C3AED]/50 text-sm"
        >
          <option value="ca">CA (full access)</option>
          <option value="manager">Manager (payroll + attendance)</option>
          <option value="partner">Partner (payroll + employees)</option>
        </select>
        <input
          required
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Set password"
          className="bg-[#0F0A1E] border border-[#7C3AED]/30 rounded-xl px-4 py-3 text-[#F1F0F5] placeholder:text-[#7B7A8E]/50 focus:outline-none focus:border-[#7C3AED]/50 focus:ring-1 focus:ring-[#7C3AED]/50 text-sm"
        />
        <button
          disabled={busy}
          type="submit"
          className="bg-[#7C3AED] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#6D28D9] disabled:opacity-50 transition-colors"
        >
          {busy ? 'Adding…' : 'Add Viewer'}
        </button>
      </form>
    </div>
  )
}
