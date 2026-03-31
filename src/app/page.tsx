'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  Banknote, CalendarCheck, Shield, FileText, BarChart3,
  CheckCircle, XCircle, Menu, X, ChevronRight,
} from 'lucide-react'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { useCountUp } from '@/lib/hooks/useCountUp'

const FEATURES = [
  { icon: Banknote, title: 'One-Click Salary', desc: 'Automate net pay calculations with deductions, advances, and overtime.' },
  { icon: CalendarCheck, title: 'Attendance Sync', desc: 'Track daily attendance, leaves, and half-days across your workforce.' },
  { icon: Shield, title: 'Compliance Ready', desc: 'Stay audit-ready with structured payroll records and export-ready reports.' },
  { icon: Banknote, title: 'Advance Management', desc: 'Issue and track employee salary advances with automatic deduction from payroll.' },
  { icon: FileText, title: 'Digital Payslips', desc: 'Generate and share professional PDF payslips instantly with one click.' },
  { icon: BarChart3, title: 'Payroll Analytics', desc: 'Visual charts for salary trends, attendance patterns, and monthly summaries.' },
]

const STEPS = [
  { n: 1, title: 'Add Employees', desc: 'Set up profiles with salary type and working hours in minutes.' },
  { n: 2, title: 'Track Attendance', desc: 'Capture daily logs, leaves, overtime, and deductions effortlessly.' },
  { n: 3, title: 'Run Payroll', desc: 'Review the summary and click Run. Payslips generated instantly.' },
]

const PLANS = [
  {
    name: 'Micro', price: '₹125', sub: '/mo', popular: false,
    features: [
      { text: 'Up to 5 employees', ok: true },
      { text: 'Full payroll — salary, OT & advances', ok: true },
      { text: 'Attendance & daily labour tracking', ok: true },
      { text: 'PDF payslips & payroll reports', ok: true },
    ],
    cta: 'Get Started',
  },
  {
    name: 'Starter', price: '₹299', sub: '/mo', popular: false,
    features: [
      { text: 'Up to 15 employees', ok: true },
      { text: 'Full payroll — salary, OT & advances', ok: true },
      { text: 'Attendance & daily labour tracking', ok: true },
      { text: 'Expenses, charts & analytics', ok: true },
    ],
    cta: 'Get Started',
  },
  {
    name: 'Growth', price: '₹499', sub: '/mo', popular: true,
    features: [
      { text: 'Up to 75 employees', ok: true },
      { text: 'Commission & daily wage workers', ok: true },
      { text: 'Advance management', ok: true },
      { text: 'Team access with role controls', ok: true },
    ],
    cta: 'Get Started',
  },
  {
    name: 'Business', price: '₹999', sub: '/mo', popular: false,
    features: [
      { text: 'Up to 500 employees', ok: true },
      { text: 'Everything in Growth', ok: true },
      { text: 'Expenses, charts & analytics', ok: true },
      { text: 'For large operations', ok: true },
    ],
    cta: 'Get Started',
  },
]

function StatCounter({ value, label }: { value: number; label: string }) {
  const count = useCountUp(value)
  return (
    <div className="flex flex-col gap-1 text-center">
      <span className="text-3xl font-bold text-text">{count}+</span>
      <span className="text-sm uppercase tracking-widest text-text-muted">{label}</span>
    </div>
  )
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const howItWorksRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: howItWorksRef, offset: ['start end', 'end start'] })
  const lineHeight = useTransform(scrollYProgress, [0.1, 0.8], ['0%', '100%'])

  return (
    <div className="min-h-screen bg-background font-sans overflow-x-hidden">

      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          animate={{ y: [0, -30, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)' }}
        />
        <motion.div
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute bottom-[20%] left-[-150px] w-[400px] h-[400px] rounded-full opacity-50"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)' }}
        />
      </div>

      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 backdrop-blur-xl bg-background/60 border-b border-[#7C3AED]/10 shadow-[0_0_40px_rgba(124,58,237,0.06)]">
        <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <img src="/payease logo.png" alt="PayEase" className="h-8 w-8 rounded-lg object-cover" />
            <span className="text-xl font-bold text-text tracking-tight">PayEase</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-text-muted hover:text-text transition-colors">Features</a>
            <a href="#how" className="text-sm text-text-muted hover:text-text transition-colors">How it works</a>
            <a href="#pricing" className="text-sm text-text-muted hover:text-text transition-colors">Pricing</a>
          </nav>
          <div className="hidden md:flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-primary hover:text-text transition-all">Sign In</Link>
            <motion.div whileTap={{ scale: 0.97 }}>
              <Link
                href="/login"
                className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)]"
              >
                Get Started
              </Link>
            </motion.div>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-text-muted hover:text-text">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-surface border-t border-[#7C3AED]/10 px-6 py-4 space-y-3">
            <a href="#features" onClick={() => setMenuOpen(false)} className="block text-sm text-text-muted">Features</a>
            <a href="#how" onClick={() => setMenuOpen(false)} className="block text-sm text-text-muted">How it works</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)} className="block text-sm text-text-muted">Pricing</a>
            <Link href="/login" onClick={() => setMenuOpen(false)} className="block text-sm text-text-muted">Sign in</Link>
            <Link href="/login" className="block bg-primary text-white text-sm font-bold px-4 py-2 rounded-xl text-center">
              Get Started
            </Link>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="px-6 pt-32 pb-24 md:pt-40 md:pb-32 max-w-7xl mx-auto text-center">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 bg-surface-elevated px-4 py-1.5 rounded-full mb-8 border border-[#7C3AED]/20">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest font-bold text-primary">Made for Bharat</span>
          </motion.div>

          <motion.h1 variants={fadeInUp} className="font-sans font-extrabold text-5xl md:text-7xl text-text leading-tight mb-6 tracking-tight">
            Payroll, <span className="text-primary-light italic">Simplified.</span>
          </motion.h1>

          <motion.p variants={fadeInUp} className="text-lg text-text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            Built for Indian businesses — manage salary, attendance, and advances in one place without the spreadsheet chaos.
          </motion.p>

          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            <motion.div whileTap={{ scale: 0.97 }}>
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 bg-primary text-white font-bold rounded-xl hover:scale-105 transition-transform inline-flex items-center gap-2"
              >
                Start Free Trial <ChevronRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Dashboard screenshot */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 12 }}
          animate={{ opacity: 1, y: 0, rotateX: 10 }}
          transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
          style={{ perspective: 1000 }}
          className="relative max-w-5xl mx-auto mt-16 px-4"
        >
          <div className="backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-2xl p-2 shadow-2xl shadow-black/60">
            <div className="rounded-xl overflow-hidden border border-white/5">
              <img
                src="/dashboard-preview.png"
                alt="PayEase Dashboard"
                className="w-full h-auto block"
              />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Stats Band */}
      <section className="bg-surface py-12 px-6">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-7xl mx-auto flex flex-wrap justify-around gap-8"
        >
          <motion.div variants={fadeInUp} className="flex flex-col gap-1 text-center">
            <span className="text-3xl font-bold text-text">500+</span>
            <span className="text-sm uppercase tracking-widest text-text-muted">Businesses</span>
          </motion.div>
          <motion.div variants={fadeInUp} className="flex flex-col gap-1 text-center">
            <span className="text-3xl font-bold text-text">₹2Cr+</span>
            <span className="text-sm uppercase tracking-widest text-text-muted">Monthly Payouts</span>
          </motion.div>
          <motion.div variants={fadeInUp} className="flex flex-col gap-1 text-center">
            <span className="text-3xl font-bold text-text">14-Day</span>
            <span className="text-sm uppercase tracking-widest text-text-muted">Free Trial</span>
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          <motion.div variants={fadeInUp} className="text-center mb-16">
            <h2 className="font-sans font-bold text-3xl md:text-4xl text-text mb-4">Everything you need</h2>
            <p className="text-text-muted max-w-xl mx-auto">Powerful features designed for the complexity of Indian businesses.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeInUp}
                className="backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-2xl p-8 hover:bg-primary/5 hover:shadow-[0_0_20px_rgba(124,58,237,0.15)] hover:border-[#7C3AED]/50 transition-all group"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-text mb-3">{f.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* How It Works */}
      <section id="how" className="py-24 bg-surface/30 relative" ref={howItWorksRef}>
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="text-center mb-20"
          >
            <motion.h2 variants={fadeInUp} className="font-sans font-bold text-3xl md:text-4xl text-text mb-4">How It Works</motion.h2>
            <motion.p variants={fadeInUp} className="text-text-muted">Get your team onboarded and paid in under 10 minutes.</motion.p>
          </motion.div>

          <div className="relative">
            {/* Animated connector line — centered on desktop */}
            <div className="absolute left-6 sm:left-1/2 top-0 bottom-0 w-px bg-[#7C3AED]/10 hidden sm:block -translate-x-1/2">
              <motion.div
                className="w-full bg-primary origin-top"
                style={{ height: lineHeight }}
              />
            </div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              className="space-y-16"
            >
              {STEPS.map((step, i) => (
                <motion.div key={step.n} variants={fadeInUp} className="flex flex-col sm:flex-row items-center gap-8 relative">
                  {/* Left side — odd steps show content here on desktop */}
                  <div className={`sm:flex-1 text-left sm:text-right ${i % 2 === 0 ? 'hidden sm:block' : 'hidden sm:block invisible'}`}>
                    {i % 2 === 0 && (
                      <>
                        <h4 className="text-xl font-bold text-text">{step.title}</h4>
                        <p className="text-sm text-text-muted mt-1">{step.desc}</p>
                      </>
                    )}
                  </div>
                  {/* Number bubble */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold z-10 shadow-[0_0_15px_rgba(124,58,237,0.5)]">
                    {step.n}
                  </div>
                  {/* Right side — even steps show content here on desktop; mobile always shows */}
                  <div className="sm:flex-1 text-left">
                    {i % 2 !== 0 ? (
                      <>
                        <h4 className="text-xl font-bold text-text">{step.title}</h4>
                        <p className="text-sm text-text-muted mt-1">{step.desc}</p>
                      </>
                    ) : (
                      <div className="sm:hidden">
                        <h4 className="text-xl font-bold text-text">{step.title}</h4>
                        <p className="text-sm text-text-muted mt-1">{step.desc}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 max-w-7xl mx-auto">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          <motion.div variants={fadeInUp} className="text-center mb-16">
            <h2 className="font-sans font-bold text-3xl md:text-4xl text-text mb-4">Pricing Plans</h2>
            <p className="text-text-muted">Scalable pricing for startups and established businesses.</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {PLANS.map((plan) => (
              <motion.div
                key={plan.name}
                variants={fadeInUp}
                className={`backdrop-blur-md bg-white/5 rounded-2xl p-8 flex flex-col ${
                  plan.popular
                    ? 'border-2 border-[#7C3AED]/50 shadow-[0_0_30px_rgba(124,58,237,0.2)] scale-105 relative'
                    : 'border border-[#7C3AED]/20'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-4 py-1 rounded-full uppercase tracking-widest">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-bold text-text mb-2">{plan.name}</h3>
                <div className="mb-8">
                  <span className="text-4xl font-extrabold text-text">{plan.price}</span>
                  <span className="text-text-muted text-sm">{plan.sub}</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f.text} className="flex items-center gap-3 text-sm">
                      {f.ok
                        ? <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                        : <XCircle className="h-4 w-4 text-text-muted/50 flex-shrink-0" />
                      }
                      <span className={f.ok ? 'text-text' : 'text-text-muted/50'}>{f.text}</span>
                    </li>
                  ))}
                </ul>
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Link
                    href="/login"
                    className={`block w-full py-3 rounded-xl font-bold text-center text-sm transition-all ${
                      plan.popular
                        ? 'bg-primary text-white hover:bg-primary/90 shadow-lg'
                        : 'border border-[#7C3AED]/30 text-text hover:bg-surface-elevated'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 p-12 md:p-20 rounded-[3rem] relative overflow-hidden"
        >
          <div className="absolute -bottom-1/2 -right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)' }}
          />
          <h2 className="font-sans font-extrabold text-3xl md:text-5xl text-text mb-6">Ready to fix your payroll?</h2>
          <p className="text-text-muted mb-10 text-lg">Join 500+ Indian businesses automating their payout cycles.</p>
          <div className="flex justify-center">
            <motion.div whileTap={{ scale: 0.97 }}>
              <Link href="/login" className="inline-block bg-primary text-white px-10 py-5 rounded-2xl font-bold text-lg hover:scale-105 transition-transform">
                Get Started Now
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-surface w-full border-t border-[#7C3AED]/10">
        <div className="flex flex-col md:flex-row justify-between items-center px-12 py-10 gap-6 max-w-7xl mx-auto">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <img src="/payease logo.png" alt="PayEase" className="h-7 w-7 rounded-lg object-cover" />
              <span className="text-lg font-bold text-text">PayEase</span>
            </div>
            <p className="text-sm text-text-muted">© 2026 PayEase. Made in India with Pride. 🇮🇳</p>
          </div>
          <div className="flex gap-8">
            <a href="#features" className="text-text-muted hover:text-text transition-colors text-sm">Features</a>
            <a href="#pricing" className="text-text-muted hover:text-text transition-colors text-sm">Pricing</a>
            <Link href="/login" className="text-text-muted hover:text-text transition-colors text-sm">Sign In</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
