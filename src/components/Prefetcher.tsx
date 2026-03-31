'use client'

import { useEffect } from 'react'
import { mutate } from 'swr'

// Warms the SWR cache for the most-visited pages on first app load.
// Runs once silently in the background — no UI rendered.
export default function Prefetcher() {
  useEffect(() => {
    const endpoints = ['/api/dashboard', '/api/employees-list']
    endpoints.forEach(url => {
      mutate(url, fetch(url).then(r => r.ok ? r.json() : null), false)
    })
  }, [])

  return null
}
