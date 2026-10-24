import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { List, Map as MapIcon, SlidersHorizontal } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { HotelSearchForm } from '@/components/search/HotelSearchForm'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Card'
import { Select } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { EmptyState, ErrorState, Spinner } from '@/components/ui/States'
import { api, errorMessage } from '@/lib/api'
import type { HotelSearchResponse } from '@/lib/types'
import { useDebounced } from '@/lib/useDebounced'
import { cn, nightsBetween, prettyDate } from '@/lib/utils'
import { HotelCard } from './HotelCard'
import { emptyHotelFilters, HotelFilters, type HotelFilterState } from './HotelFilters'

const HotelMap = lazy(() => import('./HotelMap').then((m) => ({ default: m.HotelMap })))

const SORTS = [
  { id: 'popularity', label: 'Popularity' },
  { id: 'price', label: 'Price: low to high' },
  { id: '-price', label: 'Price: high to low' },
  { id: 'rating', label: 'User rating' },
  { id: 'stars', label: 'Star category' },
]

export default function HotelResultsPage() {
  const [params] = useSearchParams()
  return <HotelResults key={params.toString()} />
}

function HotelResults() {
  const [params] = useSearchParams()
  const city = params.get('city') ?? ''
  const cityName = params.get('cityName') ?? ''
  const checkIn = params.get('check_in') ?? ''
  const checkOut = params.get('check_out') ?? ''
  const rooms = Number(params.get('rooms') ?? 1)
  const guests = Number(params.get('guests') ?? 2)
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 1

  const [filters, setFilters] = useState<HotelFilterState>(emptyHotelFilters)
  const [sort, setSort] = useState('popularity')
  const [view, setView] = useState<'list' | 'map'>('list')
  const [editing, setEditing] = useState(false)
  const [mobileFilters, setMobileFilters] = useState(false)
  const q = useDebounced(filters.q, 350)

  const [minPrice, maxPrice] = (filters.price ?? '-').split('-')
  const query = useInfiniteQuery({
    queryKey: ['hotels', city, checkIn, checkOut, rooms, guests, { ...filters, q }, sort],
    queryFn: ({ pageParam }) =>
      api
        .get<HotelSearchResponse>('/hotels/search/', {
          params: {
            city, check_in: checkIn, check_out: checkOut, rooms, guests, sort, page: pageParam,
            q: q || undefined,
            stars: filters.stars.join(',') || undefined,
            amenities: filters.amenities.join(',') || undefined,
            property_type: filters.types.join(',') || undefined,
            min_rating: filters.minRating ?? undefined,
            min_price: minPrice || undefined,
            max_price: maxPrice || undefined,
          },
        })
        .then((r) => r.data),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (last.next ? all.length + 1 : undefined),
    enabled: !!(city && checkIn && checkOut),
    placeholderData: keepPreviousData,
  })

  const first = query.data?.pages[0]
  const hotels = query.data?.pages.flatMap((p) => p.results) ?? []
  const stay = `check_in=${checkIn}&check_out=${checkOut}&rooms=${rooms}&guests=${guests}`
  const linkFor = (slug: string) => `/hotels/${slug}?${stay}`
  const filtersPanel = <HotelFilters value={filters} onChange={setFilters} amenities={first?.facets.amenities ?? []} />

  return (
    <div className="pb-12">
      <div className="bg-brand-900 px-4 py-3 text-white">
        <div className="mx-auto max-w-7xl">
          {editing ? (
            <div className="rounded-xl bg-white p-4 text-gray-900">
              <HotelSearchForm
                compact
                initial={{ city: { id: Number(city), name: cityName }, checkIn, checkOut, guests: { rooms, guests } }}
              />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="text-lg font-black">{cityName || 'Hotels'}</div>
              <div className="text-sm text-white/80">
                {checkIn && prettyDate(checkIn)} - {checkOut && prettyDate(checkOut)} · {rooms} room{rooms > 1 && 's'},{' '}
                {guests} guest{guests > 1 && 's'}
              </div>
              <Button size="sm" pill className="ml-auto" onClick={() => setEditing(true)}>
                Modify search
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 pt-6 lg:grid-cols-[280px_1fr]">
        <div className="hidden lg:block">{filtersPanel}</div>
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="mr-auto text-xl font-black">
              {first ? `${first.count} properties in ${first.city.name}` : 'Searching hotels…'}
            </h1>
            <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setMobileFilters(true)}>
              <SlidersHorizontal className="size-4" /> Filters
            </Button>
            <Select className="h-9 w-auto" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  Sort: {s.label}
                </option>
              ))}
            </Select>
            <div className="flex rounded-lg bg-white p-1 shadow-sm">
              {(['list', 'map'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    'flex cursor-pointer items-center gap-1 rounded-md px-3 py-1 text-sm font-bold capitalize',
                    view === v ? 'bg-brand-500 text-white' : 'text-gray-600',
                  )}
                  aria-pressed={view === v}
                >
                  {v === 'list' ? <List className="size-4" /> : <MapIcon className="size-4" />} {v}
                </button>
              ))}
            </div>
          </div>

          {query.isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          {query.isError && <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />}
          {first && hotels.length === 0 && (
            <EmptyState
              title="No properties match your filters"
              message="Try a different price range or remove some filters."
              action={<Button variant="outline" size="sm" onClick={() => setFilters(emptyHotelFilters)}>Clear filters</Button>}
            />
          )}

          {view === 'map' && first && hotels.length > 0 ? (
            <Suspense fallback={<Spinner label="Loading map…" />}>
              <HotelMap
                hotels={hotels}
                center={[first.city.latitude, first.city.longitude]}
                linkFor={(h) => linkFor(h.slug)}
              />
            </Suspense>
          ) : (
            <div className={cn('space-y-4 transition-opacity', query.isFetching && !query.isFetchingNextPage && !query.isLoading && 'opacity-60')}>
              {hotels.map((h) => (
                <HotelCard key={h.id} hotel={h} to={linkFor(h.slug)} nights={nights} />
              ))}
            </div>
          )}
          {query.hasNextPage && (
            <div className="flex justify-center">
              <Button variant="outline" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
                Show more properties
              </Button>
            </div>
          )}
        </div>
      </div>

      <Modal open={mobileFilters} onClose={() => setMobileFilters(false)} title="Filters">
        {filtersPanel}
        <Button className="mt-4 w-full" onClick={() => setMobileFilters(false)}>
          Show properties
        </Button>
      </Modal>
    </div>
  )
}
