import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { OfferCard } from '@/components/OfferCard'
import { Skeleton } from '@/components/ui/Card'
import { api } from '@/lib/api'
import type { Coupon } from '@/lib/types'
import { cn } from '@/lib/utils'

export default function OffersPage() {
  const [filter, setFilter] = useState<'ALL' | 'FLIGHT' | 'HOTEL'>('ALL')
  const { data, isLoading } = useQuery({ queryKey: ['offers'], queryFn: () => api.get<Coupon[]>('/offers/').then((r) => r.data) })
  const offers = data?.filter((o) => filter === 'ALL' || o.applies_to === 'ALL' || o.applies_to === filter)
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-black">Offers & coupons</h1>
      <p className="mt-1 text-gray-500">Apply these codes on the review page before you pay.</p>
      <div className="my-6 flex gap-2">
        {(['ALL', 'FLIGHT', 'HOTEL'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'cursor-pointer rounded-full px-4 py-1.5 text-sm font-bold',
              filter === f ? 'bg-brand-500 text-white' : 'bg-white text-gray-600 shadow-sm',
            )}
          >
            {f === 'ALL' ? 'All offers' : f === 'FLIGHT' ? 'Flights' : 'Hotels'}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-44" />)}
        {offers?.map((o) => <OfferCard key={o.code} offer={o} />)}
      </div>
    </div>
  )
}
