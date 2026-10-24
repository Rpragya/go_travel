import { CalendarDays, MapPin, Users } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Img } from '@/components/ui/Img'
import { Stars } from '@/components/ui/Rating'
import { ItineraryCard } from '@/features/flights/FlightReviewPage'
import type { Booking } from '@/lib/types'
import { prettyDate } from '@/lib/utils'

export function BookingSummary({ booking }: { booking: Booking }) {
  if (booking.booking_type === 'FLIGHT') {
    return (
      <div className="space-y-4">
        {booking.flight && <ItineraryCard fare={booking.flight} label="Departure" />}
        {booking.return_flight && <ItineraryCard fare={booking.return_flight} label="Return" />}
      </div>
    )
  }
  const h = booking.hotel!
  return (
    <Card className="grid overflow-hidden sm:grid-cols-[200px_1fr]">
      <Img src={h.thumbnail} seed={h.slug} alt={h.name} className="aspect-[4/3] size-full object-cover sm:aspect-auto" />
      <div className="space-y-2 p-5">
        <Stars count={h.star_rating} />
        <h2 className="text-xl font-black">{h.name}</h2>
        <p className="flex items-center gap-1 text-sm text-gray-600"><MapPin className="size-4" /> {h.address}</p>
        <p className="flex items-center gap-1 text-sm">
          <CalendarDays className="size-4 text-gray-400" /> {prettyDate(booking.check_in!)} → {prettyDate(booking.check_out!)} ·{' '}
          {booking.nights} night{booking.nights > 1 && 's'}
        </p>
        <p className="flex items-center gap-1 text-sm">
          <Users className="size-4 text-gray-400" /> {booking.rooms} x {h.room.name} · {booking.guests} guest{booking.guests > 1 && 's'}
        </p>
      </div>
    </Card>
  )
}
