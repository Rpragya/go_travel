import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Stars({ count, className }: { count: number; className?: string }) {
  return (
    <span className={cn('inline-flex', className)} aria-label={`${count} star`}>
      {Array.from({ length: count }, (_, i) => (
        <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" />
      ))}
    </span>
  )
}

export function ratingLabel(r: number) {
  if (r >= 4.5) return 'Excellent'
  if (r >= 4) return 'Very Good'
  if (r >= 3.5) return 'Good'
  if (r >= 3) return 'Average'
  return 'Okay'
}

export function RatingBadge({ rating, count }: { rating: number | string; count?: number }) {
  const r = Number(rating)
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'rounded-md px-1.5 py-0.5 text-sm font-black text-white',
          r >= 4 ? 'bg-emerald-600' : r >= 3 ? 'bg-brand-500' : 'bg-amber-500',
        )}
      >
        {r.toFixed(1)}
      </span>
      <div className="text-xs leading-tight">
        <div className="font-bold text-gray-800">{ratingLabel(r)}</div>
        {count !== undefined && <div className="text-gray-500">{count} reviews</div>}
      </div>
    </div>
  )
}
