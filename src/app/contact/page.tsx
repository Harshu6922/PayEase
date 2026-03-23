'use client'

import { useState } from 'react'
import { MessageCircle, CheckCircle } from 'lucide-react'

const ISSUE_TYPES = [
  'Payroll calculation issue',
  'Attendance not saving',
  'Payment recording problem',
  'PDF export not working',
  'Login / access issue',
  'Billing / subscription query',
  'Feature request',
  'Other',
]

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', issueType: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to send. Please try again.'); setLoading(false); return }
    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="text-center space-y-4">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Message Sent!</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm">
            We've received your message and will get back to you as soon as possible.
          </p>
          <button
            onClick={() => { setSuccess(false); setForm({ name: '', email: '', issueType: '', message: '' }) }}
            className="text-sm text-indigo-600 hover:underline"
          >
            Send another message
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="px-8 pt-8 pb-7" style={{ backgroundColor: '#1C2333' }}>
        <p className="text-xs font-semibold uppercase mb-1.5" style={{ color: '#6B7A99', letterSpacing: '0.1em' }}>Support</p>
        <h1 className="font-display text-4xl font-extrabold text-white" style={{ letterSpacing: '-0.5px' }}>Contact Us</h1>
        <p className="mt-1 text-sm" style={{ color: '#6B7A99' }}>We're here to help. Describe your issue and we'll get back to you.</p>
      </div>

      <div className="px-8 py-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Name</label>
              <input
                required
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Rahul Sharma"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="you@company.com"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issue Type</label>
            <select
              required
              value={form.issueType}
              onChange={e => setForm(p => ({ ...p, issueType: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select an issue type…</option>
              {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Describe your issue</label>
            <textarea
              required
              rows={5}
              value={form.message}
              onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
              placeholder="Please describe what happened, what you expected, and any steps to reproduce the issue…"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            {loading ? 'Sending…' : 'Send Message'}
          </button>
        </form>
      </div>
    </div>
  )
}
