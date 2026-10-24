import { Badge } from '@/components/ui/Card'
import type { BookingStatus } from '@/lib/types'

const MAP: Record<BookingStatus, { tone: 'green' | 'red' | 'yellow' | 'gray'; label: string }> = {
  CONFIRMED: { tone: 'green', label: 'Confirmed' },
  PENDING: { tone: 'yellow', label: 'Payment pending' },
  CANCELLED: { tone: 'red', label: 'Cancelled' },
  EXPIRED: { tone: 'gray', label: 'Expired' },
  FAILED: { tone: 'red', label: 'Failed' },
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  const s = MAP[status]
  return <Badge tone={s.tone}>{s.label}</Badge>
}
