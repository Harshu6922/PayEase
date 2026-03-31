'use client'

import { useState } from 'react'
import { CheckCircle, MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { springScaleIn } from '@/lib/animations'

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

  const inputClass =
    'block w-full bg-background border border-[#7C3AED]/30 rounded-xl px-4 py-3 text-text placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors'
  const labelClass = 'block text-xs uppercase tracking-wider text-text-muted font-semibold mb-1.5'

  if (success) {
    return (
      <div className="relative min-h-screen bg-background flex items-center justify-center px-4 overflow-hidden">
        {/* Purple orb */}
        <div
          className="fixed top-0 right-0 w-[480px] h-[480px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)',
            filter: 'blur(60px)',
            transform: 'translate(30%, -30%)',
          }}
        />
        <motion.div
          variants={springScaleIn}
          initial="hidden"
          animate="visible"
          className="relative w-full max-w-lg backdrop-blur-xl bg-[rgba(28,22,46,0.8)] border border-[#7C3AED]/20 rounded-2xl p-8 md:p-10 text-center space-y-4"
        >
          <CheckCircle className="mx-auto h-12 w-12 text-success" />
          <h2 className="text-text font-bold text-3xl">Message sent!</h2>
          <p className="text-text-muted text-sm">We'll get back to you shortly.</p>
          <button
            onClick={() => { setSuccess(false); setForm({ name: '', email: '', issueType: '', message: '' }) }}
            className="text-sm text-primary hover:text-primary-light underline underline-offset-2 transition-colors"
          >
            Send another message
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center px-4 py-12 overflow-hidden">
      {/* Purple orb */}
      <div
        className="fixed top-0 right-0 w-[480px] h-[480px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)',
          filter: 'blur(60px)',
          transform: 'translate(30%, -30%)',
        }}
      />

      <motion.div
        variants={springScaleIn}
        initial="hidden"
        animate="visible"
        className="relative w-full max-w-lg space-y-6"
      >
        {/* Card */}
        <div className="backdrop-blur-xl bg-[rgba(28,22,46,0.8)] border border-[#7C3AED]/20 rounded-2xl p-8 md:p-10 space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-text font-bold text-3xl">Contact Us</h1>
            <p className="text-text-muted text-sm">We typically respond within 24 hours.</p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-danger/10 border border-danger/30 text-danger rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name + Email grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Your Name</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Rahul Sharma"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Email Address</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="you@company.com"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Issue type */}
            <div>
              <label className={labelClass}>Issue Type</label>
              <select
                required
                value={form.issueType}
                onChange={e => setForm(p => ({ ...p, issueType: e.target.value }))}
                className={inputClass + ' appearance-none cursor-pointer'}
                style={{ backgroundColor: '#0F0A1E' }}
              >
                <option value="" disabled>Select an issue type…</option>
                {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Message */}
            <div>
              <label className={labelClass}>Describe your issue</label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                placeholder="Please describe what happened, what you expected, and any steps to reproduce the issue…"
                className={inputClass + ' resize-none'}
              />
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold py-4 rounded-xl shadow-[0_10px_30px_-10px_rgba(124,58,237,0.5)] hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MessageCircle className="h-4 w-4" />
              {loading ? 'Sending…' : 'Send Message'}
            </motion.button>
          </form>
        </div>

        {/* Support email note */}
        <p className="text-center text-xs text-text-muted">
          Or email us at{' '}
          <a href="mailto:payeasebuddy@gmail.com" className="text-primary hover:text-primary-light transition-colors">
            payeasebuddy@gmail.com
          </a>
        </p>
      </motion.div>
    </div>
  )
}
