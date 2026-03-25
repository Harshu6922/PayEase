'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState<any>(null)
  const [show, setShow] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem('pwa_dismissed')) return

    // iOS detection
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const standalone = (navigator.standalone as boolean | undefined) ?? false
    if (ios && !standalone) { setIsIos(true); setShow(true); return }

    // Android / Chrome
    const handler = (e: Event) => { e.preventDefault(); setPrompt(e); setShow(true) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    localStorage.setItem('pwa_dismissed', '1')
    setShow(false)
    setDismissed(true)
  }

  async function install() {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setShow(false)
  }

  if (!show || dismissed) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto bg-[#1C2333] text-white rounded-2xl shadow-2xl px-4 py-4 flex items-start gap-3">
      <img src="/icons/icon-192.png" alt="PayEase" className="h-12 w-12 rounded-xl flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">Add PayEase to Home Screen</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {isIos
            ? 'Tap the Share button then "Add to Home Screen"'
            : 'Get quick access from your home screen'}
        </p>
        {!isIos && (
          <button
            onClick={install}
            className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            Add to Home Screen
          </button>
        )}
      </div>
      <button onClick={dismiss} className="text-gray-400 hover:text-white flex-shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
