import { cn } from '@/lib/utils'

type WorkerType = 'Salaried' | 'Daily' | 'Commission'

const typeStyles: Record<WorkerType, string> = {
  Salaried: 'bg-primary/15 text-primary-light border-primary/30',
  Daily: 'bg-rupee-gold/15 text-rupee-gold border-rupee-gold/30',
  Commission: 'bg-[#A855F7]/15 text-[#A855F7] border-[#A855F7]/30',
}

interface WorkerTypeBadgeProps {
  type: WorkerType
  className?: string
}

export default function WorkerTypeBadge({ type, className }: WorkerTypeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        typeStyles[type] ?? 'bg-text-muted/15 text-text-muted border-text-muted/30',
        className
      )}
    >
      {type}
    </span>
  )
}
