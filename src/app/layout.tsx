import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import AppShell from '@/components/AppShell'
import { Suspense } from 'react'
import TrialBanner from '@/components/TrialBanner'
import InstallPrompt from '@/components/InstallPrompt'
import { Analytics } from '@vercel/analytics/next'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' })

export const metadata: Metadata = {
  title: 'PayEase',
  description: 'Manage employees, attendance, and payroll efficiently',
  manifest: '/manifest.json',
  icons: { icon: '/favicon.ico', apple: '/icons/icon-192.png' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PayEase',
  },
  other: {
    'theme-color': '#0F0A1E',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans bg-background text-text antialiased">
        <AppShell banner={<Suspense fallback={null}><TrialBanner /></Suspense>}>
          {children}
        </AppShell>
        <InstallPrompt />
        <Analytics />
      </body>
    </html>
  )
}
