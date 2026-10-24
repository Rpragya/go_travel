import { ArrowLeftRight } from 'lucide-react'
import { useState } from 'react'
import { createSearchParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import type { Airport, CabinClass } from '@/lib/types'
import { cn, fromISODate, plusDays } from '@/lib/utils'
import { usePrefs } from '@/store/prefs'
import { AirportPicker } from './AirportPicker'
import { DateField } from './DateField'
import { TravellersPicker, type TravellersValue } from './TravellersPicker'

export interface FlightSearchInitial {
  from?: Airport | null
  to?: Airport | null
  date?: string
  returnDate?: string | null
  travellers?: TravellersValue
}

const DEFAULT_FROM: Airport = { iata: 'DEL', city: 'New Delhi', name: 'Indira Gandhi International Airport' }
const DEFAULT_TO: Airport = { iata: 'BOM', city: 'Mumbai', name: 'Chhatrapati Shivaji Maharaj International Airport' }

export function FlightSearchForm({ initial, compact }: { initial?: FlightSearchInitial; compact?: boolean }) {
  const navigate = useNavigate()
  const addRecent = usePrefs((s) => s.addRecentFlight)
  const [from, setFrom] = useState<Airport | null>(initial?.from ?? DEFAULT_FROM)
  const [to, setTo] = useState<Airport | null>(initial?.to ?? DEFAULT_TO)
  const [date, setDate] = useState(initial?.date ?? plusDays(7))
  const [returnDate, setReturnDate] = useState<string | null>(initial?.returnDate ?? null)
  const [travellers, setTravellers] = useState<TravellersValue>(
    initial?.travellers ?? { adults: 1, children: 0, cabin: 'ECONOMY' as CabinClass },
  )
  const roundTrip = returnDate !== null

  const submit = () => {
    if (!from || !to) return toast.error('Please select both cities.')
    if (from.iata === to.iata) return toast.error('From and To cities cannot be the same.')
    const params: Record<string, string> = {
      from: from.iata,
      to: to.iata,
      date,
      adults: String(travellers.adults),
      children: String(travellers.children),
      cabin: travellers.cabin,
    }
    if (returnDate) params.return = returnDate
    addRecent({
      from: from.iata, fromCity: from.city, to: to.iata, toCity: to.city, date,
      returnDate: returnDate ?? undefined, ...travellers,
    })
    navigate({ pathname: '/flights', search: createSearchParams(params).toString() })
  }

  return (
    <div>
      <div className="mb-3 flex gap-4 text-sm font-bold">
        {[
          { label: 'One Way', active: !roundTrip, onClick: () => setReturnDate(null) },
          { label: 'Round Trip', active: roundTrip, onClick: () => setReturnDate(returnDate ?? plusDays(3, fromISODate(date))) },
        ].map((t) => (
          <label key={t.label} className="flex cursor-pointer items-center gap-2">
            <input type="radio" checked={t.active} onChange={t.onClick} className="accent-brand-500" />
            <span className={cn(t.active ? 'text-gray-900' : 'text-gray-500')}>{t.label}</span>
          </label>
        ))}
      </div>
      <div className={cn('grid gap-2', compact ? 'lg:grid-cols-[1fr_1fr_0.8fr_0.8fr_1fr_auto]' : 'lg:grid-cols-[1.2fr_1.2fr_0.8fr_0.8fr_1fr]')}>
        <div className="relative grid grid-cols-2 gap-2 sm:contents">
          <AirportPicker label="From" value={from} onChange={setFrom} exclude={to?.iata} />
          <button
            type="button"
            onClick={() => {
              setFrom(to)
              setTo(from)
            }}
            className="absolute top-1/2 left-1/2 z-10 grid size-8 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-gray-200 bg-white text-brand-500 shadow sm:hidden"
            aria-label="Swap cities"
          >
            <ArrowLeftRight className="size-4" />
          </button>
          <AirportPicker label="To" value={to} onChange={setTo} exclude={from?.iata} />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:contents">
          <DateField
            label="Departure"
            value={date}
            onChange={(d) => {
              setDate(d)
              if (returnDate && returnDate < d) setReturnDate(d)
            }}
          />
          <DateField
            label="Return"
            value={returnDate}
            min={date}
            align="right"
            onChange={setReturnDate}
            onClear={() => setReturnDate(null)}
            placeholder="Book a round trip"
          />
        </div>
        <TravellersPicker value={travellers} onChange={setTravellers} />
        {compact && (
          <Button size="lg" className="h-full min-h-12" pill onClick={submit}>
            Search
          </Button>
        )}
      </div>
      {!compact && (
        <div className="-mb-12 flex justify-center pt-6">
          <Button size="lg" pill className="h-12 w-56 text-xl" onClick={submit}>
            SEARCH
          </Button>
        </div>
      )}
    </div>
  )
}
