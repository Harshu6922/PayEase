'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Users, Clock, FileText, TrendingUp, Shield, ChevronRight, Menu, X, Zap, BarChart3, Smartphone } from 'lucide-react'

const FEATURES = [
  { icon: Users, title: 'All Worker Types', desc: 'Salaried, daily wage, and commission-based employees — all in one place.' },
  { icon: Clock, title: 'Attendance Tracking', desc: 'Log daily attendance with overtime and deduction calculations automatically.' },
  { icon: TrendingUp, title: 'Advance Management', desc: 'Track employee advances and auto-deduct from salary during payroll.' },
  { icon: FileText, title: 'Instant PDF Payslips', desc: 'Generate professional payslips and payroll reports with one click.' },
  { icon: Shield, title: 'Viewer Access', desc: 'Give read-only access to your CA, manager, or business partner securely.' },
  { icon: BarChart3, title: 'Payroll Analytics', desc: 'Visual charts for salary trends, attendance patterns, and monthly summaries.' },
]

const STEPS = [
  { n: '01', title: 'Add Your Employees', desc: 'Set up employee profiles with salary, worker type, and working hours in minutes.' },
  { n: '02', title: 'Log Attendance Daily', desc: 'Mark attendance, overtime, and deductions. Works on mobile too.' },
  { n: '03', title: 'Generate Payslips', desc: 'One click to calculate and export payroll PDFs for the entire team.' },
]

const PLANS = [
  {
    name: 'Starter', price: 299, employees: 15, popular: false,
    features: ['Up to 15 employees', 'All worker types', 'Attendance tracking', 'PDF payslips', 'Advance management'],
  },
  {
    name: 'Growth', price: 499, employees: 75, popular: true,
    features: ['Up to 75 employees', 'Everything in Starter', 'Payroll analytics', 'Viewer access (CA/manager)', 'Priority support'],
  },
  {
    name: 'Business', price: 999, employees: 500, popular: false,
    features: ['Up to 500 employees', 'Everything in Growth', 'Multi-admin support', 'Advanced reports', 'Dedicated support'],
  },
]

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#1C2333]/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/payease logo.png" alt="PayEase" className="h-8 w-8 rounded-xl object-cover" />
            <span className="text-white font-bold text-lg">PayEase</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</a>
            <a href="#how" className="text-sm text-gray-400 hover:text-white transition-colors">How it works</a>
            <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</a>
            <Link href="/contact" className="text-sm text-gray-400 hover:text-white transition-colors">Contact</Link>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-300 hover:text-white transition-colors">Sign in</Link>
            <Link href="/login" className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              Start Free Trial
            </Link>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-gray-400 hover:text-white">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-[#1C2333] border-t border-white/10 px-4 py-4 space-y-3">
            <a href="#features" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-400">Features</a>
            <a href="#how" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-400">How it works</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-400">Pricing</a>
            <Link href="/login" className="block text-sm text-gray-400">Sign in</Link>
            <Link href="/login" className="block bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg text-center">
              Start Free Trial
            </Link>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="bg-[#1C2333] pt-32 pb-24 px-4 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <Zap className="h-3 w-3" /> Built for Indian businesses
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight tracking-tight mb-6">
            Payroll,{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Simplified.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Manage employees, track attendance, and run payroll in minutes — not hours. Built for factories, shops, and growing Indian businesses.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login" className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3.5 rounded-xl text-base transition-colors flex items-center justify-center gap-2">
              Start Free Trial <ChevronRight className="h-4 w-4" />
            </Link>
            <a href="#how" className="border border-white/20 hover:border-white/40 text-white font-semibold px-8 py-3.5 rounded-xl text-base transition-colors text-center">
              See How It Works
            </a>
          </div>
          <p className="mt-4 text-xs text-gray-500">No credit card required · 14-day free trial</p>
        </div>

        {/* Stats */}
        <div className="max-w-3xl mx-auto mt-20 grid grid-cols-3 gap-6 relative">
          {[
            { value: '500+', label: 'Businesses' },
            { value: '₹2Cr+', label: 'Processed monthly' },
            { value: '14 days', label: 'Free trial' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-extrabold text-white">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-3">Features</p>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Everything you need to run payroll</h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">One platform for all your payroll needs — no spreadsheets, no manual calculations.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile CTA strip */}
      <section className="bg-indigo-600 py-12 px-4">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Smartphone className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-lg">Works on mobile</p>
              <p className="text-indigo-200 text-sm">Add to home screen for an app-like experience</p>
            </div>
          </div>
          <Link href="/login" className="bg-white text-indigo-600 font-bold px-6 py-3 rounded-xl text-sm hover:bg-indigo-50 transition-colors whitespace-nowrap">
            Open on Mobile →
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-3">How it works</p>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Up and running in minutes</h2>
          </div>
          <div className="space-y-6">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex gap-6 items-start">
                <div className="flex-shrink-0 h-14 w-14 rounded-2xl bg-[#1C2333] flex items-center justify-center">
                  <span className="text-indigo-400 font-bold text-sm">{s.n}</span>
                </div>
                <div className="pt-2">
                  <h3 className="font-bold text-gray-900 text-lg">{s.title}</h3>
                  <p className="text-gray-500 mt-1">{s.desc}</p>
                </div>
                {i < STEPS.length - 1 && <div className="hidden" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-3">Pricing</p>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Simple, honest pricing</h2>
            <p className="mt-3 text-gray-500">Start free for 14 days. No credit card required.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map(p => (
              <div key={p.name} className={`relative rounded-2xl border p-6 flex flex-col ${p.popular ? 'bg-[#1C2333] border-indigo-500 shadow-2xl shadow-indigo-900/30 scale-105' : 'bg-white border-gray-200'}`}>
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <p className={`font-bold text-lg ${p.popular ? 'text-white' : 'text-gray-900'}`}>{p.name}</p>
                <div className="mt-3 mb-6">
                  <span className={`text-4xl font-extrabold ${p.popular ? 'text-white' : 'text-gray-900'}`}>₹{p.price}</span>
                  <span className={`text-sm ml-1 ${p.popular ? 'text-gray-400' : 'text-gray-500'}`}>/month</span>
                </div>
                <ul className="space-y-2.5 flex-1 mb-6">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle className={`h-4 w-4 flex-shrink-0 ${p.popular ? 'text-indigo-400' : 'text-indigo-600'}`} />
                      <span className={p.popular ? 'text-gray-300' : 'text-gray-600'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/login" className={`block text-center font-semibold py-2.5 rounded-xl text-sm transition-colors ${p.popular ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}>
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[#1C2333] py-24 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 to-transparent pointer-events-none" />
        <div className="max-w-2xl mx-auto relative">
          <h2 className="text-4xl font-extrabold text-white tracking-tight mb-4">Ready to simplify your payroll?</h2>
          <p className="text-gray-400 mb-8">Join hundreds of Indian businesses saving hours every month with PayEase.</p>
          <Link href="/login" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-4 rounded-xl text-base transition-colors">
            Start Free Trial <ChevronRight className="h-4 w-4" />
          </Link>
          <p className="mt-4 text-xs text-gray-600">14 days free · No credit card · Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#141B2A] py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/payease logo.png" alt="PayEase" className="h-7 w-7 rounded-lg object-cover" />
            <span className="text-white font-bold">PayEase</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
          </div>
          <p className="text-xs text-gray-600">© 2026 PayEase. All rights reserved.</p>
        </div>
      </footer>

    </div>
  )
}
