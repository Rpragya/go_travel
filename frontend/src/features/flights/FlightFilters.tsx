import { Moon, Sun, Sunrise, Sunset } from 'lucide-react'
import type { FlightSearchResponse } from '@/lib/types'
import { cn, formatINR } from '@/lib/utils'

export interface FlightFilterState {
  stops: string[]
  airlines: string[]
  slots: string[]
  maxPrice: number | null
  refundable: boolean
}

export const emptyFlightFilters: FlightFilterState = { stops: [], airlines: [], slots: [], maxPrice: null, refundable: false }

const SLOTS = [
  { id: 'early', label: 'Before 6 AM', icon: Sunrise },
  { id: 'morning', label: '6 AM - 12 PM', icon: Sun },
  { id: 'afternoon', label: '12 PM - 6 PM', icon: Sunset },
  { id: 'night', label: 'After 6 PM', icon: Moon },
]

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

export function FlightFilters({
  value,
  onChange,
  facets,
}: {
  value: FlightFilterState
  onChange: (v: FlightFilterState) => void
  facets?: FlightSearchResponse['facets']
}) {
  const range = facets?.price_range
  const dirty = JSON.stringify(value) !== JSON.stringify(emptyFlightFilters)
  return (
    <aside className="space-y-6 rounded-xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black">Filters</h2>
        {dirty && (
          <button className="cursor-pointer text-xs font-bold text-brand-600" onClick={() => onChange(emptyFlightFilters)}>
            CLEAR ALL
          </button>
        )}
      </div>

      <section>
        <h3 className="mb-2 text-sm font-black">Popular filters</h3>
        <label className="flex cursor-pointer items-center gap-2 py-1 text-sm">
          <input type="checkbox" className="accent-brand-500" checked={value.stops.includes('0')} onChange={() => onChange({ ...value, stops: toggle(value.stops, '0') })} />
          Non-stop
        </label>
        <label className="flex cursor-pointer items-center gap-2 py-1 text-sm">
          <input type="checkbox" className="accent-brand-500" checked={value.stops.includes('1')} onChange={() => onChange({ ...value, stops: toggle(value.stops, '1') })} />
          1 stop
        </label>
        <label className="flex cursor-pointer items-center gap-2 py-1 text-sm">
          <input type="checkbox" className="accent-brand-500" checked={value.refundable} onChange={() => onChange({ ...value, refundable: !value.refundable })} />
          Refundable fares
        </label>
      </section>

      {range?.min != null && range.max != null && range.max > range.min && (
        <section>
          <h3 className="mb-2 text-sm font-black">One-way price</h3>
          <input
            type="range"
            min={Math.floor(range.min)}
            max={Math.ceil(range.max)}
            step={100}
            value={value.maxPrice ?? Math.ceil(range.max)}
            onChange={(e) => onChange({ ...value, maxPrice: Number(e.target.value) })}
            className="w-full accent-brand-500"
            aria-label="Maximum price"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{formatINR(range.min)}</span>
            <span className="font-bold text-gray-800">up to {formatINR(value.maxPrice ?? range.max)}</span>
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-sm font-black">Departure time</h3>
        <div className="grid grid-cols-2 gap-2">
          {SLOTS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onChange({ ...value, slots: toggle(value.slots, id) })}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-2 text-[11px] font-bold',
                value.slots.includes(id) ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600',
              )}
              aria-pressed={value.slots.includes(id)}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
      </section>

      {!!facets?.airlines.length && (
        <section>
          <h3 className="mb-2 text-sm font-black">Airlines</h3>
          {facets.airlines.map((a) => (
            <label key={a.code} className="flex cursor-pointer items-center gap-2 py-1 text-sm">
              <input
                type="checkbox"
                className="accent-brand-500"
                checked={value.airlines.includes(a.code)}
                onChange={() => onChange({ ...value, airlines: toggle(value.airlines, a.code) })}
              />
              <span className="flex-1">{a.name}</span>
              <span className="text-xs text-gray-500">{formatINR(a.min_price)}</span>
            </label>
          ))}
        </section>
      )}
    </aside>
  )
}
