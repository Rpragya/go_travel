import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ArrowRight, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { createSearchParams, useNavigate, useSearchParams } from 'react-router-dom'
import { FlightSearchForm } from '@/components/search/FlightSearchForm'
import { CABINS } from '@/components/search/TravellersPicker'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { api, errorMessage } from '@/lib/api'
import type { CabinClass, Fare, FlightSearchResponse } from '@/lib/types'
import { cn, formatINR, prettyDate } from '@/lib/utils'
import { emptyFlightFilters, FlightFilters, type FlightFilterState } from './FlightFilters'
import { FlightCard } from './FlightCard'

const SORTS = [
  { id: 'price', label: 'Cheapest' },
  { id: 'duration', label: 'Fastest' },
  { id: 'departure', label: 'Early departure' },
  { id: '-departure', label: 'Late departure' },
]

function useFlightSearch(from: string, to: string, date: string | null, travellers: number, cabin: string, filters: FlightFilterState, sort: string) {
  return useQuery({
    queryKey: ['flights', from, to, date, travellers, cabin, filters, sort],
    queryFn: () =>
      api
        .get<FlightSearchResponse>('/flights/search/', {
          params: {
            from, to, date, travellers, cabin, sort,
            stops: filters.stops.join(',') || undefined,
            airlines: filters.airlines.join(',') || undefined,
            slot: filters.slots.join(',') || undefined,
            max_price: filters.maxPrice ?? undefined,
            refundable: filters.refundable || undefined,
          },
        })
        .then((r) => r.data),
    enabled: !!(from && to && date),
    placeholderData: keepPreviousData,
  })
}

/** Keyed on the URL so a new search starts with fresh selection/edit state. */
export default function FlightResultsPage() {
  const [params] = useSearchParams()
  return <FlightResults key={params.toString()} />
}

function FlightResults() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const date = params.get('date') ?? ''
  const returnDate = params.get('return')
  const adults = Number(params.get('adults') ?? 1)
  const children = Number(params.get('children') ?? 0)
  const cabin = (params.get('cabin') ?? 'ECONOMY') as CabinClass
  const travellers = adults + children

  const [filters, setFilters] = useState<FlightFilterState>(emptyFlightFilters)
  const [sort, setSort] = useState('price')
  const [editing, setEditing] = useState(false)
  const [mobileFilters, setMobileFilters] = useState(false)
  const [outSel, setOutSel] = useState<Fare | null>(null)
  const [retSel, setRetSel] = useState<Fare | null>(null)

  const outbound = useFlightSearch(from, to, date, travellers, cabin, filters, sort)
  const inbound = useFlightSearch(to, from, returnDate, travellers, cabin, filters, sort)
  const calendar = useQuery({
    queryKey: ['calendar', from, to, date],
    queryFn: () =>
      api.get<{ date: string; min_price: number | null }[]>('/flights/calendar/', { params: { from, to, date } }).then((r) => r.data),
    enabled: !!(from && to && date) && !returnDate,
    staleTime: 5 * 60_000,
  })

  const book = (fare: Fare, ret?: Fare | null) =>
    navigate({
      pathname: '/flights/review',
      search: createSearchParams({
        fare: String(fare.id),
        ...(ret ? { return_fare: String(ret.id) } : {}),
        adults: String(adults),
        children: String(children),
      }).toString(),
    })

  const initial = useMemo(() => {
    const d = outbound.data
    return {
      from: d ? { iata: d.origin.iata, city: d.origin.city, name: '' } : null,
      to: d ? { iata: d.destination.iata, city: d.destination.city, name: '' } : null,
      date,
      returnDate,
      travellers: { adults, children, cabin },
    }
  }, [outbound.data, date, returnDate, adults, children, cabin])

  const resetFilters = () => setFilters(emptyFlightFilters)
  const filtersPanel = <FlightFilters value={filters} onChange={setFilters} facets={outbound.data?.facets} />
  const fromCity = outbound.data?.origin.city ?? from
  const toCity = outbound.data?.destination.city ?? to

  return (
    <div className="pb-28">
      <div className="bg-brand-900 px-4 py-3 text-white">
        <div className="mx-auto max-w-7xl">
          {editing && outbound.data ? (
            <div className="rounded-xl bg-white p-4 text-gray-900">
              <FlightSearchForm key={params.toString()} initial={initial} compact />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-2 text-lg font-black">
                {fromCity} <ArrowRight className="size-4" /> {toCity}
              </div>
              <div className="text-sm text-white/80">
                {date && prettyDate(date)}
                {returnDate && ` - ${prettyDate(returnDate)}`} · {travellers} traveller{travellers > 1 && 's'} ·{' '}
                {CABINS.find((c) => c.value === cabin)?.label}
              </div>
              <Button size="sm" pill className="ml-auto" onClick={() => setEditing(true)}>
                Modify search
              </Button>
            </div>
          )}
        </div>
      </div>

      {!returnDate && calendar.data && (
        <div className="border-b border-gray-200 bg-white">
          <div className="scrollbar-none mx-auto flex max-w-7xl overflow-x-auto">
            {calendar.data.map((c) => (
              <button
                key={c.date}
                onClick={() => {
                  params.set('date', c.date)
                  setParams(params)
                }}
                className={cn(
                  'min-w-28 flex-1 cursor-pointer border-b-4 px-3 py-2 text-center',
                  c.date === date ? 'border-brand-500 bg-brand-50' : 'border-transparent hover:bg-gray-50',
                )}
              >
                <div className="text-xs font-bold">{prettyDate(c.date, 'EEE, d MMM')}</div>
                <div className={cn('text-sm', c.date === date ? 'font-black text-brand-700' : 'text-gray-600')}>
                  {c.min_price ? formatINR(c.min_price) : '-'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-7xl gap-6 px-4 pt-6 lg:grid-cols-[280px_1fr]">
        <div className="hidden lg:block">{filtersPanel}</div>
        <div className="min-w-0">
          <div className="mb-4 flex items-center gap-2">
            <div className="scrollbar-none flex flex-1 gap-2 overflow-x-auto">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSort(s.id)}
                  className={cn(
                    'shrink-0 cursor-pointer rounded-full px-4 py-1.5 text-sm font-bold',
                    sort === s.id ? 'bg-brand-500 text-white' : 'bg-white text-gray-600 shadow-sm',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setMobileFilters(true)}>
              <SlidersHorizontal className="size-4" /> Filters
            </Button>
          </div>

          {returnDate ? (
            <div className="grid gap-4 md:grid-cols-2">
              <FlightList
                title={`${fromCity} → ${toCity}`}
                subtitle={prettyDate(date)}
                query={outbound}
                selected={outSel}
                onSelect={setOutSel}
                onReset={resetFilters}
                compact
              />
              <FlightList
                title={`${toCity} → ${fromCity}`}
                subtitle={prettyDate(returnDate)}
                query={inbound}
                selected={retSel}
                onSelect={setRetSel}
                onReset={resetFilters}
                compact
              />
            </div>
          ) : (
            <FlightList
              title={`Flights from ${fromCity} to ${toCity}`}
              query={outbound}
              onBook={(f) => book(f)}
              onReset={resetFilters}
            />
          )}
        </div>
      </div>

      {returnDate && outSel && retSel && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-brand-900 px-4 py-3 text-white shadow-2xl">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4">
            <div className="text-sm">
              <div>
                {outSel.flight.airline.name} {outSel.flight.airline.code}-{outSel.flight.flight_number} ·{' '}
                {retSel.flight.airline.name} {retSel.flight.airline.code}-{retSel.flight.flight_number}
              </div>
              <div className="text-xs text-white/70">Price per adult for the round trip</div>
            </div>
            <div className="ml-auto text-2xl font-black">{formatINR(Number(outSel.price) + Number(retSel.price))}</div>
            <Button
              variant="accent"
              pill
              disabled={new Date(retSel.flight.departure) <= new Date(outSel.flight.arrival)}
              onClick={() => book(outSel, retSel)}
            >
              BOOK NOW
            </Button>
          </div>
        </div>
      )}

      <Modal open={mobileFilters} onClose={() => setMobileFilters(false)} title="Filters">
        {filtersPanel}
        <Button className="mt-4 w-full" onClick={() => setMobileFilters(false)}>
          Show flights
        </Button>
      </Modal>
    </div>
  )
}

function FlightList({
  title,
  subtitle,
  query,
  onBook,
  selected,
  onSelect,
  onReset,
  compact,
}: {
  title: string
  subtitle?: string
  query: ReturnType<typeof useFlightSearch>
  onBook?: (f: Fare) => void
  selected?: Fare | null
  onSelect?: (f: Fare) => void
  onReset: () => void
  compact?: boolean
}) {
  const { data, isLoading, isError, error, refetch, isFetching } = query
  return (
    <section className={cn('space-y-3 transition-opacity', isFetching && !isLoading && 'opacity-60')}>
      <div>
        <h1 className="text-lg font-black">{title}</h1>
        {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
        {data && <div className="text-xs text-gray-500">{data.count} flights found</div>}
      </div>
      {isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      {isError && <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />}
      {data?.results.length === 0 && (
        <EmptyState
          title="No flights match"
          message="Try removing a few filters or choosing another date."
          action={
            <Button variant="outline" size="sm" onClick={onReset}>
              Clear filters
            </Button>
          }
        />
      )}
      {data?.results.map((fare) => (
        <FlightCard
          key={fare.id}
          fare={fare}
          compact={compact}
          onBook={onBook ? () => onBook(fare) : undefined}
          selected={selected?.id === fare.id}
          onSelect={onSelect ? () => onSelect(fare) : undefined}
        />
      ))}
    </section>
  )
}
