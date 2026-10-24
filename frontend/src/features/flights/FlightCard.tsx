import { ChevronDown, Luggage, Plane } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/Card'
import type { Fare } from '@/lib/types'
import { cn, dayDiff, fmtDay, fmtTime, formatDuration, formatINR } from '@/lib/utils'
import { AirlineLogo } from './AirlineLogo'

export function FlightCard({
  fare,
  onBook,
  selected,
  onSelect,
  compact,
}: {
  fare: Fare
  onBook?: () => void
  selected?: boolean
  onSelect?: () => void
  compact?: boolean
}) {
  const [details, setDetails] = useState(false)
  const f = fare.flight
  const plusDays = dayDiff(f.departure, f.arrival)

  return (
    <div
      className={cn(
        'rounded-xl bg-white shadow-[0_1px_6px_rgba(0,0,0,0.12)] transition',
        selected && 'ring-2 ring-brand-500',
        onSelect && 'cursor-pointer',
      )}
      onClick={onSelect}
    >
      <div className={cn('grid items-center gap-4 p-4', compact ? 'grid-cols-[1fr_auto]' : 'sm:grid-cols-[180px_1fr_auto]')}>
        <div className="flex items-center gap-3">
          {onSelect && <input type="radio" checked={!!selected} readOnly className="accent-brand-500" aria-label="Select flight" />}
          <AirlineLogo airline={f.airline} />
          <div className="min-w-0">
            <div className="truncate text-sm font-bold">{f.airline.name}</div>
            <div className="text-xs text-gray-500">
              {f.airline.code} {f.flight_number}
            </div>
          </div>
        </div>
        <div className={cn('grid grid-cols-[auto_1fr_auto] items-center gap-3', compact && 'col-span-2 row-start-2')}>
          <div>
            <div className="text-xl font-black">{fmtTime(f.departure)}</div>
            <div className="text-xs text-gray-600">{f.origin.city}</div>
          </div>
          <div className="text-center text-xs text-gray-500">
            <div>{formatDuration(f.duration_minutes)}</div>
            <div className="relative my-1 h-0.5 bg-emerald-400">
              {f.stops > 0 && <span className="absolute top-1/2 left-1/2 size-2 -translate-1/2 rounded-full bg-orange-400" />}
            </div>
            <div className={cn('font-bold', f.stops ? 'text-orange-600' : 'text-emerald-700')}>
              {f.stops ? `1 stop via ${f.stop_airport?.city ?? ''}` : 'Non stop'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-black">
              {fmtTime(f.arrival)}
              {plusDays > 0 && <sup className="ml-0.5 text-[10px] text-red-600">+{plusDays}</sup>}
            </div>
            <div className="text-xs text-gray-600">{f.destination.city}</div>
          </div>
        </div>
        <div className={cn('flex items-center justify-between gap-4 sm:flex-col sm:items-end', compact && 'flex-col items-end')}>
          <div className="text-right">
            <div className="text-xl font-black">{formatINR(fare.price)}</div>
            <div className="text-xs text-gray-500">per adult</div>
          </div>
          {onBook && (
            <button
              onClick={onBook}
              className="cursor-pointer rounded-full border border-brand-500 px-5 py-1.5 text-sm font-bold text-brand-600 hover:bg-brand-50"
            >
              BOOK NOW
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 px-4 py-2">
        {fare.refundable ? <Badge tone="green">Refundable</Badge> : <Badge>Non-refundable</Badge>}
        {fare.seats_available <= 5 && <Badge tone="red">Only {fare.seats_available} seats left</Badge>}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setDetails((d) => !d)
          }}
          className="ml-auto flex cursor-pointer items-center gap-1 text-xs font-bold text-brand-600"
          aria-expanded={details}
        >
          Flight details <ChevronDown className={cn('size-4 transition', details && 'rotate-180')} />
        </button>
      </div>
      {details && (
        <div className="grid gap-4 border-t border-gray-100 bg-gray-50 p-4 text-sm sm:grid-cols-3" onClick={(e) => e.stopPropagation()}>
          <div>
            <div className="mb-1 flex items-center gap-1 text-xs font-bold text-gray-500 uppercase">
              <Plane className="size-3" /> Itinerary
            </div>
            <div>
              {f.origin.iata} {fmtTime(f.departure)} → {f.destination.iata} {fmtTime(f.arrival)}
            </div>
            <div className="text-xs text-gray-500">{fmtDay(f.departure)}</div>
            <div className="text-xs text-gray-500">{f.aircraft}</div>
          </div>
          <div>
            <div className="mb-1 flex items-center gap-1 text-xs font-bold text-gray-500 uppercase">
              <Luggage className="size-3" /> Baggage
            </div>
            <div>Check-in: {fare.baggage_checkin}</div>
            <div>Cabin: {fare.baggage_cabin}</div>
          </div>
          <div>
            <div className="mb-1 text-xs font-bold text-gray-500 uppercase">Fare breakup (per adult)</div>
            <div>Base fare: {formatINR(fare.base_fare)}</div>
            <div>Taxes: {formatINR(fare.taxes)}</div>
          </div>
        </div>
      )}
    </div>
  )
}
