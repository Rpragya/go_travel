import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Download, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { ErrorState, Spinner } from '@/components/ui/States'
import { BookingSummary } from '@/features/booking/BookingSummary'
import { api, downloadTicket, errorMessage } from '@/lib/api'
import type { Booking } from '@/lib/types'
import { fmtDateTime, formatINR } from '@/lib/utils'
import { StatusBadge } from './StatusBadge'
import { tripTitle } from './MyTripsPage'

function cancellationPolicy(b: Booking) {
  if (b.booking_type === 'FLIGHT') {
    const refundable = [b.flight, b.return_flight].filter(Boolean).every((f) => f!.refundable)
    return refundable
      ? 'Refundable fare: you get the full fare back minus a ₹300 per traveller cancellation fee.'
      : 'Non-refundable fare: only airport taxes will be refunded.'
  }
  return b.hotel?.room.refundable
    ? 'Free cancellation until 24 hours before check-in. Later cancellations are charged one night.'
    : 'Non-refundable room: no refund will be issued.'
}

export default function TripDetailPage() {
  const { reference = '' } = useParams()
  const [params] = useSearchParams()
  const qc = useQueryClient()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const booking = useQuery({
    queryKey: ['booking', reference],
    queryFn: () => api.get<Booking>(`/bookings/${reference}/`).then((r) => r.data),
  })
  const cancel = useMutation({
    mutationFn: () => api.post<Booking>(`/bookings/${reference}/cancel/`).then((r) => r.data),
    onSuccess: (b) => {
      qc.setQueryData(['booking', reference], b)
      qc.invalidateQueries({ queryKey: ['trips'] })
      setConfirmCancel(false)
      toast.success(`Booking cancelled. Refund of ${formatINR(b.refund_amount)} initiated.`)
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  if (booking.isLoading) return <Spinner />
  if (booking.isError || !booking.data) return <div className="p-8"><ErrorState message={errorMessage(booking.error, 'Booking not found.')} /></div>
  const b = booking.data
  const justConfirmed = params.get('confirmed') === '1' && b.status === 'CONFIRMED'

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      {justConfirmed && (
        <div className="flex items-center gap-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 p-5 text-white">
          <CheckCircle2 className="size-10 shrink-0" />
          <div>
            <h1 className="text-xl font-black">Booking confirmed!</h1>
            <p className="text-sm text-white/90">Your {b.booking_type === 'FLIGHT' ? 'e-ticket' : 'hotel voucher'} has been emailed to {b.contact_email}.</p>
          </div>
        </div>
      )}
      {b.status === 'CANCELLED' && (
        <div className="flex items-center gap-4 rounded-xl bg-red-50 p-5 text-red-900">
          <XCircle className="size-8 shrink-0 text-red-500" />
          <div>
            <h1 className="font-black">This booking was cancelled</h1>
            <p className="text-sm">
              Refund of <b>{formatINR(b.refund_amount)}</b> {Number(b.refund_amount) > 0 ? 'will reach your account in 5-7 working days.' : '(no refund applicable).'}
            </p>
          </div>
        </div>
      )}

      <Card className="flex flex-wrap items-center gap-3 p-5">
        <div className="mr-auto">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black">{tripTitle(b)}</h2>
            <StatusBadge status={b.status} />
          </div>
          <p className="text-sm text-gray-500">
            Booking ID <b>{b.reference}</b> · Booked {fmtDateTime(b.created_at)}
          </p>
        </div>
        {b.status === 'PENDING' && (
          <Link to={`/checkout/${b.reference}`}>
            <Button variant="accent">Complete payment</Button>
          </Link>
        )}
        {b.status === 'CONFIRMED' && (
          <Button
            variant="outline"
            loading={downloading}
            onClick={async () => {
              setDownloading(true)
              try {
                await downloadTicket(b.reference)
              } catch (e) {
                toast.error(errorMessage(e))
              } finally {
                setDownloading(false)
              }
            }}
          >
            <Download className="size-4" /> {b.booking_type === 'FLIGHT' ? 'E-ticket' : 'Voucher'}
          </Button>
        )}
        {b.can_cancel && (
          <Button variant="ghost" className="text-red-600" onClick={() => setConfirmCancel(true)}>
            Cancel booking
          </Button>
        )}
      </Card>

      <BookingSummary booking={b} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-2 font-black">{b.booking_type === 'FLIGHT' ? 'Travellers' : 'Guest'}</h3>
          <ul className="space-y-1 text-sm">
            {b.passengers.map((p, i) => (
              <li key={i} className="flex justify-between">
                <span>{p.first_name} {p.last_name}</span>
                <span className="text-gray-500">{p.pax_type === 'CHILD' ? 'Child' : 'Adult'} · {p.age} yrs</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-gray-500">{b.contact_email} · {b.contact_phone}</p>
        </Card>
        <Card className="space-y-2 p-5 text-sm">
          <h3 className="mb-2 font-black">Payment</h3>
          <div className="flex justify-between"><span className="text-gray-600">Base amount</span><span>{formatINR(b.base_amount)}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Taxes & fees</span><span>{formatINR(b.taxes)}</span></div>
          {Number(b.discount) > 0 && (
            <div className="flex justify-between text-emerald-700"><span>Coupon ({b.coupon_code})</span><span>- {formatINR(b.discount)}</span></div>
          )}
          <div className="flex justify-between border-t border-gray-100 pt-2 font-black"><span>Total</span><span>{formatINR(b.total_amount)}</span></div>
          {Number(b.refund_amount) > 0 && (
            <div className="flex justify-between text-emerald-700"><span>Refunded</span><span>{formatINR(b.refund_amount)}</span></div>
          )}
          <p className="pt-2 text-xs text-gray-500">{cancellationPolicy(b)}</p>
        </Card>
      </div>

      <Modal open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Cancel this booking?">
        <p className="text-sm text-gray-600">{cancellationPolicy(b)}</p>
        <p className="mt-2 text-sm text-gray-600">This can't be undone.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmCancel(false)}>Keep booking</Button>
          <Button variant="danger" loading={cancel.isPending} onClick={() => cancel.mutate()}>Yes, cancel</Button>
        </div>
      </Modal>
    </div>
  )
}
