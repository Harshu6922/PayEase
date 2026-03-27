import type { Metadata } from 'next'
import { Inter, DM_Sans, Geist } from 'next/font/google'
import './globals.css'
import AppShell from '@/components/AppShell'
import { ThemeProvider } from 'next-themes'
import { Suspense } from 'react'
import TrialBanner from '@/components/TrialBanner'
import InstallPrompt from '@/components/InstallPrompt'
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })

export const metadata: Metadata = {
  title: 'PayEase',
  description: 'Manage employees, attendance, and payroll efficiently',
  manifest: '/manifest.json',
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
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body className={`${inter.variable} ${dmSans.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AppShell banner={<Suspense fallback={null}><TrialBanner /></Suspense>}>
            {children}
          </AppShell>
          <InstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  )
}
