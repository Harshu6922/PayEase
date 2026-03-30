'use client'

import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useProfile } from '@/lib/hooks/useAppData'
import SettingsClient from './SettingsClient'

async function fetchSettingsData() {
  const res = await fetch('/api/settings/members')
  if (!res.ok) return null
  return res.json()
}

export default function SettingsPage() {
  const router = useRouter()
  const { data: profile, isLoading: profileLoading } = useProfile()
  const { data } = useSWR(
    profile?.company_id && profile.role === 'admin' ? 'settings-members' : null,
    fetchSettingsData,
    { revalidateOnFocus: false }
  )

  useEffect(() => {
    if (!profileLoading && profile && profile.role !== 'admin') {
      router.replace('/dashboard')
    }
  }, [profile, profileLoading, router])

  if (!data) return null

  return (
    <SettingsClient
      companyName={data.companyName}
      companyId={data.companyId}
      currentUserId={data.currentUserId}
      userEmail={data.userEmail}
      members={data.members}
    />
  )
}
