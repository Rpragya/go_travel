import { useQuery } from '@tanstack/react-query'
import { Building2, ChevronRight, Plane } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Card, Skeleton } from '@/components/ui/Card'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { api, errorMessage } from '@/lib/api'
import type { Booking } from '@/lib/types'
import { cn, fmtDateTime, formatINR, prettyDate } from '@/lib/utils'
import { StatusBadge } from './StatusBadge'

const TABS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'pending', label: 'Pending payment' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
]

export function tripTitle(b: Booking) {
  if (b.booking_type === 'FLIGHT' && b.flight) {
    const f = b.flight.flight
    return `${f.origin.city} → ${f.destination.city}${b.return_flight ? ' (round trip)' : ''}`
  }
  return b.hotel?.name ?? b.reference
}

export default function MyTripsPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'upcoming'
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['trips', tab],
    queryFn: () => api.get<Booking[]>('/bookings/', { params: { tab } }).then((r) => r.data),
  })

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-black">My Trips</h1>
      <div className="scrollbar-none mb-6 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setParams({ tab: t.id })}
            className={cn(
              'shrink-0 cursor-pointer rounded-full px-4 py-1.5 text-sm font-bold',
              tab === t.id ? 'bg-brand-500 text-white' : 'bg-white text-gray-600 shadow-sm',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {isLoading && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        {isError && <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />}
        {data?.length === 0 && (
          <EmptyState
            title={`No ${TABS.find((t) => t.id === tab)?.label.toLowerCase()} trips`}
            message="Trips you book will show up here."
            action={<Link to="/" className="font-bold text-brand-600">Plan a trip</Link>}
          />
        )}
        {data?.map((b) => {
          const Icon = b.booking_type === 'FLIGHT' ? Plane : Building2
          return (
            <Link key={b.reference} to={b.status === 'PENDING' ? `/checkout/${b.reference}` : `/trips/${b.reference}`}>
              <Card className="flex items-center gap-4 p-4 transition hover:shadow-md">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
                  <Icon className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-black">{tripTitle(b)}</h2>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="text-sm text-gray-600">
                    {b.booking_type === 'FLIGHT'
                      ? fmtDateTime(b.starts_at)
                      : `${prettyDate(b.check_in!)} - ${prettyDate(b.check_out!)}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {b.reference} · {formatINR(b.total_amount)}
                  </p>
                </div>
                <ChevronRight className="size-5 text-gray-400" />
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
