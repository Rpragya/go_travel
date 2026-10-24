import { useQuery } from '@tanstack/react-query'
import { BadgeCheck, Building2, Clock, Headphones, Plane, ShieldCheck } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { OfferCard } from '@/components/OfferCard'
import { FlightSearchForm } from '@/components/search/FlightSearchForm'
import { HotelSearchForm, hotelSearchUrl } from '@/components/search/HotelSearchForm'
import { Card, Skeleton } from '@/components/ui/Card'
import { Img } from '@/components/ui/Img'
import { api } from '@/lib/api'
import type { City, Coupon } from '@/lib/types'
import { cn, plusDays, prettyDate } from '@/lib/utils'
import { usePrefs } from '@/store/prefs'

export default function HomePage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'hotels' ? 'hotels' : 'flights'
  const { recentFlights, recentHotels } = usePrefs()
  const offers = useQuery({ queryKey: ['offers'], queryFn: () => api.get<Coupon[]>('/offers/').then((r) => r.data) })
  const cities = useQuery({
    queryKey: ['popular-cities'],
    queryFn: () => api.get<City[]>('/locations/cities/popular/').then((r) => r.data),
    staleTime: 10 * 60_000,
  })

  const tabs = [
    { id: 'flights', label: 'Flights', icon: Plane },
    { id: 'hotels', label: 'Hotels', icon: Building2 },
  ] as const

  return (
    <>
      <section className="bg-gradient-to-b from-brand-900 via-brand-700 to-brand-500 px-4 pt-8 pb-24">
        <div className="mx-auto max-w-6xl">
          <h1 className="mb-6 text-center text-3xl font-black text-white sm:text-4xl">
            Where do you want to <span className="text-accent-500">go</span> next?
          </h1>
          <Card className="relative mx-auto px-4 pt-10 pb-6 sm:px-6">
            <div className="absolute -top-8 left-1/2 flex -translate-x-1/2 gap-1 rounded-xl bg-white p-1.5 shadow-lg">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setParams(id === 'hotels' ? { tab: 'hotels' } : {})}
                  className={cn(
                    'flex w-24 cursor-pointer flex-col items-center gap-1 rounded-lg py-2 text-xs font-bold sm:w-28',
                    tab === id ? 'bg-brand-50 text-brand-600' : 'text-gray-500 hover:text-gray-800',
                  )}
                >
                  <Icon className="size-6" />
                  {label}
                </button>
              ))}
            </div>
            {tab === 'flights' ? <FlightSearchForm /> : <HotelSearchForm />}
          </Card>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-12 px-4 pt-16">
        {(tab === 'flights' ? recentFlights.length : recentHotels.length) > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-black">Recent searches</h2>
            <div className="scrollbar-none flex gap-3 overflow-x-auto pb-1">
              {tab === 'flights'
                ? recentFlights.map((r) => (
                    <Link
                      key={`${r.from}-${r.to}`}
                      to={`/flights?from=${r.from}&to=${r.to}&date=${r.date < plusDays(0) ? plusDays(1) : r.date}${r.returnDate ? `&return=${r.returnDate}` : ''}&adults=${r.adults}&children=${r.children}&cabin=${r.cabin}`}
                      className="shrink-0 rounded-xl bg-white px-4 py-3 shadow-sm hover:shadow-md"
                    >
                      <div className="font-bold">
                        {r.fromCity} → {r.toCity}
                      </div>
                      <div className="text-xs text-gray-500">
                        {prettyDate(r.date, 'd MMM')} {r.returnDate && `- ${prettyDate(r.returnDate, 'd MMM')}`} ·{' '}
                        {r.adults + r.children} traveller(s)
                      </div>
                    </Link>
                  ))
                : recentHotels.map((r) => (
                    <Link
                      key={r.city}
                      to={hotelSearchUrl({ id: r.city, name: r.cityName }, r.checkIn < plusDays(0) ? plusDays(1) : r.checkIn, r.checkOut < plusDays(1) ? plusDays(3) : r.checkOut, r)}
                      className="shrink-0 rounded-xl bg-white px-4 py-3 shadow-sm hover:shadow-md"
                    >
                      <div className="font-bold">Hotels in {r.cityName}</div>
                      <div className="text-xs text-gray-500">
                        {prettyDate(r.checkIn, 'd MMM')} - {prettyDate(r.checkOut, 'd MMM')} · {r.guests} guest(s)
                      </div>
                    </Link>
                  ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-2xl font-black">Offers for you</h2>
            <Link to="/offers" className="text-sm font-bold text-brand-600">
              View all →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {offers.isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-44" />)}
            {offers.data?.slice(0, 4).map((o) => <OfferCard key={o.code} offer={o} />)}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-black">Popular destinations</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {cities.isLoading && Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="aspect-[4/3]" />)}
            {cities.data?.map((c) => (
              <Link
                key={c.id}
                to={hotelSearchUrl(c, plusDays(7), plusDays(9), { rooms: 1, guests: 2 })}
                className="group relative aspect-[4/3] overflow-hidden rounded-xl shadow-sm"
              >
                <Img
                  src={c.image_url}
                  seed={c.name}
                  alt={c.name}
                  className="size-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute bottom-0 p-3 text-white">
                  <div className="text-lg font-black">{c.name}</div>
                  <div className="text-xs opacity-90">{c.tagline}</div>
                  <div className="mt-1 text-xs font-bold text-accent-500">{c.hotel_count} hotels</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-4 rounded-2xl bg-white p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: BadgeCheck, title: 'Best price guarantee', text: 'Transparent fares with no hidden charges.' },
            { icon: ShieldCheck, title: 'Secure payments', text: 'Payments verified server-side with signatures.' },
            { icon: Clock, title: 'Instant confirmation', text: 'E-ticket and voucher emailed in seconds.' },
            { icon: Headphones, title: 'Easy cancellations', text: 'Cancel online and track your refund.' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-3">
              <Icon className="size-8 shrink-0 text-brand-500" />
              <div>
                <h3 className="font-bold">{title}</h3>
                <p className="text-sm text-gray-500">{text}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </>
  )
}
