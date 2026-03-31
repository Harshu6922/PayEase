'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'

export interface GlassSelectOption {
  value: string
  label: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  options: GlassSelectOption[]
  disabled?: boolean
  style?: React.CSSProperties
  placeholder?: string
}

export default function GlassSelect({ value, onChange, options, disabled, style, placeholder }: Props) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)

  function openDrop() {
    if (disabled) return
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect())
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        dropRef.current && !dropRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    function handleScroll() { setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open])

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      onClick={openDrop}
      disabled={disabled}
      style={{
        width: '100%', borderRadius: 12, padding: '10px 14px', fontSize: 13,
        color: disabled ? '#6b6080' : '#ebe1fe',
        background: 'rgba(189,157,255,0.05)',
        border: `1px solid ${open ? 'rgba(189,157,255,0.35)' : 'rgba(189,157,255,0.12)'}`,
        outline: 'none', boxSizing: 'border-box' as const,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'border-color 0.15s',
        textAlign: 'left',
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      <span>{selected?.label ?? placeholder ?? ''}</span>
      <ChevronDown size={13} style={{ color: '#afa7c2', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
    </button>
  )

  const dropdown = open && rect && typeof document !== 'undefined' ? createPortal(
    <div
      ref={dropRef}
      style={{
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 99999,
        background: 'rgba(22,17,38,0.98)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(189,157,255,0.2)',
        borderRadius: 12,
        boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
        overflow: 'hidden',
        padding: '4px',
      }}
    >
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => { onChange(opt.value); setOpen(false) }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '9px 12px', borderRadius: 8,
            fontSize: 13, textAlign: 'left', border: 'none', cursor: 'pointer',
            background: opt.value === value ? 'rgba(189,157,255,0.12)' : 'transparent',
            color: opt.value === value ? '#bd9dff' : '#ebe1fe',
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => {
            if (opt.value !== value) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(189,157,255,0.06)'
          }}
          onMouseLeave={e => {
            if (opt.value !== value) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
          }}
        >
          <span>{opt.label}</span>
          {opt.value === value && <Check size={12} style={{ flexShrink: 0 }} />}
        </button>
      ))}
    </div>,
    document.body
  ) : null

  return (
    <>
      {trigger}
      {dropdown}
    </>
  )
}
