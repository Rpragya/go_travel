import { CreditCard, Landmark, Smartphone } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { cn, formatINR } from '@/lib/utils'

/** Stand-in for Razorpay when no API keys are configured. Nothing here leaves the browser. */
export function MockPaymentModal({
  open,
  amount,
  onClose,
  onResult,
  busy,
}: {
  open: boolean
  amount: number
  onClose: () => void
  onResult: (outcome: 'success' | 'failure') => void
  busy: boolean
}) {
  const [method, setMethod] = useState<'card' | 'upi' | 'netbanking'>('card')
  const methods = [
    { id: 'card', label: 'Card', icon: CreditCard },
    { id: 'upi', label: 'UPI', icon: Smartphone },
    { id: 'netbanking', label: 'Net banking', icon: Landmark },
  ] as const
  return (
    <Modal open={open} onClose={onClose} title="Go Travels test payment">
      <p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
        Test mode: no real money is charged. Add Razorpay test keys in <code>backend/.env</code> to use real Razorpay
        Checkout.
      </p>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {methods.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMethod(id)}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-3 text-xs font-bold',
              method === id ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600',
            )}
          >
            <Icon className="size-5" /> {label}
          </button>
        ))}
      </div>
      {method === 'card' && (
        <div className="space-y-3">
          <Field label="Card number">
            <Input defaultValue="4111 1111 1111 1111" readOnly />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Expiry">
              <Input defaultValue="12/30" readOnly />
            </Field>
            <Field label="CVV">
              <Input defaultValue="123" readOnly />
            </Field>
          </div>
        </div>
      )}
      {method === 'upi' && (
        <Field label="UPI ID">
          <Input defaultValue="success@razorpay" readOnly />
        </Field>
      )}
      {method === 'netbanking' && <p className="text-sm text-gray-600">You'll be redirected to a test bank page.</p>}
      <Button size="lg" variant="accent" className="mt-5 w-full" loading={busy} onClick={() => onResult('success')}>
        Pay {formatINR(amount)}
      </Button>
      <button
        className="mt-3 w-full cursor-pointer text-center text-xs font-bold text-red-600 disabled:opacity-50"
        disabled={busy}
        onClick={() => onResult('failure')}
      >
        Simulate a failed payment
      </button>
    </Modal>
  )
}
