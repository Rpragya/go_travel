import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, ErrorState, Spinner } from '@/components/ui/States'
import { api, errorMessage } from '@/lib/api'
import type { Booking, PaymentOrder } from '@/lib/types'
import { formatINR } from '@/lib/utils'
import { BookingSummary } from './BookingSummary'
import { MockPaymentModal } from './MockPaymentModal'
import { payWithRazorpay } from './razorpay'

function useCountdown(until: string | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  if (!until) return null
  return Math.max(0, Math.floor((new Date(until).getTime() - now) / 1000))
}

export default function CheckoutPage() {
  const { reference = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [mockOrder, setMockOrder] = useState<PaymentOrder | null>(null)

  const booking = useQuery({
    queryKey: ['booking', reference],
    queryFn: () => api.get<Booking>(`/bookings/${reference}/`).then((r) => r.data),
  })
  const secondsLeft = useCountdown(booking.data?.hold_expires_at ?? null)

  const onPaid = (b: Booking) => {
    qc.setQueryData(['booking', reference], b)
    qc.invalidateQueries({ queryKey: ['trips'] })
    toast.success('Payment successful! Your booking is confirmed.')
    navigate(`/trips/${reference}?confirmed=1`, { replace: true })
  }

  const verify = useMutation({
    mutationFn: (payload: Record<string, string>) =>
      api.post<Booking>('/payments/verify/', { booking_reference: reference, ...payload }).then((r) => r.data),
    onSuccess: onPaid,
    onError: (e) => {
      toast.error(errorMessage(e))
      setMockOrder(null)
      booking.refetch()
    },
  })

  const pay = useMutation({
    mutationFn: () => api.post<PaymentOrder>('/payments/create-order/', { booking_reference: reference }).then((r) => r.data),
    onSuccess: async (order) => {
      if (order.provider === 'MOCK') return setMockOrder(order)
      try {
        const resp = await payWithRazorpay(order)
        verify.mutate({
          order_id: resp.razorpay_order_id,
          payment_id: resp.razorpay_payment_id,
          signature: resp.razorpay_signature,
        })
      } catch (e) {
        toast.error((e as Error).message)
      }
    },
    onError: (e) => {
      toast.error(errorMessage(e))
      booking.refetch()
    },
  })

  if (booking.isLoading) return <Spinner />
  if (booking.isError || !booking.data) return <div className="p-8"><ErrorState message={errorMessage(booking.error, 'Booking not found.')} /></div>
  const b = booking.data
  if (b.status === 'CONFIRMED' || b.status === 'CANCELLED') return <Navigate to={`/trips/${reference}`} replace />

  const expired = b.status === 'EXPIRED' || secondsLeft === 0
  if (expired || b.status === 'FAILED') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState
          title={b.status === 'FAILED' ? 'Booking could not be completed' : 'Your booking session expired'}
          message="We released the seats/rooms we were holding for you. Please search again to see the latest availability."
          action={<Link to="/" className="font-bold text-brand-600">Search again</Link>}
        />
      </div>
    )
  }

  const mins = Math.floor((secondsLeft ?? 0) / 60)
  const secs = (secondsLeft ?? 0) % 60

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black">Complete your payment</h1>
        <div className="flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-bold text-amber-900" role="timer">
          <Clock className="size-4" /> Held for {mins}:{secs.toString().padStart(2, '0')}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <BookingSummary booking={b} />
          <Card className="p-5">
            <h2 className="mb-2 font-black">{b.booking_type === 'FLIGHT' ? 'Travellers' : 'Guest'}</h2>
            <ul className="space-y-1 text-sm">
              {b.passengers.map((p, i) => (
                <li key={i}>
                  {p.first_name} {p.last_name} · {p.gender} · {p.age} yrs
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-gray-500">
              Ticket will be sent to {b.contact_email} · {b.contact_phone}
            </p>
          </Card>
        </div>
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card className="space-y-3 p-5 text-sm">
            <div className="text-xs text-gray-500">Booking ID {b.reference}</div>
            <div className="flex justify-between"><span className="text-gray-600">Base amount</span><span>{formatINR(b.base_amount)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Taxes & fees</span><span>{formatINR(b.taxes)}</span></div>
            {Number(b.discount) > 0 && (
              <div className="flex justify-between text-emerald-700"><span>Coupon ({b.coupon_code})</span><span>- {formatINR(b.discount)}</span></div>
            )}
            <div className="flex justify-between border-t border-gray-200 pt-3 text-lg font-black">
              <span>You pay</span><span>{formatINR(b.total_amount)}</span>
            </div>
            <Button size="lg" variant="accent" className="w-full" loading={pay.isPending || verify.isPending} onClick={() => pay.mutate()}>
              PAY {formatINR(b.total_amount)}
            </Button>
            <p className="flex items-center justify-center gap-1 text-xs text-gray-500">
              <ShieldCheck className="size-4 text-emerald-600" /> Secured by Razorpay · UPI, cards & net banking
            </p>
          </Card>
        </div>
      </div>
      <MockPaymentModal
        open={!!mockOrder}
        amount={Number(b.total_amount)}
        busy={verify.isPending}
        onClose={() => setMockOrder(null)}
        onResult={(outcome) => mockOrder && verify.mutate({ order_id: mockOrder.order_id, mock_outcome: outcome })}
      />
    </div>
  )
}
