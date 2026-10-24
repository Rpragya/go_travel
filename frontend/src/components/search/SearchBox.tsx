import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** The big MMT-style tappable field: small label, large value, muted subtitle. */
export const SearchBox = forwardRef<
  HTMLButtonElement,
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> & { label: string; value: ReactNode; sub?: ReactNode; active?: boolean }
>(function SearchBox({ label, value, sub, active, className, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'flex h-full w-full cursor-pointer flex-col items-start rounded-lg border border-gray-200 px-4 py-2.5 text-left transition hover:bg-brand-50/50',
        active && 'border-brand-500 bg-brand-50/60',
        className,
      )}
      {...rest}
    >
      <span className="text-xs font-bold tracking-wide text-gray-500 uppercase">{label}</span>
      <span className="truncate text-xl leading-tight font-black text-gray-900 sm:text-2xl">{value}</span>
      {sub && <span className="w-full truncate text-xs text-gray-500">{sub}</span>}
    </button>
  )
})
