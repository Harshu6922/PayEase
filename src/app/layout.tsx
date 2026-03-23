import type { Metadata } from 'next'
import { Inter, DM_Sans } from 'next/font/google'
import './globals.css'
import AppShell from '@/components/AppShell'
import { ThemeProvider } from 'next-themes'
import { Suspense } from 'react'
import TrialBanner from '@/components/TrialBanner'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })

export const metadata: Metadata = {
  title: 'PayEase',
  description: 'Manage employees, attendance, and payroll efficiently',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PayEase',
  },
  other: {
    'theme-color': '#1C2333',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${dmSans.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AppShell banner={<Suspense fallback={null}><TrialBanner /></Suspense>}>
            {children}
          </AppShell>
        </ThemeProvider>
      </body>
    </html>
  )
}
