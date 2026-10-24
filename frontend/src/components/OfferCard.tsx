import { Copy, TicketPercent } from 'lucide-react'
import { toast } from 'sonner'
import type { Coupon } from '@/lib/types'
import { formatINR } from '@/lib/utils'

export function OfferCard({ offer }: { offer: Coupon }) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-xl bg-white p-4 shadow-[0_1px_6px_rgba(0,0,0,0.12)]">
      <div className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-accent-500 to-pink-500 text-white">
          <TicketPercent className="size-6" />
        </span>
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase">
            {offer.applies_to === 'ALL' ? 'Flights & Hotels' : offer.applies_to === 'FLIGHT' ? 'Flights' : 'Hotels'}
          </div>
          <h3 className="leading-snug font-black">{offer.title}</h3>
        </div>
      </div>
      <p className="flex-1 text-sm text-gray-600">{offer.description}</p>
      <div className="flex items-center justify-between border-t border-dashed border-gray-200 pt-3">
        <span className="text-xs text-gray-500">Min. booking {formatINR(offer.min_amount)}</span>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(offer.code)
            toast.success(`Code ${offer.code} copied`)
          }}
          className="flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-brand-500 bg-brand-50 px-2 py-1 text-xs font-black tracking-wider text-brand-700"
        >
          {offer.code} <Copy className="size-3" />
        </button>
      </div>
    </div>
  )
}
