import type { Amenity, PropertyType } from '@/lib/types'
import { cn } from '@/lib/utils'

export interface HotelFilterState {
  price: string | null
  stars: number[]
  minRating: number | null
  amenities: number[]
  types: PropertyType[]
  q: string
}

export const emptyHotelFilters: HotelFilterState = { price: null, stars: [], minRating: null, amenities: [], types: [], q: '' }

export const PRICE_BUCKETS = [
  { id: '0-2000', label: '₹0 - ₹2,000' },
  { id: '2000-4000', label: '₹2,000 - ₹4,000' },
  { id: '4000-8000', label: '₹4,000 - ₹8,000' },
  { id: '8000-15000', label: '₹8,000 - ₹15,000' },
  { id: '15000-', label: '₹15,000+' },
]

function toggle<T>(list: T[], v: T) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

export function HotelFilters({
  value,
  onChange,
  amenities,
}: {
  value: HotelFilterState
  onChange: (v: HotelFilterState) => void
  amenities: Amenity[]
}) {
  const dirty = JSON.stringify(value) !== JSON.stringify(emptyHotelFilters)
  const check = 'flex cursor-pointer items-center gap-2 py-1 text-sm'
  return (
    <aside className="space-y-6 rounded-xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black">Filters</h2>
        {dirty && (
          <button className="cursor-pointer text-xs font-bold text-brand-600" onClick={() => onChange(emptyHotelFilters)}>
            CLEAR ALL
          </button>
        )}
      </div>
      <input
        value={value.q}
        onChange={(e) => onChange({ ...value, q: e.target.value })}
        placeholder="Search hotel or locality"
        className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-brand-500"
        aria-label="Search hotel or locality"
      />
      <section>
        <h3 className="mb-2 text-sm font-black">Price per night</h3>
        {PRICE_BUCKETS.map((b) => (
          <label key={b.id} className={check}>
            <input
              type="radio"
              name="price"
              className="accent-brand-500"
              checked={value.price === b.id}
              onChange={() => onChange({ ...value, price: b.id })}
            />
            {b.label}
          </label>
        ))}
      </section>
      <section>
        <h3 className="mb-2 text-sm font-black">Star category</h3>
        <div className="flex flex-wrap gap-2">
          {[5, 4, 3, 2].map((s) => (
            <button
              key={s}
              onClick={() => onChange({ ...value, stars: toggle(value.stars, s) })}
              aria-pressed={value.stars.includes(s)}
              className={cn(
                'cursor-pointer rounded-full border px-3 py-1 text-xs font-bold',
                value.stars.includes(s) ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-300 text-gray-600',
              )}
            >
              {s} ★
            </button>
          ))}
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-black">User rating</h3>
        {[
          { v: 4.5, l: 'Excellent: 4.5+' },
          { v: 4, l: 'Very good: 4+' },
          { v: 3, l: 'Good: 3+' },
        ].map((r) => (
          <label key={r.v} className={check}>
            <input
              type="radio"
              name="rating"
              className="accent-brand-500"
              checked={value.minRating === r.v}
              onChange={() => onChange({ ...value, minRating: r.v })}
            />
            {r.l}
          </label>
        ))}
      </section>
      <section>
        <h3 className="mb-2 text-sm font-black">Property type</h3>
        {(['HOTEL', 'RESORT', 'VILLA', 'HOMESTAY'] as const).map((t) => (
          <label key={t} className={cn(check, 'capitalize')}>
            <input
              type="checkbox"
              className="accent-brand-500"
              checked={value.types.includes(t)}
              onChange={() => onChange({ ...value, types: toggle(value.types, t) })}
            />
            {t.toLowerCase()}
          </label>
        ))}
      </section>
      <section>
        <h3 className="mb-2 text-sm font-black">Amenities</h3>
        {amenities.map((a) => (
          <label key={a.id} className={check}>
            <input
              type="checkbox"
              className="accent-brand-500"
              checked={value.amenities.includes(a.id)}
              onChange={() => onChange({ ...value, amenities: toggle(value.amenities, a.id) })}
            />
            {a.name}
          </label>
        ))}
      </section>
    </aside>
  )
}
