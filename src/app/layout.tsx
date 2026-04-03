import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import AppShell from '@/components/AppShell'
import { Suspense } from 'react'
import TrialBanner from '@/components/TrialBanner'
import InstallPrompt from '@/components/InstallPrompt'
import Prefetcher from '@/components/Prefetcher'
import { Analytics } from '@vercel/analytics/next'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' })

export const metadata: Metadata = {
  metadataBase: new URL('https://www.payeasebuddy.co.in'),
  title: {
    default: 'PayEase — Payroll & Attendance Management for Indian Businesses',
    template: '%s | PayEase',
  },
  description: 'PayEase is a simple payroll and attendance management app for small businesses in India. Manage salaried, daily, and commission workers, generate PDF payslips, track advances, and run payroll in minutes.',
  keywords: [
    'payroll software India', 'attendance management', 'salary management app',
    'payslip generator India', 'small business payroll', 'employee management',
    'daily wage worker app', 'advance management', 'payroll India',
    'HR software small business', 'PayEase',
  ],
  authors: [{ name: 'PayEase', url: 'https://www.payeasebuddy.co.in' }],
  creator: 'PayEase',
  publisher: 'PayEase',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://www.payeasebuddy.co.in',
    siteName: 'PayEase',
    title: 'PayEase — Payroll & Attendance Management for Indian Businesses',
    description: 'Simple payroll software for Indian small businesses. Manage employees, attendance, advances, and generate payslips in minutes.',
    images: [{ url: '/dashboard-preview.png', width: 1280, height: 800, alt: 'PayEase Dashboard' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PayEase — Payroll & Attendance Management for Indian Businesses',
    description: 'Simple payroll software for Indian small businesses. Manage employees, attendance, advances, and generate payslips in minutes.',
    images: ['/dashboard-preview.png'],
  },
  manifest: '/manifest.json',
  icons: { icon: '/favicon.ico', apple: '/icons/icon-192.png' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PayEase',
  },
  other: { 'theme-color': '#0F0A1E' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="font-sans bg-background text-text antialiased">
        <AppShell banner={<Suspense fallback={null}><TrialBanner /></Suspense>}>
          {children}
        </AppShell>
        <Prefetcher />
        <InstallPrompt />
        <Analytics />
      </body>
    </html>
  )
}
