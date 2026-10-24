import { Loader2, SearchX } from 'lucide-react'
import type { ReactNode } from 'react'

export function Spinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
      <Loader2 className="size-5 animate-spin text-brand-500" /> {label}
    </div>
  )
}

export function EmptyState({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-white px-6 py-14 text-center shadow-sm">
      <SearchX className="size-12 text-gray-300" />
      <h3 className="text-lg font-black">{title}</h3>
      {message && <p className="max-w-md text-sm text-gray-500">{message}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
      <p>{message}</p>
      {onRetry && (
        <button className="mt-2 cursor-pointer font-bold underline" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}
