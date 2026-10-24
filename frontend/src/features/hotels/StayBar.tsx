import { useSearchParams } from 'react-router-dom'
import { DateField } from '@/components/search/DateField'
import { GuestsPicker } from '@/components/search/GuestsPicker'
import { fromISODate, plusDays } from '@/lib/utils'

/** Edits the stay (dates/guests) in the URL, used on the hotel detail page. */
export function useStay() {
  const [params, setParams] = useSearchParams()
  const checkIn = params.get('check_in') || plusDays(7)
  const checkOut = params.get('check_out') || plusDays(1, fromISODate(checkIn))
  const rooms = Number(params.get('rooms') ?? 1)
  const guests = Number(params.get('guests') ?? 2)
  const update = (next: Partial<{ check_in: string; check_out: string; rooms: number; guests: number }>) => {
    const merged = { check_in: checkIn, check_out: checkOut, rooms, guests, ...next }
    if (merged.check_out <= merged.check_in) merged.check_out = plusDays(1, fromISODate(merged.check_in))
    setParams(
      { check_in: merged.check_in, check_out: merged.check_out, rooms: String(merged.rooms), guests: String(merged.guests) },
      { replace: true },
    )
  }
  return { checkIn, checkOut, rooms, guests, update }
}

export function StayBar({ stay }: { stay: ReturnType<typeof useStay> }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <DateField label="Check-in" value={stay.checkIn} onChange={(d) => stay.update({ check_in: d })} />
      <DateField
        label="Check-out"
        value={stay.checkOut}
        min={plusDays(1, fromISODate(stay.checkIn))}
        onChange={(d) => stay.update({ check_out: d })}
      />
      <GuestsPicker value={{ rooms: stay.rooms, guests: stay.guests }} onChange={(v) => stay.update(v)} />
    </div>
  )
}
