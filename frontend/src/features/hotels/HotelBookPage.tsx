import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Lock, MapPin, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Badge, Card } from '@/components/ui/Card'
import { Img } from '@/components/ui/Img'
import { Stars } from '@/components/ui/Rating'
import { ErrorState, Spinner } from '@/components/ui/States'
import { CouponBox } from '@/features/booking/CouponBox'
import { ContactFields, contactSchema, emptyPassenger, PassengerFields, passengerSchema } from '@/features/booking/PassengerFields'
import { PriceSummary } from '@/features/booking/PriceSummary'
import { useSavedTravellers } from '@/features/booking/useTravellers'
import { api, errorMessage } from '@/lib/api'
import type { Booking, HotelDetail, Quote, RoomType } from '@/lib/types'
import { nightsBetween, prettyDate } from '@/lib/utils'
import { useAuth } from '@/store/auth'

const schema = z.object({ passengers: z.array(passengerSchema).length(1), ...contactSchema })
type FormValues = z.infer<typeof schema>

export default function HotelBookPage() {
  const { slug = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user, openAuth } = useAuth()
  const roomId = Number(params.get('room'))
  const checkIn = params.get('check_in') ?? ''
  const checkOut = params.get('check_out') ?? ''
  const rooms = Number(params.get('rooms') ?? 1)
  const guests = Number(params.get('guests') ?? 1)
  const nights = nightsBetween(checkIn, checkOut)
  const [coupon, setCoupon] = useState<string | null>(null)

  const hotel = useQuery({ queryKey: ['hotel', slug], queryFn: () => api.get<HotelDetail>(`/hotels/${slug}/`).then((r) => r.data) })
  const roomList = useQuery({
    queryKey: ['rooms', slug, checkIn, checkOut, rooms, guests],
    queryFn: () =>
      api.get<RoomType[]>(`/hotels/${slug}/rooms/`, { params: { check_in: checkIn, check_out: checkOut, rooms, guests } }).then((r) => r.data),
  })
  const quote = useQuery({
    queryKey: ['quote', 'hotel', roomId, checkIn, checkOut, rooms, guests, coupon],
    queryFn: () =>
      api
        .post<Quote>('/bookings/quote/', {
          booking_type: 'HOTEL', room_type_id: roomId, check_in: checkIn, check_out: checkOut, rooms, guests,
          coupon_code: coupon ?? '',
        })
        .then((r) => r.data),
    retry: false,
  })
  const saved = useSavedTravellers()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      passengers: [{ ...emptyPassenger('ADULT'), first_name: user?.first_name ?? '', last_name: user?.last_name ?? '' }],
      contact_email: user?.email ?? '',
      contact_phone: user?.phone ?? '',
    },
  })
  const create = useMutation({
    mutationFn: (v: FormValues) =>
      api
        .post<Booking>('/bookings/', {
          booking_type: 'HOTEL', room_type_id: roomId, check_in: checkIn, check_out: checkOut, rooms, guests, ...v,
          coupon_code: quote.data?.coupon_valid ? coupon : '',
        })
        .then((r) => r.data),
    onSuccess: (b) => navigate(`/checkout/${b.reference}`),
    onError: (e) => toast.error(errorMessage(e)),
  })

  if (hotel.isLoading || roomList.isLoading) return <Spinner />
  const room = roomList.data?.find((r) => r.id === roomId)
  if (!hotel.data || !room) return <div className="p-8"><ErrorState message="This room is no longer available for your dates." /></div>
  if (quote.isError) return <div className="p-8"><ErrorState message={errorMessage(quote.error)} /></div>
  const h = hotel.data

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-black">Review your stay</h1>
      <form
        className="grid gap-6 lg:grid-cols-[1fr_340px]"
        onSubmit={form.handleSubmit((v) => (user ? create.mutate(v) : openAuth('login')))}
      >
        <div className="space-y-6">
          <Card className="grid overflow-hidden sm:grid-cols-[200px_1fr]">
            <Img src={h.images[0]?.url} seed={h.slug} alt={h.name} className="aspect-[4/3] size-full object-cover sm:aspect-auto" />
            <div className="space-y-2 p-5">
              <Stars count={h.star_rating} />
              <h2 className="text-xl font-black">{h.name}</h2>
              <p className="flex items-center gap-1 text-sm text-gray-600"><MapPin className="size-4" /> {h.address}</p>
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-gray-50 p-3 text-sm">
                <div>
                  <div className="text-xs text-gray-500 uppercase">Check-in</div>
                  <div className="font-bold">{prettyDate(checkIn)}</div>
                  <div className="text-xs text-gray-500">{h.check_in_time.slice(0, 5)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Check-out</div>
                  <div className="font-bold">{prettyDate(checkOut)}</div>
                  <div className="text-xs text-gray-500">{h.check_out_time.slice(0, 5)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Stay</div>
                  <div className="font-bold">{nights} night{nights > 1 && 's'}</div>
                  <div className="text-xs text-gray-500">{guests} guest{guests > 1 && 's'}</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <b>{rooms} x {room.name}</b>
                {room.breakfast_included && <Badge tone="blue">Breakfast included</Badge>}
                {room.refundable ? <Badge tone="green">Free cancellation</Badge> : <Badge>Non-refundable</Badge>}
              </div>
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <h2 className="text-lg font-black">Primary guest</h2>
            <PassengerFields
              index={0}
              label="Guest who will check in"
              register={form.register}
              setValue={form.setValue}
              errors={form.formState.errors}
              saved={saved.data}
            />
            <ContactFields register={form.register} errors={form.formState.errors} />
          </Card>

          <Card className="p-5 text-sm text-gray-600">
            <h2 className="mb-2 text-lg font-black text-gray-900">Cancellation policy</h2>
            {room.refundable
              ? 'Free cancellation until 24 hours before check-in. Cancellations within 24 hours are charged one night.'
              : 'This booking is non-refundable. No refund will be issued on cancellation.'}
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <PriceSummary quote={quote.data} baseLabel={`${rooms} room x ${nights} night${nights > 1 ? 's' : ''}`} loading={quote.isLoading} />
          <CouponBox bookingType="HOTEL" code={coupon} onChange={setCoupon} quote={quote.data} />
          <Button type="submit" size="lg" variant="accent" className="w-full" loading={create.isPending}>
            {user ? 'CONTINUE TO PAYMENT' : <><Lock className="size-4" /> LOGIN TO CONTINUE</>}
          </Button>
          <p className="flex items-center justify-center gap-1 text-xs text-gray-500">
            <ShieldCheck className="size-4 text-emerald-600" /> Your room is held for 15 minutes while you pay.
          </p>
        </div>
      </form>
    </div>
  )
}
