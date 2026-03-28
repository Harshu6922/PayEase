'use client'

import { motion } from 'framer-motion'
import { useCountUp } from '@/lib/hooks/useCountUp'
import { springScaleIn } from '@/lib/animations'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: number
  prefix?: string
  suffix?: string
  icon: LucideIcon
  valueClassName?: string
  className?: string
}

export default function MetricCard({
  label,
  value,
  prefix = '',
  suffix = '',
  icon: Icon,
  valueClassName,
  className,
}: MetricCardProps) {
  const count = useCountUp(value)

  return (
    <motion.div
      variants={springScaleIn}
      initial="hidden"
      animate="visible"
      className={cn(
        'backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-xl p-4',
        'hover:shadow-[0_0_20px_rgba(124,58,237,0.15)] hover:border-[#7C3AED]/50 transition-all duration-200',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-text-muted uppercase tracking-wide">{label}</p>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary-light" />
        </div>
      </div>
      <p className={cn('text-2xl font-mono font-bold', valueClassName)}>
        {prefix}{count.toLocaleString('en-IN')}{suffix}
      </p>
    </motion.div>
  )
}
