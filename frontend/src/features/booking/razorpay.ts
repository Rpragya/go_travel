import type { PaymentOrder } from '@/lib/types'

interface RazorpayResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

interface RazorpayInstance {
  open: () => void
  on: (event: 'payment.failed', cb: (resp: { error: { description: string } }) => void) => void
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance
  }
}

function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Could not load Razorpay. Check your connection.'))
    document.body.appendChild(s)
  })
}

/** Opens Razorpay Checkout. Resolves with the signed response, rejects if the user fails or dismisses. */
export async function payWithRazorpay(order: PaymentOrder): Promise<RazorpayResponse> {
  await loadScript()
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      name: order.name,
      description: order.description,
      order_id: order.order_id,
      prefill: order.prefill,
      theme: { color: '#008CFF' },
      handler: resolve,
      modal: { ondismiss: () => reject(new Error('Payment cancelled.')) },
    })
    rzp.on('payment.failed', (resp) => reject(new Error(resp.error.description)))
    rzp.open()
  })
}
