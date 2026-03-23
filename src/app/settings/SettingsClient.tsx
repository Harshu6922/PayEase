'use client'

import { useState, useTransition } from 'react'
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

export default function SettingsClient({ companyName, companyId, currentUserId, members: initialMembers }: Props) {
  const [members, setMembers] = useState(initialMembers)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteStatus, setInviteStatus] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(initialMembers.find(m => m.id === currentUserId)?.full_name ?? '')
  const [nameSaving, setNameSaving] = useState(false)

  const handleSaveName = async () => {
    if (!nameInput.trim()) return
    setNameSaving(true)
    const { error } = await updateMyName(nameInput.trim())
    if (error) { setActionError(error) } else {
      setMembers(prev => prev.map(m => m.id === currentUserId ? { ...m, full_name: nameInput.trim() } : m))
      setEditingName(false)
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
    <div>
      {/* Header band */}
      <div className="px-8 pt-8 pb-7" style={{ backgroundColor: '#1C2333' }}>
        <p className="text-xs font-semibold uppercase mb-1.5" style={{ color: '#6B7A99', letterSpacing: '0.1em' }}>Company</p>
        <h1 className="font-display text-4xl font-extrabold text-white" style={{ letterSpacing: '-0.5px' }}>Settings</h1>
        <p className="mt-1 text-sm" style={{ color: '#6B7A99' }}>{companyName}</p>
      </div>
      <div className="px-8 py-6 max-w-2xl space-y-8">

      {actionError && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {actionError}
        </div>
      )}

      {/* Members */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Team Members</h2>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {members.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-500 text-center">No members yet.</div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {members.map(member => (
                <li key={member.id} className="flex items-center justify-between px-4 py-3 bg-white">
                  <div className="flex-1">
                    {member.id === currentUserId && editingName ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={nameInput}
                          onChange={e => setNameInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                          className="border border-gray-300 rounded px-2 py-0.5 text-sm text-gray-900 w-40 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button onClick={handleSaveName} disabled={nameSaving} className="text-xs text-indigo-600 hover:underline disabled:opacity-50">{nameSaving ? 'Saving…' : 'Save'}</button>
                        <button onClick={() => setEditingName(false)} className="text-xs text-gray-400 hover:underline">Cancel</button>
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                        {member.full_name ?? '(no name)'}
                        {member.id === currentUserId && (
                          <>
                            <span className="text-xs text-gray-400">(you)</span>
                            <button onClick={() => { setNameInput(member.full_name ?? ''); setEditingName(true) }} className="text-xs text-indigo-500 hover:underline ml-1">Edit</button>
                          </>
                        )}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      member.role === 'admin'
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {member.role}
                    </span>
                    {member.id !== currentUserId && (
                      <>
                        <button
                          onClick={() => handleChangeRole(member.id, member.role === 'admin' ? 'viewer' : 'admin')}
                          disabled={isPending}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
                        >
                          Make {member.role === 'admin' ? 'Viewer' : 'Admin'}
                        </button>
                        <button
                          onClick={() => handleRemove(member.id)}
                          disabled={isPending}
                          className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
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
        </div>
      </section>

      {/* Invite */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Invite User</h2>
        <form onSubmit={handleInvite} className="flex gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="colleague@example.com"
            required
            className="flex-1 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400"
          />
          <button
            type="submit"
            disabled={isPending || !inviteEmail.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Sending…' : 'Send Invite'}
          </button>
        </form>
        {inviteStatus && (
          <p className="mt-2 text-sm text-green-600 dark:text-green-400">{inviteStatus}</p>
        )}
        <p className="mt-2 text-xs text-gray-500">
          Invited users receive an email link and join as Viewers. You can promote them to Admin after they accept.
        </p>
      </section>
      </div>
    </div>
  )
}
