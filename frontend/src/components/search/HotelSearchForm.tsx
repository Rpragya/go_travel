import { useState } from 'react'
import { createSearchParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { cn, fromISODate, plusDays } from '@/lib/utils'
import { usePrefs } from '@/store/prefs'
import { CityPicker, type CityValue } from './CityPicker'
import { DateField } from './DateField'
import { GuestsPicker, type GuestsValue } from './GuestsPicker'

export interface HotelSearchInitial {
  city?: CityValue | null
  checkIn?: string
  checkOut?: string
  guests?: GuestsValue
}

export function hotelSearchUrl(city: CityValue, checkIn: string, checkOut: string, g: GuestsValue) {
  return {
    pathname: '/hotels',
    search: createSearchParams({
      city: String(city.id),
      cityName: city.name,
      check_in: checkIn,
      check_out: checkOut,
      rooms: String(g.rooms),
      guests: String(g.guests),
    }).toString(),
  }
}

export function HotelSearchForm({ initial, compact }: { initial?: HotelSearchInitial; compact?: boolean }) {
  const navigate = useNavigate()
  const addRecent = usePrefs((s) => s.addRecentHotel)
  const [city, setCity] = useState<CityValue | null>(initial?.city ?? null)
  const [checkIn, setCheckIn] = useState(initial?.checkIn ?? plusDays(7))
  const [checkOut, setCheckOut] = useState(initial?.checkOut ?? plusDays(9))
  const [guests, setGuests] = useState<GuestsValue>(initial?.guests ?? { rooms: 1, guests: 2 })

  const submit = () => {
    if (!city) return toast.error('Please choose a destination.')
    if (checkOut <= checkIn) return toast.error('Check-out must be after check-in.')
    addRecent({ city: city.id, cityName: city.name, checkIn, checkOut, ...guests })
    navigate(hotelSearchUrl(city, checkIn, checkOut, guests))
  }

  return (
    <div>
      <div className={cn('grid gap-2', compact ? 'lg:grid-cols-[1.5fr_0.8fr_0.8fr_1fr_auto]' : 'lg:grid-cols-[1.6fr_0.8fr_0.8fr_1fr]')}>
        <CityPicker value={city} onChange={setCity} />
        <div className="grid grid-cols-2 gap-2 sm:contents">
          <DateField
            label="Check-in"
            value={checkIn}
            onChange={(d) => {
              setCheckIn(d)
              if (checkOut <= d) setCheckOut(plusDays(1, fromISODate(d)))
            }}
          />
          <DateField label="Check-out" value={checkOut} min={plusDays(1, fromISODate(checkIn))} onChange={setCheckOut} align="right" />
        </div>
        <GuestsPicker value={guests} onChange={setGuests} />
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
