'use client'

import { Menu } from 'lucide-react'

interface NavbarProps {
  onMenuOpen: () => void
}

export default function Navbar({ onMenuOpen }: NavbarProps) {
  return (
    <header className="md:hidden flex items-center gap-3 px-4 h-14 bg-[#1A1035] border-b border-[#7C3AED]/10 shrink-0">
      <button
        onClick={onMenuOpen}
        className="p-2 rounded-lg text-text-muted hover:bg-[#7C3AED]/10 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2">
        <img src="/payease logo.png" alt="PayEase" className="h-6 w-6 rounded-md object-cover" />
        <span className="font-bold text-text text-sm tracking-tight">PayEase</span>
      </div>
    </header>
  )
}
