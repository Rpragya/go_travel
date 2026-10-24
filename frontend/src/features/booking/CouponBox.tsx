import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, TicketPercent, X } from 'lucide-react'
import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'
import type { BookingType, Coupon, Quote } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Coupon picker. The parent re-quotes with `code`; `quote` tells us whether it applied. */
export function CouponBox({
  bookingType,
  code,
  onChange,
  quote,
}: {
  bookingType: BookingType
  code: string | null
  onChange: (code: string | null) => void
  quote?: Quote
}) {
  const [input, setInput] = useState('')
  const { data: offers = [] } = useQuery({
    queryKey: ['offers', bookingType],
    queryFn: () => api.get<Coupon[]>('/offers/', { params: { type: bookingType } }).then((r) => r.data),
  })
  const applied = code && quote?.coupon_valid
  const failed = code && quote && !quote.coupon_valid

  return (
    <Card className="p-5">
      <h3 className="mb-3 flex items-center gap-2 text-lg font-black">
        <TicketPercent className="size-5 text-accent-500" /> Coupons & offers
      </h3>
      {applied ? (
        <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="size-4" /> <b>{quote.coupon_code}</b> applied
          </span>
          <button className="cursor-pointer" onClick={() => onChange(null)} aria-label="Remove coupon">
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (input.trim()) onChange(input.trim().toUpperCase())
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter coupon code"
            className="h-10 min-w-0 flex-1 rounded-lg border border-gray-300 px-3 text-sm uppercase outline-none focus:border-brand-500"
            aria-label="Coupon code"
          />
          <button type="submit" className="cursor-pointer px-2 text-sm font-black text-brand-600">
            APPLY
          </button>
        </form>
      )}
      {failed && <p className="mt-2 text-xs text-red-600">{quote.coupon_message}</p>}
      <ul className="mt-3 space-y-2">
        {offers.map((o) => (
          <li key={o.code}>
            <label
              className={cn(
                'flex cursor-pointer gap-3 rounded-lg border p-3 text-sm',
                code === o.code ? 'border-brand-500 bg-brand-50' : 'border-gray-200',
              )}
            >
              <input
                type="radio"
                className="mt-1 accent-brand-500"
                checked={code === o.code}
                onChange={() => onChange(o.code)}
              />
              <span>
                <span className="font-black tracking-wide">{o.code}</span>
                <span className="block text-xs text-gray-600">{o.description}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </Card>
  )
}
