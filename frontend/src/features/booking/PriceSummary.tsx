import { Card } from '@/components/ui/Card'
import type { Quote } from '@/lib/types'
import { formatINR } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Card'

export function PriceSummary({ quote, baseLabel, loading }: { quote?: Quote; baseLabel: string; loading?: boolean }) {
  return (
    <Card className="p-5">
      <h3 className="mb-4 text-lg font-black">Fare summary</h3>
      {loading || !quote ? (
        <div className="space-y-3">
          <Skeleton className="h-4" />
          <Skeleton className="h-4" />
          <Skeleton className="h-6" />
        </div>
      ) : (
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-600">{baseLabel}</dt>
            <dd>{formatINR(quote.base_amount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Taxes & fees</dt>
            <dd>{formatINR(quote.taxes)}</dd>
          </div>
          {Number(quote.discount) > 0 && (
            <div className="flex justify-between text-emerald-700">
              <dt>Coupon ({quote.coupon_code})</dt>
              <dd>- {formatINR(quote.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-200 pt-3 text-lg font-black">
            <dt>Total amount</dt>
            <dd>{formatINR(quote.total)}</dd>
          </div>
        </dl>
      )}
    </Card>
  )
}
