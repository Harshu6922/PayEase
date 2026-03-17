import { redirect } from 'next/navigation'

export default function Home() {
  // We don't have a public landing page in MVP, redirect immediately to dashboard 
  // (which will redirect to login if not authenticated via middleware)
  redirect('/dashboard')
}
