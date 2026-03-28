import { cn } from '@/lib/utils'

type AttendanceStatus = 'Present' | 'Absent' | 'Half Day' | 'Holiday'
type PaymentStatus = 'Paid' | 'Pending' | 'Partial'

type Status = AttendanceStatus | PaymentStatus

const statusStyles: Record<Status, string> = {
  Paid: 'bg-success/15 text-success border-success/30',
  Present: 'bg-success/15 text-success border-success/30',
  Pending: 'bg-warning/15 text-warning border-warning/30',
  'Half Day': 'bg-warning/15 text-warning border-warning/30',
  Partial: 'bg-primary/15 text-primary-light border-primary/30',
  Absent: 'bg-danger/15 text-danger border-danger/30',
  Holiday: 'bg-text-muted/15 text-text-muted border-text-muted/30',
}

interface StatusBadgeProps {
  status: Status
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        statusStyles[status] ?? 'bg-text-muted/15 text-text-muted border-text-muted/30',
        className
      )}
    >
      {status}
    </span>
  )
}
