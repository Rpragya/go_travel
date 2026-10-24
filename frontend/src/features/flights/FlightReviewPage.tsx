import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueries, useQuery } from '@tanstack/react-query'
import { Info, Lock, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Badge, Card, Skeleton } from '@/components/ui/Card'
import { ErrorState } from '@/components/ui/States'
import { ContactFields, contactSchema, emptyPassenger, PassengerFields, passengerSchema } from '@/features/booking/PassengerFields'
import { CouponBox } from '@/features/booking/CouponBox'
import { PriceSummary } from '@/features/booking/PriceSummary'
import { useSavedTravellers } from '@/features/booking/useTravellers'
import { api, errorMessage } from '@/lib/api'
import type { Booking, Fare, Quote } from '@/lib/types'
import { dayDiff, fmtDay, fmtTime, formatDuration } from '@/lib/utils'
import { useAuth } from '@/store/auth'
import { AirlineLogo } from './AirlineLogo'

const schema = z.object({ passengers: z.array(passengerSchema), ...contactSchema })
type FormValues = z.infer<typeof schema>

export default function FlightReviewPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user, openAuth } = useAuth()
  const fareIds = [params.get('fare'), params.get('return_fare')].filter(Boolean) as string[]
  const adults = Math.max(1, Number(params.get('adults') ?? 1))
  const children = Math.max(0, Number(params.get('children') ?? 0))
  const [coupon, setCoupon] = useState<string | null>(null)

  const fares = useQueries({
    queries: fareIds.map((id) => ({
      queryKey: ['fare', id],
      queryFn: () => api.get<Fare>(`/flights/fares/${id}/`).then((r) => r.data),
    })),
  })
  const quote = useQuery({
    queryKey: ['quote', 'flight', fareIds, adults + children, coupon],
    queryFn: () =>
      api
        .post<Quote>('/bookings/quote/', {
          booking_type: 'FLIGHT',
          fare_id: fareIds[0],
          return_fare_id: fareIds[1] ?? null,
          travellers: adults + children,
          coupon_code: coupon ?? '',
        })
        .then((r) => r.data),
    enabled: fareIds.length > 0,
  })
  const saved = useSavedTravellers()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      passengers: [
        ...Array.from({ length: adults }, () => emptyPassenger('ADULT')),
        ...Array.from({ length: children }, () => emptyPassenger('CHILD')),
      ],
      contact_email: user?.email ?? '',
      contact_phone: user?.phone ?? '',
    },
  })
  const { fields } = useFieldArray({ control: form.control, name: 'passengers' })

  const create = useMutation({
    mutationFn: (v: FormValues) =>
      api
        .post<Booking>('/bookings/', {
          booking_type: 'FLIGHT',
          fare_id: fareIds[0],
          return_fare_id: fareIds[1] ?? null,
          ...v,
          coupon_code: quote.data?.coupon_valid ? coupon : '',
        })
        .then((r) => r.data),
    onSuccess: (b) => navigate(`/checkout/${b.reference}`),
    onError: (e) => toast.error(errorMessage(e)),
  })

  if (fareIds.length === 0) return <div className="p-8"><ErrorState message="No flight selected." /></div>
  const loaded = fares.every((f) => f.data)
  const failed = fares.find((f) => f.isError)

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-black">Review your booking</h1>
      {failed && <ErrorState message={errorMessage(failed.error)} />}
      <form
        className="grid gap-6 lg:grid-cols-[1fr_340px]"
        onSubmit={form.handleSubmit((v) => (user ? create.mutate(v) : openAuth('login')))}
      >
        <div className="space-y-6">
          {!loaded ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : (
            fares.map((f, i) => f.data && <ItineraryCard key={f.data.id} fare={f.data} label={i === 0 ? 'Departure' : 'Return'} />)
          )}

          <Card className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black">Traveller details</h2>
              {!user && (
                <button type="button" onClick={() => openAuth('login')} className="cursor-pointer text-sm font-bold text-brand-600">
                  Login to use saved travellers
                </button>
              )}
            </div>
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
              <Info className="size-4 shrink-0" /> Enter names exactly as on the government ID you'll carry to the airport.
            </p>
            {fields.map((field, i) => (
              <PassengerFields
                key={field.id}
                index={i}
                label={field.pax_type === 'ADULT' ? `Adult ${i + 1}` : `Child ${i - adults + 1}`}
                register={form.register}
                setValue={form.setValue}
                errors={form.formState.errors}
                saved={saved.data}
              />
            ))}
          </Card>

          <Card className="space-y-4 p-5">
            <h2 className="text-lg font-black">Contact details</h2>
            <ContactFields register={form.register} errors={form.formState.errors} />
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <PriceSummary quote={quote.data} baseLabel={`Base fare (${adults + children} traveller${adults + children > 1 ? 's' : ''})`} loading={quote.isLoading} />
          <CouponBox bookingType="FLIGHT" code={coupon} onChange={setCoupon} quote={quote.data} />
          <Button type="submit" size="lg" variant="accent" className="w-full" loading={create.isPending} disabled={!loaded}>
            {user ? (
              'CONTINUE TO PAYMENT'
            ) : (
              <>
                <Lock className="size-4" /> LOGIN TO CONTINUE
              </>
            )}
          </Button>
          <p className="flex items-center justify-center gap-1 text-xs text-gray-500">
            <ShieldCheck className="size-4 text-emerald-600" /> Seats are held for 15 minutes while you pay.
          </p>
        </div>
      </form>
    </div>
  )
}

export function ItineraryCard({ fare, label }: { fare: Fare; label: string }) {
  const f = fare.flight
  const plus = dayDiff(f.departure, f.arrival)
  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone="blue">{label}</Badge>
        <h2 className="font-black">
          {f.origin.city} → {f.destination.city}
        </h2>
        <span className="text-sm text-gray-500">
          {fmtDay(f.departure)} · {f.stops ? '1 stop' : 'Non stop'} · {formatDuration(f.duration_minutes)}
        </span>
        {fare.refundable ? <Badge tone="green">Refundable</Badge> : <Badge>Non-refundable</Badge>}
      </div>
      <div className="flex items-center gap-3">
        <AirlineLogo airline={f.airline} />
        <div className="text-sm">
          <span className="font-bold">{f.airline.name}</span>{' '}
          <span className="text-gray-500">
            {f.airline.code}-{f.flight_number} · {f.aircraft} · {fare.cabin_class.toLowerCase()}
          </span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-lg bg-gray-50 p-4">
        <div>
          <div className="text-xl font-black">{fmtTime(f.departure)}</div>
          <div className="text-sm font-bold">{f.origin.city} ({f.origin.iata})</div>
          <div className="text-xs text-gray-500">{f.origin.name}</div>
        </div>
        <div className="text-center text-xs text-gray-500">
          {formatDuration(f.duration_minutes)}
          {f.stop_airport && <div>via {f.stop_airport.city}</div>}
        </div>
        <div className="text-right">
          <div className="text-xl font-black">
            {fmtTime(f.arrival)} {plus > 0 && <sup className="text-[10px] text-red-600">+{plus}</sup>}
          </div>
          <div className="text-sm font-bold">{f.destination.city} ({f.destination.iata})</div>
          <div className="text-xs text-gray-500">{f.destination.name}</div>
        </div>
      </div>
      <div className="mt-3 text-xs text-gray-600">
        Baggage: {fare.baggage_checkin} check-in, {fare.baggage_cabin} cabin per traveller
      </div>
    </Card>
  )
}
